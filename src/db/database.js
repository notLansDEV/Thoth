import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

if (typeof window !== 'undefined') {
  throw new Error(
    'src/db/database.js is server-only and cannot be imported in browser code. ' +
    'Use API-backed services from client components instead.'
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool = null;

/**
 * Initialize database connection pool.
 * Supports either DATABASE_URL or discrete DB_* variables.
 */
export function initializeDatabase(config = {}) {
  const discrete = {
    user: config.user || process.env.DB_USER || 'postgres',
    password: config.password || process.env.DB_PASSWORD || 'postgres',
    host: config.host || process.env.DB_HOST || 'localhost',
    port: config.port || Number(process.env.DB_PORT) || 5432,
    database: config.database || process.env.DB_NAME || 'thoth',
  };

  // Prefer an explicit connection string, then DATABASE_URL, then discrete
  // DB_* settings. A single, predictable precedence avoids silently ignoring
  // DATABASE_URL (which previously happened whenever DB_NAME had a default).
  const connectionString =
    config.connectionString || process.env.DATABASE_URL || undefined;

  const poolOptions = {
    ...(connectionString ? { connectionString } : discrete),
    max: config.max || 20,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
  };

  // Lazy-load pg via Node's CJS loader so bundlers never pull it into
  // client code (this is what previously caused the blank screen).
  const require = createRequire(import.meta.url);
  let Pool;
  try {
    Pool = require('pg').Pool;
  } catch {
    throw new Error(
      'The "pg" package could not be loaded. database.js must only run in Node.js (server).'
    );
  }

  pool = new Pool(poolOptions);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getPool() {
  if (!pool) {
    initializeDatabase();
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

/**
 * Get a single row
 */
export async function getOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Get multiple rows
 */
export async function getMany(text, params = []) {
  const result = await query(text, params);
  return result.rows || [];
}

async function applySqlStatements(sql) {
  const statements = String(sql)
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  for (const statement of statements) {
    try {
      await query(statement);
    } catch (error) {
      if (!String(error.message).includes('already exists')) {
        console.warn('Schema statement error:', error.message);
      }
    }
  }
}

/**
 * Initialize database schema from schema.sql and apply pending migrations.
 */
export async function initializeSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('Applying schema.sql bootstrap...');
    await applySqlStatements(schema);

    await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      const appliedRows = await getMany('SELECT name FROM schema_migrations');
      const applied = new Set((appliedRows || []).map(r => r.name));

      // Baseline: if no migration records exist, mark existing migrations as applied
      // to avoid re-running legacy full-schema dumps on established databases.
      if (applied.size === 0) {
        for (const f of files) {
          await query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [f]);
          applied.add(f);
        }
        console.log('Recorded baseline schema migrations');
      } else {
        for (const f of files) {
          if (applied.has(f)) continue;
          const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
          console.log(`Applying migration ${f}...`);
          if (/\bBEGIN\b/i.test(sql) && /\bCOMMIT\b/i.test(sql)) {
            await query(sql);
          } else {
            await applySqlStatements(sql);
          }
          await query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [f]);
        }
      }
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

/**
 * Health check
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW()');
    return { status: 'ok', timestamp: result.rows[0].now };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Transaction support
 */
export async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  initializeDatabase,
  getPool,
  query,
  getOne,
  getMany,
  initializeSchema,
  closeDatabase,
  healthCheck,
  transaction,
};

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

  // Prefer discrete DB_* variables; fall back to DATABASE_URL only if
  // no database name is configured (DATABASE_URL is often a placeholder).
  const connectionString =
    (!discrete.database && (config.connectionString || process.env.DATABASE_URL)) ||
    undefined;

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

/**
 * Initialize database schema from schema.sql
 */
export async function initializeSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolon and filter empty statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} schema statements...`);

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.warn('Schema statement error:', error.message);
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

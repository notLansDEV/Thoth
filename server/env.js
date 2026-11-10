import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Resolve the project root so the server can be started from any directory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
const envLocalPath = path.join(root, '.env.local')

// Load .env first, then .env.local (local overrides win, mirroring Vite).
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true })

const NODE_ENV = process.env.NODE_ENV || 'development'
const isProduction = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

const VALID_ENVS = ['development', 'test', 'production']
const INSECURE_SECRETS = new Set(['devsecret', 'secret', 'changeme', 'change-me'])
const PLACEHOLDER_HINTS = ['change-me', 'replace-me', 'replace-with', 'your-secret']

function fail(message) {
  throw new Error(`[env] ${message}`)
}

if (!VALID_ENVS.includes(NODE_ENV)) {
  fail(`NODE_ENV must be one of ${VALID_ENVS.join(', ')} (got "${NODE_ENV}").`)
}

const PORT = Number(process.env.PORT || 4000)
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  fail(`PORT must be an integer between 1 and 65535 (got "${process.env.PORT}").`)
}

let JWT_SECRET = (process.env.JWT_SECRET || '').trim()
const normalizedSecret = JWT_SECRET.toLowerCase()
const looksLikePlaceholder =
  INSECURE_SECRETS.has(normalizedSecret) ||
  PLACEHOLDER_HINTS.some((hint) => normalizedSecret.includes(hint))

if (isProduction) {
  if (!JWT_SECRET) {
    fail('JWT_SECRET is required in production. Generate one with: openssl rand -hex 32')
  }
  if (JWT_SECRET.length < 32) {
    fail('JWT_SECRET must be at least 32 characters in production.')
  }
  if (looksLikePlaceholder) {
    fail('JWT_SECRET still looks like a placeholder. Generate a unique value with: openssl rand -hex 32')
  }
} else if (!JWT_SECRET) {
  // Keep local development unblocked, but make the risk explicit.
  JWT_SECRET = 'thoth-dev-only-insecure-secret'
  console.warn(
    '[env] JWT_SECRET is not set — using an insecure development-only default. ' +
      'Set JWT_SECRET in .env for stable sessions.'
  )
}

const DATABASE_URL = (process.env.DATABASE_URL || '').trim() || undefined

const db = {
  connectionString: DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'thoth',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
}

if (!Number.isInteger(db.port) || db.port < 1 || db.port > 65535) {
  fail(`DB_PORT must be an integer between 1 and 65535 (got "${process.env.DB_PORT}").`)
}

if (isProduction) {
  if (!DATABASE_URL && !process.env.DB_PASSWORD) {
    fail(
      'Database credentials are required in production. ' +
        'Set DATABASE_URL (recommended) or DB_PASSWORD.'
    )
  }
  if (!DATABASE_URL && db.password === 'postgres') {
    fail(
      'Refusing to use the default PostgreSQL password in production. ' +
        'Set DATABASE_URL or DB_PASSWORD.'
    )
  }
}

export const env = {
  NODE_ENV,
  isProduction,
  isTest,
  PORT,
  JWT_SECRET,
  databaseUrl: DATABASE_URL,
  db,
}

export default env

#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/opt/thoth}"
PGDATA="$DATA_DIR/postgres"
APP_ENV="$DATA_DIR/.env"
mkdir -p "$DATA_DIR"

# Generate secrets on first run
if [ ! -f "$APP_ENV" ]; then
  JWT_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
  DB_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"
  cat > "$APP_ENV" <<EOF
JWT_SECRET=$JWT_SECRET
POSTGRES_PASSWORD=$DB_PASSWORD
EOF
  chmod 600 "$APP_ENV"
fi

# shellcheck disable=SC1090
set -a
source "$APP_ENV"
set +a

export JWT_SECRET="${JWT_SECRET:?missing}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?missing}"
export NODE_ENV=production
export PORT="${PORT:-5232}"
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME="${DB_NAME:-thoth}"
export DB_USER="${DB_USER:-thoth}"
export DB_PASSWORD="$POSTGRES_PASSWORD"
export DATABASE_URL=""

# Escape single quotes for safe SQL string literals
SQL_DB_USER="${DB_USER//\'/\'\'}"
SQL_DB_NAME="${DB_NAME//\'/\'\'}"
SQL_DB_PASSWORD="${DB_PASSWORD//\'/\'\'}"

# Init Postgres data dir
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[thoth] Initializing PostgreSQL..."
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA" "$DATA_DIR"
  su - postgres -c "/usr/lib/postgresql/16/bin/initdb -D '$PGDATA' --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8 --no-locale"
  echo "host all all 127.0.0.1/32 scram-sha-256" >> "$PGDATA/pg_hba.conf"
  echo "host all all ::1/128 scram-sha-256" >> "$PGDATA/pg_hba.conf"
fi

chown -R postgres:postgres "$PGDATA"

# Start Postgres
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D '$PGDATA' -o '-c listen_addresses=127.0.0.1 -c port=5432' -w start"

# Create user/db safely without $$ expansion
su - postgres -c 'psql -v ON_ERROR_STOP=1 --username=postgres' <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${SQL_DB_USER}') THEN
    CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${SQL_DB_PASSWORD}';
  END IF;
END
\$do\$;

ALTER ROLE "${DB_USER}" WITH PASSWORD '${SQL_DB_PASSWORD}';

SELECT 'CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${SQL_DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE "${DB_NAME}" TO "${DB_USER}";
SQL

echo "[thoth] Starting Thoth on port $PORT..."
node /app/server/index.js &
APP_PID=$!

shutdown() {
  echo "[thoth] Shutting down..."
  kill -TERM "$APP_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D '$PGDATA' -m fast stop" || true
}
trap shutdown SIGTERM SIGINT

wait "$APP_PID"

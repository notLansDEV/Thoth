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
fi

# shellcheck disable=SC1090
source "$APP_ENV"
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

# Create user/db
su - postgres -c "psql -v ON_ERROR_STOP=1 --username=postgres <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;
SQL"
su - postgres -c "psql -v ON_ERROR_STOP=1 --username=postgres -tc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1 || psql --username=postgres -c \"CREATE DATABASE \\\"$DB_NAME\\\" OWNER \\\"$DB_USER\\\"\""
su - postgres -c "psql -v ON_ERROR_STOP=1 --username=postgres -c \"ALTER ROLE \\\"$DB_USER\\\" WITH PASSWORD '$DB_PASSWORD'; GRANT ALL PRIVILEGES ON DATABASE \\\"$DB_NAME\\\" TO \\\"$DB_USER\\\";\""

echo "[thoth] Starting Thoth on port $PORT..."
exec node /app/server/index.js

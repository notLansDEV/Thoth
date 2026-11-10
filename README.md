# Thoth — Your project's memory.

Thoth is a local-first project manager memory app backed by PostgreSQL.

Core features
- Dashboard (users, activity, project status)
- Markdown notes
- Kanban (New, Urgent, In Progress, Testing, Resolved, For Deployment, Closed, Reopened)
- Tasks & Bugs (detailed bug reports, attachments, comments)
- Calendar, Workspaces, Milestones, Reports, Settings

## Setup

1. Install dependencies and start PostgreSQL:
   ```bash
   npm install
   createdb thoth
   ```

2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` (or the discrete `DB_*` values) and generate a secret:
   ```bash
   openssl rand -hex 32   # paste into JWT_SECRET
   ```

3. Run the app (Vite + API together):
   ```bash
   npm run dev
   ```
   Frontend: http://localhost:5173 · API: http://localhost:4000/api/health

`.env` and `.env.local` are git-ignored — never commit real credentials or secrets.

## Self-hosting with Docker

Thoth ships with a Compose stack (PostgreSQL + the app), similar to Memos.

1. Create the env file and set the two secrets:
   ```bash
   cp .env.example .env
   openssl rand -hex 32   # → JWT_SECRET
   openssl rand -hex 24   # → POSTGRES_PASSWORD
   ```

2. Build and start:
   ```bash
   docker compose up -d --build
   ```

3. Open http://localhost:5232 (change `APP_PORT` in `.env` to expose another port).

Data lives in the `thoth-db` Docker volume and survives upgrades:

```bash
# backup (uses the POSTGRES_* values from .env)
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql

# upgrade
git pull && docker compose up -d --build
```

The app applies its schema automatically on startup. For HTTPS, put Caddy,
Nginx, or Traefik in front and proxy to `APP_PORT`. Set `NODE_ENV=production`
(Compose does this) so the server enforces a strong `JWT_SECRET` and database
password.

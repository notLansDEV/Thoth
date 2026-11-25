<div align="center">
  <img src="./src/assets/Thoth_logo.svg" alt="Thoth Logo" width="96" />
  <h1>Thoth</h1>
  <p><strong>Your project's memory.</strong></p>
  <p>A local-first, self-hosted project workspace for tasks, bugs, notes, and team collaboration — backed by PostgreSQL.</p>
</div>

---

## What is Thoth?

Thoth helps teams keep project work and project knowledge in one place. You can manage workspaces, projects, tasks, bugs, markdown notes, calendars, reports, and team permissions while keeping your data on your own infrastructure.

## Key Features

- **Workspaces & Projects** — Organize work by workspace, switch projects, and control project access per member.
- **Tasks & Bugs** — Kanban boards, priorities, assignees, attachments, comments, and archived stages.
- **Markdown Notes** — Project-scoped markdown pages/journal for documentation and meeting notes.
- **Calendar & Reports** — View scheduled work and export/report project progress.
- **Roles & Permissions** — Granular workspace/project role permissions with owner/admin/member controls.
- **Archive & Recovery** — Deleted projects can be reviewed and recovered (with retention cleanup).
- **Self-Hosted** — Runs with Node.js + PostgreSQL, or via Docker Compose.

## Tech Stack

- **Frontend:** React, Vite, Tailwind, Lucide
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT (Bearer + httpOnly cookie support) with CSRF protection for cookie-auth requests

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js 20+ (Node 24 recommended)
- npm
- PostgreSQL running locally

### 2. Install and configure

```bash
npm install
createdb thoth
cp .env.example .env
```

Edit `.env` and set at least:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/thoth
JWT_SECRET=replace-with-a-long-random-secret
```

Generate a secure secret:

```bash
openssl rand -hex 32
```

> `.env` and `.env.local` are git-ignored. Never commit real secrets.

### 3. Run the app

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **API health:** http://localhost:4000/api/health

The app applies idempotent schema/bootstrap updates on startup.

---

## Self-Hosting with Docker (Recommended)

### Quick start (all-in-one)

With Docker installed, run:

```bash
docker run -d \
  --name thoth \
  -p 5232:5232 \
  -v ~/.thoth:/var/opt/thoth \
  ghcr.io/notlansdev/thoth:latest
```

Open **http://localhost:5232** and create your first account.

Everything Thoth stores is in `~/.thoth`, so backing up that one folder backs up your data. On first boot, Thoth automatically initializes PostgreSQL, creates the database, and generates/persists secrets in `/var/opt/thoth`.

**Useful commands:**

```bash
docker logs -f thoth
docker stop thoth
docker start thoth
docker rm -f thoth   # data stays in ~/.thoth
```

**Build locally instead (optional):**

```bash
docker build -f Dockerfile.allinone -t thoth .
docker run -d --name thoth -p 5232:5232 -v ~/.thoth:/var/opt/thoth thoth
```

### Advanced: Docker Compose (separate app + DB)

Use this if you want a separate PostgreSQL container/service.

1. Create `.env`:

```bash
cp .env.example .env
```

Set required values:

```env
JWT_SECRET=<openssl rand -hex 32>
POSTGRES_PASSWORD=<openssl rand -hex 24>
APP_PORT=5232
```

2. Start:

```bash
docker compose up -d --build
```

Open **http://localhost:5232**

3. Status/logs:

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:5232/api/health
```

4. Stop/reset:

```bash
docker compose down
# DESTROYS DATA
docker compose down -v
```

---

## Useful Commands

```bash
npm run dev            # Run client + server in dev
npm run dev:client     # Vite frontend only
npm run dev:server     # API server only (watch)
npm run build          # Production frontend build
npm run lint           # ESLint
npm test               # Unit tests (Node test runner)
npm run test:integration  # DB-backed integration tests (requires TEST_DATABASE_URL)
npm run start:server   # Start API server
```

## Configuration Notes

- **`JWT_SECRET`** is required in production and should be long/random.
- **`DATABASE_URL`** or `DB_*` variables configure PostgreSQL.
- **`CORS_ORIGIN`** should be set when frontend and API are on different origins. For same-origin Docker self-hosting, leave it empty.
- **Uploads/attachments** are currently stored as data payloads in app data; keep attachment sizes reasonable.

## Security Notes

- Cookie auth uses `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- CSRF protection is enforced for cookie-authenticated state-changing requests.
- See [`SECURITY.md`](./SECURITY.md) for current controls and limitations.

## Troubleshooting

- **App won't start:** check `.env` values, especially `JWT_SECRET` and DB credentials.
- **Docker app unhealthy:** run `docker compose logs app` and `docker compose logs db`.
- **Port already in use:** change `APP_PORT` in `.env`, then `docker compose up -d`.
- **CORS/CSRF issues on custom domain:** set `CORS_ORIGIN` to the exact frontend origin and use HTTPS.

---

## Development Status

Thoth is actively evolving. Core workflows are usable, and security/testing hardening is ongoing. See `SECURITY.md` and tests for current coverage.

<div align="center">
  <img src="./src/assets/Thoth_logo.svg" alt="Thoth Logo" width="96" />
  <h1>Thoth</h1>
  <p><strong>Your project's memory.</strong></p>
  <p>A local-first, self-hosted project workspace for tasks, bugs, notes, and team collaboration — backed by PostgreSQL.</p>
</div>

---

## What is Thoth?

Thoth helps teams keep project work and project knowledge in one place. Manage workspaces, projects, tasks, bugs, markdown notes, calendars, reports, and team permissions while keeping your data on your own infrastructure.

## Key Features

- **Workspaces & Projects** — Organize work by workspace, switch projects, and control access per member.
- **Tasks & Bugs** — Kanban boards, priorities, assignees, attachments, comments, and archived stages.
- **Markdown Notes** — Project-scoped markdown pages and journals for documentation and meeting notes.
- **Calendar & Reports** — View scheduled work and export project progress reports.
- **Roles & Permissions** — Granular workspace and project role controls for owners, admins, and members.
- **Archive & Recovery** — Review and recover deleted projects with configurable retention cleanup.

---

## Quick Start (Docker)

### Option 1: All-in-One Container (Recommended)

Run Thoth and PostgreSQL together in a single container with zero external database setup:

```bash
docker build -f Dockerfile.allinone -t thoth .
docker run -d \
  --name thoth \
  -p 5232:5232 \
  -v ~/.thoth:/var/opt/thoth \
  thoth
```

Open **http://localhost:5232** in your browser and create your first account.

All application and database data lives in `~/.thoth` on your host machine, so backing up that single directory backs up everything.

**Container management:**

```bash
docker logs -f thoth      # Follow logs
docker stop thoth         # Stop container
docker start thoth        # Start container
docker rm -f thoth        # Remove container (data remains in ~/.thoth)
```

---

### Option 2: Docker Compose (Separate App & Database)

Use Docker Compose if you want separate containers for the Thoth server and PostgreSQL.

1. **Create your `.env` file:**

```bash
cp .env.example .env
```

Set the required secrets in `.env`:

```env
JWT_SECRET=<output of: openssl rand -hex 32>
POSTGRES_PASSWORD=<output of: openssl rand -hex 24>
APP_PORT=5232
```

2. **Build and start the stack:**

```bash
docker compose up -d --build
```

Open **http://localhost:5232** in your browser.

3. **Useful Compose commands:**

```bash
docker compose ps                     # Check container status
docker compose logs -f app            # View app logs
curl http://localhost:5232/api/health # Verify API health
docker compose down                   # Stop stack (preserves data)
docker compose down -v                # Stop stack and delete database volume
```

---

## Configuration & Security

- **`JWT_SECRET`** — Required in production; use a long, random hex string (`openssl rand -hex 32`).
- **`CORS_ORIGIN`** — Leave empty for same-origin Docker self-hosting. Only set this if your frontend and API run on different origins.
- **HTTPS / Reverse Proxy** — Place **Caddy**, **Nginx**, or **Traefik** in front of port `5232` for TLS/HTTPS.
- **Security** — Cookie authentication uses `httpOnly`, `SameSite=Lax`, and `Secure` in production with CSRF protection enabled. See [`SECURITY.md`](./SECURITY.md) for details.

## Troubleshooting

- **Container fails to start:** Check logs with `docker logs thoth` (or `docker compose logs app` and `docker compose logs db`).
- **Port `5232` already in use:** Map a different host port using `-p 8080:5232` or change `APP_PORT` in `.env`.
- **Database backup (Compose):**
  ```bash
  docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
  ```

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express
- **Database:** PostgreSQL

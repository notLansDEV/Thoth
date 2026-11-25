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
docker run -d \
  --name thoth \
  -p 5232:5232 \
  -v ~/.thoth:/var/opt/thoth \
  ghcr.io/notlansdev/thoth:latest
```

Open **http://localhost:5232** in your browser and create your first account.

All application and database data lives in `~/.thoth` on your host machine, so backing up that single directory backs up everything.

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

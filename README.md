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

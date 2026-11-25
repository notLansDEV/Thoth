# Security Notes

## Reporting
Report security issues privately to the maintainers. Do not open public issues for exploitable vulnerabilities.

## Current controls
- JWT bearer authentication for API routes (except auth/health/public endpoints).
- Workspace/project membership checks on most resource routes.
- UUID param validation for `:id` and `:userId`.
- Basic in-memory rate limiting on auth endpoints.
- Configurable CORS via `CORS_ORIGIN`.
- Basic security headers (nosniff, frame sameorigin, referrer policy, permissions policy, COOP/CORP where applicable).
- SQL identifier validation in `BaseRepository`.
- Attachment count/size validation for base64 payloads.
- Markdown rendering escapes HTML and restricts links/images to safe schemes.

## Known limitations
- JWTs are stored in browser `localStorage`; any XSS can steal tokens.
- Authorization is not yet fully centralized; role-permission matrix parity must be enforced on every endpoint.
- No comprehensive integration/e2e security tests yet.
- Attachments are stored as base64 in DB JSON.
- No production-grade migration framework/rollback.
- Rate limiting is in-memory (single process); use a shared store behind multiple instances.

## Deployment checklist
- Set strong `JWT_SECRET` and DB credentials.
- Set `CORS_ORIGIN` to trusted origins in production.
- Serve behind HTTPS.
- Back up PostgreSQL regularly.
- Rotate secrets if compromise is suspected.

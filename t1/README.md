# Stockwise

Stockwise is a portable inventory operations application with a React workspace, an independently runnable Express REST API, and persistent relational SQLite storage. It is designed to run with standard Node.js tooling on Windows, macOS, Linux, and Codespaces.

## Current implementation

- User registration and login with bcrypt password hashing and expiring JWT sessions.
- Organization created per registration, membership validation on every API request, and permission middleware for sensitive operations.
- Tenant-scoped product catalog, supplier directory, warehouse records, inventory, movements, notifications, reporting, and audit history.
- Transactional receive, issue, adjustment, and two-sided warehouse transfers. Stock cannot be reduced below zero or reserved quantity. Every adjustment is recorded in the movement ledger and audit log.
- Live dashboard totals, reorder signals, inventory valuation report, CSV export, global search, command palette, responsive layout, and persisted light/dark preference.
- Express serves the built Vite client in production. Development uses a Vite proxy to the API.

This release is a usable inventory foundation, not the complete purchasing/sales ERP scope described in the broader product brief. Purchase orders, goods receipts, sales orders, invoicing/payments, tasks/comments, transfer approval/transit, location hierarchy, CSV import, and automation execution are not implemented and are intentionally not represented as working features in the UI.

## Architecture

```text
client/          React 18 + Vite + React-Bootstrap SPA
server/          Express API, auth middleware, services, routes
server/database/ SQLite schema, connection and access-role initialization
client/src/      pages, reusable components, API client and utilities
tests/            Node test-runner checks for core validation invariants
```

## Requirements

- Node.js 20 or newer (LTS recommended)
- npm

## Install and run

```bash
npm install
```

Copy `.env.example` to `.env` and update the JWT secret before production. For development, defaults work without the file.

```bash
npm run dev
```

Open the Vite URL shown by the terminal (usually `http://localhost:5173`). The Express API listens on port 5000 by default; the Vite proxy sends `/api` requests to it. Database schema and built-in access roles are created automatically on server startup. No sample users, organizations, products, suppliers, warehouses, or stock records are inserted. Create your own account from the sign-in screen to start with an empty workspace.

### Create an account

Use **Create an account** on the sign-in screen. New users receive a private organization and Owner membership. Passwords must be at least 12 characters.

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Express listen port | `5000` |
| `DATABASE_PATH` | SQLite database file path, relative to project root or absolute | `./database/stockwise.db` |
| `JWT_SECRET` | JWT signing secret; use a random 32+ character value in production | Development-only value |
| `CLIENT_URL` | Allowed browser origin in production | `http://localhost:5173` |
| `VITE_API_URL` | Frontend API base path | `/api` |

Never commit `.env` or database files.

## Database

SQLite schema and built-in access roles are initialized idempotently when the API starts. The database is created at `DATABASE_PATH`; business data remains empty until users enter it. To initialize the database without starting the API:

```bash
npm run db:init
npm run db:roles
```

The role command creates only the application's built-in role and permission definitions. SQLite foreign keys, checks, indexes, and WAL mode are enabled. Business operations use prepared statements and transactions.

## Production build and run

```bash
npm run build
NODE_ENV=production
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=https://your-app.example
npm start
```

Set environment variables using your host's configuration interface rather than relying on shell-specific syntax. Express serves `client/dist` in production. Ensure the database directory is writable and backed up. SQLite on local disk suits a single-process deployment; use a managed PostgreSQL design before scaling to multiple application instances.

## API overview

All responses follow `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code": ..., "message": ... } }`.

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard`
- `GET|POST /api/products`, `PATCH|DELETE /api/products/:id`
- `GET|POST /api/warehouses`
- `GET|POST /api/suppliers`
- `GET /api/inventory`, `POST /api/inventory/movements`, `GET /api/inventory/movements`
- `GET /api/reports/inventory`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- `GET /api/audit-logs`, `GET /api/search`
- `POST /api/assistant/ask` (explicitly deterministic rules; not an external AI service)

Except health and authentication routes, endpoints require `Authorization: Bearer <token>`.

## Security notes

Passwords are bcrypt-hashed; tokens expire after eight hours and are held in session storage by the browser. API routes verify membership against the database and scope business queries to the authenticated organization. Inputs are bounded/validated, SQL is parameterized, JSON body size is limited, authentication is rate limited, and Helmet applies security headers. Production should use HTTPS, a strong JWT secret, restrictive CORS, protected database backups, and a dedicated operational review. Stateless bearer tokens in browser session storage are simpler to deploy but remain exposed to successful same-origin script injection; a hardened production rollout should move to an HttpOnly, Secure, SameSite cookie and add CSRF protection.

## Tests

```bash
npm test
```

Tests cover password-policy, tenant-boundary and movement-quantity invariants. These are unit-level checks, not a substitute for integration tests against a running API/database. No execution environment was available during file generation to install dependencies or run the application.

## Codespaces and portability

Open the repository in Codespaces, run `npm install`, then `npm run dev`. Forward ports 5173 and 5000 if they are not forwarded automatically. The same source uses relative project paths, npm scripts, and standard environment configuration on Windows, macOS, Linux, and Node.js hosting.

## Deployment

Build with `npm run build`, configure production environment variables, and run `npm start` on a Node.js host. Persist and back up the SQLite file. For multi-instance deployments, migrate to PostgreSQL and externalized file storage before horizontally scaling.

## License

MIT. See `LICENSE`.

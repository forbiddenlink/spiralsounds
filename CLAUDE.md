# spiralsounds

"Spiral Sounds" - a full-stack vinyl record store portfolio app. Express 5 API backend with a
vanilla-JS PWA frontend served from `public/`, SQLite persistence, JWT auth with 2FA, and
Discogs/MusicBrainz integration for record metadata.

## Stack

- Node.js, Express 5, SQLite (via `sqlite` + `sqlite3`), Socket.IO/`ws` for real-time.
- Auth: `jsonwebtoken`, `bcryptjs`, `speakeasy` (TOTP 2FA), `express-session`.
- Security middleware: `helmet`, `cors`, `express-rate-limit`, `express-validator`, `joi`,
  `dompurify`/`xss` for sanitization.
- Jest 30 (ESM via `NODE_OPTIONS=--experimental-vm-modules`) + Supertest for API tests.
- Biome 2 for lint/format. Package manager: pnpm (pnpm-lock.yaml + `packageManager` pin present;
  README/package.json scripts referencing `npm` are stale).

## Commands

```bash
pnpm start           # node server.js
pnpm dev             # node --watch server.js
pnpm migrate         # run DB migrations (db/migrations)
pnpm seed            # seed sample data
pnpm setup           # migrate && seed && start
pnpm reset-db        # delete database.db, re-migrate, re-seed
pnpm test            # jest (ESM mode)
pnpm test:watch
pnpm test:coverage
pnpm biome:check
pnpm biome:fix
```

## Layout

- `server.js` - app entry: Express setup, security middleware, session, Socket.IO wiring.
- `controllers/` - route handlers (auth, cart, collection, discogs, me, products).
- `routes/v1/` - versioned API routes.
- `services/` - business logic (Analytics, Collection, Discogs, MusicBrainz, TwoFactorAuth).
- `repositories/` - data access layer (`BaseRepository`, `CartRepository`, `ProductRepository`,
  `UserRepository`, plus Discogs/MusicBrainz API clients).
- `middleware/` - `errorHandler.js` (also exports the app `logger`), `rbac.js`, `requireAuth.js`.
- `utils/` - `jwt.js`, `sanitization.js`, `validation.js`, `emailService.js`, `errors.js`,
  `grading.js` (vinyl condition grading).
- `db/` - `db.js` (connection), `migrator.js`, `seeder.js`, `migrations/`.
- `websocket/socketManager.js` - Socket.IO setup for live updates.
- `public/` - PWA frontend (vanilla JS, service worker, manifest).
- `tests/` - Jest specs; `tests/setup.js` runs via `setupFilesAfterEnv`.

## Conventions

- ESM throughout (`"type": "module"`); Jest runs with `--experimental-vm-modules` to support it.
- `SESSION_SECRET` is required at boot; `server.js` throws immediately if it's missing.
- Coverage collection excludes `tests/**`, `public/**`, `server.js`, and `*.config.js`
  (see `jest.config.json`).

## Env vars

`PORT`, `NODE_ENV`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`,
`BCRYPT_ROUNDS`, `COOKIE_MAX_AGE`, `CLIENT_URL`, `DB_PATH`, `RATE_LIMIT_WINDOW_MS`,
`RATE_LIMIT_MAX_REQUESTS`, `LOG_LEVEL`, `TAX_RATE`, `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`,
`EMAIL_FROM`, `TWO_FA_ISSUER`, `TWO_FA_SERVICE_NAME`, `DISCOGS_CONSUMER_KEY`,
`DISCOGS_CONSUMER_SECRET`.

## Gotchas

- `database.db` is a real SQLite file at repo root; `pnpm reset-db` deletes and rebuilds it.
- CI (`.github/workflows/ci.yml`, `release-please.yml`) uses pnpm; keep `pnpm-lock.yaml` in
  sync with `package.json`.

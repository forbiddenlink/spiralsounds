# spiralsounds

"Spiral Sounds" - a full-stack vinyl record store portfolio app. Express 5 API backend with a
no-build vanilla-JS PWA frontend served from `public/`, SQLite persistence, JWT auth with 2FA,
stock and demo orders, and Discogs/MusicBrainz integration (API only, not used by the pages).
API reference: `docs/API.md`.

## Stack

- Node.js 22, Express 5, SQLite (via `sqlite` + `sqlite3`), Socket.IO on the server (the
  frontend has no live-update client).
- Auth: `jsonwebtoken`, `bcryptjs`, `speakeasy` (TOTP 2FA), `express-session`.
- Security middleware: `helmet` (CSP: scripts from `'self'` only), `cors`, `express-rate-limit`,
  `express-validator`, `joi`, `dompurify`/`xss` for sanitization.
- Jest 30 (ESM via `NODE_OPTIONS=--experimental-vm-modules`) + Supertest for API tests.
- Biome 2 for lint/format (`public/` is excluded by `biome.json`). Package manager: pnpm
  (`pnpm-lock.yaml` + `packageManager` pin; some package.json scripts still call `npm`).

## Commands

```bash
pnpm start           # node server.js
pnpm dev             # node --watch server.js
pnpm migrate         # run DB migrations
pnpm seed            # seed 10 records, testuser / TestPassword123!, sample reviews
pnpm setup           # migrate && seed && start
pnpm reset-db        # delete database.db, re-migrate, re-seed
pnpm test            # jest (ESM mode); CI fails on any red test
pnpm test:watch
pnpm test:coverage
pnpm biome:check
pnpm biome:fix
```

## Layout

- `server.js` - app entry: helmet/CSP, CORS, rate limits, same-origin check, session,
  static `public/` (extensionless `.html` URLs), legacy `/api/*` 308 redirects, HTML 404 page
  for unknown non-API GETs, Socket.IO wiring.
- `controllers/` - route handlers (auth, cart, orders, wishlist, products, me, collection, discogs).
- `routes/v1/` - versioned API routes, mounted in `routes/v1/index.js`.
- `services/` - business logic (Analytics, Collection, Discogs, MusicBrainz, TwoFactorAuth).
- `repositories/` - data access layer (`BaseRepository`, `CartRepository`, `ProductRepository`,
  `UserRepository`, plus Discogs/MusicBrainz API clients).
- `middleware/` - `errorHandler.js` (also exports the app `logger` and `notFoundHandler`),
  `rbac.js`, `requireAuth.js`, `rateLimits.js` (API and auth limiters), `sameOrigin.js` (CSRF
  origin check on unsafe `/api` methods).
- `utils/` - `jwt.js` (access/refresh tokens and the 2FA challenge token), `sanitization.js`,
  `validation.js`, `emailService.js`, `errors.js`, `grading.js` (vinyl condition grading).
- `db/` - `db.js` (connection, honours `DB_PATH`), `migrator.js` (numbered migrations listed in
  `runAllMigrations`, latest `013_create_orders`), `seeder.js`, `migrations/`.
- `websocket/socketManager.js` - Socket.IO setup.
- `public/` - the site. One HTML file per page; `js/app/` holds ES modules: `shell.js` (header,
  footer, cart drawer, toasts), `api.js` (all fetch calls), `ui.js` (shared markup), and one
  module per page. Styles in `css/spiral.css` (tokens, light and dark). `sw.js` never caches
  `/api`.
- `tests/` - Jest specs; `tests/setup.js` gives each test file its own temp database.
- `design-research/` - redesign research, plan, scores, screenshots, `report.md`, and
  `needs-approval.md` (owner decisions still open).

## Conventions

- ESM throughout (`"type": "module"`); Jest runs with `--experimental-vm-modules` to support it.
- `SESSION_SECRET` is required at boot; `server.js` throws immediately if it's missing.
- Frontend: no inline scripts (the CSP blocks them); add behaviour in `public/js/app/`.
  Yellow (`--sticker`) means price and nothing else.
- Schema changes go in a new numbered method in `db/migrator.js`, never by editing an old one.
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
  Run `pnpm migrate` after pulling: migrations 012 (stock) and 013 (orders) are required.
- The strict auth limiter allows 5 failed sign-ins per 15 minutes per IP and lives in memory;
  restart the dev server to reset it during manual testing.
- With 2FA on, `POST /auth/login` returns `{ requires2FA, challengeToken }` and no cookies;
  `/auth/2fa/verify` takes `challengeToken` + `token`, never a `userId`.
- Test apps that call `registerUser` need `express-session`, because it sets `req.session`.
- CI (`.github/workflows/ci.yml`, `release-please.yml`) uses pnpm; keep `pnpm-lock.yaml` in
  sync with `package.json`.

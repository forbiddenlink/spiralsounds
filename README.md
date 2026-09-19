# Spiral Sounds

<div align="center">

![Spiral Sounds Logo](public/images/spiral_logo.png)

**A full-stack vinyl record store PWA: Express 5 API + a vanilla-JS frontend**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-blue.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://sqlite.org/)

</div>

## What it is

Spiral Sounds is a full-stack vinyl record store: an Express 5 API backend with a vanilla-JS
PWA frontend served from `public/`, SQLite persistence, JWT auth with TOTP-based 2FA, and
Discogs/MusicBrainz integration for record metadata.

## Features

- **Product catalog**: searchable, filterable vinyl collection with genre filters
- **Cart and wishlist**: persistent cart, quantity management, saved favorites
- **Auth**: JWT-based auth with refresh tokens, TOTP 2FA (`speakeasy`), role-based access control
- **Real-time**: Socket.IO/`ws` for live cart and analytics updates
- **PWA**: installable, offline-capable via a service worker and web app manifest
- **Record metadata**: Discogs and MusicBrainz API integration
- **Security**: `helmet`, rate limiting (`express-rate-limit`), input validation (`joi`,
  `express-validator`), XSS sanitization (`dompurify`/`xss`)

## Stack

- Node.js, Express 5, SQLite (via `sqlite` + `sqlite3`), Socket.IO/`ws`
- Auth: `jsonwebtoken`, `bcryptjs`, `speakeasy` (TOTP 2FA), `express-session`
- Jest 30 (ESM) + Supertest for API tests, Biome 2 for lint/format
- Package manager: **pnpm** (`packageManager` pin + `pnpm-lock.yaml`)

## Quickstart

```bash
git clone git@github.com:forbiddenlink/spiralsounds.git
cd spiralsounds
pnpm install
cp .env.example .env       # fill in the values below
pnpm setup                 # migrate && seed && start
```

Open `http://localhost:8000` (or whatever `PORT` is set to).

## Environment variables

See `.env.example` for the full list with descriptions. At minimum, `SESSION_SECRET` and
`JWT_SECRET` are required; the server throws on boot if `SESSION_SECRET` is missing.

Key vars: `PORT`, `NODE_ENV`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DB_PATH`,
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `DISCOGS_CONSUMER_KEY`,
`DISCOGS_CONSUMER_SECRET`, `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`, `TWO_FA_ISSUER`.

## Scripts

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

## Project structure

```
spiralsounds/
├── controllers/     # Route handlers (auth, cart, collection, discogs, me, products)
├── routes/v1/       # Versioned API routes
├── services/        # Business logic (Analytics, Collection, Discogs, MusicBrainz, 2FA)
├── repositories/     # Data access layer
├── middleware/       # errorHandler, rbac, requireAuth
├── utils/            # jwt, sanitization, validation, email, grading
├── db/                # Connection, migrator, seeder, migrations
├── websocket/         # Socket.IO setup
├── public/            # PWA frontend (vanilla JS, service worker, manifest)
├── tests/             # Jest specs
└── server.js          # App entry point
```

## Deployment

Deploys as a standard Node/Express app; no build step. Set the environment variables above,
run `pnpm migrate && pnpm seed` once against the target database, then `pnpm start`.

## License

MIT. See [LICENSE](LICENSE).

# Report: Spiral Sounds design upgrade

Branch `design/upgrade` (worktree `/Volumes/LizsDisk/_wt/spiralsounds-design`), based on `origin/main` `e28e84c`. Not merged. Main and production were not touched.

## The short version

Before this work, the shop did not function. The catalog grid was empty because the frontend called API paths that 404. Sign in and the cart failed because the content security policy (CSP) blocked their inline scripts. There was no page for a single record, and unknown URLs returned raw JSON.

Now every template is rebuilt on one design direction, "Behind the counter", and the main journey works end to end. You can browse the bins, open a record, save it, add it to the cart, change quantities, review it, and place a demo order. Accessibility, best practices, and SEO score 100 on every audited page, and no tests regressed.

## Design direction

The site is the counter of an independent record shop. Three brand moves carry it, and everything else stays quiet so the album covers lead:

- A huge stretched wordmark set in Anybody at width 150.
- A yellow price sticker on every sleeve. Yellow is used for nothing else.
- Genre filters drawn as bin divider tabs.

There is one orchestrated motion: the featured record slides out of its sleeve, then turns once every 12 seconds. It stops when the visitor has reduced motion enabled.

Text is set in Atkinson Hyperlegible Next. The ground is sleeve white (`#f6f6f3`), text is groove indigo (`#1c1a33`), and the accent is the logo's pink (`#e8336d`). There is a full dark theme. The reasoning and the 12 references behind these choices are in `plan.md` and `references.md`.

## Before and after

Side by side images are in `screenshots/compare/`. Full sets are in `screenshots/before/` and `screenshots/after/`, at desktop 1440x900 and mobile 390x844.

| Page | Comparison |
|---|---|
| Home | `compare/home.jpg`, `compare/home-mobile.jpg` |
| Record (new) | `compare/record.jpg` |
| Sign in | `compare/login.jpg` |
| Cart | `compare/cart.jpg` |
| Account | `compare/account.jpg` |
| Admin dashboard | `compare/admin.jpg` |
| 404 | `compare/not-found.jpg` |

The other screenshot folders:

- Forced loading, empty, error, and success states: `screenshots/after/states/`.
- Dark theme: `after/dark/`.
- Signed-in views: `after/authed/`.
- Staff view: `after/admin/`.

## Features added

These are ranked by impact, following `plan.md`.

1. **Working catalog.** Search, genre bins with counts, sort options (title, artist, price, year, rating), a price filter, a result count, and filter state kept in the URL.
2. **Working accounts.** Sign in with a safe `next` redirect, sign up with live password rules and field-level errors, sign out, forgot and reset password, email verification, and a 2FA code page.
3. **Record page (new).** Sleeve and disc hero, price, add and save actions, facts, real ratings and reviews (signed-in buyers can write and update theirs), a related row, and recently viewed.
4. **Cart drawer and cart page.** Quantity steppers, remove, a summary, free shipping (as the old page already stated), and a clearly labelled demo checkout.
5. **Real ratings** from the reviews table, replacing the randomly generated stars.
6. **Saved records page (new)**, stored per account.
7. **Recently viewed**, stored on this device only.
8. **Honest store strip.** It says "Demo shop: checkout places no real order" and "Free shipping on every order". No invented policies.
9. **Account page.** Display name, the email confirmation state, a reset link for the password, and full 2FA management: set up with a QR code, enable, regenerate backup codes, and disable with a password.
10. **Admin dashboard.** Real numbers, plus forbidden and error states. It previously returned 500 on every load.
11. **Real 404 page** with HTTP status 404. Unknown `/api/*` paths still get a JSON 404.
12. **PWA basics.** A new service worker (network first for pages, never caches the API, offline fallback), a manifest with sized icons, and WebP covers (2.2 MB of PNG became 204 KB).

### Backend additions

These support the pages above.

- `GET /products/:id`, plus rating fields and sorts on the product list.
- `POST /products/:id/reviews`.
- `/wishlist`.
- `PATCH /cart/items/:id`.
- `PUT /me`.
- `GET /auth/session`, which returns 200 for signed-out visitors and includes the role.
- Extensionless page URLs, so the links in emails resolve.
- Fixes to the seeder and the analytics service.

19 new API tests are in `tests/storefront.test.js`.

## Scores

Each template is scored 1 to 5 on eight criteria. Every template finished at 4 or higher on every criterion. The full per-template tables and the round 1 problems are in `progress.md`.

| Template | Lowest final score | Round 1 issues fixed |
|---|---|---|
| Home | 4 | Mobile wordmark overflow, tiny hero record, layout shift 0.78 reduced to 0 |
| Record | 4 | Title-cased facts, a misleading "same bin" heading, star ARIA |
| Cart and drawer | 4 | |
| Saved | 4 | |
| Auth pages (6) | 4 | Titles crowding the form column |
| Account | 4 | A 403 probe on every customer page load |
| Admin | 4 | Mobile title overflow |
| 404 | 4 | |

## Verification (Phase 6)

- **Tests.** Both runs used `jest --runInBand` on a fresh database. `origin/main` fails 16 of 39 tests. The branch fails 16 of 58: the same 16 test names, all pre-existing. All 19 new tests pass.
- **Lint.** `biome check .` reports 86 errors on `origin/main` and 86 on the branch, all pre-existing. `public/` is excluded by the biome config, so the new frontend modules were checked with `node --check` instead.
- **Build and typecheck.** Not applicable: the repo has no build step and no TypeScript.
- **Lighthouse (mobile).** Home, record, sign up, and cart all score 100 on accessibility, best practices, and SEO.
- **Load metrics.** Measured on a 390px viewport with 4x CPU slowdown and about Slow 4G:
  - Home: largest contentful paint (LCP) 620 ms, layout shift (CLS) 0, 129 KB (was 449 KB).
  - Record: LCP 1364 ms.
  - Sign in: LCP 608 ms (was 2804 ms).
  - Cart: LCP 896 ms.
- **Journeys.** These are scripted in `/Volumes/LizsDisk/_wt/ss-tools/` and all pass with zero page errors:
  - `journeys.mjs`: sign in, save, add to cart, change quantity, review, unsave, demo checkout, 404s, and the reset link.
  - `home-flow.mjs`: the homepage browse flow.
  - `twofa.mjs`: the full 2FA round trip with a real one-time code.
  - `states.mjs`: forced loading, empty, error, and success states.

## Blocked or untested

- **Email links** (verify and reset) were never received end to end. There is no email provider configured (approval item 6). The pages themselves were tested with invalid tokens.
- **2FA at sign in** cannot work yet. Login ignores 2FA, and `verify2FA` sets no cookies (items 7, 8, 15). The page's "no sign-in waiting" state was tested.
- **Real checkout, stock levels, tracklists, and audio previews** need approval (items 1 to 4).
- **The install prompt** needs a real browser profile and was not exercised.
- **The 404 page has no Lighthouse score**, because Lighthouse will not audit a page that returns HTTP 404. It was checked visually and by script.
- **The full test suite is unreliable when run in parallel**, because the tests share `database.db` (item 10). The numbers above come from serial runs.

## Commits

```
e72c1a3 fix(db): the seeder no longer inserts the nonexistent stock column
3f4fad5 docs: profile and before screenshots
bb3a883 feat(api): product detail, reviews, wishlist, cart PATCH
97dde64 docs: references and features
f319ee6 docs(design): commit to one direction, feature ranking, and page plan
10b3c88 feat(ui): new design system and rebuilt homepage
d3cca03 feat(ui): roll the counter design out to every page (Phase 5)
95516a7 fix(a11y): give star ratings an accessible name Lighthouse accepts
```

## Approved follow-ups (after the first report)

Four groups from the approval list were approved and built, one commit each:

| Approved | What changed | Commit | Evidence |
|---|---|---|---|
| Test isolation (10) | `DB_PATH` honoured; each test file gets a throwaway database | `0133337` | Two parallel runs give identical results; dev `database.db` checksum unchanged |
| Stock and orders (1, 3) | Migrations 012 and 013; carts capped at stock; checkout is one transaction that records an order and takes copies out of stock; orders on the account page; stock on the admin page; sold-out and low-stock states | `01e869e` | `tests/orders.test.js` (9 tests); `ss-tools/orders-flow.mjs` in the browser |
| 2FA security (7, 8, 15) | Correct password with 2FA on returns a 5-minute challenge and no cookies; `/2fa/verify` takes only that challenge, allows 5 wrong codes, works once; invalid bearer tokens now 401 instead of 500 | `2569377` | `tests/twofa-login.test.js` (8 tests); `ss-tools/twofa-login.mjs` in the browser |
| Cleanup (11, 13) | 23 retired scripts and stylesheets removed (nothing loaded them); legacy `/api/*` redirects now 308 so POSTs survive | `9c13498` | Reference check against every page, the service worker, and `server.js`; `curl` POST to `/api/auth/login` reaches the v1 handler |

Tests after the follow-ups: 75 total, 14 failing, all 14 also failing on `origin/main` (stale tests from before this work). Lint: 86 errors, the same as `origin/main`.

The dev `database.db` was migrated (backup at the time: `/tmp/claude-501/pre-migrate.db`, not kept long term) and holds a few demo orders from browser testing.

## Needs approval (full list)


**Status 2026-10-02:** items 1, 3, 7, 8, 10, 11, 13, and 15 were approved and are done (commit noted on each). Still open: 2, 4, 5, 6, 7a, 9, 12, 14, 16 to 19.

## Database / schema

1. **[Done, approved 2026-10-02, `01e869e`]** **Add a `stock` column to `products`.** The seeder already defines `stock: 12` per record and `ProductRepository.updateStock` expects it, but no migration creates it. Needed for honest "low stock" / "sold out" badges, which every competitor shows. Requires a new migration (`012_add_product_stock`).
2. **Add record metadata columns** (label, catalog number, pressing/format details such as 180g or colored vinyl, tracklist). Competitors lead with this on product pages. Requires a migration plus content for the 10 records.
3. **[Done, approved 2026-10-02, `01e869e`]** **Orders table and real checkout.** `CartRepository.transferToOrder` references `order_items`, which no migration creates. Checkout today only clears the cart. Requires migrations for `orders` / `order_items`.

## Paid services / API keys

4. **Stripe Checkout.** `stripe` and `@stripe/stripe-js` are installed but unused. Real payment needs `STRIPE_SECRET_KEY` / publishable key and a webhook secret. The redesign keeps checkout as a clearly labeled demo.
5. **Discogs catalog features** (`/api/v1/catalog/*`, `/api/v1/discogs/*`) need `DISCOGS_CONSUMER_KEY` / `DISCOGS_CONSUMER_SECRET`. The UI does not surface these endpoints until keys exist.
6. **Transactional email** (verification, password reset) needs `EMAIL_USER` / `EMAIL_PASS` for a real provider.

7a. **Newsletter and back-in-stock alerts.** Seven of nine competitors offer email signup. Needs a subscribers table (migration) and an email provider (item 6).

## Auth / security boundaries (found while mapping, not changed)

7. **[Done, approved 2026-10-02, `2569377`]** **Login ignores 2FA.** `loginUser` (`controllers/authController.js`) issues access and refresh cookies even when the account has 2FA enabled, so the second factor is never enforced at sign-in. Fixing it changes the login contract (return a challenge instead of tokens).
8. **[Done, approved 2026-10-02, `2569377`]** **`POST /api/v1/auth/2fa/verify` is unauthenticated and trusts a `userId` from the request body.** Paired with item 7 it should be bound to a short-lived challenge token.
9. **Admin link shown to every signed-in user** (`authUI.js`). The redesign shows the dashboard link only when `/api/v1/auth/status` returns a role with analytics permission, if available; tightening server-side RBAC is out of scope.
10. **[Done, approved 2026-10-02, `0133337`]** **Tests write to the real `database.db`.** `db/db.js` hardcodes the filename and ignores `DB_PATH`, so `pnpm test` mutates the dev database and fails with `SQLITE_READONLY` while the dev server runs. Fixing it changes DB connection config.

## URLs / routes

11. **[Done, approved 2026-10-02, `9c13498`]** **Legacy `/api/*` redirects.** They break every POST from old clients (browsers re-send 301/302 as GET). The redesigned frontend calls `/api/v1/*` directly, so nothing depends on the redirects; removing or changing them (to 308) is a route change left for approval.
12. **Pretty URLs** (`/record/selling-dogma` instead of `/product.html?id=1`). Better for SEO and sharing, but adds new routes and server rewrites.

## Content / features removed or replaced

13. **[Done, approved 2026-10-02, `9c13498`]** **Retired frontend files (kept, not deleted).** The rebuilt pages no longer load these, but they are still in `public/`: `css/index.css`, `css/enhanced-*.css`, `js/advancedSearch.js`, `js/websocketClient.js`, `js/performance.js`, `js/theme.js`, `js/pwa.js`, `js/productUI.js`, and the old auth scripts. Deleting them is a cleanup for approval. Nothing references them after this branch (check with `grep -r` before deleting).
14. **Live notifications over Socket.IO.** `websocketClient.js` opened a raw `WebSocket` against a Socket.IO server, so it never connected. The redesign drops the client side instead of rewriting it. Bringing real-time updates back means adding the `socket.io-client` bundle (served locally for the CSP) and deciding which events matter to shoppers.
15. **[Done, approved 2026-10-02, `2569377`]** **`verify2FA` returns tokens in the response body and sets no cookies.** The redesigned `verify-2fa.html` cannot finish a cookie session from it. Fix together with items 7 and 8 (a challenge token issued at login, cookies set on verify).
16. **Extensionless page URLs.** `express.static` now uses `extensions: ['html']` so the links in verification and reset emails (`/verify-email?token=`, `/reset-password?token=`) resolve. This adds URLs; it changes no existing one. Listed so it is a conscious choice.
17. **Admin dashboard: Chart.js replaced by CSS bars.** The plan called for vendoring Chart.js. The dashboard data (5 genres, a handful of records) reads better as labelled bars and a table, with no 200 KB dependency. If richer charts are wanted later, vendor `chart.js` into `public/vendor/`.
18. **Analytics service fixes made on this branch.** `AnalyticsService` aliased a subquery as `returning` (an SQLite keyword) and the route called `getRealTimeMetrics` (the method is `getRealtimeMetrics`), so the dashboard always returned 500. Both are fixed. `getInventoryStatus` still needs the `stock` column (item 1) and is skipped until then. Review the fix in `services/AnalyticsService.js` and `routes/v1/analytics.js`.
19. **Seeded admin account.** Local testing created `shopadmin` with role `admin` in the dev `database.db` only. No seed or migration was changed. Decide whether the seeder should create a demo staff account.

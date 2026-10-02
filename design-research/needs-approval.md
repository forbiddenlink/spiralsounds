# Needs approval

Changes this upgrade did NOT make because they are destructive, risky, touch the database schema, change URLs, remove features, or need paid services/keys. Each item says why it matters and what approving it would involve.

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

# Needs approval

Changes this upgrade did NOT make because they are destructive, risky, touch the database schema, change URLs, remove features, or need paid services/keys. Each item says why it matters and what approving it would involve.

## Database / schema

1. **Add a `stock` column to `products`.** The seeder already defines `stock: 12` per record and `ProductRepository.updateStock` expects it, but no migration creates it. Needed for honest "low stock" / "sold out" badges, which every competitor shows. Requires a new migration (`012_add_product_stock`).
2. **Add record metadata columns** (label, catalog number, pressing/format details such as 180g or colored vinyl, tracklist). Competitors lead with this on product pages. Requires a migration plus content for the 10 records.
3. **Orders table and real checkout.** `CartRepository.transferToOrder` references `order_items`, which no migration creates. Checkout today only clears the cart. Requires migrations for `orders` / `order_items`.

## Paid services / API keys

4. **Stripe Checkout.** `stripe` and `@stripe/stripe-js` are installed but unused. Real payment needs `STRIPE_SECRET_KEY` / publishable key and a webhook secret. The redesign keeps checkout as a clearly labeled demo.
5. **Discogs catalog features** (`/api/v1/catalog/*`, `/api/v1/discogs/*`) need `DISCOGS_CONSUMER_KEY` / `DISCOGS_CONSUMER_SECRET`. The UI does not surface these endpoints until keys exist.
6. **Transactional email** (verification, password reset) needs `EMAIL_USER` / `EMAIL_PASS` for a real provider.

7a. **Newsletter and back-in-stock alerts.** Seven of nine competitors offer email signup. Needs a subscribers table (migration) and an email provider (item 6).

## Auth / security boundaries (found while mapping, not changed)

7. **Login ignores 2FA.** `loginUser` (`controllers/authController.js`) issues access and refresh cookies even when the account has 2FA enabled, so the second factor is never enforced at sign-in. Fixing it changes the login contract (return a challenge instead of tokens).
8. **`POST /api/v1/auth/2fa/verify` is unauthenticated and trusts a `userId` from the request body.** Paired with item 7 it should be bound to a short-lived challenge token.
9. **Admin link shown to every signed-in user** (`authUI.js`). The redesign shows the dashboard link only when `/api/v1/auth/status` returns a role with analytics permission, if available; tightening server-side RBAC is out of scope.
10. **Tests write to the real `database.db`.** `db/db.js` hardcodes the filename and ignores `DB_PATH`, so `pnpm test` mutates the dev database and fails with `SQLITE_READONLY` while the dev server runs. Fixing it changes DB connection config.

## URLs / routes

11. **Legacy `/api/*` redirects.** They break every POST from old clients (browsers re-send 301/302 as GET). The redesigned frontend calls `/api/v1/*` directly, so nothing depends on the redirects; removing or changing them (to 308) is a route change left for approval.
12. **Pretty URLs** (`/record/selling-dogma` instead of `/product.html?id=1`). Better for SEO and sharing, but adds new routes and server rewrites.

## Content / features removed or replaced

13. Pending: filled in during Phases 4 and 5 for any old UI element the redesign retires.

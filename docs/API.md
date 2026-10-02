# API reference

Snapshot as of 2026-10-02. The routes themselves (`routes/v1/`) are the source of truth; if this page and the code disagree, the code wins.

All endpoints live under `/api/v1`. Requests and responses are JSON.

## Conventions

- **Auth.** Signing in sets httpOnly `accessToken` and `refreshToken` cookies. A request can also send `Authorization: Bearer <accessToken>`.
  - *Signed in* means a valid access token is required. Without one the response is `401` with code `TOKEN_REQUIRED` or `TOKEN_INVALID`.
  - *Optional* means the response adds detail for a signed-in visitor.
  - *Staff* means the account role must carry `analytics:view` (`admin`, `super_admin`, or `moderator`).
- **Errors** use this shape: `{ "success": false, "error": { "message", "code", "statusCode", "details"? } }`. Validation failures use `code: "VALIDATION_ERROR"` and list `details.validationErrors[{ field, message }]`.
- **Cross-site writes are refused.** A `POST`, `PUT`, `PATCH`, or `DELETE` whose `Origin` or `Referer` is another site gets `403` with code `CSRF_ORIGIN`.
- **Rate limits.** Every `/api` route allows `RATE_LIMIT_MAX_REQUESTS` per window (default 100 per 15 minutes per IP). Login, register, reset request, and 2FA verify also allow only 5 failed attempts per 15 minutes per IP. Over the limit, the response is `429`.
- **Legacy paths.** `/api/products`, `/api/auth`, `/api/cart`, and `/api/analytics` answer with a `308` redirect to their `/api/v1` equivalents, which keeps the method and body.

## Auth (`/auth`)

| Method and path | Auth | What it does |
|---|---|---|
| `POST /auth/register` | none | Create an account. Body: `name`, `email`, `username`, `password`, `confirmPassword`. The password needs 8+ characters, upper and lower case, a digit, and one of `@$!%*?&`. Returns `201` and sets cookies. |
| `POST /auth/login` | none | Body: `username` (or email), `password`. Without 2FA, returns `200` and sets cookies. With 2FA on, returns `{ requires2FA: true, challengeToken }` and sets no cookies. |
| `POST /auth/2fa/verify` | none | Body: `challengeToken`, `token` (a 6-digit code or a backup code). Sets cookies on success. A wrong code returns `400` with `attemptsLeft`. An expired or unknown challenge returns `401`. A used challenge, or one with 5 failed codes, returns `429`. |
| `POST /auth/logout` | optional | Clears the cookies and, when signed in, revokes refresh tokens. |
| `POST /auth/refresh-token` | refresh cookie | Issues a new access token. |
| `POST /auth/password/reset-request` | none | Body: `email`. Always answers the same way, so it does not reveal whether an account exists. |
| `POST /auth/password/reset` | none | Body: `token`, `password`. |
| `GET /auth/email/verify?token=` | none | Confirms an email address. |
| `GET /auth/session` | optional | Always `200`: `{ isLoggedIn, name?, role? }`. The pages use this to draw the header. |
| `GET /auth/status` | signed in | Account details for the account page. |
| `POST /auth/2fa/setup` | signed in | Returns a QR code, a manual key, and backup codes. 2FA is not on until it is enabled. |
| `POST /auth/2fa/enable` | signed in | Body: `token`. Turns 2FA on. |
| `POST /auth/2fa/disable` | signed in | Body: `password`. |
| `POST /auth/2fa/backup-codes` | signed in | Replaces the backup codes. |
| `GET /auth/2fa/status` | signed in | `{ enabled, setupAt, remainingBackupCodes }`. |

## Products (`/products`)

| Method and path | Auth | What it does |
|---|---|---|
| `GET /products` | none | Query: `search`, `genre`, `minPrice`, `maxPrice`, `sortBy` (`title`, `artist`, `price`, `genre`, `year`, `rating`, `id`), `sortOrder` (`asc` or `desc`), `page`, `limit`. Each product includes `stock`, `rating_avg`, and `rating_count`. |
| `GET /products/genres` | none | Genres with counts. |
| `GET /products/search/suggestions?q=` | none | Type-ahead suggestions. |
| `GET /products/:id` | optional | `{ product, rating: { count, average }, reviews, related }`. Each review has a `mine` flag for the signed-in viewer. |
| `POST /products/:id/reviews` | signed in | Body: `rating` (1 to 5), `comment` (optional). Creates or updates your review. |
| `POST /products/analytics/search`, `POST /products/analytics/click` | none | Search and click tracking. |

## Cart (`/cart`)

| Method and path | Auth | What it does |
|---|---|---|
| `GET /cart` | signed in | `{ items: [{ cartItemId, productId, title, artist, price, image, genre, year, stock, quantity }] }`. |
| `GET /cart/count` | signed in | The number of copies in the cart. |
| `POST /cart/items` | signed in | Body: `product_id`. Adds one copy. Returns `404` for an unknown record and `409` when the cart already holds every copy in stock. |
| `PATCH /cart/items/:itemId` | signed in | Body: `quantity` (1 to 10). Returns `409` above stock. |
| `DELETE /cart/items/:itemId` | signed in | Removes one line. |
| `DELETE /cart/items` | signed in | Empties the cart. |

## Orders (`/orders`)

| Method and path | Auth | What it does |
|---|---|---|
| `POST /orders` | signed in | Turns the cart into an order in one transaction: it records the order and items, takes the copies out of stock, and empties the cart. Returns `201 { order: { id, subtotal, shipping, total, itemCount } }`. An empty cart returns `400`. If any line exceeds stock, it returns `409` with `items[{ productId, stock }]` and changes nothing. No payment is taken. |
| `GET /orders` | signed in | Your orders, newest first, each with its items. |

## Saved records (`/wishlist`)

| Method and path | Auth | What it does |
|---|---|---|
| `GET /wishlist` | signed in | Saved records. |
| `POST /wishlist` | signed in | Body: `product_id`. Saving twice has no extra effect. |
| `DELETE /wishlist/:productId` | signed in | Returns `204`. |

## Account (`/me`)

| Method and path | Auth | What it does |
|---|---|---|
| `GET /me` | signed in | `{ isLoggedIn, name }`. |
| `PUT /me` | signed in | Body: `displayName` (2 to 50 characters). |

## Staff (`/analytics`)

| Method and path | Auth | What it does |
|---|---|---|
| `GET /analytics/dashboard` | staff | Sales overview, top products, genre figures, user activity, stock, and recent activity. |
| `GET /analytics/searches`, `/activity`, `/realtime` | staff | Search log, activity feed, and live counters. |

## Collection, Discogs, and catalog

These need Discogs API keys, and the shop pages do not use them yet.

- `/collection/*` (signed in): a personal vinyl collection, folders, wantlist, value history, and play counts.
- `/discogs/*`: Discogs search, releases, masters, artists, labels, marketplace listings and prices, and the grading guide.
- `/catalog/*`: unified search and lookup across Discogs and MusicBrainz, including barcode lookup.

See the route files for parameters.

## System

| Method and path | What it does |
|---|---|
| `GET /health` | `{ status: "OK", version, timestamp, environment }` |
| `GET /info` | API name, version, and the endpoint index |

# Site profile: Spiral Sounds

Snapshot as of 2026-10-02, written against `e28e84c` (origin/main) on branch `design/upgrade`.

## In one sentence

Spiral Sounds is an online vinyl record store (a full-stack portfolio app) where visitors browse a small catalog of LPs, add records to a cart, and check out.

## Audience and main action

- **Who it is for (best reading):** vinyl buyers and collectors who browse for discovery, plus people evaluating the project as a portfolio piece.
- **Main action:** find a record and add it to the cart, then check out. Secondary: create an account (required for cart), save records for later.

## Unknowns (not invented, listed instead)

- Whether a real business, address, shipping policy, or returns policy exists. None appears in the repo. The catalog (10 albums, artists like "The Clouds", "Neon Grove") reads as fictional sample data.
- Real stock levels: the seeder defines `stock: 12` per product, but the `products` table has no `stock` column.
- Payment: `stripe` and `@stripe/stripe-js` are dependencies, but no checkout route exists. Checkout today clears the cart and prints "Your order has been sent for processing."
- Who is an admin. `authUI.js` shows the admin link to every logged-in user ("in a real app, check for admin role").
- Brand guidelines. The only brand asset is `public/images/spiral_logo.png` (pink/black cartoon turntable, 408 KB).

## Stack and serving

- Express 5 server (`server.js`) serves `public/` statically and the JSON API under `/api/v1`. Legacy `/api/*` paths redirect (301/302) to `/api/v1/*`.
- Frontend: hand-written static HTML pages plus ES-module vanilla JS. No build step, no framework.
- CSP (`server.js:39-48`): `script-src 'self'` (no inline scripts, no CDN scripts), styles allow `'unsafe-inline'` and Google Fonts, images allow `https:`.
- PWA: `manifest.json`, `sw.js` (cache-first static cache `spiral-sounds-v1.0.0`), `js/pwa.js` registers it and shows a "New version available" banner.

## Page templates and routes

| Route | File | Purpose |
|---|---|---|
| `/` | `index.html` | Home and catalog: header, genre select, product grid. `advancedSearch.js` also injects a filter sidebar. |
| `/cart.html` | `cart.html` | Cart list, order summary, checkout button. |
| `/login.html` | `login.html` | Sign in. |
| `/signup.html` | `signup.html` | Register. |
| `/forgot-password.html` | `forgot-password.html` | Request password reset. |
| `/reset-password.html` | `reset-password.html` | Set new password from token. |
| `/verify-email.html` | `verify-email.html` | Email verification landing. |
| `/verify-2fa.html` | `verify-2fa.html` | Enter TOTP code during login. |
| `/account-settings.html` | `account-settings.html` | Profile, password, 2FA setup. |
| `/admin.html` | `admin.html` | Analytics dashboard (Chart.js from CDN). |
| any unknown path | none | Express `notFoundHandler` returns raw JSON 404. |

There is no product detail page, no collection/wantlist page, no about/shipping/contact page.

## Shared components (as built)

- Top banner: greeting text, cart count link, hamburger toggle, nav (Log in, Sign up, Dashboard, Log out), search input. Duplicated by hand in each page.
- Header: logo image plus "Spiral Sounds" h1 and "The best in vinyl" subhead.
- Footer: "© Spiral Sounds".
- Product card (`productUI.js`): image, Quick View overlay (placeholder toast "coming soon"), title, artist, price, randomly generated 4 to 5 star rating, Add to Cart, genre label, wishlist heart (local toggle only, not persisted).
- Theme toggle (`theme.js`), toast notifications, PWA install/update banner, floating cart bubble from `advancedSearch.js`.

## Design tokens, fonts, styling

- CSS: `css/index.css` (52 KB), `css/enhanced-theme.css` (9 KB), `css/enhanced-components.css` (42 KB). Three overlapping layers.
- Fonts: Inter (300-700) and Poppins (400-700) from Google Fonts.
- Palette in practice: dark navy background, cyan `#06B6D4` theme color, cyan-to-violet gradient on headings, red "Reset Filters" button, emoji icons throughout.
- Look: generic dark "SaaS dashboard" template. Nothing about it says records, sleeves, or record shops.

## Content types

- **Product** (`products` table): id, title, artist, genre, price, image, year, description, created_at, updated_at. 10 seeded rows, 5 genres (rock, indie, ambient, folk, punk). Covers are 400x400 PNG photos, 130 to 330 KB each.
- **Review** (`reviews`): user_id, product_id, rating, comment. 3 seeded. No API exposes them.
- **Wishlist** (`wishlists`): table exists, no API.
- **Cart item** (`cart_items`).
- **User** (name, email, username, password hash, verification, 2FA, role).
- **Collection, folders, wantlist, value history**: tables plus full `/api/v1/collection/*` API, no UI.
- **Discogs/MusicBrainz catalog**: `/api/v1/catalog/*` and `/api/v1/discogs/*` need `DISCOGS_CONSUMER_KEY` (paid/third-party key, not configured).
- **Grading**: `utils/grading.js` defines M, NM, VG+, VG, G+, G, F, P.

## Current features and user journeys (verified in a real browser, 2026-10-02)

Screenshots: `design-research/screenshots/before/` (desktop 1440x900 and mobile 390x844, full page) and `before/authed/` (after attempting login as the seeded `testuser`).

| Journey | Status today | Evidence |
|---|---|---|
| Browse catalog on home | **Broken.** Grid is empty. | `productService.js` reads `data.products`, API returns `data.data.products`; `genres.forEach is not a function` page error. `before/home-desktop.jpg`. |
| Filter by genre | Broken (select stays "Show All" only). | Same response-shape bug. |
| Search | Broken. `advancedSearch.js` calls `/api/products/...` paths that 404 or redirect. | Console: `Failed to load genres: TypeError: Failed to fetch`. |
| Sign in | **Broken.** `login.js` POSTs `/api/auth/login`, which 302-redirects; the browser re-sends as GET and gets 404. | `before/authed/*` show logged-out states. |
| Sign up | Broken (POSTs relative `api/auth/register`, same redirect problem). | Code read, `signup.js:17`. |
| Cart | Unreachable without login; `cart.html` redirects home on 401. | `before/authed/cart_html-desktop.jpg`. |
| Checkout | Fake: clears cart, prints a message. | `cart.js:23-28`. |
| Account settings, 2FA | Broken: inline `<script>` blocked by CSP. | Console CSP errors on both. |
| Admin dashboard | Broken: Chart.js and date-fns CDN scripts blocked by CSP; redirects to login. | Console CSP errors. |
| 404 | Raw JSON error. | `before/does_not_exist-desktop.jpg`. |
| Mobile | Horizontal overflow on home (filter sidebar wider than viewport), overlapping update banner. | `before/home-mobile.jpg`. |

Also observed: fresh databases failed to seed because the seeder inserted a `stock` column the schema does not have. Fixed in this branch by dropping `stock` from the seeder INSERT (`db/seeder.js`), no schema change.

## Implication for the redesign

The visual layer and most client JS must be rebuilt, not reskinned: the grid, auth, and cart flows do not work today. Backend APIs for products, cart, auth, 2FA, and collection/wantlist are in place and can carry the new UI.

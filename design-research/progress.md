# Design upgrade progress

Branch: `design/upgrade` (worktree `/Volumes/LizsDisk/_wt/spiralsounds-design`, based on `origin/main` `e28e84c`).
Local dev: `.env` in worktree (gitignored), `PORT=8010`, start with `node server.js`. Seeded login: `testuser` / `TestPassword123!`.
Screenshot tooling (outside repo): `/Volumes/LizsDisk/_wt/ss-tools/shot.mjs` (local pages) and `ext.mjs` (external sites), Playwright 1.63 + cached Chromium.

## Phases

- [x] Phase 1: Understand the site (`profile.md`, before screenshots)
- [x] Phase 2: Research (`references.md`: 12 sites loaded, 7 blocked; `features.md`: 8 competitors loaded + Vinyl Me Please partial, Juno blocked)
- [x] Phase 3: Decide (`plan.md`)
- [x] Phase 4: Foundation + homepage
- [x] Phase 5: Roll out to every template
- [x] Phase 6: Verify
- [x] Phase 7: Report (`report.md`)

## Notes

- Main checkout at `/Volumes/LizsDisk/spiralsounds` was 13 commits behind origin and had an untracked `CLAUDE.md` identical to origin's, so work happens in a worktree instead of switching branches there.
- Seeder fix (drop nonexistent `stock` column from INSERT) made in Phase 1 so a fresh DB seeds.
- Baseline before any frontend work: `pnpm test` 23 of 39 failing on origin (stale API shapes; tests share `database.db`), `pnpm biome:check` 86 errors. Stop the dev server before running tests, and restore `database.db` after (tests write to it).
- Added storefront API (`bb3a883`): `GET /api/v1/products/:id`, `POST /api/v1/products/:id/reviews`, `/api/v1/wishlist`, `PATCH /api/v1/cart/items/:id`; tests in `tests/storefront.test.js` (12 passing).

## Phase 4 results

Foundation: `public/css/spiral.css` (tokens, base, components, page sections), `public/js/app/` (`theme-boot.js`, `api.js`, `ui.js`, `shell.js`, `home.js`), new `sw.js` (no API caching, network-first pages), WebP covers (2.2 MB to 204 KB), sized icons, manifest. API additions: rating fields and `year`/`rating` sorts on `GET /products`, `GET /auth/session` (200 for signed-out visitors). 17 storefront tests pass.

Homepage rubric (1 to 5). Round 1 = first build (`screenshots/rounds/home-r1-*`), round 2 = after fixes (`screenshots/after/home-*`).

| Criterion | R1 | R2 | Notes |
|---|---|---|---|
| Point of view | 3.5 | 4.5 | Stretched wordmark, price stickers, bin tabs, disc leaving its sleeve. |
| Typography | 4 | 4.5 | Anybody at width 150 for the wordmark, condensed for bin tabs; sticker digits fixed (were stacking). |
| Layout and rhythm | 3 | 4 | R1 squeezed the featured record to ~120px beside the wordmark; R2 stacks the words and gives the record its own column. |
| Color and imagery | 4 | 4 | Covers untouched; pink and yellow only where they mean something. Dark mode strip and disc rim fixed in R2. |
| Motion | 4 | 4 | One load moment (disc slides out, then turns at 12s/rev); stops with reduced motion. Cart sticker bumps on add. |
| Audience fit | 4 | 4.5 | Reads as a record shop, not a dashboard. |
| Memorability | 4 | 4.5 | |
| Craft | 2 | 4.5 | R1: mobile wordmark overflowed, desktop menu icon leaked, CLS 0.78, sticker ARIA error. R2: Lighthouse mobile a11y 100 / best practices 100 / SEO 100, CLS 0, no horizontal overflow at 390px, zero console errors. |

Verified by script (`ss-tools/home-flow.mjs`): bins filter (indie = 4), price sort, live search, empty state, clear, signed-out add shows sign-in toast, disc animation running.

## Phase 5 results

Every template rebuilt on the shared shell (`shell.js`: strip, header, footer, cart drawer, toasts). Screenshots: `screenshots/after/` (signed out), `after/authed/` (testuser), `after/admin/` (staff account), `after/dark/`, `after/states/` (forced states). Desktop 1440x900 and mobile 390x844 for each.

API added in this phase: reviews carry a `mine` flag and no `user_id`; `PUT /api/v1/me` (display name, 2 to 50 chars); `/auth/session` returns `role`; HTML 404 for unknown non-API GETs; extensionless page URLs. Analytics dashboard 500s fixed (see needs-approval 18). 19 storefront tests pass.

| Template | Status | POV | Type | Layout | Color | Motion | Fit | Memorable | Craft | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Home `/` | done | 4.5 | 4.5 | 4 | 4 | 4 | 4.5 | 4.5 | 4.5 | Phase 4. |
| Record `/record.html` | done | 4.5 | 4.5 | 4.5 | 4.5 | 4 | 4.5 | 4.5 | 4.5 | R1: genre facts shouted in title case ("Free On Every Order"); related heading claimed "same bin" when it fell back to nearest year. Both fixed. |
| Cart `/cart.html` + drawer | done | 4 | 4.5 | 4 | 4 | 4 | 4.5 | 4 | 4.5 | Signed out, empty (with favourites row), error, filled, ordered states all forced. |
| Saved `/saved.html` | done | 4 | 4.5 | 4 | 4 | 4 | 4 | 4 | 4.5 | Unsave removes the tile via an `ss:saved` event, empty state on last removal. |
| Sign in / sign up / forgot / reset / verify email / verify 2FA | done | 4 | 4 | 4.5 | 4.5 | 4 | 4.5 | 4 | 4.5 | R1 titles crowded the form column at width 135; set to width 125 and a smaller clamp. Field errors, form errors, success notices forced. |
| Account `/account-settings.html` | done | 4 | 4.5 | 4 | 4 | 4 | 4.5 | 4 | 4.5 | 2FA round trip scripted with a real TOTP code (`ss-tools/twofa.mjs`): wrong code, enable, 10 backup codes, regenerate, wrong password, disable. |
| Admin `/admin.html` | done | 4 | 4.5 | 4 | 4 | 4 | 4.5 | 4 | 4.5 | Staff view, forbidden (403) view, and error view. |
| 404 | done | 4.5 | 4.5 | 4 | 4 | 4 | 4.5 | 4.5 | 4.5 | Real 404 status for pages, JSON 404 kept for `/api/*`. |

R1 fixes applied across templates: mobile page titles overflowed at width 150 (`Shop dashboard`), now width 118 and `clamp(2.5rem, 12.5vw, 4rem)`; panels padded less on mobile; stat grid 2 columns on mobile; account page reads the role from `/auth/session` instead of probing a staff endpoint (which logged a 403 for every customer).

Journeys scripted (`ss-tools/journeys.mjs`, zero page errors): wrong password message, sign in with `next` redirect, save, add to cart, drawer quantity +1, post and update a review, unsave from Saved, cart total, demo checkout clears count, page 404, missing record, API JSON 404, `/reset-password?token=` bad-token message.

Not tested: the email links end to end (no email provider; item 6), 2FA at sign-in (login ignores 2FA; item 7), install prompt (needs a real browser profile).

## Phase 6 results

- **Build / typecheck:** no build step or TypeScript in this repo. `node --check` on every tracked JS file plus `public/js/app/*.js`: clean except `public/js/theme.js:106`, a syntax error that is identical on `origin/main` and in a file the new pages no longer load (needs-approval 13).
- **Tests:** `jest --runInBand` (parallel workers fight over the shared `database.db`, needs-approval 10). `origin/main` fresh DB: 16 of 39 fail. Branch: 16 of 58 fail, the same 16 test names (set difference empty), and all 19 new `storefront.test.js` tests pass.
- **Lint:** `biome check .`: 86 errors on `origin/main`, 86 on the branch. The 5 this branch introduced (formatting and import order in its 3 new files) were fixed. `public/` is excluded by `biome.json`.
- **Lighthouse (mobile, chrome-devtools MCP):** home, record, sign up, cart: accessibility 100, best practices 100, SEO 100. The record page first scored 96 (`aria-label` on a plain `span` in the star rating); fixed with `role="img"` and visually hidden text. Lighthouse refuses to audit the 404 page because it returns HTTP 404, which is the intended status.
- **Load metrics** (`ss-tools/perf.mjs`, 390px, 4x CPU, about Slow 4G, service worker blocked):

| Page | Before (origin) | After |
|---|---|---|
| Home | LCP 732 ms, CLS 0.041, 449 KB (grid empty: catalog API 404) | LCP 620 ms, CLS 0.000, 129 KB |
| Record | page did not exist | LCP 1364 ms, CLS 0.018, 106 KB |
| Sign in | LCP 2804 ms, CLS 0.001, 412 KB | LCP 608 ms, CLS 0.012, 153 KB |
| Cart | LCP 552 ms, CLS 0.041, 372 KB | LCP 896 ms, CLS 0.049, 35 KB (signed-out state) |

- **Journeys:** `ss-tools/journeys.mjs` (sign in, save, add, quantity, review, unsave, checkout, 404s, reset link), `home-flow.mjs` (bins, sort, search, empty, signed-out add, disc animation, no overflow), `twofa.mjs` (2FA setup to disable), `states.mjs` (forced loading, empty, error, success). All pass with zero page errors.

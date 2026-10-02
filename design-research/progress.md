# Design upgrade progress

Branch: `design/upgrade` (worktree `/Volumes/LizsDisk/_wt/spiralsounds-design`, based on `origin/main` `e28e84c`).
Local dev: `.env` in worktree (gitignored), `PORT=8010`, start with `node server.js`. Seeded login: `testuser` / `TestPassword123!`.
Screenshot tooling (outside repo): `/Volumes/LizsDisk/_wt/ss-tools/shot.mjs` (local pages) and `ext.mjs` (external sites), Playwright 1.63 + cached Chromium.

## Phases

- [x] Phase 1: Understand the site (`profile.md`, before screenshots)
- [x] Phase 2: Research (`references.md`: 12 sites loaded, 7 blocked; `features.md`: 8 competitors loaded + Vinyl Me Please partial, Juno blocked)
- [x] Phase 3: Decide (`plan.md`)
- [x] Phase 4: Foundation + homepage
- [→] Phase 5: Roll out to every template
- [ ] Phase 6: Verify
- [ ] Phase 7: Report

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

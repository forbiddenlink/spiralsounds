# Design upgrade progress

Branch: `design/upgrade` (worktree `/Volumes/LizsDisk/_wt/spiralsounds-design`, based on `origin/main` `e28e84c`).
Local dev: `.env` in worktree (gitignored), `PORT=8010`, start with `node server.js`. Seeded login: `testuser` / `TestPassword123!`.
Screenshot tooling (outside repo): `/Volumes/LizsDisk/_wt/ss-tools/shot.mjs` (local pages) and `ext.mjs` (external sites), Playwright 1.63 + cached Chromium.

## Phases

- [x] Phase 1: Understand the site (`profile.md`, before screenshots)
- [x] Phase 2: Research (`references.md`: 12 sites loaded, 7 blocked; `features.md`: 8 competitors loaded + Vinyl Me Please partial, Juno blocked)
- [→] Phase 3: Decide (`plan.md`)

- [ ] Phase 4: Foundation + homepage
- [ ] Phase 5: Roll out to every template
- [ ] Phase 6: Verify
- [ ] Phase 7: Report

## Notes

- Main checkout at `/Volumes/LizsDisk/spiralsounds` was 13 commits behind origin and had an untracked `CLAUDE.md` identical to origin's, so work happens in a worktree instead of switching branches there.
- Seeder fix (drop nonexistent `stock` column from INSERT) made in Phase 1 so a fresh DB seeds.
- Baseline before any frontend work: `pnpm test` 23 of 39 failing on origin (stale API shapes; tests share `database.db`), `pnpm biome:check` 86 errors. Stop the dev server before running tests, and restore `database.db` after (tests write to it).
- Added storefront API (`bb3a883`): `GET /api/v1/products/:id`, `POST /api/v1/products/:id/reviews`, `/api/v1/wishlist`, `PATCH /api/v1/cart/items/:id`; tests in `tests/storefront.test.js` (12 passing).

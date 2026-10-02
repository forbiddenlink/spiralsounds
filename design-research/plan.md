# Plan: Spiral Sounds redesign

Written against `97dde64` (`design/upgrade`, 2026-10-02). Frozen once Phase 4 starts; live state goes in `progress.md`.

## The design direction: "Behind the counter"

Spiral Sounds should feel like the counter of an independent record shop: bins with handwritten divider cards, a yellow price sticker slapped on every sleeve, and the record you came in for sliding out of its jacket. The covers are moody, photographic, and all different, so the frame around them stays plain and bright, and the brand speaks through three things only: a huge stretched wordmark, the shop's pink, and the price sticker.

### Where it comes from (references loaded in Phase 2)

- **Symbol Audio** (`references/symbol-audio-*`): a wordmark set so large it becomes the hero, with product photography sitting on top of it. We take the scale, not their cobalt.
- **Paul Kalkbrenner** (`references/kalkbrenner-*`): a single line of display type with an image set inline in the word. We set the featured record inline with the wordmark on desktop.
- **Baubauwerk** (`references/baubauwerk-*`): a strip of small, uncropped square thumbnails under a plain sentence. Model for "Recently viewed" and the cart drawer: covers at small size, no chrome.
- **penguin.music** (`references/penguin-music-*`): mood/genre chips as the primary discovery control. Our genre chips become bin divider tabs.
- **Heirest** (`references/heirest-*`): trust copy in a thin top strip, not a banner. We use it for honest store facts (demo store, free shipping as already stated in the cart).
- **GANNI** and **Proteinbolaget** (`references/ganni-*`, `references/proteinbolaget-*`): edge-to-edge product grids with no card boxes, text set directly under the image.
- Competitors (`features.md`): Norman Records and Turntable Lab for the product page anatomy (big cover left, price block and actions right, details list, related row); Banquet for "more like this".

### Type system

- **Display: Anybody** (Google Fonts, variable width 50 to 150, weight 100 to 900). Used expanded (`wdth` 125 to 150, weight 800) for the wordmark and page titles, and condensed (`wdth` 75) for the divider tabs. One family doing both jobs carries the 1970s sleeve-lettering feel without a novelty face.
- **Text: Atkinson Hyperlegible Next** (400, 500, 700). Built for legibility, distinctive letterforms, and clearly different from the display face.
- Scale (ratio 1.25, 18px body on desktop, 17px on mobile): 14, 17/18, 22, 28, 35, 44, 55, then fluid display `clamp(3.5rem, 13vw, 12rem)` for the wordmark.
- Line length capped at 68ch for running text. Sentence case everywhere. No all-caps labels, no letterspaced eyebrows, no monospace.

### Color palette

| Token | Hex | Role |
|---|---|---|
| `--sleeve` | `#F6F6F3` | Page ground: the white of an inner sleeve, slightly warm-grey, not cream. |
| `--groove` | `#1C1A33` | Text and dark sections: the indigo-black of vinyl under shop lights. |
| `--spiral` | `#E8336D` | Brand pink, taken from the logo turntable. Primary buttons, focus, active divider tab. |
| `--sticker` | `#FFD23F` | Price sticker only. Never used for anything else, so a yellow dot always means "price". |
| `--dust` | `#6B6980` | Secondary text (meets 4.5:1 on `--sleeve`). |
| `--rule` | `#DAD9E0` | Hairlines and input borders. |

Dark theme flips ground and text (`--sleeve` `#15142A`, `--groove` `#F1F0F5`), keeps pink and yellow. Contrast checked in Phase 4.

### Spacing, radius, layout

- 4px base, scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Radius has a hierarchy that means something: covers 2px (records are square), price stickers fully round, buttons and divider tabs pill/tab shaped, panels and drawer 20px. No uniform radius on everything.
- 12-column grid, max width 1320px, 24px gutters (16px on mobile). Content left-aligned; only the wordmark spans the full width.
- Product grid: no card boxes or shadows. Cover, then title, artist, and year as plain text. 4 columns desktop, 3 tablet, 2 mobile.
- Elevation only for things that float above the page: the cart drawer, the toast, the sticky header once scrolled.

### Imagery

- Album covers are the only photography. Shown square and uncropped, never with overlays, gradients, or zoom-on-hover.
- On the record page, a CSS-drawn vinyl disc (grooves from `repeating-radial-gradient`, the cover as the center label) sits half out of the sleeve.
- The existing cartoon logo stays as the favicon and app icon; the header uses the typeset wordmark.
- Emoji icons are replaced by a small inline SVG set (cart, heart, search, menu, close, plus, minus, user).

### Motion rules

- One orchestrated moment: on the home page and record page, the featured record slides out of its sleeve (600ms, ease-out) and then turns slowly (one rotation per 12s; a literal 33 1/3 rpm, 1.8s per turn, reads as frantic on screen). It stops with `prefers-reduced-motion: reduce`.
- Everything else moves only in response to the visitor: the cart drawer slides in, the "added" state on a button, the price sticker on the cart icon bumps once when the count changes.
- No scroll-triggered fade-ups, no parallax, no hover lifts on cards. Hover shows an underline on the title and a pink outline on the cover's focus ring equivalent.

### Why this is not the default

Checked against the usual generated looks: the ground is cool sleeve-white, not cream, and the accent is the logo's pink, not terracotta; there is no near-black with acid accent; no broadsheet hairline columns; no rounded shadowed card grid; no uppercase eyebrows, middle-dot meta strings, or arrows on buttons. The memorable things all come from record-shop vernacular: bin dividers, price stickers, a disc leaving its sleeve.

## Features

Ranked by impact on the main action (find a record, add it to the cart, check out). "Approval" items are already in `needs-approval.md` and are not built.

| # | Feature | Why | Peers | Status |
|---|---|---|---|---|
| 1 | Working catalog, search, genre bins | Today the grid is empty and search 404s; nothing else matters until this works. | all | Build |
| 2 | Working sign in, sign up, sign out | Cart requires an account and login currently 404s. | all | Build |
| 3 | Record page (`/record.html?id=`) | Every competitor has one; today there is nowhere to read about a record. | all 8 | Build (API added in `bb3a883`) |
| 4 | Cart drawer with quantity steppers | Adds to cart without leaving the browse flow; quantity edits. | TL, Rough Trade | Build |
| 5 | Sort and price facets with result count | Peers' most common browse controls. | RT, DC, AM, BC, TL | Build (API supports `sortBy`, `minPrice`, `maxPrice`) |
| 6 | Real ratings and reviews | Replaces the randomly generated stars on cards with real data, and lets signed-in buyers review. | Norman | Build |
| 7 | Saved records (wishlist) page | Remember records for later; persisted per account. | DC, AM, NR, BC, TL | Build |
| 8 | Related records ("From the same bin") | Keeps visitors browsing. | BQ, AM, NR, BC | Build |
| 9 | Recently viewed (on this device) | Returning to a record you looked at. | NR | Build (localStorage, per-viewer convenience) |
| 10 | Honest store strip and demo-checkout notice | Trust info peers show; ours must not invent policies. | RT, BL, NR, TL | Build, copy limited to facts in the repo |
| 11 | Real 404 page | Unknown URLs show raw JSON today. | n/a | Build (HTML 404 for non-API GETs; no route changes) |
| 12 | Stock states, sold out, notify me | Peers show them; no stock column. | BQ, TL | Approval (#1) |
| 13 | Tracklist, label, pressing variants | Peers lead with it; no data. | RT, BQ, AM, BC | Approval (#2) |
| 14 | Audio previews | Peers have them; no audio files. | RT, BL, BC | Approval (needs content) |
| 15 | Newsletter / back-in-stock alerts | Needs a table and an email provider. | 7 of 9 | Approval (add to list) |
| 16 | Real checkout and orders | Stripe keys, orders table. | all | Approval (#3, #4) |

## Page-by-page plan

Every page gets the shared header (wordmark, search, Shop, Saved, account, cart button with count sticker), the store strip, and the footer. All inline scripts move to files so the CSP stops blocking them. All API calls go to `/api/v1/*` through one `api.js` module.

- **Home / catalog (`index.html`)**: wordmark hero with the featured record (highest rated, falling back to newest year) sliding out of its sleeve, one sentence about the shop, and a "Look at this one" link. Below: bin divider tabs for genres, sort and price controls, result count, the grid with price stickers and save/add actions. Then "Highest rated" row from real reviews, "Recently viewed" strip if any. States: skeleton grid while loading, "No records match" with a clear-filters action, error with retry.
- **Record (`record.html`, new)**: sleeve and disc, title in display type, artist, year, genre bin link, price sticker, quantity, add to cart, save. Description. Rating summary and reviews, with a review form for signed-in visitors and a sign-in prompt otherwise. "From the same bin" row. States: loading, not found, error.
- **Cart (`cart.html`) and cart drawer**: lines with cover, title, artist, quantity stepper, line price, remove. Summary with subtotal, shipping (free, as the current page already states), total, and a checkout button labeled as a demo. Empty state links to the bins. Signed-out state prompts sign-in instead of redirecting.
- **Saved (`saved.html`, new)**: grid of saved records with move-to-cart and remove. Empty and signed-out states.
- **Sign in, sign up, forgot, reset, verify email, verify 2FA**: one split layout. Left: the form, plainly set. Right (desktop only): a crate of covers. Inline field validation messages from the API, password rules shown before submit, loading and success states.
- **Account settings (`account-settings.html`)**: profile details (read-only fields as the API allows), sign-out, 2FA setup with QR code, enable, disable, backup codes. Scripts moved out of inline.
- **Admin (`admin.html`)**: same chrome, Chart.js served from the installed `chart.js` package copied into `public/vendor/` so CSP allows it, permission-denied state for accounts without analytics access.
- **404 (`404.html`, new)**: "This record is not in the bins" with search and a link back.

## Verification per template

Desktop 1440x900 and mobile 390x844 screenshots, scored 1 to 5 on point of view, typography, layout and rhythm, color and imagery, motion, audience fit, memorability, and craft. Anything under 4 is reworked. Loading, empty, error, and success states are each forced and screenshotted.

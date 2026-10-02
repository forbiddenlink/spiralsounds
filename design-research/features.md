# Spiral Sounds competitor feature research

Captured 2026-10-02 with headless Chromium (desktop 1440x900 plus mobile 390x844 where the site allowed it). Screenshots live in `screenshots/competitors/`. Only features visible in a loaded screenshot or loaded page are listed. Nothing was logged into or purchased. Cloudflare challenged most mobile requests, so mobile coverage is thin (see Blocked).

Spiral Sounds baseline: product grid (~10 LPs), genre filter, text search, cart, signup/login with 2FA, account settings, admin analytics. Backend only: collection, wantlist, Discogs lookup, condition grading. Reviews and wishlist tables exist in the DB with no UI.

## 1. Rough Trade (roughtrade.com/en-us)

Loaded: home `https://www.roughtrade.com/en-us`, listing `/en-us/collection/vinyl-records`, product `/en-us/product/the-fall/fall-in-a-hole`.
Screenshots: `roughtrade-home-desktop(.jpg|-full.jpg)`, `roughtrade-listing-desktop*`, `roughtrade-product-desktop*`. Mobile blocked (Cloudflare).
Features observed:
- Announcement bar: free US shipping over $100, Trustpilot 4.3/5 from 3,500+ reviews, easy returns within 14 days.
- Global search ("Search for artists & releases"), account, cart, currency and language selector in footer.
- Mega nav: Music, Books, Merch & Hi-Fi, Offers & Trends, RT50 & Limited, Events, Used Vinyl, Blog, Club.
- Email capture modal (early access drop), footer newsletter with consent checkbox.
- Home: "New Titles Out This Week" hero, "Trending Titles" rail.
- Listing: left filter sidebar with price-range slider and in-page product search, sort dropdown (Most relevant), per-page selector, "Sign in required" lock badge on limited items.
- Product: variant selector (2LP Translucent Blue, $59.99), 30-second audio preview for every track with Qobuz-powered digital download purchase, product description (collapsible), tag chips (Pre-Orders, New On The Site, Trending Titles, Vinyl Records, artist), "Free Click & Collect from our New York store", trackable shipping note, live chat widget, Vinyl Glossary link, payment-method icons.

## 2. Discogs (discogs.com)

Loaded: home `https://www.discogs.com/`, marketplace listing `https://www.discogs.com/sell/list?format=Vinyl`.
Screenshots: `discogs-home-desktop*`, `discogs-listing-desktop*`. Release page and all mobile views blocked.
Features observed:
- Nav: Explore Discography, Shop Music, Sell Music, Community, Digs (editorial).
- Home: monthly best-selling rail, "Most Valuable Record Sales", "Black vs Color Vinyl" editorial.
- Marketplace listing (39.5M items): facets for Ships From, Format (with counts), Format Description, Price, Condition, Seller; keyword search inside results; sort (Date Listed) with direction toggle; removable filter chips, Clear All.
- Each listing row: media and sleeve condition grades (Mint, Near Mint), seller note, "Listed 1 minute ago", seller name with feedback percent and count (100%, 54), ships-from country, price plus shipping plus estimated total, Add to Cart, link to release page.
- Account tabs: Items I Want (wantlist), Purchases, Cart, Buyer Settings.

## 3. Bleep (bleep.com)

Loaded: home `https://bleep.com/`, listing `/stream/new-warehouse-arrivals`, product `/release/621165-plug-robotic-futuristic`.
Screenshots: `bleep-home-*`, `bleep-listing-*`, `bleep-product-*` (desktop and mobile).
Features observed:
- Header utilities: Worldwide Shipping, Newsletter, Gift Vouchers, Sign In, Cart; nav Music, Merchandise, Genres, Features, Sale; search bar.
- Home: promo banner, release cards with inline "Play N of N Tracks" audio preview and format chips (LP special, CD, Download).
- Listing: "New Warehouse Arrivals" grid with format chips and track-preview per card.
- Product: one row per format and pressing (Vinyl EP Limited Coloured purple marbled, clear, black), each with its own price, Pre-order label, "Bleep Exclusive" and "Limited to 250" notes, estimated release date, Add to Cart.
- Cookie consent panel.

## 4. Banquet Records (banquetrecords.com)

Loaded: home `https://www.banquetrecords.com/`, listing `/new-in`, product `/johnny-marr/the-age-of-everything/964264742`.
Screenshots: `banquet-home-desktop*`, `banquet-listing-desktop*`, `banquet-product-desktop*`. Mobile blocked.
Features observed:
- Nav: Indie/Alt, Punk/Rock, Dance, Events, New In, Pre-Orders; search; login/register; cart.
- Home: "This week at Banquet" editorial blurb, Featured Releases, upcoming in-store events carousel, mailout and WhatsApp channel links.
- New In page: date sidebar (Today plus last 9 days), cards with badges SIGNED, RSD 2026, BACK IN STOCK, format line (CD | LP), label.
- Product: price table with a row per variant (LP black GBP 26.99, CD, LP red Indies Exclusive, signed copies), Add to Cart and Buy Now per row, "0 left / Sorry - sold out" state, "Notify me when this item is released / available", per-customer purchase limit note, numbered tracklist, item code, label, tags, release-info date, description with artist quote.

## 5. Amoeba Music (amoeba.com)

Loaded: home `https://www.amoeba.com/`, listing `/music/new-releases/`, product `/music/album/4498772`.
Screenshots: `amoeba-home-desktop*`, `amoeba-listing-desktop*`, `amoeba-product-desktop*`. Mobile blocked.
Features observed:
- Free US shipping banner, scoped search (All, Artists, Albums, DVDs, Labels), email alerts button, gift certificates, accessibility widget.
- Nav: Music, Movies, Merch, Live at Amoeba, What's In My Bag?, Our Stores. Home modules: Music We Like (staff picks), What's New, New Releases tabs (Vinyl, CD, Movies), Amoeba Exclusive color vinyl, "Sell Us Your Vinyl".
- Listing: genre sidebar (about 28 genres), filter Out Now vs Upcoming, filter by format (10", 12", 7", 78, Amoeba Exclusive, Cassette, CD, Download, Generic, LP), sort (Release Date) plus "recommends" toggle, week selector, listing vs image view toggle, pagination, add-to-list icon and Buy button per row.
- Product: PRE-ORDER badge, VINYL format badge, release date, label, genre, format, notes (limit one per customer), "Amoeba Review" blurb, Side A and Side B track table, "View all photos", "Users Also Bought" (Dig-Deeper) rail, Ships FREE in U.S., share button.

## 6. Norman Records (normanrecords.com)

Loaded: home `https://www.normanrecords.com/`, listing `/coloured-vinyl`, product `/records/218687-the-fall-fall-in-a-hole`.
Screenshots: `norman-home-desktop*`, `norman-listing-desktop*`, `norman-product-desktop*`. Mobile blocked.
Features observed:
- Trust strip: since 1996, NormanPoints loyalty on every order, global shipping, guaranteed packaging, email alerts for a 5 GBP voucher, Feefo Platinum award, Vinyl Price Match banner, Gift Vouchers.
- Nav: Browse, New, Reissues, Preorders, Cheap, Vouchers, Help, About, Features; search; login; cart; checkout shortcut.
- Home discovery links: New, Preorders, Reissues, Exclusives, Coloured vinyl, Cheap vinyl, Staff Picks, Bestsellers, Classic Vinyl, Daily and Weekly Update, Weekly Playlist, Album of the Week, Reissue of the Week, New Music Friday.
- Listing: "1-50 of 879 items", numbered pagination, Filters button, COLOURED VINYL badge, editorial blurbs per item.
- Product: format tabs (Vinyl Double LP), price with US-dollar conversion, Add to cart, pre-order due date, pressing description (blue vinyl, edition of 500), badges (coloured, limited edition, price match, 455 NormanPoints), Intro short/full toggle, embedded video, "More vinyl & CDs from The Fall" rail, customer reviews with "Rate or review this item", "Nobody loves me, be the 1st" (favourite), "Shop for more from" artist/label/genre links, per-artist email alerts, "Your recently viewed items", 29,500+ verified reviews.

## 7. Bandcamp (bandcamp.com)

Loaded: home `https://bandcamp.com/`, listing `/discover/all/vinyl`, product `https://brainstory1.bandcamp.com/album/shoebox-days-ep`.
Screenshots: `bandcamp-home-*`, `bandcamp-listing-*`, `bandcamp-product-*` (desktop and mobile).
Features observed:
- Nav: Digital music, Vinyl, Compact discs, Cassettes, T-shirts, Gift cards, Editorial, Radio; global search.
- Home: live "Selling right now" ticker with price and country, Bandcamp Daily editorial, Bandcamp Friday countdown banner.
- Discover listing: genre chips, category chips (digital, vinyl, CD, cassette, T-shirt), sort (best-selling), location filter ("artists from anywhere"), freshness filter, clear all filters, inline preview player with pressing thumbnails and track list beside the grid.
- Product: audio player with track progress, multiple vinyl variants (Black Vinyl, Limited Edition exclusive Eyeshot Blood Colored Vinyl) each with pre-order price and "ships on or around" date, digital album included, "Send as Gift", Share/Embed, Wishlist, "supported by" fan avatars, Follow artist, artist bio, shows, "more from" label link.

## 8. Turntable Lab (turntablelab.com)

Loaded: home `https://www.turntablelab.com/`, vinyl listing `/collections/vinyl-cds-date`, vinyl product `/collections/lab-of-the-moment/products/danny-brown-atrocity-exhibition-10th-anniversary-edition-colored-vinyl-vinyl-2lp-turntable-lab-exclusive`. Also loaded (gear, not records): `/collections/pro-ject-turntables`, `/products/technics-sl-1200-mk7-turntable-black`.
Screenshots: `turntablelab-home-*`, `turntablelab-vinyllisting-*`, `ttl-vinylproduct-*`, `turntablelab-listing-*`, `turntablelab-product-*` (desktop and mobile).
Features observed:
- Header: weekly newsletter link, search with exact-match tip, Rewards program, wishlist heart, account, cart total.
- Nav: Daily, Exclusives, Turntables, Stereo+Hi-Fi, Vinyl Records, DJ Gear, Merch, Pro-Ject, Guides (buyer's guides), Info. Promo: 10% off 4 or more records.
- Vinyl listing: genre chips (Rock/Indie, Electronic, Jazz, Funk/Soul, Hip-Hop, R&B, Pop, Reggae, Latin, Japan, Soundtracks), Filter drawer, "2147 results", sort (Date, new to old), per-card wishlist heart and quick-add plus button, badges (lab pick, gear specials, Sale with strikethrough price), placeholder art for items "being processed" with stock notification sign-up.
- Product: breadcrumbs, label and SKU, one-line editorial blurb, Pre-Order notice with ship month and policy link, Add to Cart plus Shop Pay Buy Now, wishlist button with count (32), "Available to order" stock line, free shipping over $99, Lab Points earn note, thumbnail gallery, live chat, accessibility widget.
- Home: "Of the moment" curated collection, TTL Exclusives pressings.

## 9. Vinyl Me Please (vinylmeplease.com) - partial

Loaded: home `https://www.vinylmeplease.com/` (desktop and mobile). Screenshots: `vmp-home-*`.
Features observed: the home page is an SMS landing ("Text VMP to (314) 300-9979 for the best damn records"), a "Get catalog drops" signup, and one featured pressing with pressing detail ("london gold" 180g, mastered at Abbey Road). The catalog link `https://go.vmp.fm/catalog` returned status 200 with an empty body, and `/collections/all` and `/pages/membership` returned 404. No listing or product page could be captured, so nothing else is claimed.

## Feature matrix

Y means observed on a loaded page. Blank means not observed (not proof of absence). Columns: RT Rough Trade, DC Discogs, BL Bleep, BQ Banquet, AM Amoeba, NR Norman, BC Bandcamp, TL Turntable Lab, VM Vinyl Me Please, SS Spiral Sounds.

| Feature | RT | DC | BL | BQ | AM | NR | BC | TL | VM | SS has it? |
|---|---|---|---|---|---|---|---|---|---|---|
| Text search | Y | Y | Y | Y | Y | Y | Y | Y |  | Y |
| Genre browse or filter | Y |  | Y | Y | Y |  | Y | Y |  | Y |
| Multi-facet filters (format, price, condition) | Y | Y |  |  | Y | Y | Y | Y |  | No |
| Sort options | Y | Y |  |  | Y |  | Y | Y |  | No |
| New arrivals by date | Y | Y | Y | Y | Y | Y | Y | Y |  | No |
| Pre-order items with ship or release date |  |  | Y | Y | Y | Y | Y | Y |  | No |
| Limited, exclusive or coloured pressing labels | Y | Y | Y | Y | Y | Y | Y | Y | Y | No |
| Variant or pressing selector on product | Y |  | Y | Y |  | Y | Y |  |  | No |
| Tracklist on product | Y |  |  | Y | Y |  | Y |  |  | No |
| Audio previews | Y |  | Y |  |  |  | Y |  |  | No |
| Embedded video on product |  |  |  |  |  | Y |  |  |  | No |
| Condition grading (Mint, NM, VG+) shown | | Y |  |  |  |  |  |  |  | Backend only |
| Seller ratings and marketplace |  | Y |  |  |  |  |  |  |  | No |
| Customer reviews on product |  |  |  |  |  | Y |  |  |  | DB only |
| Site-level trust or review badge | Y |  |  |  |  | Y |  |  |  | No |
| Wishlist or favourites |  | Y |  |  | Y | Y | Y | Y |  | DB and wantlist backend only |
| Recently viewed |  |  |  |  |  | Y |  |  |  | No |
| Related items or more from artist |  |  |  | Y | Y | Y | Y |  |  | No |
| Staff picks or editorial | Y | Y | Y | Y | Y | Y | Y | Y |  | No |
| Sold out state plus notify-me |  |  |  | Y |  |  |  | Y |  | No |
| Signed or exclusive badges |  |  | Y | Y | Y | Y | Y | Y |  | No |
| Newsletter or email alerts | Y |  | Y | Y | Y | Y |  | Y | Y | No |
| Shipping threshold or policy visible | Y |  | Y |  | Y | Y |  | Y |  | No |
| Returns info visible | Y |  |  |  |  |  |  |  |  | No |
| Loyalty or rewards points |  |  |  |  |  | Y |  | Y |  | No |
| Gift cards or vouchers |  |  | Y |  | Y | Y | Y |  |  | No |
| Buy now or quick add |  |  |  | Y |  |  |  | Y |  | No |
| Digital download option | Y |  | Y |  |  |  | Y |  |  | No |
| Used or secondhand | Y | Y |  |  | Y |  |  |  |  | No |
| Price match |  |  |  |  |  | Y |  |  |  | No |
| In-store pickup, store locator or events | Y |  |  | Y | Y |  |  |  |  | No |
| Live chat or accessibility widget | Y |  |  |  | Y |  |  | Y |  | No |
| Multi-currency or language | Y |  |  |  |  |  |  |  |  | No |
| Pagination or result counts |  | Y |  |  | Y | Y |  | Y |  | No |
| Cart | Y | Y | Y | Y | Y | Y |  | Y |  | Y |
| Account login | Y | Y | Y | Y | Y | Y | Y | Y |  | Y (with 2FA) |
| Admin analytics dashboard | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Y |

Not verified anywhere: cart drawer behaviour (carts were not opened), recently viewed on sites other than Norman, tracklists on Bleep and Norman product pages below the loaded fold.

## Blocked

- Juno Records (`https://www.juno.co.uk/`): blocked, Cloudflare "Just a moment..." (HTTP 403) on desktop and mobile. No screenshots kept, no features claimed.
- Discogs release page (`/release/5077187-Massive-Attack-Mezzanine`, `/release/38376567-Funkadelic-Maggot-Brain`): blocked, 403 challenge and a screenshot timeout. Discogs mobile blocked for every URL.
- Mobile views blocked by Cloudflare (403 "Attention Required" or "Just a moment") for: Rough Trade, Discogs, Banquet, Amoeba, Norman. Those challenge captures were deleted. Mobile screenshots exist only for Bleep, Bandcamp, Turntable Lab, Vinyl Me Please.
- Vinyl Me Please catalog and product pages: not reachable (empty body at go.vmp.fm/catalog, 404s on guessed Shopify paths). Home page only.
- Rough Trade product `/en-us/product/supertramp/breakfast-in-america-5` returned 404; replaced with The Fall product above.
- WebFetch returned 403 for Rough Trade, Juno, Norman, Banquet, Amoeba; URLs were found by dumping links from the live browser instead.

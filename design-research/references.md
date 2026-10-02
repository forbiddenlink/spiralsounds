# Design references for the Spiral Sounds redesign

Researched 2026-10-02. All screenshots are of the live sites, taken with headless Chromium into `screenshots/references/` as `<name>-desktop.jpg`, `<name>-desktop-full.jpg`, `<name>-mobile.jpg`. Observations below come from the desktop first-fold screenshots (and the full-page shot for Symbol Audio and GANNI). I did not scroll-test motion; motion notes are marked "implied" where the fold suggests it. Screenshots were converted to JPEG (quality 78, full-page shots cropped at 6000px) to keep the repo small.

Source caveats: Awwwards category pages loaded and are the primary source. The Godly and SiteInspire listing pages were not fetchable (Godly redirects to recent.design, SiteInspire returned HTTP 429, Land-book category pages hit a bot challenge except the home feed). Godly and SiteInspire entries were found through search results for individual gallery pages. Live URLs were confirmed by loading the site and checking the page title.

## Music industry

### 1. Paul Kalkbrenner
- Live URL: https://www.paulkalkbrenner.net
- Source: Awwwards, Site of the Day (Sep 02, 2026, with Developer Award) - https://www.awwwards.com/websites/music/ (site page: https://www.awwwards.com/sites/paul-kalkbrenner)
- Industry: musician / artist site with store. In music industry.
- Screenshots: kalkbrenner-desktop.jpg, kalkbrenner-desktop-full.jpg, kalkbrenner-mobile.jpg
- Observed:
  - All-white page with one enormous black grotesque wordmark ("Paul Kalkbrenner") spanning about 80% of the width; a small photo is inserted as a "letter space" between the two words.
  - Nav is a single row of small text links top-right (Music, Tour, About, Journey, Gallery, News, Contact, Store); the monogram sits top-left. Store is just another nav item.
  - Persistent "Now playing: Time To Dance" and "Sound OFF" toggle pinned to the bottom edge, with a 2-line intro sentence centered in the bottom bar.
  - Strictly black on white, no accent color; hierarchy comes only from scale.
  - Intro and hover transitions are implied by the Awwwards element list (intro animation, hover effects), not verified.
- Steal for Spiral Sounds: a persistent "now playing" strip at the bottom plus one giant wordmark hero, so the shop feels like a listening room.

### 2. Overworld Audio
- Live URL: https://overworldaudio.com
- Source: Awwwards, Honorable Mention (Sep 06, 2026) - https://www.awwwards.com/websites/music/
- Industry: audio brand. In music industry.
- Screenshots: overworld-desktop.jpg, overworld-desktop-full.jpg, overworld-mobile.jpg
- Observed:
  - Entry gate: near-black navy field with film grain, a faint outlined geometric logo, tiny letter-spaced "OVERWORLD / AUDIO" in the center.
  - Two choices only: bordered "ENTER WITH SOUND" button bottom-center and a quiet underlined "ENTER WITHOUT SOUND" link bottom-right.
  - Type is thin, wide-tracked uppercase sans at very small size; contrast is deliberately low.
  - Only the gate was captured; interior pages were not seen.
- Steal for Spiral Sounds: the optional sound-on gate with a quiet opt-out, used once on first visit, and a grain texture over dark panels.

### 3. Byotone
- Live URL: https://byotone.com
- Source: Awwwards, listed on the music category page - https://www.awwwards.com/websites/music/ (site page: https://www.awwwards.com/sites/byotone)
- Industry: live audio sessions / wellness audio. In music industry.
- Screenshots: byotone-desktop.jpg, byotone-desktop-full.jpg, byotone-mobile.jpg
- Observed:
  - Charcoal background with a ring of fine white particles (looks like a canvas particle field) around a centered white logo.
  - Type pairing: pale-mint slab/typewriter-style serif for the headline ("EXPERIENCE A NEW AUDIO JOURNEY") over a clean geometric sans for body, plus a monospace button label.
  - Single accent color (mint green) used for headline and primary button; the secondary action "ENTER QUIETLY" is plain small caps text.
  - Same sound-on/sound-off gate pattern as Overworld.
- Steal for Spiral Sounds: the three-voice type system (display serif, grotesque body, mono for labels like catalog numbers and prices) with one accent color.

### 4. penguin.music
- Live URL: https://penguin.music
- Source: Awwwards, Honorable Mention (Sep 05, 2026) - https://www.awwwards.com/websites/music/
- Industry: music visualizer / web toy. In music industry.
- Screenshots: penguin-music-desktop.jpg, penguin-music-desktop-full.jpg, penguin-music-mobile.jpg
- Observed:
  - Full-bleed 3D scene (a penguin on a subway platform, top-down) with a violet haze and film grain; the UI floats on top.
  - One rounded pill search bar centered at the top ("search and play anything or paste a url") with source chips below (spotify, youtube, microphone).
  - Mood chips along the bottom edge (today's selection, 8-bit core, lofi beats, soulful jazz, deep work music, boiler room); lowercase throughout, white translucent pills.
  - Settings and fullscreen icons in the corners only; no navigation bar.
- Steal for Spiral Sounds: mood/genre chips as pill buttons ("deep work music"-style labels) as a discovery layer above the genre filter.

### 5. Paradigm Festival
- Live URL: https://paradigmfestival.com
- Source: Awwwards, Honorable Mention (Sep 09, 2026) - https://www.awwwards.com/websites/music/
- Industry: music festival. In music industry.
- Screenshots: paradigm-desktop.jpg, paradigm-desktop-full.jpg, paradigm-mobile.jpg
- Observed:
  - Full-bleed duotone video/photo treatment: olive-khaki base with hot pink and orange blown-out highlights; the subject is half abstracted.
  - Wordmark in an extra-wide, heavy extended sans in warm off-white, set on two staggered lines (second line indented right) with the date above in a condensed sans.
  - Only two controls: bordered "Tickets" button and a filled cream "Menu" button, top-right.
  - Staggering the headline lines is the only layout move; everything else is image.
- Steal for Spiral Sounds: a duotone/gradient-map treatment on album art for hero and hover states, so mismatched cover art feels like one set.

### 6. Symbol Audio
- Live URL: https://symbolaudio.com
- Source: Godly - https://godly.website/website/wow-page-841 (found via search; listing page not fetchable)
- Industry: vinyl and hi-fi furniture shop. Adjacent to music (audio/vinyl retail); counts as in-industry.
- Screenshots: symbol-audio-desktop.jpg, symbol-audio-desktop-full.jpg, symbol-audio-mobile.jpg
- Observed:
  - Saturated cobalt-blue page background throughout; the wordmark "Symbol" is a huge pale-grey sans that crops off the viewport edges over a hero photo of a record wall.
  - Product grid of white cards on the blue field, 3 columns, each with a small tag ("Bestseller", "Exclusive"), product name and "from $X" price; cards have generous whitespace around the object.
  - Merchandising is by editorial row, each with a conversational heading: "What's on: Bestsellers...", "Collection Highlight: USM Speakers", "New Arrival: McIntosh...".
  - Hairline rule dividers between sections; large light-weight section headings in white.
  - A small inline newsletter card ("Stay in the loop...") sits just under the hero.
  - Several product images appear blank in the full-page capture (lazy loading), so the grid is only seen at the first row.
- Steal for Spiral Sounds: editorial row headings in sentence voice ("What's on:", "New Arrival:") over a plain card grid, on a bold single-color page.

## Outside the music industry

### 7. GANNI
- Live URL: https://www.ganni.com
- Source: Land-book, Ecommerce (the first gallery feed on land-book.com) - https://land-book.com/websites/100651-ganni-designermode-taschen-und-accessoires-fur-damen-offizieller-onlineshop
- Industry: fashion e-commerce. Out of music.
- Screenshots: ganni-desktop.jpg, ganni-desktop-full.jpg, ganni-mobile.jpg
- Observed:
  - Full-bleed editorial photograph as hero (candid, off-center, a bag held in-frame), with a huge white sans wordmark overlaid bottom-left and a small campaign caption with arrow link bottom-right.
  - Thin utility header: logo left, 6 text links, search field, then icons for store locator, wishlist, account, bag. Slim promo bar above ("Welcome Offer | 15% Off Your First Purchase") with a close control.
  - Product row starts directly under the hero as grey placeholder tiles labelled "New" (lazy loaded); 4-up grid with 20px gutters.
  - Neutral palette; all color comes from photography.
- Steal for Spiral Sounds: a wide editorial hero with a campaign caption (for example "Staff pick of the week") that sits directly above a 4-up "New" product row.

### 8. Heirest
- Live URL: https://www.heirest.com
- Source: Awwwards e-commerce category - https://www.awwwards.com/websites/e-commerce/ (site page: https://www.awwwards.com/sites/heirest)
- Industry: bespoke fine jewellery. Out of music.
- Screenshots: heirest-desktop.jpg, heirest-desktop-full.jpg, heirest-mobile.jpg
- Observed:
  - Full-bleed cinematic photo/video hero of a person inspecting a ring through a loupe; subject is the craft, not the product.
  - Transparent header over the image: spaced uppercase wordmark left, four centered links (Shop, Bespoke, Our Standards, Sydney Trunk Show), utilities right (currency, search, account, bag).
  - Burgundy announcement bar with warranty and shipping promises in tracked uppercase.
  - Headline is a short sentence ("Author what others inherit.") in light-weight sans at bottom-left; a ghost-outlined "DESIGN YOURS" button bottom-right.
  - Trust copy ("Every decision yours. Every step visible.") replaces a sales message.
- Steal for Spiral Sounds: trust lines about condition grading and pressing details in the announcement bar and under the hero, because collectors buy on provenance.

### 9. KILLSTAR
- Live URL: https://www.killstar.com
- Source: Awwwards e-commerce category - https://www.awwwards.com/websites/e-commerce/ (site page: https://www.awwwards.com/sites/killstar)
- Industry: alternative fashion. Out of music (strong subculture identity, close to record-store culture).
- Screenshots: killstar-desktop.jpg, killstar-desktop-full.jpg, killstar-mobile.jpg
- Observed:
  - Strong brand world: oxblood velvet curtain hero with a blackletter-ish script logo and a thin engraved-style serif for "FLASH SALE 60% OFF".
  - Black announcement bar and nav, uppercase letter-spaced menu with the sale links in red; a diagonal "EXTRA 10% OFF" ribbon across the top-left corner.
  - Below the hero, a full-width lineup photo of six models in a single row works as a category banner.
  - Promotion is loud, but the dark palette and consistent display typeface keep it coherent.
- Steal for Spiral Sounds: a subculture-coded display face and a dark theme as a brand voice; use the corner ribbon only for a single promo.

### 10. Ring Pop
- Live URL: https://www.ringpop.com
- Source: Awwwards e-commerce category - https://www.awwwards.com/websites/e-commerce/
- Industry: confectionery brand site. Out of music.
- Screenshots: ringpop-desktop.jpg, ringpop-desktop-full.jpg, ringpop-mobile.jpg
- Observed:
  - Gigantic condensed bold sans headline in white ("PUT YOUR COLORS WHERE YOUR MOUTH IS") across a tight crop of a photo; the headline is clipped at the top by the sticky header.
  - Header: three left links, the logo centered, a red hexagonal search button and a blue "Buy Now" pill on the right; the two colored controls echo the product.
  - Cream (#fff5e8-like) section background below the hero with another huge condensed headline ("A RING FOR EVERY THING.").
  - Cookie banner sits fixed at the bottom with three buttons.
- Steal for Spiral Sounds: condensed oversized headline type and one high-contrast "Buy Now" pill that stays in the header.

### 11. Proteinbolaget
- Live URL: https://www.proteinbolaget.se
- Source: Awwwards e-commerce category - https://www.awwwards.com/websites/e-commerce/
- Industry: supplements retailer (Sweden). Out of music.
- Screenshots: proteinbolaget-desktop.jpg, proteinbolaget-desktop-full.jpg, proteinbolaget-mobile.jpg
- Observed:
  - Three-item reassurance bar at the top (fast delivery, free shipping threshold, price guarantee) with check icons.
  - Header built for search-first retail: orange square hamburger tile with the orange two-line wordmark, a wide grey search field (Sok produkt, varumarke, kategori) in the center, account/wishlist/bag icons.
  - Hero: full-bleed image of two product tubs with a "Brand of the Month" kicker, a bold headline with one phrase in orange, and an outlined button.
  - Orange is the only accent and appears in the logo, menu tile and headline emphasis.
- Steal for Spiral Sounds: a wide, labelled search field in the header that includes "product, brand, category" scope, which for a record shop reads "album, artist, genre".

### 12. Baubauwerk
- Live URL: https://baubauwerk.com
- Source: Godly - https://godly.website/website/foreignrap-125 (found via search; listing page not fetchable)
- Industry: branding and design studio (Berlin). Out of music; not a shop, so it contributes layout and type ideas only.
- Screenshots: baubauwerk-desktop.jpg, baubauwerk-desktop-full.jpg, baubauwerk-mobile.jpg
- Observed:
  - White page, centered intro paragraph set at very large size in a geometric grotesque, with key words ("identities", "websites", "graphic design", "WordPress") boxed in hairline rectangles that read as inline links.
  - Header: five evenly distributed links with the heavy bold wordmark in the exact center.
  - A single horizontal strip of small work thumbnails of varied heights runs along the bottom of the fold, like a contact sheet.
  - A small Berlin-flag-like icon above the paragraph is the only illustration.
- Steal for Spiral Sounds: a centered statement paragraph with boxed inline keywords as links ("browse jazz", "browse soul"), and a contact-sheet strip of cover thumbnails.

## Blocked

- Unimatic (https://www.unimatic.it, https://www.unimatic.com): .it showed a Chromium network error page, .com failed with a certificate error. Replaced. Source gallery was Awwwards e-commerce.
- The Blimp (SiteInspire, music / record labels): live URL guessed as theblimp.com, timed out. Replaced.
- Company Record Label (SiteInspire): live URL guess did not resolve. Replaced.
- Arstraumur (Awwwards music): arstraumur.is did not resolve.
- HOO Festival (Awwwards music): hoofestival.com did not resolve.
- Soufflet Malt (Awwwards music): timed out.
- Lujo (Awwwards e-commerce): lujo.com timed out.
- Gallery listing pages: godly.website redirects to recent.design; siteinspire.com returned 429; land-book.com category filter pages hit a bot challenge. Firecrawl had no credits.

## Patterns across the set

- Typography carries the identity. Kalkbrenner, Paradigm, Ring Pop and Symbol each use one oversized display wordmark or headline as the hero instead of a carousel.
- Dark or saturated single-color grounds are common in music (navy, charcoal, cobalt, olive duotone); the non-music shops lean on white or cream and let photography carry color.
- One accent color per site, applied to a headline phrase, a button or a logo (mint, orange, red, burgundy), never several at once.
- Minimal header with few links plus utility icons: search, account, wishlist, bag. Search is promoted to a labelled field on the retail sites (Proteinbolaget, GANNI).
- Editorial merchandising: rows are titled as sentences or campaigns ("What's on:", "Brand of the Month", "Spring/Summer collection") instead of "Products".
- Sound and presence: Kalkbrenner, Overworld and Byotone offer sound on/off up front or a persistent now-playing bar. Opt-out is always present and visually quiet.
- Mood and genre chips (penguin.music) and boxed inline keywords (Baubauwerk) make browsing feel like discovery rather than filtering.
- Trust and provenance copy sits at the top (Heirest warranty, Proteinbolaget guarantees). Applicable to condition grading for used vinyl.
- Texture adds warmth to flat colors: film grain (Overworld, penguin.music), particles (Byotone), duotone (Paradigm).
- Product cards are plain: object on white, a small tag, name, "from" price. The visual drama lives in the section around the grid, not in the card.

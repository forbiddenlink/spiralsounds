/**
 * MusicBrainz + Cover Art Archive Integration
 * Provides album art and metadata as a fallback/supplement to Discogs.
 *
 * Both APIs are free and open-source. No API key required.
 * - https://musicbrainz.org/doc/MusicBrainz_API (rate limit: 1 req/sec)
 * - https://coverartarchive.org/
 *
 * Rate limiting: MusicBrainz allows 1 request/second without authentication.
 * With a registered User-Agent they recommend still staying under 1 req/s.
 */

const MB_API = "https://musicbrainz.org/ws/2";
const CAA_API = "https://coverartarchive.org";
const USER_AGENT = "SpiralSounds/1.0 (https://spiralsounds.com)";

// Simple rate limiter: ensure at least 1100ms between requests
let lastRequestTime = 0;

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...options.headers,
    },
  });
}

// ─── Types (JSDoc) ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MBRelease
 * @property {string} id - MusicBrainz release MBID
 * @property {string} title
 * @property {string} [date] - YYYY or YYYY-MM-DD
 * @property {string} status - 'Official' | 'Promotion' | 'Bootleg'
 * @property {MBArtistCredit[]} ['artist-credit']
 * @property {MBLabelInfo[]} ['label-info']
 * @property {string} [country]
 */

/**
 * @typedef {Object} CoverArtImage
 * @property {string} image - Full-size image URL (archive.org)
 * @property {string} [small] - Thumbnail 250px
 * @property {string} [large] - Thumbnail 500px
 * @property {boolean} front
 * @property {boolean} back
 * @property {string[]} types
 */

// ─── MusicBrainz Search ───────────────────────────────────────────────────────

/**
 * Search for releases (albums) by artist and album title.
 * @param {string} artist
 * @param {string} album
 * @param {number} [limit=5]
 * @returns {Promise<MBRelease[]>}
 */
export async function searchReleases(artist, album, limit = 5) {
  const query = `release:"${album}" AND artist:"${artist}"`;
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fmt: "json",
  });

  const res = await rateLimitedFetch(`${MB_API}/release?${params}`);
  if (!res.ok) return [];

  const json = await res.json();
  return json.releases ?? [];
}

/**
 * Search for a recording (track) by ISRC or title + artist.
 * @param {string} title
 * @param {string} [artist]
 * @returns {Promise<Array>}
 */
export async function searchRecordings(title, artist) {
  let query = `recording:"${title}"`;
  if (artist) query += ` AND artist:"${artist}"`;

  const params = new URLSearchParams({ query, limit: "5", fmt: "json" });
  const res = await rateLimitedFetch(`${MB_API}/recording?${params}`);
  if (!res.ok) return [];

  const json = await res.json();
  return json.recordings ?? [];
}

// ─── Cover Art Archive ────────────────────────────────────────────────────────

/**
 * Fetch cover art images for a MusicBrainz release MBID.
 * @param {string} mbid - MusicBrainz Release ID
 * @returns {Promise<CoverArtImage[]>}
 */
export async function getCoverArt(mbid) {
  const res = await fetch(`${CAA_API}/release/${mbid}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const json = await res.json();
  return (json.images ?? []).map((img) => ({
    image: img.image,
    small: img.thumbnails?.small,
    large: img.thumbnails?.large,
    front: img.front ?? false,
    back: img.back ?? false,
    types: img.types ?? [],
  }));
}

/**
 * Get the front cover art URL for an artist + album combination.
 * Searches MusicBrainz first, then fetches from Cover Art Archive.
 * Falls back to null if nothing found.
 * @param {string} artist
 * @param {string} album
 * @returns {Promise<string | null>}
 */
export async function getFrontCoverArt(artist, album) {
  const releases = await searchReleases(artist, album, 3);

  for (const release of releases) {
    const images = await getCoverArt(release.id);
    const front = images.find((img) => img.front);
    if (front) return front.large ?? front.image;
  }

  // Try the release-group endpoint as a fallback
  if (releases.length > 0) {
    const rgRes = await rateLimitedFetch(
      `${MB_API}/release/${releases[0].id}?inc=release-groups&fmt=json`,
    );
    if (rgRes.ok) {
      const rgJson = await rgRes.json();
      const rgMbid = rgJson["release-group"]?.id;
      if (rgMbid) {
        const rgCoverRes = await fetch(`${CAA_API}/release-group/${rgMbid}`, {
          headers: { Accept: "application/json" },
        });
        if (rgCoverRes.ok) {
          const rgCoverJson = await rgCoverRes.json();
          const front = (rgCoverJson.images ?? []).find((img) => img.front);
          if (front) return front.thumbnails?.large ?? front.image;
        }
      }
    }
  }

  return null;
}

export class MusicBrainzService {
  searchReleases = searchReleases;
  searchRecordings = searchRecordings;
  getCoverArt = getCoverArt;
  getFrontCoverArt = getFrontCoverArt;
}

export default new MusicBrainzService();

/**
 * MusicBrainz API Repository
 * Free, no API key required. Rate limit: 1 req/sec.
 * Provides: artist metadata, release groups, label info, ISRCs, cover art.
 *
 * Delegates to MusicBrainzService for operations it already supports
 * (searchReleases, getCoverArt, getFrontCoverArt, searchRecordings).
 * Implements direct MB API calls for lookup operations not yet in the service.
 */

import mbService from "../services/MusicBrainzService.js";

const BASE_URL = "https://musicbrainz.org/ws/2";
const USER_AGENT = "SpiralSounds/1.0 (https://spiralsounds.com)";

// Simple rate limiter: ensure at least 1100ms between requests
let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok)
    throw new Error(`MusicBrainz error: ${res.status} ${res.statusText}`);
  return res.json();
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("fmt", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Search for releases by artist + album title.
 * Delegates to MusicBrainzService which handles rate limiting.
 * @param {string} artist
 * @param {string} album
 * @param {number} [limit=20]
 */
export async function searchReleases(artist, album, limit = 20) {
  return mbService.searchReleases(artist, album, limit);
}

/**
 * Get release details with recordings, artists, labels, and release-group.
 * @param {string} mbid - MusicBrainz release ID
 */
export async function getRelease(mbid) {
  return rateLimitedFetch(
    buildUrl(`release/${mbid}`, {
      inc: "recordings+artists+labels+release-groups",
    }),
  );
}

/**
 * Get artist info with release groups.
 * @param {string} mbid - MusicBrainz artist ID
 */
export async function getArtist(mbid) {
  return rateLimitedFetch(
    buildUrl(`artist/${mbid}`, { inc: "release-groups" }),
  );
}

/**
 * Get a release-group (canonical album) with credits and releases.
 * @param {string} mbid - MusicBrainz release-group ID
 */
export async function getReleaseGroup(mbid) {
  return rateLimitedFetch(
    buildUrl(`release-group/${mbid}`, { inc: "artist-credits+releases" }),
  );
}

/**
 * Look up releases by barcode (EAN/UPC).
 * @param {string} barcode
 * @param {number} [limit=5]
 */
export async function lookupByBarcode(barcode, limit = 5) {
  return rateLimitedFetch(
    buildUrl("release", { query: `barcode:${barcode}`, limit }),
  );
}

/**
 * Get cover art images for a release MBID.
 * Delegates to MusicBrainzService.
 * @param {string} mbid
 */
export async function getCoverArt(mbid) {
  return mbService.getCoverArt(mbid);
}

/**
 * Get the front cover art URL for artist + album.
 * Delegates to MusicBrainzService.
 * @param {string} artist
 * @param {string} album
 */
export async function getFrontCoverArt(artist, album) {
  return mbService.getFrontCoverArt(artist, album);
}

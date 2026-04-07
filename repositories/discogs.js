/**
 * Discogs API Repository
 * Thin data-access wrapper around DiscogsService.
 * Uses the `disconnect` npm client — no API key needed for public data.
 * Rate limit: 60 req/min unauthenticated, 25 req/min authenticated.
 */

import { getDiscogsService } from "../services/DiscogsService.js";

/**
 * Search Discogs catalog
 * @param {string} query - Search term (artist, title, barcode)
 * @param {Object} options - { type, format, genre, perPage, page }
 */
export async function searchCatalog(query, options = {}) {
  const discogs = getDiscogsService();
  return discogs.searchReleases({
    query,
    type: options.type || "release",
    format: options.format || "Vinyl",
    ...(options.genre && { genre: options.genre }),
    perPage: options.perPage || 20,
    page: options.page || 1,
  });
}

/**
 * Get release details (tracklist, formats, labels, etc.)
 * @param {number|string} releaseId
 */
export async function getRelease(releaseId) {
  const discogs = getDiscogsService();
  return discogs.getRelease(releaseId);
}

/**
 * Get master release (canonical version)
 * @param {number|string} masterId
 */
export async function getMaster(masterId) {
  const discogs = getDiscogsService();
  return discogs.getMasterRelease(masterId);
}

/**
 * Get price suggestions for a release from the Discogs marketplace
 * @param {number|string} releaseId
 */
export async function getPriceSuggestions(releaseId) {
  const discogs = getDiscogsService();
  return discogs.getPriceSuggestions(releaseId);
}

/**
 * Get artist details
 * @param {number|string} artistId
 */
export async function getArtist(artistId) {
  const discogs = getDiscogsService();
  return discogs.getArtist(artistId);
}

/**
 * Get artist releases
 * @param {number|string} artistId
 * @param {Object} options - { sort, sortOrder, perPage, page }
 */
export async function getArtistReleases(artistId, options = {}) {
  const discogs = getDiscogsService();
  return discogs.getArtistReleases(artistId, {
    sort: options.sort || "year",
    sortOrder: options.sortOrder || "desc",
    perPage: options.perPage || 20,
    page: options.page || 1,
  });
}

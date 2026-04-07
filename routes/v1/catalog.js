/**
 * Catalog Routes — /api/v1/catalog/*
 * Unified search and lookup combining Discogs (primary) + MusicBrainz (metadata/art).
 */

import express from "express";
import * as discogs from "../../repositories/discogs.js";
import * as musicbrainz from "../../repositories/musicbrainz.js";

export const catalogRouter = express.Router();

/**
 * GET /api/v1/catalog/search?q=&format=Vinyl&genre=Rock&page=1
 * Search Discogs catalog (primary source for vinyl)
 */
catalogRouter.get("/search", async (req, res) => {
  const { q, format, genre, page } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ success: false, error: "Query parameter q is required" });
  }

  try {
    const results = await discogs.searchCatalog(q, { format, genre, page });
    res.json({ success: true, data: results });
  } catch (err) {
    console.error("Catalog search error:", err);
    res.status(500).json({ success: false, error: "Failed to search catalog" });
  }
});

/**
 * GET /api/v1/catalog/release/:id
 * Get Discogs release details
 */
catalogRouter.get("/release/:id", async (req, res) => {
  try {
    const release = await discogs.getRelease(req.params.id);
    res.json({ success: true, data: release });
  } catch (err) {
    console.error("Get release error:", err);
    res.status(500).json({ success: false, error: "Failed to get release" });
  }
});

/**
 * GET /api/v1/catalog/release/:id/price
 * Get marketplace price suggestions for a release
 */
catalogRouter.get("/release/:id/price", async (req, res) => {
  try {
    const prices = await discogs.getPriceSuggestions(req.params.id);
    res.json({ success: true, data: prices });
  } catch (err) {
    console.error("Price suggestions error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get price suggestions" });
  }
});

/**
 * GET /api/v1/catalog/artist/:id
 * Get artist info + releases from Discogs
 */
catalogRouter.get("/artist/:id", async (req, res) => {
  try {
    const [artist, releases] = await Promise.all([
      discogs.getArtist(req.params.id),
      discogs.getArtistReleases(req.params.id),
    ]);
    res.json({ success: true, data: { artist, releases } });
  } catch (err) {
    console.error("Get artist error:", err);
    res.status(500).json({ success: false, error: "Failed to get artist" });
  }
});

/**
 * GET /api/v1/catalog/barcode/:barcode
 * Look up a record by barcode (UPC/EAN).
 * Checks MusicBrainz first, supplements with Discogs.
 */
catalogRouter.get("/barcode/:barcode", async (req, res) => {
  const { barcode } = req.params;

  try {
    const mbResults = await musicbrainz.lookupByBarcode(barcode);

    if (mbResults.releases?.length > 0) {
      const discogsSearch = await discogs.searchCatalog(barcode);
      return res.json({
        success: true,
        data: {
          source: "musicbrainz+discogs",
          musicbrainz: mbResults.releases[0],
          discogs: discogsSearch.results?.[0] ?? null,
        },
      });
    }

    const discogsResults = await discogs.searchCatalog(barcode);
    res.json({
      success: true,
      data: {
        source: "discogs",
        result: discogsResults.results?.[0] ?? null,
      },
    });
  } catch (err) {
    console.error("Barcode lookup error:", err);
    res.status(500).json({ success: false, error: "Barcode lookup failed" });
  }
});

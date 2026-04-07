/**
 * Discogs API Controller
 * Handles all Discogs-related HTTP endpoints
 */

import { getDiscogsService } from '../services/DiscogsService.js'
import { getAllGrades, getAllSleeveGrades, gradeToDiscogsLabel } from '../utils/grading.js'
import { logger } from '../middleware/errorHandler.js'

/**
 * Search Discogs releases
 */
export async function searchReleases(req, res) {
  try {
    const discogs = getDiscogsService()
    const {
      q: query,
      artist,
      title,
      format,
      genre,
      year,
      country,
      label,
      barcode,
      catno,
      page = 1,
      per_page = 25
    } = req.query

    if (!query && !artist && !title && !label && !barcode && !catno) {
      return res.status(400).json({
        success: false,
        error: 'At least one search parameter is required'
      })
    }

    const results = await discogs.searchReleases({
      query,
      artist,
      title,
      format: format || 'Vinyl',
      genre,
      year: year ? parseInt(year) : undefined,
      country,
      label,
      barcode,
      catno,
      page: parseInt(page),
      perPage: parseInt(per_page)
    })

    res.json({
      success: true,
      data: results
    })
  } catch (err) {
    logger.error('Discogs search error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to search Discogs',
      details: err.message
    })
  }
}

/**
 * Get release details
 */
export async function getRelease(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid release ID is required'
      })
    }

    const release = await discogs.getRelease(parseInt(id))

    res.json({
      success: true,
      data: release
    })
  } catch (err) {
    logger.error('Discogs get release error:', err)

    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Release not found'
      })
    }

    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get release',
      details: err.message
    })
  }
}

/**
 * Get master release details
 */
export async function getMasterRelease(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid master ID is required'
      })
    }

    const master = await discogs.getMasterRelease(parseInt(id))

    res.json({
      success: true,
      data: master
    })
  } catch (err) {
    logger.error('Discogs get master release error:', err)

    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Master release not found'
      })
    }

    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get master release',
      details: err.message
    })
  }
}

/**
 * Get versions of a master release
 */
export async function getMasterVersions(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params
    const { page = 1, per_page = 50 } = req.query

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid master ID is required'
      })
    }

    const versions = await discogs.getMasterVersions(
      parseInt(id),
      parseInt(page),
      parseInt(per_page)
    )

    res.json({
      success: true,
      data: versions
    })
  } catch (err) {
    logger.error('Discogs get master versions error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get master versions',
      details: err.message
    })
  }
}

/**
 * Get artist information
 */
export async function getArtist(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid artist ID is required'
      })
    }

    const artist = await discogs.getArtist(parseInt(id))

    res.json({
      success: true,
      data: artist
    })
  } catch (err) {
    logger.error('Discogs get artist error:', err)

    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Artist not found'
      })
    }

    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get artist',
      details: err.message
    })
  }
}

/**
 * Get artist releases
 */
export async function getArtistReleases(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params
    const { page = 1, per_page = 50, sort = 'year', sort_order = 'asc' } = req.query

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid artist ID is required'
      })
    }

    const releases = await discogs.getArtistReleases(parseInt(id), {
      page: parseInt(page),
      perPage: parseInt(per_page),
      sort,
      sortOrder: sort_order
    })

    res.json({
      success: true,
      data: releases
    })
  } catch (err) {
    logger.error('Discogs get artist releases error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get artist releases',
      details: err.message
    })
  }
}

/**
 * Search artists
 */
export async function searchArtists(req, res) {
  try {
    const discogs = getDiscogsService()
    const { q: query, page = 1, per_page = 25 } = req.query

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      })
    }

    const results = await discogs.searchArtists(query, parseInt(page), parseInt(per_page))

    res.json({
      success: true,
      data: results
    })
  } catch (err) {
    logger.error('Discogs search artists error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to search artists',
      details: err.message
    })
  }
}

/**
 * Get label information
 */
export async function getLabel(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid label ID is required'
      })
    }

    const label = await discogs.getLabel(parseInt(id))

    res.json({
      success: true,
      data: label
    })
  } catch (err) {
    logger.error('Discogs get label error:', err)

    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Label not found'
      })
    }

    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get label',
      details: err.message
    })
  }
}

/**
 * Get marketplace listings for a release
 */
export async function getMarketplaceListings(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params
    const { condition, sort, sort_order, page = 1, per_page = 25 } = req.query

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid release ID is required'
      })
    }

    // Convert our grade code to Discogs label if provided
    const discogsCondition = condition ? gradeToDiscogsLabel(condition) : undefined

    const listings = await discogs.getMarketplaceListings(parseInt(id), {
      condition: discogsCondition,
      sort,
      sortOrder: sort_order,
      page: parseInt(page),
      perPage: parseInt(per_page)
    })

    res.json({
      success: true,
      data: listings
    })
  } catch (err) {
    logger.error('Discogs get marketplace listings error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get marketplace listings',
      details: err.message
    })
  }
}

/**
 * Get price suggestions for a release
 */
export async function getPriceSuggestions(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid release ID is required'
      })
    }

    const suggestions = await discogs.getPriceSuggestions(parseInt(id))

    res.json({
      success: true,
      data: suggestions
    })
  } catch (err) {
    logger.error('Discogs get price suggestions error:', err)

    // Price suggestions may not be available for all releases
    if (err.status === 404) {
      return res.json({
        success: true,
        data: {},
        message: 'No price data available for this release'
      })
    }

    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to get price suggestions',
      details: err.message
    })
  }
}

/**
 * Get grading system reference
 */
export function getGradingSystem(req, res) {
  res.json({
    success: true,
    data: {
      mediaGrades: getAllGrades(),
      sleeveGrades: getAllSleeveGrades()
    }
  })
}

/**
 * Import release as local product
 */
export async function importRelease(req, res) {
  try {
    const discogs = getDiscogsService()
    const { id } = req.params
    const additionalData = req.body || {}

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid release ID is required'
      })
    }

    const productData = await discogs.importReleaseAsProduct(parseInt(id), additionalData)

    res.json({
      success: true,
      data: productData,
      message: 'Release data prepared for import. Use products API to create the product.'
    })
  } catch (err) {
    logger.error('Discogs import release error:', err)
    res.status(err.status || 500).json({
      success: false,
      error: 'Failed to import release',
      details: err.message
    })
  }
}

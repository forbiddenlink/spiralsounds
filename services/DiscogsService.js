/**
 * Discogs API Integration Service
 * Uses disconnect library for OAuth and API calls
 */

import Discogs from 'disconnect'
import { GRADES, discogsLabelToGrade } from '../utils/grading.js'

const DISCOGS_API_BASE = 'https://api.discogs.com'

export class DiscogsService {
  constructor(options = {}) {
    this.userAgent = 'SpiralSounds/1.0 +https://spiralsounds.com'
    this.consumerKey = options.consumerKey || process.env.DISCOGS_CONSUMER_KEY
    this.consumerSecret = options.consumerSecret || process.env.DISCOGS_CONSUMER_SECRET
    this.accessToken = options.accessToken || null
    this.accessSecret = options.accessSecret || null
    this.rateLimitRemaining = 60
    this.rateLimitReset = null

    // Initialize disconnect client
    this.client = null
    this.db = null
    this.user = null
    this.collection = null
    this.wantlist = null
    this.marketplace = null
  }

  /**
   * Initialize the Discogs client with OAuth credentials
   */
  initialize() {
    if (this.client) return this.client

    const config = {
      userAgent: this.userAgent
    }

    if (this.consumerKey && this.consumerSecret) {
      config.consumerKey = this.consumerKey
      config.consumerSecret = this.consumerSecret
    }

    if (this.accessToken && this.accessSecret) {
      config.accessToken = this.accessToken
      config.accessTokenSecret = this.accessSecret
    }

    this.client = new Discogs.Client(config)
    this.db = this.client.database()
    this.user = this.client.user()
    this.marketplace = this.client.marketplace()

    return this.client
  }

  /**
   * Set OAuth tokens after authentication
   */
  setOAuthTokens(accessToken, accessSecret) {
    this.accessToken = accessToken
    this.accessSecret = accessSecret
    this.client = null // Reset to reinitialize with new tokens
    this.initialize()
  }

  /**
   * Get OAuth request token for authorization flow
   */
  async getRequestToken(callbackUrl) {
    const oauth = new Discogs.Client(this.userAgent).oauth()
    return new Promise((resolve, reject) => {
      oauth.getRequestToken(this.consumerKey, this.consumerSecret, callbackUrl, (err, requestData) => {
        if (err) reject(err)
        else resolve(requestData)
      })
    })
  }

  /**
   * Exchange request token for access token
   */
  async getAccessToken(requestToken, requestSecret, verifier) {
    const oauth = new Discogs.Client(this.userAgent).oauth()
    return new Promise((resolve, reject) => {
      oauth.getAccessToken(requestToken, requestSecret, verifier, (err, accessData) => {
        if (err) reject(err)
        else resolve(accessData)
      })
    })
  }

  /**
   * Get authenticated user identity
   */
  async getIdentity() {
    this.initialize()
    return new Promise((resolve, reject) => {
      this.client.getIdentity((err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  /**
   * Build headers for direct API requests
   */
  getHeaders() {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'application/vnd.discogs.v2.discogs+json'
    }

    if (this.consumerKey && this.consumerSecret) {
      headers['Authorization'] = `Discogs key=${this.consumerKey}, secret=${this.consumerSecret}`
    }

    return headers
  }

  /**
   * Handle rate limiting from Discogs API
   */
  updateRateLimits(response) {
    const remaining = response.headers?.get?.('x-discogs-ratelimit-remaining')
    const reset = response.headers?.get?.('x-discogs-ratelimit-reset')

    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10)
    }
    if (reset) {
      this.rateLimitReset = new Date(parseInt(reset, 10) * 1000)
    }
  }

  /**
   * Wait if rate limited
   */
  async checkRateLimit() {
    if (this.rateLimitRemaining <= 0 && this.rateLimitReset) {
      const waitTime = this.rateLimitReset.getTime() - Date.now()
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime + 100))
      }
    }
  }

  /**
   * Make a direct request to Discogs API (fallback)
   */
  async request(endpoint, options = {}) {
    await this.checkRateLimit()

    const url = `${DISCOGS_API_BASE}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    })

    this.updateRateLimits(response)

    if (!response.ok) {
      const error = new Error(`Discogs API error: ${response.status}`)
      error.status = response.status
      error.response = await response.json().catch(() => null)
      throw error
    }

    return response.json()
  }

  /**
   * Search for releases on Discogs
   * @param {Object} params - Search parameters
   */
  async searchReleases(params = {}) {
    this.initialize()

    const searchParams = {
      type: 'release',
      format: params.format || 'Vinyl',
      page: params.page || 1,
      per_page: params.perPage || 25
    }

    if (params.query) searchParams.q = params.query
    if (params.artist) searchParams.artist = params.artist
    if (params.title) searchParams.release_title = params.title
    if (params.genre) searchParams.genre = params.genre
    if (params.year) searchParams.year = params.year
    if (params.country) searchParams.country = params.country
    if (params.label) searchParams.label = params.label
    if (params.barcode) searchParams.barcode = params.barcode
    if (params.catno) searchParams.catno = params.catno

    return new Promise((resolve, reject) => {
      this.db.search(searchParams, (err, data) => {
        if (err) reject(err)
        else resolve({
          results: data.results.map(this.normalizeRelease),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Get release details by Discogs ID
   */
  async getRelease(releaseId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getRelease(releaseId, (err, data) => {
        if (err) reject(err)
        else resolve(this.normalizeReleaseDetails(data))
      })
    })
  }

  /**
   * Get master release (canonical version)
   */
  async getMasterRelease(masterId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getMaster(masterId, (err, data) => {
        if (err) reject(err)
        else resolve(this.normalizeMasterRelease(data))
      })
    })
  }

  /**
   * Get all versions of a master release
   */
  async getMasterVersions(masterId, page = 1, perPage = 50) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getMasterVersions(masterId, { page, per_page: perPage }, (err, data) => {
        if (err) reject(err)
        else resolve({
          versions: data.versions.map(this.normalizeVersion),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Get marketplace listings for a release
   */
  async getMarketplaceListings(releaseId, options = {}) {
    const params = new URLSearchParams()
    params.set('status', 'For Sale')
    if (options.condition) params.set('condition', options.condition)
    if (options.sort) params.set('sort', options.sort)
    if (options.sortOrder) params.set('sort_order', options.sortOrder)
    params.set('page', (options.page || 1).toString())
    params.set('per_page', (options.perPage || 25).toString())

    const data = await this.request(`/marketplace/listings?release_id=${releaseId}&${params}`)

    return {
      listings: data.listings.map(this.normalizeMarketplaceListing),
      pagination: data.pagination
    }
  }

  /**
   * Get price suggestions for a release
   */
  async getPriceSuggestions(releaseId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.marketplace.getPriceSuggestions(releaseId, (err, data) => {
        if (err) reject(err)
        else resolve(this.normalizePriceSuggestions(data))
      })
    })
  }

  /**
   * Get artist information
   */
  async getArtist(artistId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getArtist(artistId, (err, data) => {
        if (err) reject(err)
        else resolve(this.normalizeArtist(data))
      })
    })
  }

  /**
   * Get artist releases
   */
  async getArtistReleases(artistId, options = {}) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getArtistReleases(artistId, {
        page: options.page || 1,
        per_page: options.perPage || 50,
        sort: options.sort || 'year',
        sort_order: options.sortOrder || 'asc'
      }, (err, data) => {
        if (err) reject(err)
        else resolve({
          releases: data.releases.map(this.normalizeArtistRelease),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Search for artists
   */
  async searchArtists(query, page = 1, perPage = 25) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.search({ q: query, type: 'artist', page, per_page: perPage }, (err, data) => {
        if (err) reject(err)
        else resolve({
          results: data.results.map(this.normalizeArtistSearchResult),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Get label information
   */
  async getLabel(labelId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.db.getLabel(labelId, (err, data) => {
        if (err) reject(err)
        else resolve(this.normalizeLabel(data))
      })
    })
  }

  /**
   * Get user collection (requires OAuth)
   */
  async getUserCollection(username, folderId = 0, options = {}) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.collection().getReleases(username, folderId, {
        page: options.page || 1,
        per_page: options.perPage || 50,
        sort: options.sort || 'added',
        sort_order: options.sortOrder || 'desc'
      }, (err, data) => {
        if (err) reject(err)
        else resolve({
          releases: data.releases.map(this.normalizeCollectionRelease),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Get collection folders (requires OAuth)
   */
  async getCollectionFolders(username) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.collection().getFolders(username, (err, data) => {
        if (err) reject(err)
        else resolve(data.folders)
      })
    })
  }

  /**
   * Add release to collection (requires OAuth)
   */
  async addToCollection(username, folderId, releaseId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.collection().addRelease(username, folderId, releaseId, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  /**
   * Remove release from collection (requires OAuth)
   */
  async removeFromCollection(username, folderId, releaseId, instanceId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.collection().removeRelease(username, folderId, releaseId, instanceId, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  /**
   * Get user wantlist (requires OAuth)
   */
  async getUserWantlist(username, options = {}) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.wantlist().getReleases(username, {
        page: options.page || 1,
        per_page: options.perPage || 50
      }, (err, data) => {
        if (err) reject(err)
        else resolve({
          wants: data.wants.map(this.normalizeWantlistItem),
          pagination: data.pagination
        })
      })
    })
  }

  /**
   * Add release to wantlist (requires OAuth)
   */
  async addToWantlist(username, releaseId, notes = '', rating = 0) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.wantlist().addRelease(username, releaseId, { notes, rating }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  /**
   * Remove release from wantlist (requires OAuth)
   */
  async removeFromWantlist(username, releaseId) {
    this.initialize()

    return new Promise((resolve, reject) => {
      this.user.wantlist().removeRelease(username, releaseId, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }

  // ========== NORMALIZATION METHODS ==========

  /**
   * Normalize release from search results
   */
  normalizeRelease(release) {
    return {
      discogsId: release.id,
      type: release.type,
      title: release.title,
      year: release.year,
      country: release.country,
      format: release.format?.join(', '),
      formatDetails: release.format,
      label: release.label?.join(', '),
      labelDetails: release.label,
      genre: release.genre?.join(', '),
      genres: release.genre,
      style: release.style?.join(', '),
      styles: release.style,
      coverImage: release.cover_image,
      thumbnail: release.thumb,
      masterId: release.master_id,
      resourceUrl: release.resource_url,
      uri: release.uri
    }
  }

  /**
   * Normalize full release details
   */
  normalizeReleaseDetails(release) {
    return {
      discogsId: release.id,
      title: release.title,
      artistsSort: release.artists_sort,
      artists: release.artists?.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        anv: a.anv,
        join: a.join,
        tracks: a.tracks
      })),
      extraArtists: release.extraartists?.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role
      })),
      year: release.year,
      country: release.country,
      released: release.released,
      releasedFormatted: release.released_formatted,
      labels: release.labels?.map(l => ({
        id: l.id,
        name: l.name,
        catno: l.catno,
        entityType: l.entity_type,
        resourceUrl: l.resource_url
      })),
      series: release.series?.map(s => ({
        id: s.id,
        name: s.name,
        catno: s.catno
      })),
      companies: release.companies?.map(c => ({
        id: c.id,
        name: c.name,
        catno: c.catno,
        entityType: c.entity_type,
        entityTypeName: c.entity_type_name
      })),
      formats: release.formats?.map(f => ({
        name: f.name,
        qty: f.qty,
        text: f.text,
        descriptions: f.descriptions
      })),
      genres: release.genres,
      styles: release.styles,
      tracklist: release.tracklist?.map(t => ({
        position: t.position,
        type: t.type_,
        title: t.title,
        duration: t.duration,
        artists: t.artists?.map(a => ({ id: a.id, name: a.name })),
        extraArtists: t.extraartists?.map(a => ({ id: a.id, name: a.name, role: a.role }))
      })),
      identifiers: release.identifiers?.map(i => ({
        type: i.type,
        value: i.value,
        description: i.description
      })),
      videos: release.videos?.map(v => ({
        uri: v.uri,
        title: v.title,
        description: v.description,
        duration: v.duration,
        embed: v.embed
      })),
      images: release.images?.map(i => ({
        type: i.type,
        uri: i.uri,
        uri150: i.uri150,
        width: i.width,
        height: i.height
      })),
      notes: release.notes,
      dataQuality: release.data_quality,
      community: {
        rating: release.community?.rating?.average,
        ratingCount: release.community?.rating?.count,
        have: release.community?.have,
        want: release.community?.want,
        contributors: release.community?.contributors,
        submitter: release.community?.submitter?.username
      },
      lowestPrice: release.lowest_price,
      numForSale: release.num_for_sale,
      masterId: release.master_id,
      masterUrl: release.master_url,
      uri: release.uri,
      resourceUrl: release.resource_url,
      dateAdded: release.date_added,
      dateChanged: release.date_changed
    }
  }

  /**
   * Normalize master release
   */
  normalizeMasterRelease(master) {
    return {
      discogsId: master.id,
      title: master.title,
      mainRelease: master.main_release,
      mainReleaseUrl: master.main_release_url,
      versionsUrl: master.versions_url,
      numVersions: master.num_for_sale,
      artists: master.artists?.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role
      })),
      genres: master.genres,
      styles: master.styles,
      year: master.year,
      images: master.images?.map(i => ({
        type: i.type,
        uri: i.uri,
        uri150: i.uri150
      })),
      tracklist: master.tracklist?.map(t => ({
        position: t.position,
        title: t.title,
        duration: t.duration
      })),
      videos: master.videos?.map(v => ({
        uri: v.uri,
        title: v.title,
        duration: v.duration
      })),
      lowestPrice: master.lowest_price,
      numForSale: master.num_for_sale,
      dataQuality: master.data_quality,
      uri: master.uri,
      resourceUrl: master.resource_url
    }
  }

  /**
   * Normalize version from master versions list
   */
  normalizeVersion(version) {
    return {
      id: version.id,
      title: version.title,
      format: version.format,
      label: version.label,
      catno: version.catno,
      country: version.country,
      released: version.released,
      thumbnail: version.thumb,
      status: version.status
    }
  }

  /**
   * Normalize marketplace listing
   */
  normalizeMarketplaceListing(listing) {
    return {
      id: listing.id,
      status: listing.status,
      condition: listing.condition,
      conditionGrade: discogsLabelToGrade(listing.condition),
      sleeveCondition: listing.sleeve_condition,
      sleeveConditionGrade: discogsLabelToGrade(listing.sleeve_condition),
      price: {
        value: listing.price?.value,
        currency: listing.price?.currency
      },
      originalPrice: listing.original_price,
      shippingPrice: listing.shipping_price,
      allowOffers: listing.allow_offers,
      comments: listing.comments,
      seller: {
        id: listing.seller?.id,
        username: listing.seller?.username,
        rating: listing.seller?.stats?.rating,
        numRatings: listing.seller?.stats?.total,
        minOrderTotal: listing.seller?.min_order_total
      },
      posted: listing.posted,
      releaseId: listing.release?.id,
      releaseTitle: listing.release?.description,
      uri: listing.uri
    }
  }

  /**
   * Normalize price suggestions
   */
  normalizePriceSuggestions(suggestions) {
    const normalized = {}

    for (const grade of Object.values(GRADES)) {
      if (suggestions[grade.discogsLabel]) {
        normalized[grade.code] = {
          value: suggestions[grade.discogsLabel].value,
          currency: suggestions[grade.discogsLabel].currency,
          label: grade.label
        }
      }
    }

    return normalized
  }

  /**
   * Normalize artist data
   */
  normalizeArtist(artist) {
    return {
      discogsId: artist.id,
      name: artist.name,
      realName: artist.realname,
      profile: artist.profile,
      nameVariations: artist.namevariations,
      aliases: artist.aliases?.map(a => ({ id: a.id, name: a.name })),
      urls: artist.urls,
      images: artist.images?.map(i => ({
        type: i.type,
        uri: i.uri,
        uri150: i.uri150
      })),
      members: artist.members?.map(m => ({
        id: m.id,
        name: m.name,
        active: m.active
      })),
      groups: artist.groups?.map(g => ({
        id: g.id,
        name: g.name,
        active: g.active
      })),
      dataQuality: artist.data_quality,
      uri: artist.uri,
      resourceUrl: artist.resource_url,
      releasesUrl: artist.releases_url
    }
  }

  /**
   * Normalize artist release
   */
  normalizeArtistRelease(release) {
    return {
      id: release.id,
      type: release.type,
      title: release.title,
      artist: release.artist,
      role: release.role,
      format: release.format,
      label: release.label,
      year: release.year,
      thumb: release.thumb,
      status: release.status
    }
  }

  /**
   * Normalize artist search result
   */
  normalizeArtistSearchResult(result) {
    return {
      discogsId: result.id,
      type: result.type,
      title: result.title,
      thumbnail: result.thumb,
      coverImage: result.cover_image,
      uri: result.uri
    }
  }

  /**
   * Normalize label data
   */
  normalizeLabel(label) {
    return {
      discogsId: label.id,
      name: label.name,
      profile: label.profile,
      contactInfo: label.contact_info,
      parentLabel: label.parent_label ? {
        id: label.parent_label.id,
        name: label.parent_label.name
      } : null,
      subLabels: label.sublabels?.map(s => ({
        id: s.id,
        name: s.name
      })),
      urls: label.urls,
      images: label.images?.map(i => ({
        type: i.type,
        uri: i.uri,
        uri150: i.uri150
      })),
      dataQuality: label.data_quality,
      uri: label.uri,
      resourceUrl: label.resource_url,
      releasesUrl: label.releases_url
    }
  }

  /**
   * Normalize collection release
   */
  normalizeCollectionRelease(item) {
    return {
      instanceId: item.instance_id,
      folderId: item.folder_id,
      rating: item.rating,
      dateAdded: item.date_added,
      notes: item.notes,
      release: {
        id: item.basic_information?.id,
        title: item.basic_information?.title,
        year: item.basic_information?.year,
        thumb: item.basic_information?.thumb,
        coverImage: item.basic_information?.cover_image,
        artists: item.basic_information?.artists?.map(a => ({
          id: a.id,
          name: a.name
        })),
        labels: item.basic_information?.labels?.map(l => ({
          id: l.id,
          name: l.name,
          catno: l.catno
        })),
        formats: item.basic_information?.formats?.map(f => ({
          name: f.name,
          qty: f.qty,
          descriptions: f.descriptions
        })),
        genres: item.basic_information?.genres,
        styles: item.basic_information?.styles
      }
    }
  }

  /**
   * Normalize wantlist item
   */
  normalizeWantlistItem(item) {
    return {
      id: item.id,
      rating: item.rating,
      notes: item.notes,
      dateAdded: item.date_added,
      release: {
        id: item.basic_information?.id,
        title: item.basic_information?.title,
        year: item.basic_information?.year,
        thumb: item.basic_information?.thumb,
        coverImage: item.basic_information?.cover_image,
        artists: item.basic_information?.artists?.map(a => ({
          id: a.id,
          name: a.name
        })),
        labels: item.basic_information?.labels?.map(l => ({
          id: l.id,
          name: l.name,
          catno: l.catno
        })),
        formats: item.basic_information?.formats,
        genres: item.basic_information?.genres,
        styles: item.basic_information?.styles
      }
    }
  }

  /**
   * Import release data into local product format
   */
  async importReleaseAsProduct(releaseId, additionalData = {}) {
    const release = await this.getRelease(releaseId)
    let priceSuggestions = null

    try {
      priceSuggestions = await this.getPriceSuggestions(releaseId)
    } catch {
      // Price suggestions may not be available
    }

    // Get suggested price based on NM condition or lowest available
    let suggestedPrice = release.lowestPrice
    if (priceSuggestions?.NM) {
      suggestedPrice = priceSuggestions.NM.value
    }

    return {
      title: release.title,
      artist: release.artistsSort,
      genre: release.genres?.[0] || 'Unknown',
      year: release.year,
      description: release.notes || `${release.title} by ${release.artistsSort}`,
      image: release.images?.[0]?.uri || additionalData.image,
      price: additionalData.price || suggestedPrice || 29.99,
      stock: additionalData.stock || 1,
      // Discogs metadata
      discogs_id: release.discogsId,
      discogs_master_id: release.masterId,
      label: release.labels?.[0]?.name,
      catalog_number: release.labels?.[0]?.catno,
      format: release.formats?.[0]?.name,
      format_details: release.formats?.[0]?.descriptions?.join(', '),
      country: release.country,
      released: release.releasedFormatted,
      styles: release.styles?.join(', '),
      tracklist: JSON.stringify(release.tracklist),
      community_rating: release.community?.rating,
      community_have: release.community?.have,
      community_want: release.community?.want,
      ...additionalData
    }
  }
}

// Singleton instance
let discogsService = null

export function getDiscogsService(options = {}) {
  if (!discogsService || Object.keys(options).length > 0) {
    discogsService = new DiscogsService(options)
  }
  return discogsService
}

export default DiscogsService

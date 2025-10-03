/**
 * Base Repository class with common database operations
 */
import { getDBConnection } from '../db/db.js'
import { DatabaseError, NotFoundError } from '../utils/errors.js'
import { logger } from '../middleware/errorHandler.js'

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName
  }

  /**
   * Get database connection with error handling
   */
  async getDB() {
    try {
      return await getDBConnection()
    } catch (error) {
      logger.error(`Database connection failed: ${error.message}`)
      throw new DatabaseError('Database connection failed', error)
    }
  }

  /**
   * Execute a query with error handling
   */
  async executeQuery(query, params = []) {
    try {
      const db = await this.getDB()
      return await db.all(query, params)
    } catch (error) {
      logger.error(`Query execution failed: ${error.message}`, { query, params })
      throw new DatabaseError('Query execution failed', error)
    }
  }

  /**
   * Execute a single query (get one result)
   */
  async executeGetQuery(query, params = []) {
    try {
      const db = await this.getDB()
      return await db.get(query, params)
    } catch (error) {
      logger.error(`Get query execution failed: ${error.message}`, { query, params })
      throw new DatabaseError('Query execution failed', error)
    }
  }

  /**
   * Execute a run query (INSERT, UPDATE, DELETE)
   */
  async executeRunQuery(query, params = []) {
    try {
      const db = await this.getDB()
      return await db.run(query, params)
    } catch (error) {
      logger.error(`Run query execution failed: ${error.message}`, { query, params })
      throw new DatabaseError('Query execution failed', error)
    }
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`
    return await this.executeGetQuery(query, [id])
  }

  /**
   * Find record by ID or throw NotFoundError
   */
  async findByIdOrFail(id, resourceName = 'Record') {
    const record = await this.findById(id)
    if (!record) {
      throw new NotFoundError(resourceName, id)
    }
    return record
  }

  /**
   * Find all records
   */
  async findAll(limit = null, offset = 0) {
    let query = `SELECT * FROM ${this.tableName}`
    const params = []

    if (limit) {
      query += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }

    return await this.executeQuery(query, params)
  }

  /**
   * Count total records
   */
  async count(whereClause = '', params = []) {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`
    const result = await this.executeGetQuery(query, params)
    return result.count
  }

  /**
   * Create a new record
   */
  async create(data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')
    
    const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`
    const result = await this.executeRunQuery(query, values)
    
    return {
      id: result.lastID,
      ...data
    }
  }

  /**
   * Update a record by ID
   */
  async updateById(id, data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map(key => `${key} = ?`).join(', ')
    
    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`
    const result = await this.executeRunQuery(query, [...values, id])
    
    if (result.changes === 0) {
      throw new NotFoundError(this.tableName.slice(0, -1), id) // Remove 's' from table name
    }
    
    return result
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`
    const result = await this.executeRunQuery(query, [id])
    
    if (result.changes === 0) {
      throw new NotFoundError(this.tableName.slice(0, -1), id)
    }
    
    return result
  }

  /**
   * Check if record exists
   */
  async exists(id) {
    const query = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`
    const result = await this.executeGetQuery(query, [id])
    return !!result
  }

  /**
   * Find records with custom where clause
   */
  async findWhere(whereClause, params = [], limit = null, offset = 0) {
    let query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`
    const queryParams = [...params]

    if (limit) {
      query += ' LIMIT ? OFFSET ?'
      queryParams.push(limit, offset)
    }

    return await this.executeQuery(query, queryParams)
  }

  /**
   * Find single record with custom where clause
   */
  async findOneWhere(whereClause, params = []) {
    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`
    return await this.executeGetQuery(query, params)
  }
}
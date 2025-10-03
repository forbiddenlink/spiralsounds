import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'node:path'
import { logger } from '../middleware/errorHandler.js'

export class DatabaseMigrator {
  constructor() {
    this.dbPath = process.env.DB_PATH || './database.db'
  }

  async getConnection() {
    return open({
      filename: this.dbPath,
      driver: sqlite3.Database
    })
  }

  async createMigrationsTable() {
    const db = await this.getConnection()

    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.close()
  }

  async hasRun(migrationName) {
    const db = await this.getConnection()
    const result = await db.get('SELECT 1 FROM migrations WHERE name = ?', [migrationName])
    await db.close()
    return !!result
  }

  async markAsRun(migrationName) {
    const db = await this.getConnection()
    await db.run('INSERT INTO migrations (name) VALUES (?)', [migrationName])
    await db.close()
  }

  async runMigration(name, migrationFunction) {
    await this.createMigrationsTable()

    if (await this.hasRun(name)) {
      logger.info(`Migration ${name} already executed, skipping`)
      return
    }

    logger.info(`Running migration: ${name}`)

    try {
      await migrationFunction()
      await this.markAsRun(name)
      logger.info(`Migration ${name} completed successfully`)
    } catch (error) {
      logger.error(`Migration ${name} failed:`, error)
      throw error
    }
  }

  async runAllMigrations() {
    // First create the base users table if it doesn't exist
    await this.createBaseTables()
    
    const migrations = [
      { name: '001_add_user_fields', fn: this.addUserFields.bind(this) },
      { name: '002_create_refresh_tokens', fn: this.createRefreshTokensTable.bind(this) },
      { name: '003_create_password_resets', fn: this.createPasswordResetsTable.bind(this) },
      { name: '004_add_product_fields', fn: this.addProductFields.bind(this) },
      { name: '005_create_reviews', fn: this.createReviewsTable.bind(this) },
      { name: '006_create_wishlists', fn: this.createWishlistTable.bind(this) },
      { name: '007_add_cart_timestamps', fn: this.addCartTimestamps.bind(this) },
      { name: '008_create_search_analytics', fn: this.createSearchAnalyticsTable.bind(this) },
      { name: '009_add_oauth_2fa', fn: this.addOAuthAnd2FA.bind(this) },
      { name: '010_add_rbac_support', fn: this.addRBACSupport.bind(this) }
    ]

    for (const migration of migrations) {
      await this.runMigration(migration.name, migration.fn)
    }
  }

  async createBaseTables() {
    const db = await this.getConnection()
    
    try {
      // Create users table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create products table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          genre TEXT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          image TEXT,
          year INTEGER,
          description TEXT
        )
      `)

      // Create cart_items table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `)

      await db.close()
    } catch (error) {
      await db.close()
      throw error
    }
  }

  // Migration 001: Add fields to users table
  async addUserFields() {
    const db = await this.getConnection()

    try {
      // Check if columns exist before adding them
      const tableInfo = await db.all("PRAGMA table_info(users)")
      const existingColumns = tableInfo.map(col => col.name)

      const columnsToAdd = [
        { name: 'email_verification_token', sql: 'ALTER TABLE users ADD COLUMN email_verification_token TEXT' },
        { name: 'is_verified', sql: 'ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE' },
        { name: 'created_at', sql: 'ALTER TABLE users ADD COLUMN created_at DATETIME' },
        { name: 'last_login', sql: 'ALTER TABLE users ADD COLUMN last_login DATETIME' },
        { name: 'avatar_url', sql: 'ALTER TABLE users ADD COLUMN avatar_url TEXT' }
      ]

      for (const column of columnsToAdd) {
        if (!existingColumns.includes(column.name)) {
          await db.exec(column.sql)
          logger.info(`Added column ${column.name} to users table`)
        }
      }

    } finally {
      await db.close()
    }
  }

  // Migration 002: Create refresh tokens table
  async createRefreshTokensTable() {
    const db = await this.getConnection()

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `)

      await db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)')

    } finally {
      await db.close()
    }
  }

  // Migration 003: Create password resets table
  async createPasswordResetsTable() {
    const db = await this.getConnection()

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `)

      await db.exec('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at)')

    } finally {
      await db.close()
    }
  }

  // Migration 004: Add fields to products table
  async addProductFields() {
    const db = await this.getConnection()

    try {
      const tableInfo = await db.all("PRAGMA table_info(products)")
      const existingColumns = tableInfo.map(col => col.name)

      const columnsToAdd = [
        { name: 'description', sql: 'ALTER TABLE products ADD COLUMN description TEXT' },
        { name: 'created_at', sql: 'ALTER TABLE products ADD COLUMN created_at DATETIME' },
        { name: 'updated_at', sql: 'ALTER TABLE products ADD COLUMN updated_at DATETIME' }
      ]

      for (const column of columnsToAdd) {
        if (!existingColumns.includes(column.name)) {
          await db.exec(column.sql)
          logger.info(`Added column ${column.name} to products table`)
        }
      }

    } finally {
      await db.close()
    }
  }

  // Migration 005: Create reviews table
  async createReviewsTable() {
    const db = await this.getConnection()

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(user_id, product_id)
        )
      `)

      await db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)')

    } finally {
      await db.close()
    }
  }

  // Migration 006: Create wishlist table
  async createWishlistTable() {
    const db = await this.getConnection()

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS wishlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(user_id, product_id)
        )
      `)

      await db.exec('CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)')

    } finally {
      await db.close()
    }
  }

  // Migration 007: Add timestamps to cart_items table
  async addCartTimestamps() {
    const db = await this.getConnection()

    try {
      // Check if column exists before adding it
      const tableInfo = await db.all("PRAGMA table_info(cart_items)")
      const existingColumns = tableInfo.map(col => col.name)

      if (!existingColumns.includes('created_at')) {
        // Add column without default value (SQLite limitation)
        await db.exec('ALTER TABLE cart_items ADD COLUMN created_at DATETIME')
        logger.info('Added created_at column to cart_items table')
        
        // Set default values for existing rows
        await db.exec(`UPDATE cart_items SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`)
      }

      if (!existingColumns.includes('updated_at')) {
        await db.exec('ALTER TABLE cart_items ADD COLUMN updated_at DATETIME')
        logger.info('Added updated_at column to cart_items table')
        
        // Set default values for existing rows
        await db.exec(`UPDATE cart_items SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`)
      }

      // Create index on created_at for better analytics performance
      await db.exec('CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at)')

    } finally {
      await db.close()
    }
  }

  // Migration 008: Create search analytics table
  async createSearchAnalyticsTable() {
    const db = await this.getConnection()

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          search_query TEXT NOT NULL,
          filters_applied TEXT,
          results_count INTEGER DEFAULT 0,
          clicked_product_id INTEGER,
          search_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          session_id TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
          FOREIGN KEY (clicked_product_id) REFERENCES products (id) ON DELETE SET NULL
        )
      `)

      // Create indexes for better performance
      await db.exec('CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(search_query)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(search_timestamp)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id)')

      logger.info('Search analytics table created successfully')

    } finally {
      await db.close()
    }
  }

  // Migration 009: Add OAuth and 2FA support
  async addOAuthAnd2FA() {
    const db = await this.getConnection()

    try {
      logger.info('Adding OAuth and 2FA support to users table...')

      // Check existing columns to avoid duplicates
      const tableInfo = await db.all("PRAGMA table_info(users)")
      const existingColumns = tableInfo.map(col => col.name)

      // OAuth provider columns
      const oauthColumns = [
        { name: 'google_id', sql: 'ALTER TABLE users ADD COLUMN google_id TEXT' },
        { name: 'github_id', sql: 'ALTER TABLE users ADD COLUMN github_id TEXT' },
        { name: 'oauth_provider', sql: 'ALTER TABLE users ADD COLUMN oauth_provider TEXT' },
        { name: 'oauth_created_at', sql: 'ALTER TABLE users ADD COLUMN oauth_created_at INTEGER' }
      ]

      // 2FA columns
      const tfaColumns = [
        { name: 'two_fa_secret', sql: 'ALTER TABLE users ADD COLUMN two_fa_secret TEXT' },
        { name: 'two_fa_enabled', sql: 'ALTER TABLE users ADD COLUMN two_fa_enabled INTEGER DEFAULT 0' },
        { name: 'two_fa_backup_codes', sql: 'ALTER TABLE users ADD COLUMN two_fa_backup_codes TEXT' },
        { name: 'two_fa_setup_at', sql: 'ALTER TABLE users ADD COLUMN two_fa_setup_at INTEGER' }
      ]

      // Security audit columns
      const securityColumns = [
        { name: 'last_login_at', sql: 'ALTER TABLE users ADD COLUMN last_login_at INTEGER' },
        { name: 'last_login_ip', sql: 'ALTER TABLE users ADD COLUMN last_login_ip TEXT' },
        { name: 'failed_login_attempts', sql: 'ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0' },
        { name: 'locked_until', sql: 'ALTER TABLE users ADD COLUMN locked_until INTEGER' }
      ]

      // Profile enhancement columns
      const profileColumns = [
        { name: 'display_name', sql: 'ALTER TABLE users ADD COLUMN display_name TEXT' },
        { name: 'profile_picture', sql: 'ALTER TABLE users ADD COLUMN profile_picture TEXT' }
      ]

      // Add all columns
      const allColumns = [...oauthColumns, ...tfaColumns, ...securityColumns, ...profileColumns]
      
      for (const column of allColumns) {
        if (!existingColumns.includes(column.name)) {
          await db.exec(column.sql)
          logger.info(`Added column ${column.name} to users table`)
        }
      }

      // Create OAuth sessions table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS oauth_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          provider TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `)

      // Create security audit log table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          event_type TEXT NOT NULL,
          event_details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          success INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `)

      // Create indexes for performance (including unique indexes for OAuth IDs)
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users (google_id) WHERE google_id IS NOT NULL')
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id_unique ON users (github_id) WHERE github_id IS NOT NULL')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions (user_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log (user_id)')
      await db.exec('CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log (event_type)')

      logger.info('OAuth and 2FA support added successfully')

    } finally {
      await db.close()
    }
  }

  // Migration 010: Add RBAC (Role-Based Access Control) support
  async addRBACSupport() {
    const db = await this.getConnection()

    try {
      logger.info('Adding RBAC support to users table...')
      
      // Add role column to users table with constraint
      await db.exec(`
        ALTER TABLE users 
        ADD COLUMN role TEXT DEFAULT 'user' 
        CHECK (role IN ('super_admin', 'admin', 'moderator', 'user', 'guest'))
      `)

      // Add role index for performance
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
      `)

      // Create user_permissions table for granular permissions
      await db.exec(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          permission TEXT NOT NULL,
          granted_by INTEGER,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(user_id, permission)
        )
      `)

      // Create RBAC audit log table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS rbac_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          target_user_id INTEGER,
          old_role TEXT,
          new_role TEXT,
          permission TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `)

      // Set admin role for existing test user (if exists)
      const result = await db.run(`
        UPDATE users 
        SET role = 'admin' 
        WHERE username = 'testuser' OR email = 'test@example.com'
      `)

      if (result.changes > 0) {
        logger.info(`Assigned admin role to ${result.changes} existing user(s)`)
      }

      logger.info('RBAC migration completed successfully')

    } finally {
      await db.close()
    }
  }
}

// Export instance
export const migrator = new DatabaseMigrator()
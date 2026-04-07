/**
 * Migration 011: Add Vinyl Collection Support
 * Creates tables for user vinyl collections, wantlists, and value tracking
 */

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { logger } from '../../middleware/errorHandler.js'

export async function migrate() {
  const db = await open({
    filename: process.env.DB_PATH || './database.db',
    driver: sqlite3.Database
  })

  try {
    logger.info('Running migration 011: Add vinyl collection support...')

    // User collection items table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS collection_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        discogs_release_id INTEGER,
        product_id INTEGER,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        year INTEGER,
        format TEXT,
        label TEXT,
        catalog_number TEXT,
        country TEXT,
        genres TEXT,
        styles TEXT,
        cover_image TEXT,
        notes TEXT,
        media_condition TEXT DEFAULT 'VG+',
        sleeve_condition TEXT DEFAULT 'VG+',
        purchase_price DECIMAL(10,2),
        purchase_date DATE,
        purchase_location TEXT,
        current_value DECIMAL(10,2),
        folder_id INTEGER DEFAULT 1,
        play_count INTEGER DEFAULT 0,
        last_played DATE,
        is_for_sale BOOLEAN DEFAULT FALSE,
        asking_price DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `)
    logger.info('Created collection_items table')

    // Collection folders table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS collection_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `)
    logger.info('Created collection_folders table')

    // Wantlist table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS wantlist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        discogs_release_id INTEGER,
        discogs_master_id INTEGER,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        year INTEGER,
        format TEXT,
        label TEXT,
        cover_image TEXT,
        notes TEXT,
        priority INTEGER DEFAULT 3,
        max_price DECIMAL(10,2),
        desired_condition TEXT DEFAULT 'VG+',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, discogs_release_id)
      )
    `)
    logger.info('Created wantlist_items table')

    // Collection value history for tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS collection_value_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_items INTEGER NOT NULL,
        total_value DECIMAL(12,2) NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    logger.info('Created collection_value_history table')

    // Create indexes for performance
    await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_user_id ON collection_items(user_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_folder ON collection_items(user_id, folder_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_discogs ON collection_items(discogs_release_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_artist ON collection_items(artist)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_collection_year ON collection_items(year)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_wantlist_user_id ON wantlist_items(user_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_wantlist_discogs ON wantlist_items(discogs_release_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_wantlist_priority ON wantlist_items(user_id, priority)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_value_history_user ON collection_value_history(user_id)')
    await db.exec('CREATE INDEX IF NOT EXISTS idx_value_history_date ON collection_value_history(recorded_at)')

    logger.info('Migration 011 completed successfully')

  } finally {
    await db.close()
  }
}

export async function rollback() {
  const db = await open({
    filename: process.env.DB_PATH || './database.db',
    driver: sqlite3.Database
  })

  try {
    logger.info('Rolling back migration 011...')

    await db.exec('DROP TABLE IF EXISTS collection_value_history')
    await db.exec('DROP TABLE IF EXISTS wantlist_items')
    await db.exec('DROP TABLE IF EXISTS collection_folders')
    await db.exec('DROP TABLE IF EXISTS collection_items')

    logger.info('Migration 011 rolled back successfully')

  } finally {
    await db.close()
  }
}

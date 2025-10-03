#!/usr/bin/env node

import { migrator } from './db/migrator.js'
import { logger } from './middleware/errorHandler.js'

async function runMigrations() {
  try {
    logger.info('Starting database migrations...')
    await migrator.runAllMigrations()
    logger.info('All migrations completed successfully!')
  } catch (error) {
    logger.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
}

export { runMigrations }
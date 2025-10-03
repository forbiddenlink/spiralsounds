#!/usr/bin/env node

import { seeder } from './db/seeder.js'
import { logger } from './middleware/errorHandler.js'

async function runSeeding() {
  try {
    await seeder.seedAll()
  } catch (error) {
    logger.error('Seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeding()
}

export { runSeeding }
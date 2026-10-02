// Jest setup file
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Set environment variables for all tests
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'

// Each test file gets its own throwaway database, so parallel workers never
// share a file and no test touches the dev database.db. A test file may still
// set its own DB_PATH at module level; it takes effect before these hooks run.
const testDbPath = path.join(os.tmpdir(), `spiralsounds-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
process.env.DB_PATH = testDbPath

global.beforeAll(async () => {
  const { migrator } = await import('../db/migrator.js')
  await migrator.runAllMigrations()
})

global.afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

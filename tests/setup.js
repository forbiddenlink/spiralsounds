// Jest setup file
import fs from 'fs'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

// Set environment variables for all tests
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'
process.env.DB_PATH = './test-database.db'

// Global setup to create test database
global.beforeAll(async () => {
  // Clean up any existing test database
  if (fs.existsSync('./test-database.db')) {
    fs.unlinkSync('./test-database.db')
  }
  
  // Create fresh test database with basic schema
  const db = await open({
    filename: './test-database.db',
    driver: sqlite3.Database
  })
  
  // Create basic tables for testing
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  await db.close()
})

// Global cleanup
global.afterAll(() => {
  // Clean up test database
  if (fs.existsSync('./test-database.db')) {
    fs.unlinkSync('./test-database.db')
  }
})
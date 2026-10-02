import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

// DB_PATH lets tests (and other environments) use their own database file
export async function getDBConnection() {
  return open({
    filename: process.env.DB_PATH || 'database.db',
    driver: sqlite3.Database
  })
}

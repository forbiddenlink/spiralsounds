import { beforeAll, describe, expect, test } from '@jest/globals'
import bcrypt from 'bcryptjs'

process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-with-32-characters-minimum'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-with-32-characters'
process.env.NODE_ENV = 'test'

let seeder
let getDBConnection

async function resetTestUser() {
  const db = await getDBConnection()
  await db.run('DELETE FROM users WHERE username = ?', ['testuser'])
  await db.close()
}

async function readHash() {
  const db = await getDBConnection()
  const row = await db.get('SELECT password FROM users WHERE username = ?', ['testuser'])
  await db.close()
  return row.password
}

beforeAll(async () => {
  const { DatabaseSeeder } = await import('../db/seeder.js')
  ;({ getDBConnection } = await import('../db/db.js'))
  seeder = new DatabaseSeeder()
})

describe('seedTestUser', () => {
  test('uses SEED_TEST_USER_PASSWORD when set', async () => {
    await resetTestUser()
    process.env.SEED_TEST_USER_PASSWORD = 'from-env-Pass9!'
    await seeder.seedTestUser()
    expect(await bcrypt.compare('from-env-Pass9!', await readHash())).toBe(true)
  })

  test('does not fall back to a hard-coded password when unset', async () => {
    await resetTestUser()
    delete process.env.SEED_TEST_USER_PASSWORD
    await seeder.seedTestUser()
    const hash = await readHash()
    expect(await bcrypt.compare('TestPassword123!', hash)).toBe(false)
  })
})

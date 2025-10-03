/**
 * Migration: Add role-based access control to users table
 */

export const up = async (db) => {
  console.log('Adding RBAC support to users table...')
  
  // Add role column to users table
  await db.run(`
    ALTER TABLE users 
    ADD COLUMN role TEXT DEFAULT 'user' 
    CHECK (role IN ('super_admin', 'admin', 'moderator', 'user', 'guest'))
  `)

  // Add role index for performance
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `)

  // Create roles table for future extensibility (optional permissions per user)
  await db.run(`
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

  // Create security audit log table for RBAC events
  await db.run(`
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
  await db.run(`
    UPDATE users 
    SET role = 'admin' 
    WHERE username = 'testuser' OR email = 'test@example.com'
  `)

  console.log('RBAC migration completed successfully')
}

export const down = async (db) => {
  console.log('Rolling back RBAC migration...')
  
  // Remove role column (SQLite doesn't support DROP COLUMN directly)
  // Create backup, recreate table, restore data
  await db.run('ALTER TABLE users RENAME TO users_backup')
  
  await db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_verified BOOLEAN DEFAULT 0,
      email_verification_token TEXT,
      email_verified_at DATETIME,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      last_login DATETIME
    )
  `)

  await db.run(`
    INSERT INTO users (
      id, name, email, username, password, is_verified, 
      email_verification_token, email_verified_at, 
      password_reset_token, password_reset_expires,
      created_at, updated_at, last_login
    )
    SELECT 
      id, name, email, username, password, is_verified,
      email_verification_token, email_verified_at,
      password_reset_token, password_reset_expires,
      created_at, updated_at, last_login
    FROM users_backup
  `)

  await db.run('DROP TABLE users_backup')
  await db.run('DROP TABLE IF EXISTS user_permissions')
  await db.run('DROP TABLE IF EXISTS rbac_audit_log')
  
  console.log('RBAC rollback completed')
}
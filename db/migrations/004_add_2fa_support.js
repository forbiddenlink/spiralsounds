/**
 * Database Migration: Add 2FA Support
 * Adds fields for two-factor authentication and security auditing
 */

export const up = async (db) => {
    console.log('🔐 Adding 2FA and security support to users table...');
    
    // Add 2FA columns
    db.exec(`
      ALTER TABLE users ADD COLUMN two_fa_secret TEXT;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN two_fa_enabled INTEGER DEFAULT 0;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN two_fa_backup_codes TEXT;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN two_fa_setup_at INTEGER;
    `);
    
    // Add security audit fields
    db.exec(`
      ALTER TABLE users ADD COLUMN last_login_at INTEGER;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN last_login_ip TEXT;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN locked_until INTEGER;
    `);
    
    // Add profile enhancement fields
    db.exec(`
      ALTER TABLE users ADD COLUMN display_name TEXT;
    `);
    
    db.exec(`
      ALTER TABLE users ADD COLUMN profile_picture TEXT;
    `);
    
    // Create security audit log table
    db.exec(`
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
      );
    `);
    
    // Create indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log (user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log (event_type);
    `);
    
    console.log('✅ 2FA and security audit support added successfully');
}

export const down = async (db) => {
    console.log('🔄 Removing 2FA support...');
    
    // Drop tables
    db.exec('DROP TABLE IF EXISTS security_audit_log;');
    
    // Note: SQLite doesn't support DROP COLUMN, so we would need to recreate the users table
    // For development, we'll just note this limitation
    console.log('⚠️ Note: SQLite does not support dropping columns. In production, you would need to recreate the users table.');
    console.log('✅ 2FA tables removed successfully');
}
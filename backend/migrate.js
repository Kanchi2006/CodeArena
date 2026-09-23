const db = require('./db');

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // 1. Update organization_profiles with new columns
    const orgColumns = [
      { name: 'logo_url', type: 'VARCHAR(500)' },
      { name: 'description', type: 'TEXT' },
      { name: 'established_year', type: 'INT' },
      { name: 'industry', type: 'VARCHAR(100)' },
      { name: 'employee_count', type: 'VARCHAR(50)' },
      { name: 'contact_person', type: 'VARCHAR(255)' },
      { name: 'contact_designation', type: 'VARCHAR(100)' },
      { name: 'twitter_url', type: 'VARCHAR(255)' },
      { name: 'linkedin_url', type: 'VARCHAR(255)' }
    ];

    for (const col of orgColumns) {
      try {
        await db.query(`ALTER TABLE organization_profiles ADD COLUMN ${col.name} ${col.type} DEFAULT NULL`);
        console.log(`Added column ${col.name} to organization_profiles`);
      } catch (e) {
        // Column likely exists, skip
      }
    }

    // 2. Create organization_documents table
    await db.query(`CREATE TABLE IF NOT EXISTS organization_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      org_profile_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      filesize VARCHAR(50),
      doc_type VARCHAR(100),
      status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
      rejection_reason TEXT,
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('Verified organization_documents table');

    // 3. Create organization_notifications table
    await db.query(`CREATE TABLE IF NOT EXISTS organization_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      org_profile_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('Verified organization_notifications table');

    // 4. Add rules_config JSON column to assessments and contests
    for (const table of ['assessments', 'contests']) {
      try {
        await db.query(`ALTER TABLE ${table} ADD COLUMN rules_config JSON DEFAULT NULL`);
        console.log(`Added rules_config to ${table}`);
      } catch (e) {
        // Column likely exists, skip
      }
    }

    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0));
}

module.exports = { runMigrations };

const db = require('./db');

async function migrate() {
  try {
    const queries = [
      // 1. Add new columns to organization_profiles
      "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS reg_number VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS pan_number VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS rep_name VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS rep_designation VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL",
      // 2. Extend ENUM
      "ALTER TABLE organization_profiles MODIFY COLUMN verification_status ENUM('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','SUSPENDED','RESUBMISSION_REQUIRED') DEFAULT 'PENDING'",
    ];

    for (const sql of queries) {
      try {
        await db.query(sql);
        console.log('OK:', sql.substring(0, 70));
      } catch (e) {
        console.log('Skip/Err:', e.message.substring(0, 100));
      }
    }

    // 3. Create organization_audit_logs
    await db.query(`CREATE TABLE IF NOT EXISTS organization_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      org_profile_id INT NOT NULL,
      action VARCHAR(100) NOT NULL,
      admin_id INT NOT NULL,
      reason TEXT,
      previous_status VARCHAR(50),
      new_status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_profile_id) REFERENCES organization_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('OK: organization_audit_logs created');

    // 4. Create contests
    await db.query(`CREATE TABLE IF NOT EXISTS contests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      organization_id INT NOT NULL,
      created_by INT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 120,
      registration_deadline DATETIME NULL,
      visibility ENUM('PUBLIC','PRIVATE') DEFAULT 'PUBLIC',
      max_participants INT DEFAULT 0,
      eligibility TEXT,
      allowed_languages JSON,
      leaderboard_visible TINYINT(1) DEFAULT 1,
      rules TEXT,
      status ENUM('DRAFT','SCHEDULED','LIVE','COMPLETED','CANCELLED') DEFAULT 'DRAFT',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('OK: contests created');

    // 5. Create contest_problems
    await db.query(`CREATE TABLE IF NOT EXISTS contest_problems (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contest_id INT NOT NULL,
      problem_id INT NOT NULL,
      order_index INT DEFAULT 0,
      points INT DEFAULT 100,
      UNIQUE KEY unique_contest_problem (contest_id, problem_id),
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('OK: contest_problems created');

    // 6. Create contest_participants
    await db.query(`CREATE TABLE IF NOT EXISTS contest_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contest_id INT NOT NULL,
      user_id INT NOT NULL,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      score INT DEFAULT 0,
      rank_position INT NULL,
      UNIQUE KEY unique_participant (contest_id, user_id),
      FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    console.log('OK: contest_participants created');

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}
migrate();

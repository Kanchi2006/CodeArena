const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

async function seedTestOrganization() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed mechanism is strictly disabled in production environment.');
    process.exit(1);
  }

  const testEmail = 'orgtest@codearena.local';
  const testUsername = 'orgtest';
  const testPasswordRaw = 'OrgTest@12345';
  const testOrgName = 'CodeArena Test Organization';

  try {
    console.log('--- Seeding Development Test Organization Account ---');
    if (typeof db.initDB === 'function') {
      await db.initDB();
    }

    // 1. Check if user with test email or username exists
    const [users] = await db.query(
      'SELECT id, username, email, role FROM users WHERE email = ? OR username = ?',
      [testEmail, testUsername]
    );

    let userId;
    if (users.length > 0) {
      userId = users[0].id;
      console.log(`[DevSeed] Test user already exists: ID=${userId}, username=${users[0].username}, role=${users[0].role}`);
      // Ensure role is organization
      if (users[0].role !== 'organization') {
        await db.query('UPDATE users SET role = "organization" WHERE id = ?', [userId]);
        console.log(`[DevSeed] Updated user role to 'organization' for ID ${userId}`);
      }
    } else {
      // 2. Hash password using bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPasswordRaw, salt);

      const [result] = await db.query(
        `INSERT INTO users (username, email, password, display_name, role, activity_status)
         VALUES (?, ?, ?, ?, 'organization', 'offline')`,
        [testUsername, testEmail, hashedPassword, testOrgName]
      );
      userId = result.insertId;
      console.log(`[DevSeed] Created new organization user: ID=${userId}, email=${testEmail}`);
    }

    // 3. Check organization_profiles table
    const [profiles] = await db.query(
      'SELECT id, verification_status FROM organization_profiles WHERE user_id = ?',
      [userId]
    );

    if (profiles.length === 0) {
      await db.query(
        `INSERT INTO organization_profiles 
           (user_id, organization_name, organization_type, official_email, verification_status)
         VALUES (?, ?, 'Private Limited', ?, 'PENDING')`,
        [userId, testOrgName, testEmail]
      );
      console.log(`[DevSeed] Created organization_profile for user ID ${userId} with verification_status='PENDING'`);
    } else {
      console.log(`[DevSeed] Existing organization_profile found: status='${profiles[0].verification_status}'`);
    }

    console.log('\n--- Seed Complete ---');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPasswordRaw}`);
    console.log(`Role: organization`);
    console.log(`Status: PENDING`);
    
    return { success: true, userId };
  } catch (error) {
    console.error('[DevSeed Error]:', error);
    throw error;
  }
}

// Execute CLI script if run directly
if (require.main === module) {
  seedTestOrganization()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedTestOrganization };

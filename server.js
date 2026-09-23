const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, query } = require('./db');
const authenticateToken = require('./middleware/authenticateToken');
const authorizeRole = require('./middleware/authorizeRole');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database
initDB().catch(err => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});

// --- Authentication Routes ---

// User Registration
app.post('/api/auth/register', [
  body('username').isString().notEmpty().trim(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['user', 'organization']).optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user' } = req.body;

  try {
    const [existingUser] = await query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    const newUser = { id: result.insertId, username, email, role };
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User Login
app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').isString().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- User Profile Routes ---

// GET User Profile (Protected)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await query('SELECT id, username, email, role, bio, github_profile, skills, display_name, is_blocked, activity_status, featured_milestone, auth_provider, provider_id, avatar_url FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user-specific data like solved problems, streak, xp, etc.
    const [userData] = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END), 0) AS total_solved_problems,
        COALESCE(SUM(xp), 0) AS total_xp,
        COALESCE(MAX(streak), 0) AS max_streak,
        COALESCE(SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END), 0) AS current_streak
      FROM user_problem_attempts 
      WHERE user_id = ?
    `, [userId]);

    const profileData = {
      ...user,
      total_solved_problems: userData.total_solved_problems || 0,
      total_xp: userData.total_xp || 0,
      max_streak: userData.max_streak || 0,
      current_streak: userData.current_streak || 0,
    };

    res.json(profileData);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// PUT Update User Profile (Protected)
app.put('/api/user/profile', authenticateToken, [
  body('bio').isString().optional(),
  body('github_profile').isURL().optional(),
  body('skills').isString().optional(),
  body('display_name').isString().optional(),
  body('avatar_url').isURL().optional(),
  body('password').isLength({ min: 6 }).optional(), // Allow password update
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const { bio, github_profile, skills, display_name, avatar_url, password } = req.body;
  const updates = [];
  const values = [];

  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  if (github_profile !== undefined) { updates.push('github_profile = ?'); values.push(github_profile); }
  if (skills !== undefined) { updates.push('skills = ?'); values.push(skills); }
  if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }

  if (password) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push('password = ?');
      values.push(hashedPassword);
    } catch (error) {
      console.error('Password hashing error:', error);
      return res.status(500).json({ message: 'Error updating password' });
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  values.push(userId); // Add userId for the WHERE clause

  try {
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// --- Organization Specific Routes ---

// GET Organization Dashboard Stats (Protected, Org Role)
app.get('/api/organization/dashboard-stats', authenticateToken, authorizeRole('organization'), async (req, res) => {
  const orgId = req.user.id; // Assuming user.id is the organization_profile_id for simplicity, adjust if different

  try {
    // 1. Stats Overview
    const [assessmentsStats] = await query(`
      SELECT 
        COUNT(id) AS total_assessments,
        SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) AS active_assessments,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_assessments
      FROM assessments WHERE organization_id = ?
    `, [orgId]);

    const [contestsStats] = await query(`
      SELECT 
        COUNT(id) AS total_contests,
        SUM(CASE WHEN status = 'LIVE' THEN 1 ELSE 0 END) AS active_contests
      FROM contests WHERE organization_id = ?
    `, [orgId]);

    const [participantsStats] = await query(`
      SELECT COUNT(DISTINCT user_id) AS total_participants
      FROM contest_participants WHERE contest_id IN (SELECT id FROM contests WHERE organization_id = ?)
    `, [orgId]);

    const [pendingRegistrations] = await query(`
      SELECT COUNT(id) AS pending_registrations
      FROM organization_profiles 
      WHERE verification_status = 'PENDING' OR verification_status = 'UNDER_REVIEW'
    `);

    const [certificatesIssued] = await query(`
      SELECT COUNT(id) AS total_certificates
      FROM course_certificates 
      WHERE course_id IN (SELECT id FROM courses WHERE organization_id = ?) -- Assuming courses are linked to orgs
    `, [orgId]); // Adjust if certificates are not directly linked to organizations

    // 2. Recent Activity Feed (Example: recent assessment completions, contest starts)
    const recentActivity = [];
    // Example: Fetch recent assessment completions
    const [recentAssessments] = await query(`
      SELECT a.title AS assessment_title, ua.completed_at
      FROM user_assessments ua
      JOIN assessments a ON ua.assessment_id = a.id
      WHERE a.organization_id = ? AND ua.status = 'COMPLETED'
      ORDER BY ua.completed_at DESC
      LIMIT 5
    `, [orgId]);
    recentAssessments.forEach(item => recentActivity.push({ type: 'Assessment Completed', detail: item.assessment_title, timestamp: item.completed_at }));

    // Example: Fetch upcoming contests
    const [upcomingContests] = await query(`
      SELECT title, start_time
      FROM contests
      WHERE organization_id = ? AND status = 'SCHEDULED' AND start_time > NOW()
      ORDER BY start_time ASC
      LIMIT 3
    `, [orgId]);
    upcomingContests.forEach(item => recentActivity.push({ type: 'Contest Starting Soon', detail: item.title, timestamp: item.start_time }));

    // 3. Upcoming Events (can be contests, scheduled assessments, etc.)
    const upcomingEvents = [...upcomingContests]; // Combine with other event types if needed

    res.json({
      stats: {
        totalAssessments: assessmentsStats.total_assessments || 0,
        activeAssessments: assessmentsStats.active_assessments || 0,
        completedAssessments: assessmentsStats.completed_assessments || 0,
        totalContests: contestsStats.total_contests || 0,
        activeContests: contestsStats.active_contests || 0,
        totalParticipants: participantsStats.total_participants || 0,
        pendingRegistrations: pendingRegistrations.pending_registrations || 0,
        certificatesIssued: certificatesIssued.total_certificates || 0,
      },
      recentActivity: recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), // Sort by timestamp descending
      upcomingEvents: upcomingEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)) // Sort by start_time ascending
    });

  } catch (error) {
    console.error('Get organization dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

// GET Organization Profile (Protected, Org Role)
app.get('/api/organization/profile', authenticateToken, authorizeRole('organization'), async (req, res) => {
  const userId = req.user.id; // Assuming user.id is the organization_profile_id for simplicity

  try {
    // Fetch basic user info
    const [user] = await query('SELECT id, username, email, role, avatar_url FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch organization profile details
    const [orgProfile] = await query(`
      SELECT 
        id, user_id, organization_name, organization_type, website, official_email, phone_number, address, country, state, city,
        reg_certificate, pan_card, gstin, govt_id, selfie_id, verification_status, submitted_at, verified_at, rejection_reason,
        -- New fields
        logo_url, description, established_year, industry, employee_count, contact_person, contact_designation, twitter_url, linkedin_url
      FROM organization_profiles WHERE user_id = ?
    `, [userId]);

    if (!orgProfile) {
      // If no profile exists, create a basic one linked to the user
      const [newProfileResult] = await query(`
        INSERT INTO organization_profiles (user_id, organization_name, official_email, verification_status)
        VALUES (?, ?, ?, 'PENDING')
      `, [userId, `${user.username}'s Organization`, user.email]);
      
      // Fetch the newly created profile
      const [newOrgProfile] = await query('SELECT * FROM organization_profiles WHERE id = ?', [newProfileResult.insertId]);
      
      // Fetch computed stats for the new profile
      const computedStats = await getOrganizationComputedStats(newOrgProfile.id);

      return res.json({ ...user, ...newOrgProfile, ...computedStats });
    }

    // Fetch computed statistics
    const computedStats = await getOrganizationComputedStats(orgProfile.id);

    res.json({ ...user, ...orgProfile, ...computedStats });

  } catch (error) {
    console.error('Get organization profile error:', error);
    res.status(500).json({ message: 'Server error fetching organization profile' });
  }
});

// PUT Update Organization Profile (Protected, Org Role)
app.put('/api/organization/profile', authenticateToken, authorizeRole('organization'), [
  // Basic Info
  body('organization_name').isString().notEmpty(),
  body('organization_type').isString().optional(),
  body('website').isURL().optional(),
  body('official_email').isEmail().optional(),
  body('phone_number').isString().optional(),
  body('address').isString().optional(),
  body('country').isString().optional(),
  body('state').isString().optional(),
  body('city').isString().optional(),
  // New fields
  body('logo_url').isURL().optional(),
  body('description').isString().optional(),
  body('established_year').isInt().optional(),
  body('industry').isString().optional(),
  body('employee_count').isString().optional(),
  body('contact_person').isString().optional(),
  body('contact_designation').isString().optional(),
  body('twitter_url').isURL().optional(),
  body('linkedin_url').isURL().optional(),
  // Verification related fields (only modifiable by admin, but included for completeness if needed)
  // body('verification_status').isIn(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'RESUBMISSION_REQUIRED']).optional(),
  // body('rejection_reason').isString().optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id; // Assuming user.id is the organization_profile_id
  const {
    organization_name, organization_type, website, official_email, phone_number, address, country, state, city,
    logo_url, description, established_year, industry, employee_count, contact_person, contact_designation, twitter_url, linkedin_url
  } = req.body;

  try {
    // Check if organization profile exists, create if not
    let [orgProfile] = await query('SELECT id FROM organization_profiles WHERE user_id = ?', [userId]);

    if (!orgProfile) {
      const [newProfileResult] = await query(`
        INSERT INTO organization_profiles (user_id, organization_name, official_email, verification_status)
        VALUES (?, ?, ?, 'PENDING')
      `, [userId, organization_name || `${req.user.username}'s Organization`, official_email || req.user.email]);
      orgProfile = { id: newProfileResult.insertId };
    }

    const orgProfileId = orgProfile.id;

    const updates = [];
    const values = [];

    if (organization_name !== undefined) { updates.push('organization_name = ?'); values.push(organization_name); }
    if (organization_type !== undefined) { updates.push('organization_type = ?'); values.push(organization_type); }
    if (website !== undefined) { updates.push('website = ?'); values.push(website); }
    if (official_email !== undefined) { updates.push('official_email = ?'); values.push(official_email); }
    if (phone_number !== undefined) { updates.push('phone_number = ?'); values.push(phone_number); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (country !== undefined) { updates.push('country = ?'); values.push(country); }
    if (state !== undefined) { updates.push('state = ?'); values.push(state); }
    if (city !== undefined) { updates.push('city = ?'); values.push(city); }
    // New fields
    if (logo_url !== undefined) { updates.push('logo_url = ?'); values.push(logo_url); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (established_year !== undefined) { updates.push('established_year = ?'); values.push(established_year); }
    if (industry !== undefined) { updates.push('industry = ?'); values.push(industry); }
    if (employee_count !== undefined) { updates.push('employee_count = ?'); values.push(employee_count); }
    if (contact_person !== undefined) { updates.push('contact_person = ?'); values.push(contact_person); }
    if (contact_designation !== undefined) { updates.push('contact_designation = ?'); values.push(contact_designation); }
    if (twitter_url !== undefined) { updates.push('twitter_url = ?'); values.push(twitter_url); }
    if (linkedin_url !== undefined) { updates.push('linkedin_url = ?'); values.push(linkedin_url); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(orgProfileId); // Add orgProfileId for the WHERE clause

    await query(`UPDATE organization_profiles SET ${updates.join(', ')} WHERE id = ?`, values);

    // Update user's display name if organization name is provided and user role is organization
    if (organization_name !== undefined && req.user.role === 'organization') {
      await query('UPDATE users SET display_name = ? WHERE id = ?', [organization_name, userId]);
    }

    res.json({ message: 'Organization profile updated successfully' });

  } catch (error) {
    console.error('Update organization profile error:', error);
    res.status(500).json({ message: 'Server error updating organization profile' });
  }
});

// Helper function to get computed stats for an organization
async function getOrganizationComputedStats(orgProfileId) {
  const stats = {
    hostedAssessments: 0,
    hostedContests: 0,
    totalParticipants: 0,
    completedExams: 0,
    certificatesIssued: 0,
  };

  try {
    // Hosted Assessments
    const [assessments] = await query('SELECT COUNT(id) AS count FROM assessments WHERE organization_id = ?', [orgProfileId]);
    stats.hostedAssessments = assessments[0]?.count || 0;

    // Hosted Contests
    const [contests] = await query('SELECT COUNT(id) AS count FROM contests WHERE organization_id = ?', [orgProfileId]);
    stats.hostedContests = contests[0]?.count || 0;

    // Total Participants in contests hosted by the organization
    const [participants] = await query(`
      SELECT COUNT(DISTINCT user_id) AS count 
      FROM contest_participants 
      WHERE contest_id IN (SELECT id FROM contests WHERE organization_id = ?)
    `, [orgProfileId]);
    stats.totalParticipants = participants[0]?.count || 0;

    // Completed Exams (This might need a more specific definition, e.g., completed assessments by participants)
    // For now, let's assume it means assessments hosted by the org that have at least one completion.
    // A more accurate count would involve joining with user_assessments.
    const [completedExams] = await query(`
      SELECT COUNT(DISTINCT assessment_id) AS count
      FROM user_assessments
      WHERE assessment_id IN (SELECT id FROM assessments WHERE organization_id = ?) AND status = 'COMPLETED'
    `, [orgProfileId]);
    stats.completedExams = completedExams[0]?.count || 0;

    // Certificates Issued (Assuming courses are linked to organizations)
    const [certificates] = await query(`
      SELECT COUNT(id) AS count
      FROM course_certificates
      WHERE course_id IN (SELECT id FROM courses WHERE organization_id = ?)
    `, [orgProfileId]);
    stats.certificatesIssued = certificates[0]?.count || 0;

  } catch (error) {
    console.error('Error calculating organization computed stats:', error);
    // Return default stats in case of error
  }
  return stats;
}


// --- Problem Routes ---
app.get('/api/problems', authenticateToken, async (req, res) => {
  try {
    const problems = await query('SELECT id, title, difficulty, category, tags FROM problems ORDER BY id ASC');
    res.json(problems);
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

app.get('/api/problems/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [problem] = await query('SELECT * FROM problems WHERE id = ?', [id]);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.json(problem);
  } catch (error) {
    console.error('Get problem by ID error:', error);
    res.status(500).json({ message: 'Server error fetching problem' });
  }
});

// --- Assessment Routes ---
app.get('/api/assessments', authenticateToken, async (req, res) => {
  try {
    const assessments = await query(`
      SELECT id, slug, title, description, category, difficulty, duration_minutes, status, organization_id
      FROM assessments
      ORDER BY created_at DESC
    `);
    res.json(assessments);
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ message: 'Server error fetching assessments' });
  }
});

app.get('/api/assessments/:slug', authenticateToken, async (req, res) => {
  const { slug } = req.params;
  try {
    const [assessment] = await query('SELECT * FROM assessments WHERE slug = ?', [slug]);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (error) {
    console.error('Get assessment by slug error:', error);
    res.status(500).json({ message: 'Server error fetching assessment' });
  }
});

// --- Contest Routes ---
app.get('/api/contests', authenticateToken, async (req, res) => {
  try {
    const contests = await query(`
      SELECT id, slug, title, description, organization_id, start_time, end_time, status
      FROM contests
      ORDER BY start_time DESC
    `);
    res.json(contests);
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({ message: 'Server error fetching contests' });
  }
});

app.get('/api/contests/:slug', authenticateToken, async (req, res) => {
  const { slug } = req.params;
  try {
    const [contest] = await query('SELECT * FROM contests WHERE slug = ?', [slug]);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    res.json(contest);
  } catch (error) {
    console.error('Get contest by slug error:', error);
    res.status(500).json({ message: 'Server error fetching contest' });
  }
});

// --- Course Routes ---
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const courses = await query(`
      SELECT id, slug, title, short_description, category, difficulty, estimated_duration_hours, thumbnail_url, status
      FROM courses
      ORDER BY created_at DESC
    `);
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error fetching courses' });
  }
});

app.get('/api/courses/:slug', authenticateToken, async (req, res) => {
  const { slug } = req.params;
  try {
    const [course] = await query('SELECT * FROM courses WHERE slug = ?', [slug]);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error('Get course by slug error:', error);
    res.status(500).json({ message: 'Server error fetching course' });
  }
});

// --- Catch-all for 404 ---
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

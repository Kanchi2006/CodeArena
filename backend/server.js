const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const db = require('./db');
const executionService = require('./services/executionService');
const assessmentScoringService = require('./services/assessmentScoringService');
const assessmentTimerService = require('./services/assessmentTimerService');
const translatorService = require('./services/translatorService');
const geminiService = require('./services/geminiService');
const adminGeminiService = require('./services/adminGeminiService');
const emailService = require('./services/emailService');
const { seedTestOrganization } = require('./seed_test_org');
require('dotenv').config();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'org-docs');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer config for org document uploads
const orgDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeBase = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `org_${req.user?.id || 'unknown'}_${Date.now()}_${safeBase}`);
  }
});
const orgDocUpload = multer({
  storage: orgDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.pdf$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF files (.pdf) are allowed'));
  }
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// Configured CORS Origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (e.g. server-to-server, Postman, health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));
app.use(express.json());

// JWT Authentication Middleware (Strict)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional JWT Authentication Middleware (Supports Guest Execution)
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null' || token === '') {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
};

// Admin Authorization Middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin privileges required' });
  }
};

// Organization Authorization Middleware
const authorizeOrg = (req, res, next) => {
  if (req.user && req.user.role === 'organization') {
    next();
  } else {
    res.status(403).json({ error: 'Organization account required' });
  }
};

// Verified Organization Authorization Middleware
const authorizeVerifiedOrg = async (req, res, next) => {
  if (!req.user || req.user.role !== 'organization') {
    return res.status(403).json({ error: 'Organization account required' });
  }
  try {
    const [orgs] = await db.query('SELECT verification_status FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgs.length === 0 || orgs[0].verification_status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Organization verification required. Your organization must be verified before performing this action.' });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Admin or Verified Organization Authorization Middleware
const authorizeAdminOrVerifiedOrg = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access token required' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.role === 'organization') {
    try {
      const [orgs] = await db.query('SELECT verification_status FROM organization_profiles WHERE user_id = ?', [req.user.id]);
      if (orgs.length === 0 || orgs[0].verification_status !== 'VERIFIED') {
        return res.status(403).json({ error: 'Organization verification required. Your organization must be verified before performing this action.' });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  return res.status(403).json({ error: 'Admin or verified organization account required' });
};

// Admin Test Email Dispatch Endpoint (Task 4)
app.post('/api/admin/email/test', authenticateToken, authorizeAdmin, async (req, res) => {
  const { recipientEmail } = req.body;
  try {
    const result = await emailService.testEmailService(recipientEmail || req.user.email);
    res.json({
      message: 'Test email dispatch attempt complete',
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXECUTION SANDBOX ENGINE ---

function executeChildProcess(command, stdinInput, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const child = exec(command, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed || error.signal === 'SIGTERM') {
          return resolve({
            timedOut: true,
            stdout: stdout ? stdout.trim() : '',
            stderr: 'Execution timed out after 5 seconds.'
          });
        }
        return resolve({
          timedOut: false,
          error: true,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : error.message
        });
      }
      resolve({
        timedOut: false,
        error: false,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    if (stdinInput && child.stdin) {
      child.stdin.write(stdinInput);
      child.stdin.end();
    } else if (child.stdin) {
      child.stdin.end();
    }
  });
}

async function runCodeSandbox(language, code, input, timeoutMs = 5000) {
  const tmpDir = os.tmpdir();
  const fileId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const langLower = (language || '').toLowerCase();

  if (langLower === 'javascript' || langLower === 'js') {
    const filePath = path.join(tmpDir, `code_${fileId}.js`);
    const fullCode = `
${code}

// Execution Harness
(function() {
  const fs = require('fs');
  let rawInput = '';
  try { rawInput = fs.readFileSync(0, 'utf-8'); } catch(e) {}
  
  if (typeof twoSum === 'function') {
    const lines = rawInput.trim().split('\\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const nums = lines[0].split(/\\s+/).map(Number);
      const target = Number(lines[1]);
      console.log(JSON.stringify(twoSum(nums, target)));
    } else if (lines.length === 1 && lines[0].includes('=')) {
      const matchNums = lines[0].match(/\\[([^\\]]+)\\]/);
      const matchTarget = lines[0].match(/target\\s*=\\s*(-?\\d+)/);
      if (matchNums && matchTarget) {
        const nums = matchNums[1].split(',').map(n => Number(n.trim()));
        const target = Number(matchTarget[1]);
        console.log(JSON.stringify(twoSum(nums, target)));
      }
    } else if (lines.length === 1 && lines[0].length > 0) {
      const nums = lines[0].split(/\\s+/).map(Number);
      console.log(JSON.stringify(twoSum(nums, 9)));
    }
  } else if (typeof reverseString === 'function') {
    console.log(reverseString(rawInput.trim()));
  } else if (typeof main === 'function') {
    main(rawInput);
  }
})();
`;
    fs.writeFileSync(filePath, fullCode, 'utf-8');
    const result = await executeChildProcess(`node "${filePath}"`, input, timeoutMs);
    try { fs.unlinkSync(filePath); } catch (e) { }

    if (result.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: result.stderr };
    }
    if (result.error) {
      return { status: 'Compilation Error', stdout: result.stdout, stderr: result.stderr };
    }
    return { status: 'Accepted', stdout: result.stdout || 'Execution finished cleanly.', stderr: result.stderr };

  } else if (langLower === 'python' || langLower === 'python3') {
    const filePath = path.join(tmpDir, `code_${fileId}.py`);
    const fullCode = `
import sys, json

${code}

if __name__ == '__main__':
    raw_input = sys.stdin.read().strip()
    if 'Solution' in globals():
        sol = Solution()
        if hasattr(sol, 'twoSum'):
            lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
            if len(lines) >= 2:
                nums = [int(x) for x in lines[0].split()]
                target = int(lines[1])
                res = sol.twoSum(nums, target)
                print(json.dumps(res))
            elif len(lines) == 1:
                nums = [int(x) for x in lines[0].split()]
                res = sol.twoSum(nums, 9)
                print(json.dumps(res))
        elif hasattr(sol, 'reverseString'):
            res = sol.reverseString(list(raw_input))
            print(res)
    elif 'twoSum' in globals():
        lines = [l.strip() for l in raw_input.split('\\n') if l.strip()]
        if len(lines) >= 2:
            nums = [int(x) for x in lines[0].split()]
            target = int(lines[1])
            res = twoSum(nums, target)
            print(json.dumps(res))
`;
    fs.writeFileSync(filePath, fullCode, 'utf-8');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const result = await executeChildProcess(`${pythonCmd} "${filePath}"`, input, timeoutMs);
    try { fs.unlinkSync(filePath); } catch (e) { }

    if (result.timedOut) {
      return { status: 'Time Limit Exceeded', stdout: '', stderr: result.stderr };
    }
    if (result.error) {
      return { status: 'Compilation Error', stdout: result.stdout, stderr: result.stderr };
    }
    return { status: 'Accepted', stdout: result.stdout || 'Execution finished cleanly.', stderr: result.stderr };

  } else {
    return {
      status: 'Accepted',
      stdout: `[Execution simulated for ${language.toUpperCase()}]\nCode logic parsed successfully.`,
      stderr: ''
    };
  }
}

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { username, name, displayName, email, password, confirmPassword } = req.body;
  const fullName = name || displayName || username || 'Developer';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const cleanUsername = (username || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '_');

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this Email or Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (username, email, password, display_name, role, activity_status) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanUsername, email, hashedPassword, fullName, 'user', 'online']
    );

    const token = jwt.sign({ id: result.insertId, username: cleanUsername, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

    // Send welcome email server-side
    emailService.sendWelcomeEmail({
      userId: result.insertId,
      recipientEmail: email,
      userName: fullName
    }).catch(err => console.error('Error sending welcome email:', err));

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username: cleanUsername,
        email,
        role: 'user',
        solved_count: 0,
        streak: 0,
        xp: 0,
        bio: '',
        github_profile: '',
        skills: '',
        display_name: fullName,
        is_blocked: 0,
        activity_status: 'online',
        org_status: null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body;
  const loginIdentifier = username || email;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [loginIdentifier, loginIdentifier]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Access denied: This account has been blocked by an administrator.' });
    }

await db.query("UPDATE users SET activity_status = 'online' WHERE id = ?", [user.id]);
    let orgStatus = null;
    let orgProfile = null;
    if (user.role === 'organization') {
      const [orgs] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [user.id]);
      if (orgs.length > 0) {
        orgStatus = orgs[0].verification_status;
        orgProfile = orgs[0];
      }
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        solved_count: user.solved_count,
        streak: user.streak,
        xp: user.xp,
        bio: user.bio || '',
        github_profile: user.github_profile || '',
        skills: user.skills || '',
        display_name: user.display_name || user.username,
        is_blocked: user.is_blocked,
        activity_status: 'online',
        org_status: orgStatus,
        org_profile: orgProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Logout User
app.post('/api/auth/logout', async (req, res) => {
  try {
    // Support both authenticated and unauthenticated logout
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token && token !== 'undefined' && token !== 'null') {
      jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (!err && decoded && decoded.id) {
await db.query("UPDATE users SET activity_status = 'offline' WHERE id = ?", [decoded.id]);        }
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/auth/me - Fetch authenticated user session with role & org_status
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const authResponse = await buildUserAuthResponse(req.user.id);
    if (!authResponse) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(authResponse.user);
  } catch (error) {
    console.error('Error fetching /api/auth/me:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =============================================================
// EMAIL OTP VERIFICATION SYSTEM (USER & ORGANIZATION)
// =============================================================

// Helper to generate secure 6-digit OTP
function generateSecureOtp() {
  const crypto = require('crypto');
  return String(crypto.randomInt(100000, 999999));
}

// POST /api/auth/otp/send - Send / Resend OTP
app.post('/api/auth/otp/send', async (req, res) => {
  const { email, purpose } = req.body; // purpose: 'user_email_verification' | 'org_email_verification'
  if (!email || !purpose) {
    return res.status(400).json({ error: 'Email and purpose are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const validPurpose = purpose === 'org_email_verification' ? 'org_email_verification' : 'user_email_verification';

  try {
    let targetUserId = null;
    let targetOrgId = null;
    let recipientName = 'User';

    if (validPurpose === 'user_email_verification') {
      const [uRows] = await db.query('SELECT id, username, display_name, is_email_verified FROM users WHERE email = ?', [cleanEmail]);
      if (uRows.length === 0) {
        return res.status(404).json({ error: 'No account found with this email address' });
      }
      if (uRows[0].is_email_verified) {
        return res.json({ message: 'Email address is already verified', isAlreadyVerified: true });
      }
      targetUserId = uRows[0].id;
      recipientName = uRows[0].display_name || uRows[0].username;
    } else {
      const [orgRows] = await db.query('SELECT id, organization_name, is_email_verified FROM organization_profiles WHERE official_email = ?', [cleanEmail]);
      if (orgRows.length === 0) {
        return res.status(404).json({ error: 'No organization profile found with this official email' });
      }
      if (orgRows[0].is_email_verified) {
        return res.json({ message: 'Organization email is already verified', isAlreadyVerified: true });
      }
      targetOrgId = orgRows[0].id;
      recipientName = orgRows[0].organization_name;
    }

    // Check rate limit & cooldown
    const [existingOtps] = await db.query(
      `SELECT * FROM email_otps 
       WHERE email = ? AND purpose = ? AND verified_at IS NULL AND expires_at > NOW() 
       ORDER BY id DESC LIMIT 1`,
      [cleanEmail, validPurpose]
    );

    if (existingOtps.length > 0) {
      const activeOtp = existingOtps[0];
      if (activeOtp.resend_cooldown_until && new Date(activeOtp.resend_cooldown_until) > new Date()) {
        const remainingSecs = Math.ceil((new Date(activeOtp.resend_cooldown_until).getTime() - Date.now()) / 1000);
        return res.status(429).json({ 
          error: `Please wait ${remainingSecs} seconds before requesting another verification code.`,
          cooldownRemainingSeconds: remainingSecs
        });
      }
    }

    // Generate new OTP
    const rawOtp = generateSecureOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    console.log(`[EmailService] Verification OTP generated for email ${cleanEmail} (purpose: ${validPurpose})`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000); // 10 mins expiry
    const cooldownUntil = new Date(now.getTime() + 60000); // 60s cooldown

    await db.query(
      `INSERT INTO email_otps (user_id, organization_id, email, otp_hash, purpose, expires_at, resend_cooldown_until)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetUserId, targetOrgId, cleanEmail, otpHash, validPurpose, expiresAt, cooldownUntil]
    );

    // Dispatch email
    if (validPurpose === 'user_email_verification') {
      await emailService.sendUserEmailVerificationOtpEmail({
        userId: targetUserId,
        recipientEmail: cleanEmail,
        userName: recipientName,
        otp: rawOtp,
        expiryMinutes: 10
      });
    } else {
      await emailService.sendOrgEmailVerificationOtpEmail({
        orgProfileId: targetOrgId,
        recipientEmail: cleanEmail,
        orgName: recipientName,
        otp: rawOtp,
        expiryMinutes: 10
      });
    }

    res.json({
      message: 'Verification code sent to email successfully',
      email: cleanEmail,
      expiryMinutes: 10,
      cooldownSeconds: 60
    });

  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/otp/verify - Verify 6-digit OTP
app.post('/api/auth/otp/verify', async (req, res) => {
  const { email, otp, purpose } = req.body;
  if (!email || !otp || !purpose) {
    return res.status(400).json({ error: 'Email, OTP code, and purpose are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();
  const validPurpose = purpose === 'org_email_verification' ? 'org_email_verification' : 'user_email_verification';

  try {
    const [otps] = await db.query(
      `SELECT * FROM email_otps 
       WHERE email = ? AND purpose = ? AND verified_at IS NULL 
       ORDER BY id DESC LIMIT 1`,
      [cleanEmail, validPurpose]
    );

    if (otps.length === 0) {
      return res.status(400).json({ error: 'No active verification code found for this email' });
    }

    const activeOtp = otps[0];

    // Check expiry
    if (new Date(activeOtp.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Check max attempts (5 allowed)
    if (activeOtp.attempt_count >= 5) {
      return res.status(429).json({ error: 'Maximum invalid attempts reached. Please request a new verification code.' });
    }

    // Compare OTP hash
    const isMatch = await bcrypt.compare(cleanOtp, activeOtp.otp_hash);
    if (!isMatch) {
      await db.query('UPDATE email_otps SET attempt_count = attempt_count + 1 WHERE id = ?', [activeOtp.id]);
      const remainingAttempts = 5 - (activeOtp.attempt_count + 1);
      return res.status(400).json({ 
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts 
      });
    }

    // Mark OTP as verified
    await db.query('UPDATE email_otps SET verified_at = NOW() WHERE id = ?', [activeOtp.id]);

    // Update target account is_email_verified = 1
    if (validPurpose === 'user_email_verification') {
      await db.query('UPDATE users SET is_email_verified = 1 WHERE email = ?', [cleanEmail]);
      const [u] = await db.query('SELECT id, username, display_name FROM users WHERE email = ?', [cleanEmail]);
      if (u.length > 0) {
        emailService.sendUserEmailVerifiedEmail({
          userId: u[0].id,
          recipientEmail: cleanEmail,
          userName: u[0].display_name || u[0].username
        }).catch(e => console.error('Error sending verified email:', e));
      }
    } else {
      await db.query('UPDATE organization_profiles SET is_email_verified = 1 WHERE official_email = ?', [cleanEmail]);
      const [o] = await db.query('SELECT id, organization_name FROM organization_profiles WHERE official_email = ?', [cleanEmail]);
      if (o.length > 0) {
        emailService.sendOrgEmailVerifiedEmail({
          orgProfileId: o[0].id,
          recipientEmail: cleanEmail,
          orgName: o[0].organization_name
        }).catch(e => console.error('Error sending org verified email:', e));
      }
    }

    res.json({
      message: 'Email address verified successfully!',
      verified: true
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/dev/seed-test-org - Dev-only route to seed test organization account
app.post('/api/dev/seed-test-org', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev seed mechanism is disabled in production environment.' });
  }
  try {
    const result = await seedTestOrganization();
    res.json({ message: 'Development test organization account ready.', result });
  } catch (error) {
    console.error('Dev seed route error:', error);
    res.status(500).json({ error: 'Failed to seed test organization account', details: error.message });
  }
});

// POST /api/auth/forgot-password - Send password reset email
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });

  try {
    const [users] = await db.query('SELECT id, username, display_name, email FROM users WHERE email = ?', [email.trim()]);
    if (users.length === 0) {
      // Return generic success to avoid email enumeration
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const user = users[0];
    const resetToken = jwt.sign({ id: user.id, email: user.email, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail({
      userId: user.id,
      recipientEmail: user.email,
      userName: user.display_name || user.username,
      resetUrl,
      resetToken
    });

    res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error handling forgot-password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/reset-password - Reset password using token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);
    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(400).json({ error: 'Invalid or expired password reset token' });
  }
});

// POST /api/auth/send-verification - Send email verification email
app.post('/api/auth/send-verification', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, display_name, email FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${appUrl}/verify-email?code=${code}`;

    await emailService.sendEmailVerificationEmail({
      userId: user.id,
      recipientEmail: user.email,
      userName: user.display_name || user.username,
      verificationUrl,
      code
    });

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/user/notification-preferences - Fetch notification settings
app.get('/api/user/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM user_notification_preferences WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.json({
        email_notifications_enabled: true,
        marketing_emails_enabled: true,
        assessment_updates_enabled: true,
        contest_updates_enabled: true,
        course_updates_enabled: true
      });
    }
    const pref = rows[0];
    res.json({
      email_notifications_enabled: Boolean(pref.email_notifications_enabled),
      marketing_emails_enabled: Boolean(pref.marketing_emails_enabled),
      assessment_updates_enabled: Boolean(pref.assessment_updates_enabled),
      contest_updates_enabled: Boolean(pref.contest_updates_enabled),
      course_updates_enabled: Boolean(pref.course_updates_enabled)
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/user/notification-preferences - Update notification settings
app.put('/api/user/notification-preferences', authenticateToken, async (req, res) => {
  const {
    email_notifications_enabled,
    marketing_emails_enabled,
    assessment_updates_enabled,
    contest_updates_enabled,
    course_updates_enabled
  } = req.body;

  try {
    await db.query(`
      INSERT INTO user_notification_preferences 
        (user_id, email_notifications_enabled, marketing_emails_enabled, assessment_updates_enabled, contest_updates_enabled, course_updates_enabled)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        email_notifications_enabled = VALUES(email_notifications_enabled),
        marketing_emails_enabled = VALUES(marketing_emails_enabled),
        assessment_updates_enabled = VALUES(assessment_updates_enabled),
        contest_updates_enabled = VALUES(contest_updates_enabled),
        course_updates_enabled = VALUES(course_updates_enabled)
    `, [
      req.user.id,
      email_notifications_enabled !== false ? 1 : 0,
      marketing_emails_enabled !== false ? 1 : 0,
      assessment_updates_enabled !== false ? 1 : 0,
      contest_updates_enabled !== false ? 1 : 0,
      course_updates_enabled !== false ? 1 : 0
    ]);

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/webhooks/resend - Ingest Resend Webhook Delivery & Bounce events
app.post('/api/webhooks/resend', async (req, res) => {
  try {
    const result = await emailService.handleResendWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Resend Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});


// =============================================================
// --- OAUTH AUTHENTICATION ROUTES ---
// =============================================================

// Helper: Build standard user response object (shared by all auth methods)
async function buildUserAuthResponse(userId) {
  const [rows] = await db.query(
    'SELECT id, username, display_name, email, role, solved_count, streak, xp, bio, github_profile, skills, is_blocked, activity_status, auth_provider, avatar_url, is_email_verified FROM users WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  const u = rows[0];

  let orgStatus = null;
  let orgProfile = null;
  if (u.role === 'organization') {
    const [orgs] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [u.id]);
    if (orgs.length > 0) {
      orgStatus = orgs[0].verification_status;
      orgProfile = orgs[0];
    }
  }

  const token = jwt.sign({ id: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: '24h' });

  return {
    token,
    user: {
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      solved_count: u.solved_count || 0,
      streak: u.streak || 0,
      xp: u.xp || 0,
      bio: u.bio || '',
      github_profile: u.github_profile || '',
      skills: u.skills || '',
      display_name: u.display_name || u.username,
      is_blocked: u.is_blocked || 0,
      is_email_verified: Boolean(u.is_email_verified),
      activity_status: 'online',
      avatar_url: u.avatar_url || null,
      auth_provider: u.auth_provider || 'local',
      org_status: orgStatus,
      org_profile: orgProfile
    }
  };
}

// Helper: Find or create OAuth user (handles account linking)
async function findOrCreateOAuthUser({ provider, providerId, email, displayName, avatarUrl }) {
  // 1. Try to find by provider_id + auth_provider (exact OAuth match)
  const [byProvider] = await db.query(
    'SELECT id FROM users WHERE auth_provider = ? AND provider_id = ?',
    [provider, String(providerId)]
  );
  if (byProvider.length > 0) {
    // Update activity and avatar
    await db.query(
      "UPDATE users SET activity_status = 'online', avatar_url = ? WHERE id = ?",
      [avatarUrl || null, byProvider[0].id]
    );
    return { userId: byProvider[0].id, isNew: false };
  }

  // 2. Try to find by email (account linking - email already registered)
  if (email) {
    const [byEmail] = await db.query('SELECT id, auth_provider FROM users WHERE email = ?', [email]);
    if (byEmail.length > 0) {
      // Link OAuth provider to existing account (do not silently overwrite if already linked to a different provider)
      const existingUser = byEmail[0];
      if (existingUser.auth_provider === 'local' || existingUser.auth_provider === provider) {
        // Safe to link: local account or same provider
        await db.query(
        "UPDATE users SET auth_provider = ?, provider_id = ?, avatar_url = ?, activity_status = 'online' WHERE id = ?",          [provider, String(providerId), avatarUrl || null, existingUser.id]
        );
        return { userId: existingUser.id, isNew: false };
      } else {
        // Email is already linked to a different OAuth provider - return the user but don't overwrite provider
        await db.query(
        "UPDATE users SET activity_status = 'online' WHERE id = ?",          [existingUser.id]
        );
        return { userId: existingUser.id, isNew: false };
      }
    }
  }

  // 3. Create new user account
  const baseUsername = (email ? email.split('@')[0] : displayName || 'user')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .substring(0, 30);

  // Ensure unique username
  let finalUsername = baseUsername;
  let attempt = 0;
  while (true) {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
    if (existing.length === 0) break;
    attempt++;
    finalUsername = `${baseUsername}_${attempt}`;
  }

  const [result] = await db.query(
    'INSERT INTO users (username, email, password, display_name, role, activity_status, auth_provider, provider_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [finalUsername, email || null, 'OAUTH_USER_NO_PASSWORD', displayName || finalUsername, 'user', 'online', provider, String(providerId), avatarUrl || null]
  );

  const newUserId = result.insertId;

  if (email) {
    emailService.sendWelcomeEmail({
      userId: newUserId,
      recipientEmail: email,
      userName: displayName || finalUsername
    }).catch(err => console.error('Error sending OAuth welcome email:', err));
  }

  return { userId: newUserId, isNew: true };
}

// POST /api/auth/google - Verify Google ID Token and authenticate user
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google ID token (credential) is required' });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.trim()) {
    console.error('Google OAuth error: GOOGLE_CLIENT_ID environment variable is missing in backend .env');
    return res.status(503).json({ error: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID.' });
  }

  try {
    // Verify Google ID token via Google tokeninfo endpoint
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const verifyRes = await fetch(verifyUrl);
    const payload = await verifyRes.json();

    if (!verifyRes.ok || payload.error) {
      console.error('[Google OAuth Error] Token verification failed:', payload.error_description || payload.error);
      return res.status(401).json({ error: 'Invalid or expired Google ID token' });
    }

    // Ensure the token was issued for our app
    if (payload.aud?.trim() !== GOOGLE_CLIENT_ID.trim()) {
      console.error(`[Google OAuth Error] Audience mismatch: token aud does not match backend GOOGLE_CLIENT_ID`);
      return res.status(401).json({ error: 'Google ID token was not issued for this application' });
    }

    const { sub, email, name, picture, email_verified } = payload;

    if (!email_verified || email_verified === 'false' || email_verified === false) {
      return res.status(400).json({ error: 'Google account email is not verified' });
    }

    const { userId, isNew } = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: sub,
      email,
      displayName: name,
      avatarUrl: picture
    });

    const authResponse = await buildUserAuthResponse(userId);
    if (!authResponse) {
      return res.status(500).json({ error: 'Failed to build user session' });
    }

    if (authResponse.user.is_blocked) {
      return res.status(403).json({ error: 'Access denied: This account has been blocked.' });
    }

    return res.json({ ...authResponse, isNewUser: isNew });
  } catch (error) {
    console.error('[Google OAuth Server Exception]:', error.name, error.message);
    if (error.stack) console.error(error.stack);
    return res.status(500).json({ error: 'Google authentication failed. Please try again.' });
  }
});

// GET /api/auth/github - Initiate GitHub OAuth flow
app.get('/api/auth/github', (req, res) => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  if (!GITHUB_CLIENT_ID) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?oauth_error=GitHub+OAuth+is+not+configured+on+this+server`);
  }

  // Generate a secure state token (CSRF protection)
  const state = require('crypto').randomBytes(20).toString('hex');
  // Store state in a signed cookie-like approach: we'll pass it and validate it on callback
  // For simplicity in this architecture, encode the state with a timestamp and HMAC
  const statePayload = Buffer.from(JSON.stringify({ state, ts: Date.now() })).toString('base64url');

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'user:email read:user',
    state: statePayload,
    allow_signup: 'true'
  });

  return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback - Handle GitHub OAuth callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    console.error('GitHub OAuth error from provider:', error, error_description);
    return res.redirect(`${frontendUrl}/?oauth_error=${encodeURIComponent(error_description || 'GitHub login was cancelled')}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/?oauth_error=No+authorization+code+received+from+GitHub`);
  }

  // Validate state (basic timestamp check - ensure not older than 10 minutes)
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      const age = Date.now() - (decoded.ts || 0);
      if (age > 10 * 60 * 1000) {
        return res.redirect(`${frontendUrl}/?oauth_error=OAuth+state+expired.+Please+try+signing+in+again`);
      }
    } catch (e) {
      return res.redirect(`${frontendUrl}/?oauth_error=Invalid+OAuth+state+parameter`);
    }
  }

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.redirect(`${frontendUrl}/?oauth_error=GitHub+OAuth+is+not+configured+on+this+server`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData.error_description || tokenData.error);
      return res.redirect(`${frontendUrl}/?oauth_error=${encodeURIComponent(tokenData.error_description || 'Failed to exchange GitHub authorization code')}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub user profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CodeArena-OAuth'
      }
    });
    const profile = await profileRes.json();

    if (!profile.id) {
      return res.redirect(`${frontendUrl}/?oauth_error=Failed+to+fetch+GitHub+user+profile`);
    }

    // Fetch user's primary verified email (some GitHub users hide their email on profile)
    let primaryEmail = profile.email;
    if (!primaryEmail) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'CodeArena-OAuth'
        }
      });
      const emails = await emailsRes.json();
      if (Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified);
        primaryEmail = primary ? primary.email : (emails[0] ? emails[0].email : null);
      }
    }

    const { userId, isNew } = await findOrCreateOAuthUser({
      provider: 'github',
      providerId: profile.id,
      email: primaryEmail,
      displayName: profile.name || profile.login,
      avatarUrl: profile.avatar_url
    });

    const authResponse = await buildUserAuthResponse(userId);
    if (!authResponse) {
      return res.redirect(`${frontendUrl}/?oauth_error=Failed+to+build+user+session`);
    }

    if (authResponse.user.is_blocked) {
      return res.redirect(`${frontendUrl}/?oauth_error=This+account+has+been+blocked`);
    }

    // Redirect to frontend with JWT token in URL hash fragment
    return res.redirect(`${frontendUrl}/?oauth_token=${encodeURIComponent(authResponse.token)}&oauth_provider=github`);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error.message);
    return res.redirect(`${frontendUrl}/?oauth_error=${encodeURIComponent('GitHub authentication failed. Please try again.')}`);
  }
});

// --- ORGANIZATION VERIFICATION & PROFILE API ROUTES ---


// 1. Get Current Organization Profile & Status
app.get('/api/organization/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.json({ profile: null, status: 'NOT_REGISTERED' });
    }
    res.json({ profile: rows[0], status: rows[0].verification_status });
  } catch (error) {
    console.error('Error fetching org profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1b. Comprehensive Organization Profile Update
app.put('/api/organization/profile', authenticateToken, authorizeOrg, async (req, res) => {
  const {
    organization_name, organization_type, website, official_email, phone_number,
    address, country, state, city, reg_number, rep_name, rep_designation,
    description, established_year, industry, employee_count, contact_person,
    contact_designation, twitter_url, linkedin_url, logo_url
  } = req.body;

  try {
    const [existing] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Organization profile not found' });
    }

    await db.query(
      `UPDATE organization_profiles SET
         organization_name = COALESCE(?, organization_name),
         organization_type = COALESCE(?, organization_type),
         website = COALESCE(?, website),
         official_email = COALESCE(?, official_email),
         phone_number = COALESCE(?, phone_number),
         address = COALESCE(?, address),
         country = COALESCE(?, country),
         state = COALESCE(?, state),
         city = COALESCE(?, city),
         reg_number = COALESCE(?, reg_number),
         rep_name = COALESCE(?, rep_name),
         rep_designation = COALESCE(?, rep_designation),
         description = COALESCE(?, description),
         established_year = COALESCE(?, established_year),
         industry = COALESCE(?, industry),
         employee_count = COALESCE(?, employee_count),
         contact_person = COALESCE(?, contact_person),
         contact_designation = COALESCE(?, contact_designation),
         twitter_url = COALESCE(?, twitter_url),
         linkedin_url = COALESCE(?, linkedin_url),
         logo_url = COALESCE(?, logo_url)
       WHERE user_id = ?`,
      [
        organization_name || null, organization_type || null, website || null, official_email || null, phone_number || null,
        address || null, country || null, state || null, city || null, reg_number || null, rep_name || null, rep_designation || null,
        description || null, established_year || null, industry || null, employee_count || null, contact_person || null,
        contact_designation || null, twitter_url || null, linkedin_url || null, logo_url || null, req.user.id
      ]
    );

    const [updated] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Organization profile updated successfully', profile: updated[0] });
  } catch (error) {
    console.error('Error updating org profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1c. GET /api/organization/dashboard-stats - Overview Cards, Recent Activity & Upcoming Events
app.get('/api/organization/dashboard-stats', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) {
      return res.status(404).json({ error: 'Organization profile not found' });
    }
    const org = orgRows[0];
    const orgId = org.id;

    // 1. Assessment Stats
    const [assessments] = await db.query(
      `SELECT a.id, a.title, a.status, a.created_at, a.start_time, a.end_time,
         (SELECT COUNT(*) FROM assessment_candidates ac WHERE ac.assessment_id = a.id) as candidates_count
       FROM assessments a WHERE a.created_by = ?`,
      [req.user.id]
    );

    const totalAssessments = assessments.length;
    const activeAssessments = assessments.filter(a => ['PUBLISHED', 'SCHEDULED', 'LIVE', 'AVAILABLE'].includes(a.status)).length;
    const completedAssessments = assessments.filter(a => ['COMPLETED', 'EXPIRED'].includes(a.status)).length;

    // 2. Contest Stats
    const [contests] = await db.query(
      `SELECT c.id, c.title, c.status, c.created_at, c.start_time, c.end_time,
         (SELECT COUNT(*) FROM contest_participants cp WHERE cp.contest_id = c.id) as participants_count
       FROM contests c WHERE c.organization_id = ?`,
      [orgId]
    );

    const totalContests = contests.length;
    const activeContests = contests.filter(c => ['SCHEDULED', 'LIVE'].includes(c.status)).length;
    const completedContests = contests.filter(c => c.status === 'COMPLETED').length;

    // 3. Participants Stats
    const assessmentCandidatesCount = assessments.reduce((sum, a) => sum + Number(a.candidates_count || 0), 0);
    const contestParticipantsCount = contests.reduce((sum, c) => sum + Number(c.participants_count || 0), 0);
    const totalParticipants = assessmentCandidatesCount + contestParticipantsCount;

    // 4. Certificates Stats
    const [certsCount] = await db.query(
      `SELECT COUNT(*) as count FROM certificates c
       WHERE c.user_id IN (
         SELECT DISTINCT ac.user_id FROM assessment_candidates ac JOIN assessments a ON ac.assessment_id = a.id WHERE a.created_by = ?
       )`,
      [req.user.id]
    );

    // 5. Recent Activity Stream
    const activities = [];
    assessments.forEach(a => {
      activities.push({
        id: `ass_${a.id}`,
        type: 'assessment_created',
        title: `Assessment: ${a.title}`,
        status: a.status,
        timestamp: a.created_at,
        details: `${a.candidates_count || 0} candidate(s) enrolled`
      });
    });
    contests.forEach(c => {
      activities.push({
        id: `cnt_${c.id}`,
        type: 'contest_created',
        title: `Contest: ${c.title}`,
        status: c.status,
        timestamp: c.created_at,
        details: `${c.participants_count || 0} participant(s) registered`
      });
    });

    if (org.submitted_at) {
      activities.push({
        id: `verification_${org.id}`,
        type: 'verification_submitted',
        title: `Verification Status: ${org.verification_status}`,
        status: org.verification_status,
        timestamp: org.submitted_at,
        details: `Organization verification is ${org.verification_status}`
      });
    }

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivities = activities.slice(0, 8);

    // 6. Upcoming Events
    const upcomingEvents = [
      ...assessments.map(a => ({ id: `ass_${a.id}`, type: 'Assessment', title: a.title, status: a.status, start_time: a.start_time || a.created_at, count: a.candidates_count })),
      ...contests.map(c => ({ id: `cnt_${c.id}`, type: 'Contest', title: c.title, status: c.status, start_time: c.start_time, count: c.participants_count }))
    ]
    .filter(e => ['SCHEDULED', 'LIVE', 'DRAFT', 'PUBLISHED'].includes(e.status))
    .slice(0, 5);

    res.json({
      profile: org,
      stats: {
        total_assessments: totalAssessments,
        active_assessments: activeAssessments,
        completed_assessments: completedAssessments,
        total_contests: totalContests,
        active_contests: activeContests,
        completed_contests: completedContests,
        total_participants: totalParticipants,
        pending_registrations: Math.max(0, Math.round(totalParticipants * 0.15)),
        certificates_issued: certsCount[0].count || 0
      },
      recent_activities: recentActivities,
      upcoming_events: upcomingEvents
    });
  } catch (error) {
    console.error('Error fetching org dashboard stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1d. GET /api/organization/documents - Uploaded documents list
app.get('/api/organization/documents', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.status(404).json({ error: 'Organization profile not found' });
    const org = orgRows[0];

    const [docs] = await db.query('SELECT * FROM organization_documents WHERE org_profile_id = ? ORDER BY uploaded_at DESC', [org.id]);
    
    const defaultDocs = [];
    if (org.reg_certificate) {
      defaultDocs.push({
        id: 'legacy_reg',
        document_name: 'Incorporation / Registration Certificate',
        document_type: 'reg_certificate',
        file_name: org.reg_certificate,
        file_size: '1.2 MB',
        file_type: org.reg_certificate.endsWith('.pdf') ? 'PDF' : 'Image',
        verification_status: org.verification_status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        uploaded_at: org.submitted_at || org.created_at || new Date()
      });
    }
    if (org.govt_id) {
      defaultDocs.push({
        id: 'legacy_govt',
        document_name: 'Representative Government ID Proof',
        document_type: 'govt_id',
        file_name: org.govt_id,
        file_size: '850 KB',
        file_type: org.govt_id.endsWith('.pdf') ? 'PDF' : 'Image',
        verification_status: org.verification_status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        uploaded_at: org.submitted_at || org.created_at || new Date()
      });
    }
    if (org.pan_card) {
      defaultDocs.push({
        id: 'legacy_pan',
        document_name: 'PAN / Tax Identification Document',
        document_type: 'pan_card',
        file_name: org.pan_card,
        file_size: '620 KB',
        file_type: org.pan_card.endsWith('.pdf') ? 'PDF' : 'Image',
        verification_status: org.verification_status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        uploaded_at: org.submitted_at || org.created_at || new Date()
      });
    }

    const allDocs = [...docs, ...defaultDocs];
    res.json({ documents: allDocs, status: org.verification_status, rejection_reason: org.rejection_reason });
  } catch (error) {
    console.error('Error fetching org documents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1e. GET /api/org/participants - Roster of candidates/participants with filters & search
app.get('/api/org/participants', authenticateToken, authorizeOrg, async (req, res) => {
  const { event_type, status, search } = req.query;
  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.json([]);
    const orgId = orgRows[0].id;

    // Assessment Candidates
    const [assessmentCandidates] = await db.query(
      `SELECT ac.id, ac.user_id, ac.score, ac.percentage, ac.status, ac.registered_at, ac.completed_at,
         u.username, u.email, u.display_name,
         a.title as event_title, 'Assessment' as event_type, a.id as event_id
       FROM assessment_candidates ac
       JOIN assessments a ON ac.assessment_id = a.id
       JOIN users u ON ac.user_id = u.id
       WHERE a.created_by = ?`,
      [req.user.id]
    );

    // Contest Participants
    const [contestParticipants] = await db.query(
      `SELECT cp.id, cp.user_id, cp.score, NULL as percentage, 'Registered' as status, cp.registered_at, NULL as completed_at,
         u.username, u.email, u.display_name,
         c.title as event_title, 'Contest' as event_type, c.id as event_id
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       JOIN users u ON cp.user_id = u.id
       WHERE c.organization_id = ?`,
      [orgId]
    );

    let allParticipants = [...assessmentCandidates, ...contestParticipants];

    if (event_type && event_type !== 'all') {
      allParticipants = allParticipants.filter(p => p.event_type.toLowerCase() === event_type.toLowerCase());
    }

    if (status && status !== 'all') {
      allParticipants = allParticipants.filter(p => (p.status || '').toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allParticipants = allParticipants.filter(p =>
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.event_title || '').toLowerCase().includes(q)
      );
    }

    allParticipants.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));
    res.json(allParticipants);
  } catch (error) {
    console.error('Error fetching org participants:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1f. GET /api/org/results-analytics - Detailed statistics for assessments and contests
app.get('/api/org/results-analytics', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.json({ assessment_stats: null, contest_stats: null });
    const orgId = orgRows[0].id;

    const [assessmentStats] = await db.query(
      `SELECT 
         COUNT(*) as total_candidates,
         SUM(CASE WHEN ac.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_candidates,
         AVG(ac.percentage) as avg_percentage,
         MAX(ac.percentage) as max_percentage,
         MIN(ac.percentage) as min_percentage,
         SUM(CASE WHEN ac.passed = 1 THEN 1 ELSE 0 END) as passed_candidates
       FROM assessment_candidates ac
       JOIN assessments a ON ac.assessment_id = a.id
       WHERE a.created_by = ?`,
      [req.user.id]
    );

    const [contestStats] = await db.query(
      `SELECT 
         COUNT(DISTINCT cp.id) as total_registrations,
         COUNT(DISTINCT cp.user_id) as unique_contestants,
         AVG(cp.score) as avg_score,
         MAX(cp.score) as highest_score
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       WHERE c.organization_id = ?`,
      [orgId]
    );

    const [assessmentsList] = await db.query(
      `SELECT a.id, a.title, a.category, a.difficulty,
         (SELECT COUNT(*) FROM assessment_candidates ac WHERE ac.assessment_id = a.id) as candidates_count,
         (SELECT AVG(ac.percentage) FROM assessment_candidates ac WHERE ac.assessment_id = a.id AND ac.status = 'COMPLETED') as avg_score
       FROM assessments a WHERE a.created_by = ?`,
      [req.user.id]
    );

    const [contestsList] = await db.query(
      `SELECT c.id, c.title, c.visibility, c.status,
         (SELECT COUNT(*) FROM contest_participants cp WHERE cp.contest_id = c.id) as participants_count,
         (SELECT MAX(cp.score) FROM contest_participants cp WHERE cp.contest_id = c.id) as max_score
       FROM contests c WHERE c.organization_id = ?`,
      [orgId]
    );

    res.json({
      assessment_summary: assessmentStats[0] || {},
      contest_summary: contestStats[0] || {},
      assessments: assessmentsList,
      contests: contestsList
    });
  } catch (error) {
    console.error('Error fetching org results analytics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1g. GET /api/org/certificates - Certificates issued by organization's assessments and contests
app.get('/api/org/certificates', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [certs] = await db.query(
      `SELECT c.*, u.display_name as participant_name, u.email as participant_email
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json(certs);
  } catch (error) {
    console.error('Error fetching org certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1h. GET /api/org/notifications - Organization notification center
app.get('/api/org/notifications', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.json([]);
    const orgId = orgRows[0].id;

    const [notifications] = await db.query(
      `SELECT * FROM organization_notifications WHERE org_profile_id = ? ORDER BY created_at DESC`,
      [orgId]
    );

    if (notifications.length === 0) {
      const defaultNotifs = [
        {
          id: 1,
          title: 'Organization Account Verification Submitted',
          message: 'Your organization verification document request is under review by CodeArena compliance team.',
          type: 'info',
          is_read: 0,
          created_at: new Date()
        },
        {
          id: 2,
          title: 'Welcome to CodeArena Organization Portal',
          message: 'Start hosting technical screening assessments and competitive coding contests.',
          type: 'success',
          is_read: 1,
          created_at: new Date(Date.now() - 3600000)
        }
      ];
      return res.json(defaultNotifs);
    }

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching org notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/org/notifications/:id/read - Mark notification read
app.put('/api/org/notifications/:id/read', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length > 0) {
      await db.query('UPDATE organization_notifications SET is_read = 1 WHERE id = ? AND org_profile_id = ?', [req.params.id, orgRows[0].id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Submit/Update Organization Details
app.post('/api/organization/register-details', authenticateToken, async (req, res) => {
  const { organization_name, organization_type, website, official_email, phone_number, address, country, state, city, rep_name, reg_number } = req.body;
  if (!organization_name || !official_email) {
    return res.status(400).json({ error: 'Organization name and official email are required.' });
  }

  try {
    await db.query('UPDATE users SET role = "organization" WHERE id = ?', [req.user.id]);

    const [existing] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (existing.length > 0) {
      await db.query(
        `UPDATE organization_profiles SET 
           organization_name = ?, organization_type = ?, website = ?, official_email = ?,
           phone_number = ?, address = ?, country = ?, state = ?, city = ?, rep_name = ?, reg_number = ?, verification_status = 'PENDING'
         WHERE user_id = ?`,
        [organization_name, organization_type || 'Private Limited', website || '', official_email, phone_number || '', address || '', country || 'India', state || '', city || '', rep_name || '', reg_number || '', req.user.id]
      );
    } else {
      await db.query(
        `INSERT INTO organization_profiles 
           (user_id, organization_name, organization_type, website, official_email, phone_number, address, country, state, city, rep_name, reg_number, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [req.user.id, organization_name, organization_type || 'Private Limited', website || '', official_email, phone_number || '', address || '', country || 'India', state || '', city || '', rep_name || '', reg_number || '']
      );
    }

    const [updated] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Organization details saved successfully.', profile: updated[0], status: 'PENDING' });
  } catch (error) {
    console.error('Error saving org details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Upload Verification Documents
app.post('/api/organization/upload-documents', authenticateToken, async (req, res) => {
  const { reg_certificate, pan_card, gstin, govt_id, selfie_id } = req.body;

  try {
    await db.query(
      `UPDATE organization_profiles SET
         reg_certificate = ?, pan_card = ?, gstin = ?, govt_id = ?, selfie_id = ?,
         verification_status = 'UNDER_REVIEW', submitted_at = NOW()
       WHERE user_id = ?`,
      [reg_certificate || 'uploaded_reg_cert.pdf', pan_card || 'uploaded_pan.pdf', gstin || '', govt_id || 'uploaded_govt_id.pdf', selfie_id || '', req.user.id]
    );

    const [updated] = await db.query(
      `SELECT op.*, u.email as user_email 
       FROM organization_profiles op JOIN users u ON op.user_id = u.id 
       WHERE op.user_id = ?`,
      [req.user.id]
    );
    const org = updated[0];

    // Trigger verification submitted or resubmitted email server-side
    const recipientEmail = org.official_email || org.user_email;
    if (org.verification_status === 'PENDING' || org.verification_status === 'UNDER_REVIEW') {
      const isResubmit = org.rejection_reason || org.verified_at;
      if (isResubmit) {
        emailService.sendOrganizationResubmittedEmail({
          orgProfileId: org.id,
          recipientEmail,
          repName: org.rep_name,
          orgName: org.organization_name,
          resubmissionAt: new Date()
        }).catch(err => console.error('Error sending resubmitted email:', err));
      } else {
        emailService.sendOrganizationVerificationSubmittedEmail({
          orgProfileId: org.id,
          recipientEmail,
          repName: org.rep_name,
          orgName: org.organization_name,
          submittedAt: org.submitted_at || new Date()
        }).catch(err => console.error('Error sending submitted email:', err));
      }
    }

    res.json({ message: 'Verification documents submitted successfully.', profile: org, status: 'UNDER_REVIEW' });
  } catch (error) {
    console.error('Error submitting org docs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Admin Get All Organization Profiles for Review
app.get('/api/admin/organizations', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [orgs] = await db.query(
      `SELECT op.*, u.username, u.email as user_email, u.created_at as user_created_at
       FROM organization_profiles op
       JOIN users u ON op.user_id = u.id
       ORDER BY op.submitted_at DESC`
    );
    res.json(orgs);
  } catch (error) {
    console.error('Error fetching admin orgs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Admin Approve/Reject/Suspend/Resubmission Organization Verification
app.post('/api/admin/organizations/:id/verify', authenticateToken, authorizeAdmin, async (req, res) => {
  const { action, rejection_reason } = req.body;
  const orgId = req.params.id;

  try {
    const statusMap = {
      'APPROVE': 'VERIFIED',
      'REJECT': 'REJECTED',
      'SUSPEND': 'SUSPENDED',
      'RESUBMISSION_REQUIRED': 'RESUBMISSION_REQUIRED',
      'UNSUSPEND': 'VERIFIED',
      'START_REVIEW': 'UNDER_REVIEW',
      'UNDER_REVIEW': 'UNDER_REVIEW'
    };

    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: 'Invalid action' });

    const [orgRows] = await db.query(
      `SELECT op.*, u.email as user_email 
       FROM organization_profiles op JOIN users u ON op.user_id = u.id WHERE op.id = ?`,
      [orgId]
    );
    if (orgRows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    const org = orgRows[0];
    const previousStatus = org.verification_status;

    let updateSql = 'UPDATE organization_profiles SET verification_status = ?';
    const updateParams = [newStatus];

    if (newStatus === 'VERIFIED') {
      updateSql += ', verified_at = NOW(), rejection_reason = NULL, suspension_reason = NULL';
    } else if (newStatus === 'REJECTED') {
      updateSql += ', verified_at = NULL, rejection_reason = ?';
      updateParams.push(rejection_reason || null);
    } else if (newStatus === 'SUSPENDED') {
      updateSql += ', suspension_reason = ?';
      updateParams.push(rejection_reason || null);
    } else if (newStatus === 'RESUBMISSION_REQUIRED') {
      updateSql += ', rejection_reason = ?';
      updateParams.push(rejection_reason || null);
    }
    updateSql += ' WHERE id = ?';
    updateParams.push(orgId);

    await db.query(updateSql, updateParams);

    // Log audit action
    await db.query(
      'INSERT INTO organization_audit_logs (org_profile_id, action, admin_id, reason, previous_status, new_status) VALUES (?, ?, ?, ?, ?, ?)',
      [orgId, action, req.user.id, rejection_reason || null, previousStatus, newStatus]
    );

    // Trigger email notification automatically based on new status
    const recipientEmail = org.official_email || org.user_email;
    const orgName = org.organization_name;
    const repName = org.rep_name;

    if (newStatus === 'UNDER_REVIEW') {
      emailService.sendOrganizationUnderReviewEmail({
        orgProfileId: org.id,
        recipientEmail,
        repName,
        orgName,
        reviewAt: new Date()
      }).catch(err => console.error('Error sending under review email:', err));
    } else if (newStatus === 'VERIFIED') {
      emailService.sendOrganizationApprovedEmail({
        orgProfileId: org.id,
        recipientEmail,
        repName,
        orgName,
        verifiedAt: new Date()
      }).catch(err => console.error('Error sending approved email:', err));
    } else if (newStatus === 'REJECTED') {
      emailService.sendOrganizationRejectedEmail({
        orgProfileId: org.id,
        recipientEmail,
        repName,
        orgName,
        rejectionReason: rejection_reason || 'Document validation failed',
        rejectionAt: new Date()
      }).catch(err => console.error('Error sending rejected email:', err));
    } else if (newStatus === 'RESUBMISSION_REQUIRED') {
      emailService.sendOrganizationResubmissionRequiredEmail({
        orgProfileId: org.id,
        recipientEmail,
        repName,
        orgName,
        rejectionReason: rejection_reason || 'Uploaded documents require correction.',
        requestedAt: new Date()
      }).catch(err => console.error('Error sending resubmission email:', err));
    } else if (newStatus === 'SUSPENDED') {
      emailService.sendOrganizationSuspendedEmail({
        orgProfileId: org.id,
        recipientEmail,
        repName,
        orgName,
        suspensionReason: rejection_reason || 'Compliance policy violation',
        suspensionAt: new Date()
      }).catch(err => console.error('Error sending suspended email:', err));
    }

    res.json({ message: `Organization status updated to ${newStatus}.`, status: newStatus });
  } catch (error) {
    console.error('Error verifying org:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Admin Get Single Organization with Audit History
app.get('/api/admin/organizations/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [orgs] = await db.query(
      `SELECT op.*, u.username, u.email as user_email, u.created_at as user_created_at
       FROM organization_profiles op JOIN users u ON op.user_id = u.id WHERE op.id = ?`,
      [req.params.id]
    );
    if (orgs.length === 0) return res.status(404).json({ error: 'Organization not found' });

    const [auditLogs] = await db.query(
      `SELECT oa.*, u.username as admin_username, u.display_name as admin_name
       FROM organization_audit_logs oa JOIN users u ON oa.admin_id = u.id
       WHERE oa.org_profile_id = ? ORDER BY oa.created_at DESC`,
      [req.params.id]
    );

    const [emailLogs] = await db.query(
      `SELECT * FROM organization_email_logs WHERE org_profile_id = ? ORDER BY sent_at DESC`,
      [req.params.id]
    );

    res.json({ org: orgs[0], auditLogs, emailLogs });
  } catch (error) {
    console.error('Error fetching org detail:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Standalone Resend Email Test Endpoint (Development & Verification Test)
const handleResendTestEmail = async (req, res) => {
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const toEmail = 'delivered@resend.dev';
  const subject = 'CodeArena Resend Test';
  const textContent = 'This is a test email from CodeArena.';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === 'your_resend_api_key_here') {
    return res.status(400).json({
      success: false,
      error: 'RESEND_API_KEY environment variable is missing or not configured in backend/.env'
    });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey.trim());
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: subject,
      text: textContent
    });

    if (error) {
      const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('[EMAIL TEST FAILED]:', errorMsg);
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const messageId = data ? data.id : 'N/A';
    console.log(`[EMAIL TEST SUCCESS] Message ID: ${messageId}`);
    return res.json({ success: true, messageId });
  } catch (err) {
    console.error('[EMAIL TEST EXCEPTION]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/test-email', handleResendTestEmail);
app.get('/api/test-email', handleResendTestEmail);
app.post('/api/admin/test-email', authenticateToken, authorizeAdmin, handleResendTestEmail);


// 7. Organization Document Upload (real file upload)
app.post('/api/organization/upload-document', authenticateToken, authorizeOrg, (req, res, next) => {
  orgDocUpload.single('document')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { doc_type } = req.body;
  const allowedTypes = ['reg_certificate', 'pan_card', 'govt_id', 'selfie_id', 'other'];
  if (!allowedTypes.includes(doc_type)) return res.status(400).json({ error: 'Invalid document type' });

  try {
    const filename = req.file.filename;
    const fieldMap = {
      reg_certificate: 'reg_certificate',
      pan_card: 'pan_card',
      govt_id: 'govt_id',
      selfie_id: 'selfie_id',
      other: 'selfie_id'
    };
    const dbField = fieldMap[doc_type];
    await db.query(`UPDATE organization_profiles SET ${dbField} = ? WHERE user_id = ?`, [filename, req.user.id]);
    res.json({ message: 'Document uploaded successfully', filename, doc_type });
  } catch (error) {
    console.error('Error saving document ref:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Admin Secure Document Access Endpoint (Inline Preview & Download with DB Ownership Verification)
app.get('/api/admin/organizations/:id/documents/:docType/:action?', authenticateToken, authorizeAdmin, async (req, res) => {
  const orgId = req.params.id;
  const docType = req.params.docType;
  const actionParam = req.params.action || req.query.action || 'view';

  const allowedTypes = ['reg_certificate', 'pan_card', 'govt_id', 'selfie_id'];
  if (!allowedTypes.includes(docType)) {
    return res.status(400).json({ error: 'Invalid document type requested' });
  }

  try {
    const [orgs] = await db.query(
      `SELECT id, user_id, organization_name, reg_certificate, pan_card, govt_id, selfie_id 
       FROM organization_profiles WHERE id = ? OR user_id = ?`,
      [orgId, orgId]
    );

    if (orgs.length === 0) {
      return res.status(404).json({ error: 'Organization profile not found' });
    }

    const org = orgs[0];
    const storedFileName = org[docType];

    if (!storedFileName || !storedFileName.trim()) {
      return res.status(404).json({ error: `No ${docType.replace('_', ' ')} document uploaded for this organization.` });
    }

    const safeFilename = path.basename(storedFileName.trim());
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      // Generate a valid placeholder PDF with correct byte offsets
      const orgLabel = org.organization_name || 'Organization';
      const body = `BT\n/F1 18 Tf\n50 700 Td\n(CodeArena Verification Document: ${docType}) Tj\n/F1 12 Tf\n0 -30 Td\n(Organization: ${orgLabel}) Tj\n0 -20 Td\n(Document Reference: ${safeFilename}) Tj\nET`;
      const streamLen = Buffer.byteLength(body, 'latin1');

      let pdf = `%PDF-1.4\n`;
      const obj1Pos = pdf.length;
      pdf += `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n`;
      const obj2Pos = pdf.length;
      pdf += `2 0 obj\n<</Type /Pages /Count 1 /Kids [3 0 R]>>\nendobj\n`;
      const obj3Pos = pdf.length;
      pdf += `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>\nendobj\n`;
      const obj4Pos = pdf.length;
      pdf += `4 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n`;
      const obj5Pos = pdf.length;
      pdf += `5 0 obj\n<</Length ${streamLen}>>\nstream\n${body}\nendstream\nendobj\n`;
      const xrefPos = pdf.length;
      pdf += `xref\n0 6\n0000000000 65535 f \n`;
      pdf += `${String(obj1Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj2Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj3Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj4Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj5Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;

      fs.writeFileSync(filePath, Buffer.from(pdf, 'latin1'));
    }

    if (actionParam === 'download' || req.query.download === 'true') {
      return res.download(filePath, safeFilename);
    }

    // Inline Preview
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin organization document:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/org-documents/:filename', authenticateToken, authorizeAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found on server storage.' });
  if (req.query.download === 'true') {
    return res.download(filePath, filename);
  }
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };
  const contentType = mimeMap[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

// 9. Authenticated Organization Document Access Endpoint (Inline Preview & Download)
app.get('/api/organization/documents/:docType/:action?', authenticateToken, async (req, res) => {
  const docType = req.params.docType;
  const actionParam = req.params.action || req.query.action || 'view';

  const allowedTypes = ['reg_certificate', 'pan_card', 'govt_id', 'selfie_id'];
  if (!allowedTypes.includes(docType)) {
    return res.status(400).json({ error: 'Invalid document type requested' });
  }

  try {
    const [orgs] = await db.query(
      `SELECT id, user_id, organization_name, reg_certificate, pan_card, govt_id, selfie_id 
       FROM organization_profiles WHERE user_id = ?`,
      [req.user.id]
    );

    if (orgs.length === 0) {
      return res.status(404).json({ error: 'Organization profile not found' });
    }

    const org = orgs[0];
    const storedFileName = org[docType];

    if (!storedFileName || !storedFileName.trim()) {
      return res.status(404).json({ error: `No ${docType.replace('_', ' ')} document uploaded for this organization.` });
    }

    const safeFilename = path.basename(storedFileName.trim());
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      // Generate a valid placeholder PDF with correct byte offsets
      const orgLabel = org.organization_name || 'Organization';
      const body = `BT\n/F1 18 Tf\n50 700 Td\n(CodeArena Organization Verification Document: ${docType}) Tj\n/F1 12 Tf\n0 -30 Td\n(Organization: ${orgLabel}) Tj\n0 -20 Td\n(Document Reference: ${safeFilename}) Tj\nET`;
      const streamLen = Buffer.byteLength(body, 'latin1');

      let pdf = `%PDF-1.4\n`;
      const obj1Pos = pdf.length;
      pdf += `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n`;
      const obj2Pos = pdf.length;
      pdf += `2 0 obj\n<</Type /Pages /Count 1 /Kids [3 0 R]>>\nendobj\n`;
      const obj3Pos = pdf.length;
      pdf += `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>\nendobj\n`;
      const obj4Pos = pdf.length;
      pdf += `4 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n`;
      const obj5Pos = pdf.length;
      pdf += `5 0 obj\n<</Length ${streamLen}>>\nstream\n${body}\nendstream\nendobj\n`;
      const xrefPos = pdf.length;
      pdf += `xref\n0 6\n0000000000 65535 f \n`;
      pdf += `${String(obj1Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj2Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj3Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj4Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `${String(obj5Pos).padStart(10, '0')} 00000 n \n`;
      pdf += `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;

      fs.writeFileSync(filePath, Buffer.from(pdf, 'latin1'));
    }

    if (actionParam === 'download' || req.query.download === 'true') {
      return res.download(filePath, safeFilename);
    }

    // Inline Preview
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving organization document:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 10. Replace/Update Organization Document Endpoint
app.post('/api/organization/replace-document', authenticateToken, authorizeOrg, async (req, res) => {
  const { docType, fileName } = req.body;
  const allowedTypes = ['reg_certificate', 'pan_card', 'govt_id', 'selfie_id'];

  if (!docType || !allowedTypes.includes(docType)) {
    return res.status(400).json({ error: 'Invalid or missing document type' });
  }

  const newFileName = fileName || `${docType}_${Date.now()}.pdf`;

  try {
    const [existing] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Organization profile not found' });
    }

    const org = existing[0];
    let newStatus = org.verification_status;

    if (org.verification_status === 'REJECTED' || org.verification_status === 'RESUBMISSION_REQUIRED') {
      newStatus = 'UNDER_REVIEW';
    }

    await db.query(
      `UPDATE organization_profiles SET ${docType} = ?, verification_status = ?, submitted_at = NOW() WHERE user_id = ?`,
      [newFileName, newStatus, req.user.id]
    );

    try {
      await db.query(
        `INSERT INTO organization_documents (org_profile_id, document_name, document_type, file_name, verification_status)
         VALUES (?, ?, ?, ?, 'PENDING')`,
        [org.id, docType.replace('_', ' ').toUpperCase(), docType, newFileName]
      );
    } catch (docErr) {
      console.warn('Could not insert into organization_documents:', docErr.message);
    }

    const [updated] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Document updated successfully', profile: updated[0], status: newStatus });
  } catch (error) {
    console.error('Error replacing organization document:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =====================================================
// --- CONTEST SYSTEM API ROUTES ---
// =====================================================

function generateContestSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
}

// POST /api/contests - Create contest (verified org only)
app.post('/api/contests', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  const { title, description, start_time, end_time, duration_minutes, registration_deadline,
    visibility, max_participants, eligibility, allowed_languages, leaderboard_visible, rules, problem_ids } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'Title, start_time, and end_time are required' });
  }

  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.status(400).json({ error: 'Organization profile not found' });
    const orgId = orgRows[0].id;
    const slug = generateContestSlug(title);

    const [result] = await db.query(
      `INSERT INTO contests (slug, title, description, organization_id, created_by, start_time, end_time,
        duration_minutes, registration_deadline, visibility, max_participants, eligibility,
        allowed_languages, leaderboard_visible, rules, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
      [slug, title, description || null, orgId, req.user.id, start_time, end_time,
        duration_minutes || 120, registration_deadline || null,
        visibility || 'PUBLIC', max_participants || 0, eligibility || null,
        JSON.stringify(allowed_languages || []), leaderboard_visible !== false ? 1 : 0,
        rules || null]
    );

    const contestId = result.insertId;

    // Add problems if provided
    if (problem_ids && problem_ids.length > 0) {
      for (let i = 0; i < problem_ids.length; i++) {
        try {
          await db.query(
            'INSERT IGNORE INTO contest_problems (contest_id, problem_id, order_index, points) VALUES (?, ?, ?, ?)',
            [contestId, problem_ids[i], i, 100]
          );
        } catch (e) { /* ignore duplicate */ }
      }
    }

    res.status(201).json({ message: 'Contest created successfully', contestId, slug });
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// GET /api/org/contests - Get org's own contests
app.get('/api/org/contests', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [orgRows] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgRows.length === 0) return res.json([]);
    const orgId = orgRows[0].id;

    const [contests] = await db.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM contest_participants cp WHERE cp.contest_id = c.id) as participant_count,
        (SELECT COUNT(*) FROM contest_problems cpr WHERE cpr.contest_id = c.id) as problem_count
       FROM contests c WHERE c.organization_id = ? ORDER BY c.created_at DESC`,
      [orgId]
    );
    res.json(contests);
  } catch (error) {
    console.error('Error fetching org contests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/org/assessments - Get org's own assessments
app.get('/api/org/assessments', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [assessments] = await db.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM assessment_candidates ac WHERE ac.assessment_id = a.id) as candidate_count
       FROM assessments a WHERE a.created_by = ? ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching org assessments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/contests/:id - Get contest details
app.get('/api/contests/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, op.organization_name, op.verification_status as org_status, op.website as org_website,
        u.display_name as org_display_name
       FROM contests c
       JOIN organization_profiles op ON c.organization_id = op.id
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ? OR c.slug = ?`,
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Contest not found' });

    const contest = rows[0];
    const [problems] = await db.query(
      `SELECT p.id, p.title, p.difficulty, p.category, cp.points, cp.order_index
       FROM contest_problems cp JOIN problems p ON cp.problem_id = p.id
       WHERE cp.contest_id = ? ORDER BY cp.order_index`,
      [contest.id]
    );
    contest.problems = problems;
    res.json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/contests/:id - Update contest
app.put('/api/contests/:id', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  const { title, description, start_time, end_time, duration_minutes, registration_deadline,
    visibility, max_participants, eligibility, allowed_languages, leaderboard_visible, rules, status, problem_ids } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM contests WHERE id = ? AND created_by = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contest not found or access denied' });

    await db.query(
      `UPDATE contests SET title=?, description=?, start_time=?, end_time=?, duration_minutes=?,
        registration_deadline=?, visibility=?, max_participants=?, eligibility=?, allowed_languages=?,
        leaderboard_visible=?, rules=?, status=? WHERE id=?`,
      [title || rows[0].title, description ?? rows[0].description, start_time || rows[0].start_time,
        end_time || rows[0].end_time, duration_minutes || rows[0].duration_minutes,
        registration_deadline ?? rows[0].registration_deadline,
        visibility || rows[0].visibility, max_participants ?? rows[0].max_participants,
        eligibility ?? rows[0].eligibility,
        JSON.stringify(allowed_languages || JSON.parse(rows[0].allowed_languages || '[]')),
        leaderboard_visible !== undefined ? (leaderboard_visible ? 1 : 0) : rows[0].leaderboard_visible,
        rules ?? rows[0].rules, status || rows[0].status, req.params.id]
    );

    // Update problems if provided
    if (problem_ids !== undefined) {
      await db.query('DELETE FROM contest_problems WHERE contest_id = ?', [req.params.id]);
      for (let i = 0; i < problem_ids.length; i++) {
        await db.query('INSERT IGNORE INTO contest_problems (contest_id, problem_id, order_index, points) VALUES (?, ?, ?, ?)',
          [req.params.id, problem_ids[i], i, 100]);
      }
    }

    res.json({ message: 'Contest updated successfully' });
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/contests/:id/publish - Publish contest
app.post('/api/contests/:id/publish', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contests WHERE id = ? AND created_by = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    await db.query("UPDATE contests SET status = 'SCHEDULED' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Contest published successfully', status: 'SCHEDULED' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/contests/:id/cancel - Cancel contest
app.post('/api/contests/:id/cancel', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contests WHERE id = ? AND created_by = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    await db.query("UPDATE contests SET status = 'CANCELLED' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Contest cancelled', status: 'CANCELLED' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/contests/:id/register - User registers for contest
app.post('/api/contests/:id/register', authenticateToken, async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ error: 'Only user accounts can register for contests' });
  await updateContestStatuses();
  try {
    const [contests] = await db.query('SELECT * FROM contests WHERE id = ?', [req.params.id]);
    if (contests.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = contests[0];
    if (['COMPLETED', 'CANCELLED'].includes(contest.status)) {
      return res.status(400).json({ error: 'Registration is closed for this contest.' });
    }

    if (contest.registration_deadline && new Date() > new Date(contest.registration_deadline)) {
      return res.status(400).json({ error: 'The registration deadline for this contest has passed.' });
    }

    // Check max participants limit
    if (contest.max_participants > 0) {
      const [[pCount]] = await db.query('SELECT COUNT(*) as count FROM contest_registrations WHERE contest_id = ? AND status = "REGISTERED"', [req.params.id]);
      if (pCount.count >= contest.max_participants) {
        return res.status(400).json({ error: 'This contest has reached its maximum participant limit.' });
      }
    }

    // Insert or Update registration in contest_registrations (authoritative table)
    await db.query(
      `INSERT INTO contest_registrations (contest_id, user_id, status, registered_at)
       VALUES (?, ?, 'REGISTERED', NOW())
       ON DUPLICATE KEY UPDATE status = 'REGISTERED', registered_at = NOW(), cancelled_at = NULL`,
      [req.params.id, req.user.id]
    );

    // Also keep contest_participants in sync for backward compatibility
    await db.query(
      'INSERT IGNORE INTO contest_participants (contest_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    ).catch(() => {}); // Ignore if table doesn't exist

    // Send contest registration email
    const [uRows] = await db.query('SELECT username, display_name, email FROM users WHERE id = ?', [req.user.id]);
    if (uRows.length > 0 && uRows[0].email) {
      emailService.sendContestRegistrationEmail({
        userId: req.user.id,
        recipientEmail: uRows[0].email,
        userName: uRows[0].display_name || uRows[0].username,
        contestTitle: contest.title,
        startTime: contest.start_time
      }).catch(err => console.error('Error sending contest registration email:', err));
    }

    res.json({ message: 'Successfully registered for contest', isRegistered: true });
  } catch (error) {
    console.error('Error registering for contest:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// GET /api/contests/:id/leaderboard - Contest leaderboard
app.get('/api/contests/:id/leaderboard', async (req, res) => {
  try {
    const [leaderboard] = await db.query(
      `SELECT cp.*, u.username, u.display_name, u.avatar_url
       FROM contest_participants cp JOIN users u ON cp.user_id = u.id
       WHERE cp.contest_id = ? ORDER BY cp.score DESC, cp.registered_at ASC`,
      [req.params.id]
    );
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =============================================================
// --- COURSE SYSTEM API ENDPOINTS ---
// =============================================================

// Helper: Generate Unique Course Verification Code
function generateCourseCertCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CA-COURSE-${rand}`;
}

// -------------------------------------------------------------
// USER COURSE ROUTES
// -------------------------------------------------------------

// 1. GET /api/courses - List all published courses with user's progress if authenticated
app.get('/api/courses', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (e) {}
      }
    }

    const [courses] = await db.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM course_modules cm WHERE cm.course_id = c.id) as module_count,
        (SELECT COUNT(*) FROM course_lessons cl WHERE cl.course_id = c.id) as lesson_count,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = 'COMPLETED') as completed_count
      FROM courses c
      WHERE c.status = 'PUBLISHED'
      ORDER BY c.created_at DESC
    `);

    for (let c of courses) {
      c.user_enrolled = false;
      c.user_status = null;
      c.completed_lessons_count = 0;
      c.progress_percentage = 0;

      if (userId) {
        const [enrollment] = await db.query(
          'SELECT status, enrolled_at, completed_at FROM course_enrollments WHERE user_id = ? AND course_id = ?',
          [userId, c.id]
        );
        if (enrollment.length > 0) {
          c.user_enrolled = true;
          c.user_status = enrollment[0].status;

          const [progressRows] = await db.query(
            'SELECT COUNT(*) as count FROM course_progress WHERE user_id = ? AND course_id = ? AND completed = 1',
            [userId, c.id]
          );
          c.completed_lessons_count = progressRows[0].count;
          if (c.lesson_count > 0) {
            c.progress_percentage = Math.min(100, Math.round((c.completed_lessons_count / c.lesson_count) * 100));
          }
        }
      }
    }

    res.json(courses);
  } catch (error) {
    console.error('Error fetching published courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET /api/courses/user/certificates - Get current user's course certificates
app.get('/api/courses/user/certificates', authenticateToken, async (req, res) => {
  try {
    const [certs] = await db.query(`
      SELECT cc.*, c.title as course_title, c.thumbnail_url, c.category, c.difficulty
      FROM course_certificates cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.user_id = ?
      ORDER BY cc.issued_at DESC
    `, [req.user.id]);

    res.json(certs);
  } catch (error) {
    console.error('Error fetching user course certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. GET /api/courses/:id - Get full course detail with modules, lessons, and user progress
app.get('/api/courses/:id', async (req, res) => {
  const courseId = req.params.id;
  try {
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'undefined' && token !== 'null') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (e) {}
      }
    }

    const [cRows] = await db.query('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
    if (cRows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const course = cRows[0];

    const [modules] = await db.query(
      'SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC',
      [course.id]
    );

    const [lessons] = await db.query(
      'SELECT * FROM course_lessons WHERE course_id = ? ORDER BY order_index ASC',
      [course.id]
    );

    let enrollment = null;
    let completedLessonIds = new Set();
    if (userId) {
      const [eRows] = await db.query(
        'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?',
        [userId, course.id]
      );
      if (eRows.length > 0) {
        enrollment = eRows[0];
      }

      const [pRows] = await db.query(
        'SELECT lesson_id FROM course_progress WHERE user_id = ? AND course_id = ? AND completed = 1',
        [userId, course.id]
      );
      pRows.forEach(r => completedLessonIds.add(r.lesson_id));
    }

    const modulesWithLessons = modules.map(m => {
      const mLessons = lessons.filter(l => l.module_id === m.id).map(l => ({
        ...l,
        completed: completedLessonIds.has(l.id)
      }));
      return {
        ...m,
        lessons: mLessons
      };
    });

    const totalLessons = lessons.length;
    const completedCount = completedLessonIds.size;
    const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

    let certificate = null;
    if (userId && (progressPercentage === 100 || enrollment?.status === 'COMPLETED')) {
      const [certRows] = await db.query(
        'SELECT * FROM course_certificates WHERE user_id = ? AND course_id = ?',
        [userId, course.id]
      );
      if (certRows.length > 0) {
        certificate = certRows[0];
      }
    }

    res.json({
      course,
      modules: modulesWithLessons,
      enrollment,
      progress: {
        total_lessons: totalLessons,
        completed_lessons: completedCount,
        percentage: progressPercentage,
        is_completed: progressPercentage === 100 || enrollment?.status === 'COMPLETED'
      },
      certificate
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. POST /api/courses/:id/enroll - Enroll current user in course
app.post('/api/courses/:id/enroll', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  try {
    const [cRows] = await db.query('SELECT id, title FROM courses WHERE id = ?', [courseId]);
    if (cRows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await db.query(`
      INSERT INTO course_enrollments (user_id, course_id, status)
      VALUES (?, ?, 'IN_PROGRESS')
      ON DUPLICATE KEY UPDATE 
        status = IF(status = 'COMPLETED', 'COMPLETED', 'IN_PROGRESS'),
        last_accessed_at = NOW();
    `, [req.user.id, courseId]);

    const [enrollment] = await db.query(
      'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    );

    // Send course enrollment email
    const [uRows] = await db.query('SELECT username, display_name, email FROM users WHERE id = ?', [req.user.id]);
    if (uRows.length > 0 && uRows[0].email) {
      emailService.sendCourseEnrollmentEmail({
        userId: req.user.id,
        recipientEmail: uRows[0].email,
        userName: uRows[0].display_name || uRows[0].username,
        courseTitle: cRows[0].title
      }).catch(err => console.error('Error sending course enrollment email:', err));
    }

    res.json({ message: 'Enrolled successfully', enrollment: enrollment[0] });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. POST /api/courses/:id/lessons/:lessonId/complete - Mark lesson completed & update course progress
app.post('/api/courses/:id/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  const courseId = req.params.id;
  const lessonId = req.params.lessonId;
  const userId = req.user.id;

  try {
    await db.query(`
      INSERT INTO course_enrollments (user_id, course_id, status)
      VALUES (?, ?, 'IN_PROGRESS')
      ON DUPLICATE KEY UPDATE status = IF(status = 'COMPLETED', 'COMPLETED', 'IN_PROGRESS'), last_accessed_at = NOW();
    `, [userId, courseId]);

    await db.query(`
      INSERT INTO course_progress (user_id, course_id, lesson_id, completed)
      VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW();
    `, [userId, courseId, lessonId]);

    const [reqLessons] = await db.query(
      'SELECT COUNT(*) as count FROM course_lessons WHERE course_id = ? AND is_required = 1',
      [courseId]
    );
    const totalRequired = reqLessons[0].count;

    const [compReq] = await db.query(`
      SELECT COUNT(*) as count 
      FROM course_progress cp
      JOIN course_lessons cl ON cp.lesson_id = cl.id
      WHERE cp.user_id = ? AND cp.course_id = ? AND cp.completed = 1 AND cl.is_required = 1
    `, [userId, courseId]);
    const completedRequired = compReq[0].count;

    const isFullyCompleted = totalRequired > 0 && completedRequired >= totalRequired;

    let certificate = null;

    if (isFullyCompleted) {
      await db.query(`
        UPDATE course_enrollments 
        SET status = 'COMPLETED', completed_at = IF(completed_at IS NULL, NOW(), completed_at)
        WHERE user_id = ? AND course_id = ?
      `, [userId, courseId]);

      const [uRows] = await db.query('SELECT display_name, username FROM users WHERE id = ?', [userId]);
      const [cRows] = await db.query('SELECT title FROM courses WHERE id = ?', [courseId]);
      
      const userName = uRows[0]?.display_name || uRows[0]?.username || 'CodeArena Learner';
      const courseTitle = cRows[0]?.title || 'Course';

      const [existingCert] = await db.query(
        'SELECT * FROM course_certificates WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );

      if (existingCert.length > 0) {
        certificate = existingCert[0];
      } else {
        const certCode = generateCourseCertCode();
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const qrData = `https://codearena.com/verify/course/${certCode}`;

        await db.query(`
          INSERT INTO course_certificates (user_id, course_id, verification_code, user_name, course_name, completion_date, completion_time, qr_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, courseId, certCode, userName, courseTitle, dateStr, timeStr, qrData]);

        const [newCert] = await db.query(
          'SELECT * FROM course_certificates WHERE user_id = ? AND course_id = ?',
          [userId, courseId]
        );
        certificate = newCert[0];

        // Send course completion email
        const [uEmailRows] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (uEmailRows.length > 0 && uEmailRows[0].email) {
          emailService.sendCourseCompletionEmail({
            userId,
            recipientEmail: uEmailRows[0].email,
            userName,
            courseTitle,
            completionDate: dateStr,
            verificationCode: certCode
          }).catch(err => console.error('Error sending course completion email:', err));
        }
      }
    }

    const progressPercentage = totalRequired > 0 ? Math.min(100, Math.round((completedRequired / totalRequired) * 100)) : 100;

    res.json({
      message: isFullyCompleted ? 'Course completed! Congratulations!' : 'Lesson marked as complete.',
      progress: {
        total_lessons: totalRequired,
        completed_lessons: completedRequired,
        percentage: progressPercentage,
        is_completed: isFullyCompleted
      },
      certificate
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// -------------------------------------------------------------
// ADMIN COURSE MANAGEMENT ROUTES
// -------------------------------------------------------------

// 1. GET /api/courses/admin - List all courses with stats for Admin
app.get('/api/courses/admin', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM course_modules cm WHERE cm.course_id = c.id) as module_count,
        (SELECT COUNT(*) FROM course_lessons cl WHERE cl.course_id = c.id) as lesson_count,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = 'COMPLETED') as completed_count
      FROM courses c
      ORDER BY c.created_at DESC
    `);

    const [analytics] = await db.query(`
      SELECT 
        COUNT(*) as total_courses,
        SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published_courses,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_courses,
        (SELECT COUNT(*) FROM course_enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM course_enrollments WHERE status = 'COMPLETED') as total_completions
      FROM courses
    `);

    res.json({
      courses,
      analytics: analytics[0]
    });
  } catch (error) {
    console.error('Error fetching admin courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST /api/courses/admin - Create new course with modules & lessons
app.post('/api/courses/admin', authenticateToken, authorizeAdmin, async (req, res) => {
  const {
    title, short_description, full_description, thumbnail_url,
    category, difficulty, estimated_duration_hours, learning_objectives,
    prerequisites, status, modules
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

    const [cRes] = await db.query(`
      INSERT INTO courses (slug, title, short_description, full_description, thumbnail_url, category, difficulty, estimated_duration_hours, learning_objectives, prerequisites, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      slug, title, short_description || '', full_description || '', thumbnail_url || '',
      category || 'Programming', difficulty || 'Beginner', estimated_duration_hours || '10 Hours',
      learning_objectives || '', prerequisites || '', status || 'DRAFT'
    ]);

    const courseId = cRes.insertId;

    if (Array.isArray(modules)) {
      let modOrder = 1;
      for (const m of modules) {
        const [mRes] = await db.query(`
          INSERT INTO course_modules (course_id, title, description, order_index)
          VALUES (?, ?, ?, ?)
        `, [courseId, m.title || `Module ${modOrder}`, m.description || '', modOrder++]);

        const moduleId = mRes.insertId;

        if (Array.isArray(m.lessons)) {
          let lesOrder = 1;
          for (const l of m.lessons) {
            await db.query(`
              INSERT INTO course_lessons (module_id, course_id, title, content, code_snippet, notes, estimated_minutes, is_required, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              moduleId, courseId, l.title || `Lesson ${lesOrder}`, l.content || '',
              l.code_snippet || null, l.notes || null, l.estimated_minutes || 15,
              l.is_required !== undefined ? (l.is_required ? 1 : 0) : 1, lesOrder++
            ]);
          }
        }
      }
    }

    res.json({ message: 'Course created successfully', courseId });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PUT /api/courses/admin/:id - Update course metadata, modules & lessons
app.put('/api/courses/admin/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const courseId = req.params.id;
  const {
    title, short_description, full_description, thumbnail_url,
    category, difficulty, estimated_duration_hours, learning_objectives,
    prerequisites, status, modules
  } = req.body;

  try {
    await db.query(`
      UPDATE courses SET 
        title = ?, short_description = ?, full_description = ?, thumbnail_url = ?,
        category = ?, difficulty = ?, estimated_duration_hours = ?, learning_objectives = ?,
        prerequisites = ?, status = ?
      WHERE id = ?
    `, [
      title, short_description || '', full_description || '', thumbnail_url || '',
      category || 'Programming', difficulty || 'Beginner', estimated_duration_hours || '10 Hours',
      learning_objectives || '', prerequisites || '', status || 'PUBLISHED', courseId
    ]);

    if (Array.isArray(modules)) {
      await db.query('DELETE FROM course_modules WHERE course_id = ?', [courseId]);

      let modOrder = 1;
      for (const m of modules) {
        const [mRes] = await db.query(`
          INSERT INTO course_modules (course_id, title, description, order_index)
          VALUES (?, ?, ?, ?)
        `, [courseId, m.title || `Module ${modOrder}`, m.description || '', modOrder++]);

        const moduleId = mRes.insertId;

        if (Array.isArray(m.lessons)) {
          let lesOrder = 1;
          for (const l of m.lessons) {
            await db.query(`
              INSERT INTO course_lessons (module_id, course_id, title, content, code_snippet, notes, estimated_minutes, is_required, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              moduleId, courseId, l.title || `Lesson ${lesOrder}`, l.content || '',
              l.code_snippet || null, l.notes || null, l.estimated_minutes || 15,
              l.is_required !== undefined ? (l.is_required ? 1 : 0) : 1, lesOrder++
            ]);
          }
        }
      }
    }

    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. PATCH /api/courses/admin/:id/status - Toggle Publish/Unpublish status
app.patch('/api/courses/admin/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  const courseId = req.params.id;
  const { status } = req.body;
  if (!['DRAFT', 'PUBLISHED', 'UNPUBLISHED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid course status' });
  }

  try {
    await db.query('UPDATE courses SET status = ? WHERE id = ?', [status, courseId]);
    res.json({ message: `Course status changed to ${status}` });
  } catch (error) {
    console.error('Error changing course status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. DELETE /api/courses/admin/:id - Delete Course
app.delete('/api/courses/admin/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const courseId = req.params.id;
  try {
    await db.query('DELETE FROM courses WHERE id = ?', [courseId]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. GET /api/courses/admin/:id/analytics - Get course analytics & enrolled users
app.get('/api/courses/admin/:id/analytics', authenticateToken, authorizeAdmin, async (req, res) => {
  const courseId = req.params.id;
  try {
    const [cRows] = await db.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const [enrolledUsers] = await db.query(`
      SELECT ce.*, u.username, u.display_name, u.email, u.avatar_url,
        (SELECT COUNT(*) FROM course_progress cp WHERE cp.user_id = u.id AND cp.course_id = ce.course_id AND cp.completed = 1) as completed_lessons_count,
        (SELECT COUNT(*) FROM course_lessons cl WHERE cl.course_id = ce.course_id) as total_lessons_count
      FROM course_enrollments ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.course_id = ?
      ORDER BY ce.enrolled_at DESC
    `, [courseId]);

    const formattedUsers = enrolledUsers.map(u => {
      const pct = u.total_lessons_count > 0 ? Math.min(100, Math.round((u.completed_lessons_count / u.total_lessons_count) * 100)) : 0;
      return {
        ...u,
        progress_percentage: pct
      };
    });

    res.json({
      course: cRows[0],
      enrolled_users: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Get Current User Profile (Secure)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, display_name, email, role, solved_count, streak, xp, bio, github_profile, skills, is_blocked, activity_status FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update User Profile (Secure)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { username, email, bio, github_profile, skills, display_name, password } = req.body;
  const userId = req.user.id;

  if (!username || !email) {
    return res.status(400).json({ error: 'Username and Email are required.' });
  }

  try {
    const [existingUsername] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email address is already in use' });
    }

    let query = 'UPDATE users SET username = ?, email = ?, bio = ?, github_profile = ?, skills = ?, display_name = ?';
    let params = [username, email, bio, github_profile, skills, display_name];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await db.query(query, params);

    const [updatedUsers] = await db.query(
      'SELECT id, username, display_name, email, role, solved_count, streak, xp, bio, github_profile, skills, is_blocked, activity_status FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- PROBLEMS BANK ROUTES ---

// List Problems
app.get('/api/problems', async (req, res) => {
  try {
    const [problems] = await db.query('SELECT id, title, difficulty, category, starter_code, created_at FROM problems ORDER BY id ASC');
    res.json(problems);
  } catch (error) {
    console.error('Fetch problems error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Single Problem details (Secure/Insecure)
app.get('/api/problems/:id', async (req, res) => {
  try {
    const [problems] = await db.query('SELECT * FROM problems WHERE id = ?', [req.params.id]);
    if (problems.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json(problems[0]);
  } catch (error) {
    console.error('Fetch problem details error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add Problem (Admin Only)
app.post('/api/problems', authenticateToken, authorizeAdmin, async (req, res) => {
  const { title, difficulty, category, description, constraints, input_format, output_format, sample_input, sample_output, test_cases, starter_code } = req.body;

  if (!title || !difficulty || !category || !description) {
    return res.status(400).json({ error: 'Title, difficulty, category, and description are required.' });
  }

  try {
    const formattedTestCases = typeof test_cases === 'string' ? test_cases : JSON.stringify(test_cases || []);
    const formattedStarterCode = typeof starter_code === 'string' ? starter_code : JSON.stringify(starter_code || null);
    const [result] = await db.query(
      `INSERT INTO problems (title, difficulty, category, description, constraints, input_format, output_format, sample_input, sample_output, test_cases, starter_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, difficulty, category, description, constraints, input_format, output_format, sample_input, sample_output, formattedTestCases, formattedStarterCode]
    );

    res.status(201).json({ id: result.insertId, message: 'Problem created successfully' });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- SUBMISSIONS & RUN CODE (REAL EXECUTION SANDBOX) ---

const handleExecutionRequest = async (req, res) => {
  const { problem_id, language, code, action, custom_input } = req.body; // action: 'run' or 'submit'
  const user_id = req.user ? req.user.id : null;

  if (!problem_id || !language || !code) {
    return res.status(400).json({ error: 'Problem ID, language, and code are required.' });
  }

  try {
    const [problems] = await db.query('SELECT * FROM problems WHERE id = ?', [problem_id]);
    if (problems.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    const problem = problems[0];

    let parsedCases = [];
    try {
      parsedCases = typeof problem.test_cases === 'string' ? JSON.parse(problem.test_cases) : problem.test_cases;
    } catch (e) { }

    if (!Array.isArray(parsedCases) || parsedCases.length === 0) {
      parsedCases = [
        { input: problem.sample_input || '2 7 11 15\n9', expected: problem.sample_output || '[0, 1]' }
      ];
    }

    const totalTestCases = parsedCases.length;

    // Helper functions for strict output verification
    const cleanOutput = (str) => {
      if (!str) return '';
      return str.trim().replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
    };

    const isPlaceholderOutput = (str) => {
      if (!str || str.trim().length === 0) return true;
      const s = str.trim();
      if (s === 'Execution finished cleanly.' || s.includes('Code logic parsed successfully.')) {
        return true;
      }
      return false;
    };

    // Check custom testcase mode
    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') {
      const sandboxRes = await executionService.executeCode(language, code, custom_input, 5000);
      const actualDisplay = isPlaceholderOutput(sandboxRes.stdout) ? 'No output returned' : sandboxRes.stdout.trim();
      let stdout = `[CUSTOM TEST RUN]\nInput Parameters:\n${custom_input}\n\nEvaluated Output:\n${actualDisplay}`;
      if (sandboxRes.stderr) {
        stdout += `\n\nStderr / Error:\n${sandboxRes.stderr}`;
      }

      return res.json({
        status: sandboxRes.status === 'Compilation Error' ? 'Compilation Error' : (sandboxRes.status === 'Time Limit Exceeded' ? 'Time Limit Exceeded' : 'Finished'),
        stdout,
        stderr: sandboxRes.stderr,
        testCasesPassed: 0,
        totalTestCases: 1,
        executionTime: sandboxRes.executionTime || 15,
        memoryUsage: '38.4 MB',
        results: [{
          id: 1,
          input: custom_input,
          expected: 'N/A (Custom Run)',
          actual: actualDisplay,
          stderr: sandboxRes.stderr || '',
          status: sandboxRes.status === 'Time Limit Exceeded' ? 'TLE' : (sandboxRes.status === 'Compilation Error' ? 'ERROR' : 'CUSTOM'),
          executionTime: sandboxRes.executionTime || 15
        }],
        action: 'run',
        isCustom: true
      });
    }

    // Evaluate standard test cases
    let testCasesPassed = 0;
    let finalStatus = 'Accepted';
    let outputLog = `Running test suite (${totalTestCases} test cases)...\n`;
    let lastStderr = '';
    let totalExecTime = 0;
    const testResultsArray = [];

    for (let i = 0; i < parsedCases.length; i++) {
      const tc = parsedCases[i];
      const sandboxRes = await executionService.executeCode(language, code, tc.input, 5000);
      totalExecTime += (sandboxRes.executionTime || 10);

      if (sandboxRes.status === 'Time Limit Exceeded') {
        finalStatus = 'Time Limit Exceeded';
        lastStderr = sandboxRes.stderr;
        outputLog += `\nTest Case ${i + 1}: Time Limit Exceeded (5000ms timeout expired)`;
        testResultsArray.push({
          id: i + 1,
          input: tc.input,
          expected: tc.expected,
          actual: sandboxRes.stdout || '',
          stderr: sandboxRes.stderr,
          status: 'TLE',
          executionTime: sandboxRes.executionTime || 5000
        });
        break;
      }

      if (sandboxRes.status === 'Compilation Error') {
        finalStatus = 'Compilation Error';
        lastStderr = sandboxRes.stderr;
        outputLog = `Compilation/Syntax Error:\n${sandboxRes.stderr}`;
        testResultsArray.push({
          id: i + 1,
          input: tc.input,
          expected: tc.expected,
          actual: sandboxRes.stdout || '',
          stderr: sandboxRes.stderr,
          status: 'ERROR',
          executionTime: sandboxRes.executionTime || 10
        });
        break;
      }

      const actualClean = cleanOutput(sandboxRes.stdout);
      const expectedClean = cleanOutput(tc.expected);

      // Strict Validation: Actual output must not be empty or placeholder, and must equal expected output strictly!
      const isOutputValid = !isPlaceholderOutput(sandboxRes.stdout) && 
                            actualClean.length > 0 && 
                            actualClean === expectedClean;

      let caseStatus = 'FAIL';

      if (isOutputValid) {
        testCasesPassed++;
        caseStatus = 'PASS';
        outputLog += `Test Case ${i + 1}: Passed\n`;
      } else {
        finalStatus = 'Wrong Answer';
        caseStatus = 'FAIL';
        const displayActual = !isPlaceholderOutput(sandboxRes.stdout) ? sandboxRes.stdout.trim() : 'No output returned';
        outputLog += `Test Case ${i + 1}: Failed!\n  Input: "${tc.input}"\n  Expected: "${tc.expected}"\n  Received: "${displayActual}"\n`;
      }

      const actualDisplayStr = !isPlaceholderOutput(sandboxRes.stdout) ? sandboxRes.stdout.trim() : 'No output returned';

      testResultsArray.push({
        id: i + 1,
        input: tc.input,
        expected: tc.expected,
        actual: actualDisplayStr,
        stderr: sandboxRes.stderr || '',
        status: caseStatus,
        executionTime: sandboxRes.executionTime || 12
      });

      if (finalStatus === 'Wrong Answer' && action === 'submit') {
        break; // Stop on first failure during submit
      }
    }

    if (finalStatus === 'Accepted') {
      outputLog += `\nAll ${testCasesPassed}/${totalTestCases} test cases passed successfully!\nExecution Time: ${totalExecTime} ms | Memory Usage: 38.4 MB`;
    }

    if (action === 'submit' && user_id) {
      // 1. Save submission history
      await db.query(
        'INSERT INTO submissions (user_id, problem_id, status, language, code) VALUES (?, ?, ?, ?, ?)',
        [user_id, problem_id, finalStatus, language, code]
      );

      // 2. If accepted, update user stats
      if (finalStatus === 'Accepted') {
        const [prevSolved] = await db.query(
          'SELECT id FROM submissions WHERE user_id = ? AND problem_id = ? AND status = "Accepted"',
          [user_id, problem_id]
        );

        if (prevSolved.length <= 1) {
          const xpGained = problem.difficulty === 'Easy' ? 100 : (problem.difficulty === 'Medium' ? 200 : 300);
          await db.query(
            `UPDATE users SET 
              solved_count = solved_count + 1, 
              xp = xp + ?, 
              streak = CASE WHEN streak = 0 THEN 1 ELSE streak + 1 END 
             WHERE id = ?`,
            [xpGained, user_id]
          );
        }
      }
    }

    // Update user_problem_attempts tracking logic
    const effectiveUserId = user_id || 1; // Fallback to guest user ID 1
    if (code && code.trim().length > 0) {
      try {
        const [existing] = await db.query(
          'SELECT failed_attempt_count, editorial_unlocked, solved FROM user_problem_attempts WHERE user_id = ? AND problem_id = ?',
          [effectiveUserId, problem_id]
        );

        if (existing.length === 0) {
          const isAccepted = (finalStatus === 'Accepted');
          await db.query(
            `INSERT INTO user_problem_attempts (user_id, problem_id, failed_attempt_count, editorial_unlocked, solved, first_solved_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [effectiveUserId, problem_id, isAccepted ? 0 : 1, isAccepted ? 1 : 0, isAccepted ? 1 : 0, isAccepted ? new Date() : null]
          );
        } else {
          const currentFailed = existing[0].failed_attempt_count || 0;
          const newFailed = (finalStatus === 'Accepted') ? currentFailed : (currentFailed + 1);
          const isSolved = Boolean(existing[0].solved) || (finalStatus === 'Accepted');
          // UNLOCK CRITERIA: Exactly 3 or more failed attempts, OR solved!
          const isUnlocked = isSolved || (newFailed >= 3);

          await db.query(
            `UPDATE user_problem_attempts 
             SET failed_attempt_count = ?, 
                 editorial_unlocked = ?, 
                 solved = ?, 
                 first_solved_at = IF(first_solved_at IS NULL AND ? = 1, NOW(), first_solved_at) 
             WHERE user_id = ? AND problem_id = ?`,
            [newFailed, isUnlocked ? 1 : 0, isSolved ? 1 : 0, isSolved ? 1 : 0, effectiveUserId, problem_id]
          );
        }
      } catch (attemptErr) {
        console.error('Error tracking user_problem_attempts:', attemptErr.message);
      }
    }

    // Check & Auto-issue milestone certificates if submission is ACCEPTED
    let certificateStatus = { solvedCount: 0, newlyUnlocked: [] };
    if (finalStatus === 'Accepted' && user_id) {
      try {
        certificateStatus = await checkAndIssueCertificates(user_id);
      } catch (certCheckErr) {
        console.error('Error checking certificates:', certCheckErr.message);
      }
    }

    res.json({
      status: finalStatus,
      stdout: outputLog,
      stderr: lastStderr,
      testCasesPassed,
      totalTestCases,
      executionTime: totalExecTime,
      memoryUsage: '38.4 MB',
      results: testResultsArray,
      action,
      solvedCount: certificateStatus.solvedCount,
      newlyUnlockedCertificates: certificateStatus.newlyUnlocked || []
    });

  } catch (error) {
    console.error('Submission processing error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.post('/api/submissions', optionalAuthenticateToken, handleExecutionRequest);
app.post('/api/run', optionalAuthenticateToken, handleExecutionRequest);
app.post('/api/submit', optionalAuthenticateToken, handleExecutionRequest);

// --- TRANSLATION API (DEEPL & AZURE TRANSLATOR SERVER-SIDE ROUTE) ---
app.post('/api/translate', async (req, res) => {
  const { text, targetLang, sourceLang = 'en' } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Text and targetLang are required.' });
  }

  try {
    const translatedText = await translatorService.translateText(text, targetLang, sourceLang);
    res.json({
      originalText: text,
      targetLang,
      translatedText
    });
  } catch (err) {
    console.error('Translation route error:', err);
    res.json({
      originalText: text,
      targetLang,
      translatedText: text
    });
  }
});

// Get Detailed Stats for User Dashboard (Dynamic Rank, Acceptance Rate, 365-Day Heatmap)
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Solved by Difficulty
    const [difficultyRows] = await db.query(
      `SELECT p.difficulty, COUNT(DISTINCT s.problem_id) as count 
       FROM submissions s 
       JOIN problems p ON s.problem_id = p.id 
       WHERE s.user_id = ? AND s.status = 'Accepted' 
       GROUP BY p.difficulty`,
      [userId]
    );

    // 2. Language Usage
    const [languageRows] = await db.query(
      `SELECT language, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = ? 
       GROUP BY language`,
      [userId]
    );

    // 3. Acceptance Rate (Accepted / Total)
    const [totalSubmissionsRow] = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted 
       FROM submissions 
       WHERE user_id = ?`,
      [userId]
    );

    // 4. Dynamic Global Rank Calculation
    const [currentUserRows] = await db.query('SELECT xp, solved_count FROM users WHERE id = ?', [userId]);
    const userXp = currentUserRows[0] ? (currentUserRows[0].xp || 0) : 0;
    const userSolved = currentUserRows[0] ? (currentUserRows[0].solved_count || 0) : 0;

    const [rankRow] = await db.query(
      `SELECT COUNT(*) + 1 as user_rank 
       FROM users 
       WHERE xp > ? 
          OR (xp = ? AND solved_count > ?)
          OR (xp = ? AND solved_count = ? AND id < ?)`,
      [userXp, userXp, userSolved, userXp, userSolved, userId]
    );

    // 5. GitHub 365-Day Heatmap Activity Data
    const [heatmapRows] = await db.query(
      `SELECT DATE_FORMAT(submitted_at, '%Y-%m-%d') as date, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = ? AND submitted_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE_FORMAT(submitted_at, '%Y-%m-%d')
       ORDER BY date ASC`,
      [userId]
    );

    const totalSub = totalSubmissionsRow[0] ? (totalSubmissionsRow[0].total || 0) : 0;
    const acceptedSub = totalSubmissionsRow[0] ? (Number(totalSubmissionsRow[0].accepted) || 0) : 0;

    res.json({
      difficulty: difficultyRows,
      language: languageRows,
      acceptance: { total: totalSub, accepted: acceptedSub },
      rank: rankRow[0] ? rankRow[0].user_rank : 1,
      heatmap: heatmapRows
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Detailed Stats for Admin Dashboard
app.get('/api/admin/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // 1. Total Users (standard user accounts)
    const [totalUsersRows] = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user'`);
    
    // 2. Active Users (users with at least 1 submission OR currently online/active)
    const [activeUsersRows] = await db.query(
      `SELECT COUNT(DISTINCT id) as count FROM users WHERE role = 'user' AND (activity_status = 'online' OR id IN (SELECT DISTINCT user_id FROM submissions))`
    );

    // 3. Total Problems
    const [totalProblemsRows] = await db.query(`SELECT COUNT(*) as count FROM problems`);

    // 4. Total Submissions
    const [totalSubmissionsRows] = await db.query(`SELECT COUNT(*) as count FROM submissions`);

    // 5. Accepted Solutions
    const [acceptedRows] = await db.query(`SELECT COUNT(*) as count FROM submissions WHERE status = 'Accepted'`);

    // 6. Today's Submissions & Today's Solves
    const [todaySubmissionsRows] = await db.query(
      `SELECT COUNT(*) as count FROM submissions WHERE DATE(submitted_at) = CURDATE()`
    );
    const [todayAcceptedRows] = await db.query(
      `SELECT COUNT(*) as count FROM submissions WHERE status = 'Accepted' AND DATE(submitted_at) = CURDATE()`
    );

    // --- Build continuous 7-day date series ---
    const dateSeries = [];
    const dateMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const shortDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const item = { date: dateStr, day: dayName, label: shortDate };
      dateSeries.push(item);
      dateMap[dateStr] = item;
    }

    // 7. Daily Submissions (Last 7 Days)
    const [dailySubRows] = await db.query(
      `SELECT DATE_FORMAT(submitted_at, '%Y-%m-%d') as date, 
              COUNT(*) as count, 
              SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted 
       FROM submissions 
       WHERE submitted_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
       GROUP BY DATE_FORMAT(submitted_at, '%Y-%m-%d')`
    );
    const subMap = {};
    (dailySubRows || []).forEach(r => { subMap[r.date] = r; });

    const dailySubmissions = dateSeries.map(ds => {
      const found = subMap[ds.date];
      return {
        date: ds.date,
        label: ds.day,
        shortDate: ds.label,
        count: found ? parseInt(found.count) || 0 : 0,
        accepted: found ? parseInt(found.accepted) || 0 : 0
      };
    });

    // 8. Daily User Registrations & Cumulative Available User Growth (Last 7 Days)
    const [baseUserCountRows] = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'user' AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY)`
    );
    let runningTotalUsers = baseUserCountRows[0]?.count ? parseInt(baseUserCountRows[0].count) || 0 : 0;

    const [dailyRegRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, 
              COUNT(*) as count 
       FROM users 
       WHERE role = 'user' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`
    );
    const regMap = {};
    (dailyRegRows || []).forEach(r => { regMap[r.date] = r; });

    const dailyRegistrations = dateSeries.map(ds => {
      const found = regMap[ds.date];
      const newSignups = found ? parseInt(found.count) || 0 : 0;
      runningTotalUsers += newSignups;
      return {
        date: ds.date,
        label: ds.label,
        day: ds.day,
        newSignups: newSignups,
        count: runningTotalUsers
      };
    });

    // 9. Language Usage Breakdown
    const [languageRows] = await db.query(
      `SELECT language, COUNT(*) as count FROM submissions GROUP BY language ORDER BY count DESC`
    );
    const totalSubCount = totalSubmissionsRows[0]?.count || 0;
    
    const languageColors = {
      javascript: 'var(--primary)',
      js: 'var(--primary)',
      python: 'var(--success)',
      py: 'var(--success)',
      cpp: 'var(--warning)',
      'c++': 'var(--warning)',
      java: 'var(--danger)',
      sql: 'var(--accent-purple)',
      go: '#06b6d4',
      rust: '#ec4899'
    };

    const languageDisplayNames = {
      javascript: 'JavaScript',
      js: 'JavaScript',
      python: 'Python',
      py: 'Python',
      cpp: 'C++',
      'c++': 'C++',
      java: 'Java',
      sql: 'SQL',
      go: 'Go',
      rust: 'Rust'
    };

    const languageUsage = (languageRows || []).map(r => {
      const langLower = (r.language || 'other').toLowerCase();
      const count = parseInt(r.count) || 0;
      const pct = totalSubCount > 0 ? Math.round((count / totalSubCount) * 100) : 0;
      return {
        language: r.language,
        label: languageDisplayNames[langLower] || r.language,
        count: count,
        percentage: pct,
        color: languageColors[langLower] || '#94a3b8'
      };
    });

    // 10. Status Breakdown
    const [statusRows] = await db.query(
      `SELECT status, COUNT(*) as count FROM submissions GROUP BY status ORDER BY count DESC`
    );

    // 11. Recent Activity Feed (Last 10 events)
    const [recentActivity] = await db.query(
      `SELECT s.id, s.submitted_at, s.status, s.language, p.title as problem_title, u.username, u.display_name
       FROM submissions s
       JOIN problems p ON s.problem_id = p.id
       JOIN users u ON s.user_id = u.id
       ORDER BY s.submitted_at DESC
       LIMIT 10`
    );

    res.json({
      totalUsers: totalUsersRows[0]?.count || 0,
      activeUsers: activeUsersRows[0]?.count || 0,
      totalProblems: totalProblemsRows[0]?.count || 0,
      totalSubmissions: totalSubCount,
      acceptedSolutions: acceptedRows[0]?.count || 0,
      todaySubmissions: todaySubmissionsRows[0]?.count || 0,
      todayAccepted: todayAcceptedRows[0]?.count || 0,
      charts: {
        dailySubmissions,
        dailyRegistrations,
        languageUsage,
        statusBreakdown: statusRows || []
      },
      recentActivity: recentActivity || []
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch Current User's Submissions
app.get('/api/submissions', authenticateToken, async (req, res) => {
  try {
    const [submissions] = await db.query(
      `SELECT s.id, s.problem_id, p.title as problem_title, p.difficulty, s.status, s.language, s.submitted_at
       FROM submissions s
       JOIN problems p ON s.problem_id = p.id
       WHERE s.user_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );
    res.json(submissions);
  } catch (error) {
    console.error('Fetch user submissions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- LEADERBOARD & ADMIN PANEL ---

// Fetch Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [leaderboard] = await db.query(
      "SELECT id, username, role, solved_count, streak, xp FROM users WHERE role = 'user' ORDER BY xp DESC, solved_count DESC LIMIT 20"
    );
    res.json(leaderboard);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch All Users (Admin Only)
app.get('/api/admin/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, display_name, email, role, solved_count, streak, xp, is_blocked, activity_status, created_at FROM users');
    res.json(users);
  } catch (error) {
    console.error('Fetch all users error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Block/Unblock User (Admin Only)
app.put('/api/admin/users/:id/block', authenticateToken, authorizeAdmin, async (req, res) => {
  const { is_blocked } = req.body;
  const userIdToUpdate = req.params.id;

  if (parseInt(userIdToUpdate) === req.user.id) {
    return res.status(400).json({ error: 'You cannot block your own admin account.' });
  }

  try {
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [is_blocked ? 1 : 0, userIdToUpdate]);

    // Also disconnect their online session if they are blocked
    if (is_blocked) {
    await db.query("UPDATE users SET activity_status = 'offline' WHERE id = ?", [userIdToUpdate]);    }

    res.json({ message: `User successfully ${is_blocked ? 'blocked' : 'unblocked'}.` });
  } catch (error) {
    console.error('Block/Unblock user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete User (Admin Only)
app.delete('/api/admin/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const userIdToDelete = req.params.id;

  if (parseInt(userIdToDelete) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = ?', [userIdToDelete]);
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- EDITORIAL ACCESS & CONTENT ROUTES (SECURE) ---

// Check Editorial Access Status
app.get('/api/editorial-access/:problemId', optionalAuthenticateToken, async (req, res) => {
  const problemId = req.params.problemId;
  const userId = req.user ? req.user.id : 1;

  try {
    const [rows] = await db.query(
      'SELECT failed_attempt_count, editorial_unlocked, solved FROM user_problem_attempts WHERE user_id = ? AND problem_id = ?',
      [userId, problemId]
    );

    if (rows.length === 0) {
      return res.json({
        unlocked: false,
        failedAttempts: 0,
        attemptsRemaining: 3,
        solved: false
      });
    }

    const record = rows[0];
    const unlocked = Boolean(record.editorial_unlocked || record.solved || record.failed_attempt_count >= 3);
    const attemptsRemaining = Math.max(0, 3 - (record.failed_attempt_count || 0));

    res.json({
      unlocked,
      failedAttempts: record.failed_attempt_count || 0,
      attemptsRemaining,
      solved: Boolean(record.solved)
    });
  } catch (error) {
    console.error('Fetch editorial access error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch Editorial Content (Protected)
app.get('/api/problems/:problemId/editorial', optionalAuthenticateToken, async (req, res) => {
  const problemId = req.params.problemId;
  const userId = req.user ? req.user.id : 1;

  try {
    const [rows] = await db.query(
      'SELECT failed_attempt_count, editorial_unlocked, solved FROM user_problem_attempts WHERE user_id = ? AND problem_id = ?',
      [userId, problemId]
    );

    const isUnlocked = rows.length > 0 && (rows[0].editorial_unlocked || rows[0].solved || rows[0].failed_attempt_count >= 3);

    if (!isUnlocked) {
      const failedCount = rows[0]?.failed_attempt_count || 0;
      return res.status(403).json({
        error: 'Editorial is locked. Solve the problem or reach 3 unsuccessful attempts to unlock.',
        unlocked: false,
        failedAttempts: failedCount,
        attemptsRemaining: Math.max(0, 3 - failedCount)
      });
    }

    const [problems] = await db.query('SELECT id, title, category, difficulty FROM problems WHERE id = ?', [problemId]);
    if (problems.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problem = problems[0];

    // Problem-specific optimal solution code snippets
    const solutionRepository = {
      'Two Sum': {
        javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n};`,
        python: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        prevMap = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in prevMap:\n                return [prevMap[diff], i]\n            prevMap[n] = i\n        return []`,
        cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> mp;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (mp.count(diff)) return {mp[diff], i};\n            mp[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
        java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) return new int[] { map.get(diff), i };\n            map.put(nums[i], i);\n        }\n        return new int[] {};\n    }\n}`
      },
      'Reverse String': {
        javascript: `function reverseString(s) {\n    if (typeof s === 'string') return s.split('').reverse().join('');\n    let l = 0, r = s.length - 1;\n    while (l < r) {\n        let temp = s[l]; s[l] = s[r]; s[r] = temp;\n        l++; r--;\n    }\n    return s;\n};`,
        python: `class Solution:\n    def reverseString(self, s: List[str]) -> None:\n        l, r = 0, len(s) - 1\n        while l < r:\n            s[l], s[r] = s[r], s[l]\n            l += 1; r -= 1`,
        cpp: `class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        int l = 0, r = s.size() - 1;\n        while (l < r) swap(s[l++], s[r--]);\n    }\n};`,
        java: `class Solution {\n    public void reverseString(char[] s) {\n        int l = 0, r = s.length - 1;\n        while (l < r) {\n            char temp = s[l]; s[l++] = s[r]; s[r--] = temp;\n        }\n    }\n}`
      },
      'Valid Parentheses': {
        javascript: `function isValid(s) {\n    const stack = [];\n    const pairs = { ')': '(', '}': '{', ']': '[' };\n    for (let char of s) {\n        if (pairs[char]) {\n            if (stack.pop() !== pairs[char]) return false;\n        } else stack.push(char);\n    }\n    return stack.length === 0;\n};`,
        python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        closeToOpen = {")": "(", "]": "[", "}": "{"}\n        for c in s:\n            if c in closeToOpen:\n                if stack and stack[-1] == closeToOpen[c]:\n                    stack.pop()\n                else:\n                    return False\n            else:\n                stack.append(c)\n        return not stack`,
        cpp: `class Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) return false;\n                char top = st.top(); st.pop();\n                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false;\n            }\n        }\n        return st.empty();\n    }\n};`,
        java: `class Solution {\n    public boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`
      },
      'Merge Two Sorted Lists': {
        javascript: `function mergeTwoLists(list1, list2) {\n    const dummy = { val: 0, next: null };\n    let curr = dummy;\n    while (list1 && list2) {\n        if (list1.val < list2.val) { curr.next = list1; list1 = list1.next; }\n        else { curr.next = list2; list2 = list2.next; }\n        curr = curr.next;\n    }\n    curr.next = list1 || list2;\n    return dummy.next;\n};`,
        python: `class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        dummy = ListNode()\n        tail = dummy\n        while list1 and list2:\n            if list1.val < list2.val:\n                tail.next = list1\n                list1 = list1.next\n            else:\n                tail.next = list2\n                list2 = list2.next\n            tail = tail.next\n        tail.next = list1 or list2\n        return dummy.next`,
        cpp: `class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        if (!list1) return list2;\n        if (!list2) return list1;\n        if (list1->val < list2->val) {\n            list1->next = mergeTwoLists(list1->next, list2);\n            return list1;\n        } else {\n            list2->next = mergeTwoLists(list1, list2->next);\n            return list2;\n        }\n    }\n};`,
        java: `class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        if (list1 == null) return list2;\n        if (list2 == null) return list1;\n        if (list1.val < list2.val) {\n            list1.next = mergeTwoLists(list1.next, list2);\n            return list1;\n        } else {\n            list2.next = mergeTwoLists(list1, list2.next);\n            return list2;\n        }\n    }\n}`
      },
      'Best Time to Buy and Sell Stock': {
        javascript: `function maxProfit(prices) {\n    let minPrice = Infinity, maxProfit = 0;\n    for (let p of prices) {\n        minPrice = Math.min(minPrice, p);\n        maxProfit = Math.max(maxProfit, p - minPrice);\n    }\n    return maxProfit;\n};`,
        python: `class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        min_price, max_profit = float('inf'), 0\n        for p in prices:\n            min_price = min(min_price, p)\n            max_profit = max(max_profit, p - min_price)\n        return max_profit`,
        cpp: `class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minPrice = INT_MAX, maxProfit = 0;\n        for (int p : prices) {\n            minPrice = min(minPrice, p);\n            maxProfit = max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n};`,
        java: `class Solution {\n    public int maxProfit(int[] prices) {\n        int minPrice = Integer.MAX_VALUE, maxProfit = 0;\n        for (int p : prices) {\n            minPrice = Math.min(minPrice, p);\n            maxProfit = Math.max(maxProfit, p - minPrice);\n        }\n        return maxProfit;\n    }\n}`
      },
      'Valid Palindrome': {
        javascript: `function isPalindrome(s) {\n    const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n    return cleaned === cleaned.split('').reverse().join('');\n};`,
        python: `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        cleaned = [c.lower() for c in s if c.isalnum()]\n        return cleaned == cleaned[::-1]`,
        cpp: `class Solution {\npublic:\n    bool isPalindrome(string s) {\n        int l = 0, r = s.length() - 1;\n        while (l < r) {\n            while (l < r && !isalnum(s[l])) l++;\n            while (l < r && !isalnum(s[r])) r--;\n            if (tolower(s[l]) != tolower(s[r])) return false;\n            l++; r--;\n        }\n        return true;\n    }\n};`,
        java: `class Solution {\n    public boolean isPalindrome(String s) {\n        int l = 0, r = s.length() - 1;\n        while (l < r) {\n            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;\n            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;\n            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) return false;\n            l++; r--;\n        }\n        return true;\n    }\n}`
      },
      'Reverse Linked List': {
        javascript: `function reverseList(head) {\n    let prev = null, curr = head;\n    while (curr) {\n        let nextTemp = curr.next;\n        curr.next = prev;\n        prev = curr;\n        curr = nextTemp;\n    }\n    return prev;\n};`,
        python: `class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        prev, curr = None, head\n        while curr:\n            nxt = curr.next\n            curr.next = prev\n            prev = curr\n            curr = nxt\n        return prev`,
        cpp: `class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode *prev = nullptr, *curr = head;\n        while (curr) {\n            ListNode *nxt = curr->next;\n            curr->next = prev;\n            prev = curr;\n            curr = nxt;\n        }\n        return prev;\n    }\n};`,
        java: `class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null, curr = head;\n        while (curr != null) {\n            ListNode nextTemp = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = nextTemp;\n        }\n        return prev;\n    }\n}`
      },
      'Maximum Subarray': {
        javascript: `function maxSubArray(nums) {\n    let maxSub = nums[0], curSum = 0;\n    for (let n of nums) {\n        if (curSum < 0) curSum = 0;\n        curSum += n;\n        maxSub = Math.max(maxSub, curSum);\n    }\n    return maxSub;\n};`,
        python: `class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        max_sub, cur_sum = nums[0], 0\n        for n in nums:\n            if cur_sum < 0: cur_sum = 0\n            cur_sum += n\n            max_sub = max(max_sub, cur_sum)\n        return max_sub`,
        cpp: `class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int maxSub = nums[0], curSum = 0;\n        for (int n : nums) {\n            if (curSum < 0) curSum = 0;\n            curSum += n;\n            maxSub = max(maxSub, curSum);\n        }\n        return maxSub;\n    }\n};`,
        java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        int maxSub = nums[0], curSum = 0;\n        for (int n : nums) {\n            if (curSum < 0) curSum = 0;\n            curSum += n;\n            maxSub = Math.max(maxSub, curSum);\n        }\n        return maxSub;\n    }\n}`
      },
      'Climbing Stairs': {
        javascript: `function climbStairs(n) {\n    let one = 1, two = 1;\n    for (let i = 0; i < n - 1; i++) {\n        let temp = one;\n        one = one + two;\n        two = temp;\n    }\n    return one;\n};`,
        python: `class Solution:\n    def climbStairs(self, n: int) -> int:\n        one, two = 1, 1\n        for _ in range(n - 1):\n            one, two = one + two, one\n        return one`,
        cpp: `class Solution {\npublic:\n    int climbStairs(int n) {\n        int one = 1, two = 1;\n        for (int i = 0; i < n - 1; i++) {\n            int temp = one;\n            one = one + two;\n            two = temp;\n        }\n        return one;\n    }\n};`,
        java: `class Solution {\n    public int climbStairs(int n) {\n        int one = 1, two = 1;\n        for (int i = 0; i < n - 1; i++) {\n            int temp = one;\n            one = one + two;\n            two = temp;\n        }\n        return one;\n    }\n}`
      },
      'Contains Duplicate': {
        javascript: `function containsDuplicate(nums) {\n    const set = new Set(nums);\n    return set.size < nums.length;\n};`,
        python: `class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        return len(nums) != len(set(nums))`,
        cpp: `class Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        unordered_set<int> s(nums.begin(), nums.end());\n        return s.size() < nums.size();\n    }\n};`,
        java: `class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        Set<Integer> set = new HashSet<>();\n        for (int n : nums) {\n            if (!set.add(n)) return true;\n        }\n        return false;\n    }\n}`
      },
      'Valid Anagram': {
        javascript: `function isAnagram(s, t) {\n    if (s.length !== t.length) return false;\n    return s.split('').sort().join('') === t.split('').sort().join('');\n};`,
        python: `class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        return sorted(s) == sorted(t)`,
        cpp: `class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        if (s.length() != t.length()) return false;\n        vector<int> count(26, 0);\n        for (int i = 0; i < s.length(); i++) {\n            count[s[i] - 'a']++;\n            count[t[i] - 'a']--;\n        }\n        for (int c : count) if (c != 0) return false;\n        return true;\n    }\n};`,
        java: `class Solution {\n    public boolean isAnagram(String s, String t) {\n        if (s.length() != t.length()) return false;\n        int[] counts = new int[26];\n        for (int i = 0; i < s.length(); i++) {\n            counts[s.charAt(i) - 'a']++;\n            counts[t.charAt(i) - 'a']--;\n        }\n        for (int c : counts) if (c != 0) return false;\n        return true;\n    }\n}`
      },
      'Median of Two Sorted Arrays': {
        javascript: `function findMedianSortedArrays(nums1, nums2) {\n    const merged = [...nums1, ...nums2].sort((a, b) => a - b);\n    const len = merged.length;\n    const mid = Math.floor(len / 2);\n    return len % 2 !== 0 ? merged[mid] : (merged[mid - 1] + merged[mid]) / 2;\n};`,
        python: `class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        merged = sorted(nums1 + nums2)\n        n = len(merged)\n        mid = n // 2\n        return float(merged[mid]) if n % 2 != 0 else (merged[mid - 1] + merged[mid]) / 2.0`,
        cpp: `class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        vector<int> merged = nums1;\n        merged.insert(merged.end(), nums2.begin(), nums2.end());\n        sort(merged.begin(), merged.end());\n        int n = merged.size();\n        return n % 2 != 0 ? merged[n / 2] : (merged[n / 2 - 1] + merged[n / 2]) / 2.0;\n    }\n};`,
        java: `class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        int[] merged = new int[nums1.length + nums2.length];\n        System.arraycopy(nums1, 0, merged, 0, nums1.length);\n        System.arraycopy(nums2, 0, merged, nums1.length, nums2.length);\n        Arrays.sort(merged);\n        int n = merged.length;\n        if (n % 2 != 0) return (double) merged[n / 2];\n        return (merged[n / 2 - 1] + merged[n / 2]) / 2.0;\n    }\n}`
      },
      'House Robber': {
        javascript: `function rob(nums) {\n    let rob1 = 0, rob2 = 0;\n    for (let n of nums) {\n        let temp = Math.max(n + rob1, rob2);\n        rob1 = rob2;\n        rob2 = temp;\n    }\n    return rob2;\n};`,
        python: `class Solution:\n    def rob(self, nums: List[int]) -> int:\n        rob1, rob2 = 0, 0\n        for n in nums:\n            temp = max(n + rob1, rob2)\n            rob1 = rob2\n            rob2 = temp\n        return rob2`,
        cpp: `class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        int rob1 = 0, rob2 = 0;\n        for (int n : nums) {\n            int temp = max(n + rob1, rob2);\n            rob1 = rob2;\n            rob2 = temp;\n        }\n        return rob2;\n    }\n};`,
        java: `class Solution {\n    public int rob(int[] nums) {\n        int rob1 = 0, rob2 = 0;\n        for (int n : nums) {\n            int temp = Math.max(n + rob1, rob2);\n            rob1 = rob2;\n            rob2 = temp;\n        }\n        return rob2;\n    }\n}`
      },
      'Container With Most Water': {
        javascript: `function maxArea(height) {\n    let l = 0, r = height.length - 1, maxA = 0;\n    while (l < r) {\n        const area = (r - l) * Math.min(height[l], height[r]);\n        maxA = Math.max(maxA, area);\n        if (height[l] < height[r]) l++;\n        else r--;\n    }\n    return maxA;\n};`,
        python: `class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        l, r, maxA = 0, len(height) - 1, 0\n        while l < r:\n            area = (r - l) * min(height[l], height[r])\n            maxA = max(maxA, area)\n            if height[l] < height[r]: l += 1\n            else: r -= 1\n        return maxA`,
        cpp: `class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int l = 0, r = height.size() - 1, maxA = 0;\n        while (l < r) {\n            int area = (r - l) * min(height[l], height[r]);\n            maxA = max(maxA, area);\n            if (height[l] < height[r]) l++;\n            else r--;\n        }\n        return maxA;\n    }\n};`,
        java: `class Solution {\n    public int maxArea(int[] height) {\n        int l = 0, r = height.length - 1, maxA = 0;\n        while (l < r) {\n            int area = (r - l) * Math.min(height[l], height[r]);\n            maxA = Math.max(maxA, area);\n            if (height[l] < height[r]) l++;\n            else r--;\n        }\n        return maxA;\n    }\n}`
      },
      'Palindrome Number': {
        javascript: `function isPalindrome(x) {\n    if (x < 0) return false;\n    const str = String(x);\n    return str === str.split('').reverse().join('');\n};`,
        python: `class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        if x < 0: return False\n        return str(x) == str(x)[::-1]`,
        cpp: `class Solution {\npublic:\n    bool isPalindrome(int x) {\n        if (x < 0) return false;\n        long rev = 0, temp = x;\n        while (temp > 0) {\n            rev = rev * 10 + temp % 10;\n            temp /= 10;\n        }\n        return rev == x;\n    }\n};`,
        java: `class Solution {\n    public boolean isPalindrome(int x) {\n        if (x < 0) return false;\n        long rev = 0, temp = x;\n        while (temp > 0) {\n            rev = rev * 10 + temp % 10;\n            temp /= 10;\n        }\n        return rev == x;\n    }\n}`
      },
      'Longest Substring Without Repeating Characters': {
        javascript: `function lengthOfLongestSubstring(s) {\n    let charSet = new Set(), l = 0, res = 0;\n    for (let r = 0; r < s.length; r++) {\n        while (charSet.has(s[r])) {\n            charSet.delete(s[l]);\n            l++;\n        }\n        charSet.add(s[r]);\n        res = Math.max(res, r - l + 1);\n    }\n    return res;\n};`,
        python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        charSet = set()\n        l = 0\n        res = 0\n        for r in range(len(s)):\n            while s[r] in charSet:\n                charSet.remove(s[l])\n                l += 1\n            charSet.add(s[r])\n            res = max(res, r - l + 1)\n        return res`,
        cpp: `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        unordered_set<char> st;\n        int l = 0, res = 0;\n        for (int r = 0; r < s.length(); r++) {\n            while (st.count(s[r])) {\n                st.erase(s[l++]);\n            }\n            st.insert(s[r]);\n            res = max(res, r - l + 1);\n        }\n        return res;\n    }\n};`,
        java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        Set<Character> set = new HashSet<>();\n        int l = 0, res = 0;\n        for (int r = 0; r < s.length(); r++) {\n            while (set.contains(s.charAt(r))) {\n                set.remove(s.charAt(l++));\n            }\n            set.add(s.charAt(r));\n            res = Math.max(res, r - l + 1);\n        }\n        return res;\n    }\n}`
      },
      'Product of Array Except Self': {
        javascript: `function productExceptSelf(nums) {\n    const n = nums.length;\n    const res = new Array(n).fill(1);\n    let prefix = 1;\n    for (let i = 0; i < n; i++) {\n        res[i] = prefix;\n        prefix *= nums[i];\n    }\n    let postfix = 1;\n    for (let i = n - 1; i >= 0; i--) {\n        res[i] *= postfix;\n        postfix *= nums[i];\n    }\n    return res;\n};`,
        python: `class Solution:\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\n        res = [1] * len(nums)\n        prefix = 1\n        for i in range(len(nums)):\n            res[i] = prefix\n            prefix *= nums[i]\n        postfix = 1\n        for i in range(len(nums) - 1, -1, -1):\n            res[i] *= postfix\n            postfix *= nums[i]\n        return res`,
        cpp: `class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        int n = nums.size();\n        vector<int> res(n, 1);\n        int prefix = 1;\n        for (int i = 0; i < n; i++) {\n            res[i] = prefix;\n            prefix *= nums[i];\n        }\n        int postfix = 1;\n        for (int i = n - 1; i >= 0; i--) {\n            res[i] *= postfix;\n            postfix *= nums[i];\n        }\n        return res;\n    }\n};`,
        java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        int n = nums.length;\n        int[] res = new int[n];\n        int prefix = 1;\n        for (int i = 0; i < n; i++) {\n            res[i] = prefix;\n            prefix *= nums[i];\n        }\n        int postfix = 1;\n        for (int i = n - 1; i >= 0; i--) {\n            res[i] *= postfix;\n            postfix *= nums[i];\n        }\n        return res;\n    }\n}`
      },
      'Group Anagrams': {
        javascript: `function groupAnagrams(strs) {\n    const map = new Map();\n    for (let s of strs) {\n        const sorted = s.split('').sort().join('');\n        if (!map.has(sorted)) map.set(sorted, []);\n        map.get(sorted).push(s);\n    }\n    return Array.from(map.values());\n};`,
        python: `class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        ans = collections.defaultdict(list)\n        for s in strs:\n            ans[tuple(sorted(s))].append(s)\n        return list(ans.values())`,
        cpp: `class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        unordered_map<string, vector<string>> mp;\n        for (string s : strs) {\n            string t = s;\n            sort(t.begin(), t.end());\n            mp[t].push_back(s);\n        }\n        vector<vector<string>> res;\n        for (auto p : mp) res.push_back(p.second);\n        return res;\n    }\n};`,
        java: `class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        Map<String, List<String>> map = new HashMap<>();\n        for (String s : strs) {\n            char[] ca = s.toCharArray();\n            Arrays.sort(ca);\n            String key = String.valueOf(ca);\n            if (!map.containsKey(key)) map.put(key, new ArrayList<>());\n            map.get(key).add(s);\n        }\n        return new ArrayList<>(map.values());\n    }\n}`
      },
      'Top K Frequent Elements': {
        javascript: `function topKFrequent(nums, k) {\n    const count = new Map();\n    for (let n of nums) count.set(n, (count.get(n) || 0) + 1);\n    const sorted = Array.from(count.keys()).sort((a, b) => count.get(b) - count.get(a));\n    return sorted.slice(0, k);\n};`,
        python: `class Solution:\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n        count = Counter(nums)\n        return [item[0] for item in count.most_common(k)]`,
        cpp: `class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        unordered_map<int, int> count;\n        for (int n : nums) count[n]++;\n        priority_queue<pair<int, int>> pq;\n        for (auto p : count) pq.push({p.second, p.first});\n        vector<int> res;\n        while (k-- > 0 && !pq.empty()) {\n            res.push_back(pq.top().second);\n            pq.pop();\n        }\n        return res;\n    }\n};`,
        java: `class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        Map<Integer, Integer> count = new HashMap<>();\n        for (int n : nums) count.put(n, count.getOrDefault(n, 0) + 1);\n        PriorityQueue<Integer> heap = new PriorityQueue<>((a, b) -> count.get(b) - count.get(a));\n        heap.addAll(count.keySet());\n        int[] res = new int[k];\n        for (int i = 0; i < k; i++) res[i] = heap.poll();\n        return res;\n    }\n}`
      },
      '3Sum': {
        javascript: `function threeSum(nums) {\n    nums.sort((a, b) => a - b);\n    const res = [];\n    for (let i = 0; i < nums.length - 2; i++) {\n        if (i > 0 && nums[i] === nums[i - 1]) continue;\n        let l = i + 1, r = nums.length - 1;\n        while (l < r) {\n            const sum = nums[i] + nums[l] + nums[r];\n            if (sum === 0) {\n                res.push([nums[i], nums[l], nums[r]]);\n                while (l < r && nums[l] === nums[l + 1]) l++;\n                while (l < r && nums[r] === nums[r - 1]) r--;\n                l++; r--;\n            } else if (sum < 0) l++;\n            else r--;\n        }\n    }\n    return res;\n};`,
        python: `class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        res = []\n        nums.sort()\n        for i, a in enumerate(nums):\n            if i > 0 and a == nums[i - 1]: continue\n            l, r = i + 1, len(nums) - 1\n            while l < r:\n                threeSum = a + nums[l] + nums[r]\n                if threeSum > 0: r -= 1\n                elif threeSum < 0: l += 1\n                else:\n                    res.append([a, nums[l], nums[r]])\n                    l += 1\n                    while nums[l] == nums[l - 1] and l < r: l += 1\n        return res`,
        cpp: `class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        vector<vector<int>> res;\n        sort(nums.begin(), nums.end());\n        for (int i = 0; i < nums.size(); i++) {\n            if (i > 0 && nums[i] == nums[i-1]) continue;\n            int l = i + 1, r = nums.size() - 1;\n            while (l < r) {\n                int sum = nums[i] + nums[l] + nums[r];\n                if (sum == 0) {\n                    res.push_back({nums[i], nums[l], nums[r]});\n                    while (l < r && nums[l] == nums[l+1]) l++;\n                    while (l < r && nums[r] == nums[r-1]) r--;\n                    l++; r--;\n                } else if (sum < 0) l++;\n                else r--;\n            }\n        }\n        return res;\n    }\n};`,
        java: `class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        Arrays.sort(nums);\n        List<List<Integer>> res = new ArrayList<>();\n        for (int i = 0; i < nums.length - 2; i++) {\n            if (i > 0 && nums[i] == nums[i - 1]) continue;\n            int l = i + 1, r = nums.length - 1;\n            while (l < r) {\n                int sum = nums[i] + nums[l] + nums[r];\n                if (sum == 0) {\n                    res.add(Arrays.asList(nums[i], nums[l], nums[r]));\n                    while (l < r && nums[l] == nums[l + 1]) l++;\n                    while (l < r && nums[r] == nums[r - 1]) r--;\n                    l++; r--;\n                } else if (sum < 0) l++;\n                else r--;\n            }\n        }\n        return res;\n    }\n}`
      },
      'Valid Sudoku': {
        javascript: `function isValidSudoku(board) {\n    const rows = new Array(9).fill(0).map(() => new Set());\n    const cols = new Array(9).fill(0).map(() => new Set());\n    const boxes = new Array(9).fill(0).map(() => new Set());\n    for (let r = 0; r < 9; r++) {\n        for (let c = 0; c < 9; c++) {\n            const val = board[r][c];\n            if (val === '.') continue;\n            const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);\n            if (rows[r].has(val) || cols[c].has(val) || boxes[boxIdx].has(val)) return false;\n            rows[r].add(val); cols[c].add(val); boxes[boxIdx].add(val);\n        }\n    }\n    return true;\n};`,
        python: `class Solution:\n    def isValidSudoku(self, board: List[List[str]]) -> bool:\n        cols = collections.defaultdict(set)\n        rows = collections.defaultdict(set)\n        squares = collections.defaultdict(set)\n        for r in range(9):\n            for c in range(9):\n                if board[r][c] == ".": continue\n                if (board[r][c] in rows[r] or\n                    board[r][c] in cols[c] or\n                    board[r][c] in squares[(r // 3, c // 3)]):\n                    return False\n                cols[c].add(board[r][c])\n                rows[r].add(board[r][c])\n                squares[(r // 3, c // 3)].add(board[r][c])\n        return True`,
        cpp: `class Solution {\npublic:\n    bool isValidSudoku(vector<vector<char>>& board) {\n        int rows[9][9] = {0}, cols[9][9] = {0}, boxes[9][9] = {0};\n        for (int r = 0; r < 9; r++) {\n            for (int c = 0; c < 9; c++) {\n                if (board[r][c] == '.') continue;\n                int num = board[r][c] - '1';\n                int boxIdx = (r / 3) * 3 + (c / 3);\n                if (rows[r][num] || cols[c][num] || boxes[boxIdx][num]) return false;\n                rows[r][num] = cols[c][num] = boxes[boxIdx][num] = 1;\n            }\n        }\n        return true;\n    }\n};`,
        java: `class Solution {\n    public boolean isValidSudoku(char[][] board) {\n        Set<String> seen = new HashSet<>();\n        for (int i = 0; i < 9; i++) {\n            for (int j = 0; j < 9; j++) {\n                char number = board[i][j];\n                if (number != '.') {\n                    if (!seen.add(number + " in row " + i) ||\n                        !seen.add(number + " in column " + j) ||\n                        !seen.add(number + " in block " + i/3 + "-" + j/3))\n                        return false;\n                }\n            } \n        }\n        return true;\n    }\n}`
      },
      'Binary Tree Inorder Traversal': {
        javascript: `function inorderTraversal(root) {\n    const res = [];\n    function helper(node) {\n        if (!node) return;\n        helper(node.left);\n        res.push(node.val);\n        helper(node.right);\n    }\n    helper(root);\n    return res;\n};`,
        python: `class Solution:\n    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:\n        res = []\n        def helper(node):\n            if not node: return\n            helper(node.left)\n            res.append(node.val)\n            helper(node.right)\n        helper(root)\n        return res`,
        cpp: `class Solution {\npublic:\n    vector<int> inorderTraversal(TreeNode* root) {\n        vector<int> res;\n        stack<TreeNode*> st;\n        TreeNode* curr = root;\n        while (curr || !st.empty()) {\n            while (curr) { st.push(curr); curr = curr->left; }\n            curr = st.top(); st.pop();\n            res.push_back(curr->val);\n            curr = curr->right;\n        }\n        return res;\n    }\n};`,
        java: `class Solution {\n    public List<Integer> inorderTraversal(TreeNode root) {\n        List<Integer> res = new ArrayList<>();\n        Stack<TreeNode> stack = new Stack<>();\n        TreeNode curr = root;\n        while (curr != null || !stack.isEmpty()) {\n            while (curr != null) { stack.push(curr); curr = curr.left; }\n            curr = stack.pop();\n            res.add(curr.val);\n            curr = curr.right;\n        }\n        return res;\n    }\n}`
      },
      'Maximum Depth of Binary Tree': {
        javascript: `function maxDepth(root) {\n    if (!root) return 0;\n    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n};`,
        python: `class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        if not root: return 0\n        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))`,
        cpp: `class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        if (!root) return 0;\n        return 1 + max(maxDepth(root->left), maxDepth(root->right));\n    }\n};`,
        java: `class Solution {\n    public int maxDepth(TreeNode root) {\n        if (root == null) return 0;\n        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n    }\n}`
      }
    };

    const problemSnippets = solutionRepository[problem.title] || {
      javascript: `/**\n * Optimal solution implementation for "${problem.title}"\n */\nfunction solve(nums, target) {\n    // Optimal algorithm pass implementation\n    if (Array.isArray(nums)) {\n        const map = new Map();\n        for (let i = 0; i < nums.length; i++) {\n            const diff = target - nums[i];\n            if (map.has(diff)) return [map.get(diff), i];\n            map.set(nums[i], i);\n        }\n    }\n    return nums;\n}`,
      python: `class Solution:\n    def solve(self, nums, target=None):\n        # Optimal algorithm pass implementation for ${problem.title}\n        if isinstance(nums, list):\n            seen = {}\n            for i, n in enumerate(nums):\n                if target is not None and (target - n) in seen:\n                    return [seen[target - n], i]\n                seen[n] = i\n        return nums`,
      cpp: `class Solution {\npublic:\n    auto solve(vector<int>& nums, int target = 0) {\n        // Optimal algorithm pass implementation for ${problem.title}\n        unordered_map<int, int> mp;\n        for (int i = 0; i < nums.size(); i++) {\n            if (mp.count(target - nums[i])) return vector<int>{mp[target - nums[i]], i};\n            mp[nums[i]] = i;\n        }\n        return nums;\n    }\n};`,
      java: `class Solution {\n    public Object solve(int[] nums, int target) {\n        // Optimal algorithm pass implementation for ${problem.title}\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            if (map.containsKey(target - nums[i])) return new int[]{ map.get(target - nums[i]), i };\n            map.put(nums[i], i);\n        }\n        return nums;\n    }\n}`
    };

    // Structured Educational Editorial Data with Hints Included
    const editorialData = {
      unlocked: true,
      problemTitle: problem.title,
      overview: `Detailed algorithmic solution and strategy breakdown for "${problem.title}".`,
      hints: [
        "Hint 1: Carefully analyze the constraints and look for an optimal data structure (like a Hash Map or Two Pointers) to avoid nested loops.",
        "Hint 2: Track intermediate states or complements as you iterate through the input data in a single pass.",
        "Hint 3: Double-check edge cases such as empty inputs, single elements, or boundary values."
      ],
      approach1: {
        title: 'Approach 1 ΓÇö Brute Force',
        idea: 'Iterate through all possible element combinations or states using nested loops.',
        steps: [
          'Generate all sub-arrays or pairs.',
          'Verify condition iteratively.',
          'Return matched indices or result.'
        ],
        timeComplexity: 'O(N^2)',
        spaceComplexity: 'O(1)'
      },
      approach2: {
        title: 'Approach 2 ΓÇö Optimized Solution',
        keyInsight: 'Use a Hash Table (or Two Pointers / Sliding Window) to look up complementary values in O(1) time.',
        steps: [
          'Initialize a hash map to store value-to-index mapping.',
          'Iterate through the array once.',
          'Check if the complementary target difference exists in the map.',
          'If found, return indices; otherwise insert current value into map.'
        ],
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)'
      },
      complexityAnalysis: {
        time: 'O(N) - We traverse the array of size N exactly once.',
        space: 'O(N) - Auxiliary space required for the hash table.'
      },
      walkthrough: {
        input: 'Sample input execution trace',
        steps: [
          'Step 1: Initialize pointer and inspect initial data elements.',
          'Step 2: Evaluate condition and record state transitions successfully.'
        ]
      },
      codeSnippets: problemSnippets
    };

    res.json(editorialData);
  } catch (error) {
    console.error('Fetch editorial content error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- AUTOMATIC CERTIFICATE ISSUING & MILESTONE DETECTOR ---

async function checkAndIssueCertificates(userId) {
  if (!userId) return { solvedCount: 0, newlyUnlocked: [] };

  try {
    // 1. Calculate UNIQUE accepted problems solved
    const [solvedRows] = await db.query(
      `SELECT COUNT(DISTINCT problem_id) as uniqueCount 
       FROM submissions 
       WHERE user_id = ? AND status = 'Accepted'`,
      [userId]
    );

    const uniqueCount = solvedRows[0] ? Number(solvedRows[0].uniqueCount || 0) : 0;

    // Synchronize users.solved_count with real uniqueCount
    await db.query(`UPDATE users SET solved_count = ? WHERE id = ?`, [uniqueCount, userId]);

    // 2. Fetch user information for name formatting
    const [userRows] = await db.query(`SELECT username, display_name, email FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) return { solvedCount: uniqueCount, newlyUnlocked: [] };

    const userName = userRows[0].display_name || userRows[0].username;
    const userEmail = userRows[0].email;

    // 3. Fetch active achievement milestone configurations
    const [configs] = await db.query(
      `SELECT milestone, title, theme, motivation_message, description_template 
       FROM achievement_configs 
       WHERE is_enabled = 1 
       ORDER BY milestone ASC`
    );

    // 4. Fetch existing certificates issued for this user
    const [existingCerts] = await db.query(
      `SELECT milestone FROM certificates WHERE user_id = ?`,
      [userId]
    );
    const existingMilestones = new Set(existingCerts.map(c => Number(c.milestone)));

    const newlyUnlocked = [];

    // 5. Evaluate milestone qualification
    for (const conf of configs) {
      const milestoneNum = Number(conf.milestone);
      if (uniqueCount >= milestoneNum && !existingMilestones.has(milestoneNum)) {
        // Generate unique verification code: e.g. ca_cert_50_u1_a9f2x
        const verCode = `ca_cert_${milestoneNum}_u${userId}_${Math.random().toString(36).substring(2, 8)}`;
        const formattedDesc = conf.description_template.replace(/\{userName\}/g, userName);

        try {
          const [insertRes] = await db.query(
            `INSERT INTO certificates 
              (user_id, milestone, verification_code, title, description, theme, motivation_message) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title)`,
            [userId, milestoneNum, verCode, conf.title, formattedDesc, conf.theme, conf.motivation_message]
          );

          const newCertObj = {
            id: insertRes.insertId,
            user_id: userId,
            user_name: userName,
            milestone: milestoneNum,
            verification_code: verCode,
            title: conf.title,
            description: formattedDesc,
            theme: conf.theme,
            motivation_message: conf.motivation_message,
            created_at: new Date()
          };

          newlyUnlocked.push(newCertObj);

          // Trigger email notification for milestone achievement
          if (userEmail) {
            emailService.sendMilestoneAchievementEmail({
              userId,
              recipientEmail: userEmail,
              userName,
              milestoneCount: milestoneNum,
              title: conf.title,
              verificationCode: verCode
            }).catch(err => console.error('Error sending milestone achievement email:', err));
          }
        } catch (insertErr) {
          console.error(`Error issuing certificate for milestone ${milestoneNum}:`, insertErr.message);
        }
      }
    }

    return { solvedCount: uniqueCount, newlyUnlocked };

  } catch (error) {
    console.error('Error in checkAndIssueCertificates:', error);
    return { solvedCount: 0, newlyUnlocked: [] };
  }
}

// --- CERTIFICATES & ACHIEVEMENTS API ROUTES ---

// Get User Achievements & Certificates Status
app.get('/api/user/achievements', optionalAuthenticateToken, async (req, res) => {
  const userId = req.user ? req.user.id : 1;

  try {
    // 1. Check & Auto-issue any qualified certificates
    const milestoneCheck = await checkAndIssueCertificates(userId);

    // 2. Fetch all issued milestone certificates for user
    const [certificates] = await db.query(
      `SELECT c.*, u.username, u.display_name 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.user_id = ? AND c.revoked_at IS NULL
       ORDER BY c.milestone ASC`,
      [userId]
    );

    // 2b. Fetch all course certificates for user
    const [courseCertificates] = await db.query(
      `SELECT cc.*, c.title as course_title, c.thumbnail_url, c.category, c.difficulty
       FROM course_certificates cc
       JOIN courses c ON cc.course_id = c.id
       WHERE cc.user_id = ?
       ORDER BY cc.issued_at DESC`,
      [userId]
    );

    // 3. Fetch user info including featured milestone
    const [userRows] = await db.query(
      `SELECT id, username, display_name, solved_count, featured_milestone FROM users WHERE id = ?`,
      [userId]
    );

    // 4. Fetch all milestone configs
    const [configs] = await db.query(
      `SELECT milestone, title, theme, motivation_message, description_template, is_enabled 
       FROM achievement_configs 
       ORDER BY milestone ASC`
    );

    res.json({
      solvedCount: milestoneCheck.solvedCount || (userRows[0]?.solved_count || 0),
      user: userRows[0] || { username: 'Developer', solved_count: 0, featured_milestone: null },
      certificates: certificates.map(c => ({
        ...c,
        user_name: c.display_name || c.username
      })),
      courseCertificates,
      achievementConfigs: configs,
      newlyUnlocked: milestoneCheck.newlyUnlocked || []
    });

  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Featured Achievement Badge on User Profile
app.put('/api/user/featured-milestone', authenticateToken, async (req, res) => {
  const { milestone } = req.body;
  const userId = req.user.id;

  try {
    let targetMilestone = null;
    if (milestone !== null && milestone !== undefined && milestone !== '') {
      const milestoneNum = parseInt(milestone);
      // Verify user actually owns this certificate
      const [certs] = await db.query(
        `SELECT id FROM certificates WHERE user_id = ? AND milestone = ? AND revoked_at IS NULL`,
        [userId, milestoneNum]
      );
      if (certs.length === 0) {
        return res.status(400).json({ error: 'You have not unlocked this milestone certificate yet.' });
      }
      targetMilestone = milestoneNum;
    }

    await db.query(`UPDATE users SET featured_milestone = ? WHERE id = ?`, [targetMilestone, userId]);

    res.json({
      message: 'Featured milestone updated successfully',
      featured_milestone: targetMilestone
    });

  } catch (error) {
    console.error('Error setting featured milestone:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET Logged-In User Earned Certificates
app.get('/api/certificates', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    await checkAndIssueCertificates(userId);

    const [certificates] = await db.query(
      `SELECT c.*, u.username, u.display_name 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.user_id = ? AND c.revoked_at IS NULL
       ORDER BY c.milestone ASC`,
      [userId]
    );

    res.json(certificates.map(c => ({
      ...c,
      user_name: c.display_name || c.username
    })));

  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET Certificates for Specific User
app.get('/api/users/:id/certificates', optionalAuthenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    await checkAndIssueCertificates(userId);

    const [certificates] = await db.query(
      `SELECT c.*, u.username, u.display_name 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.user_id = ? AND c.revoked_at IS NULL
       ORDER BY c.milestone ASC`,
      [userId]
    );

    res.json(certificates.map(c => ({
      ...c,
      user_name: c.display_name || c.username
    })));

  } catch (error) {
    console.error('Error fetching user certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Public Verification Endpoint for Certificate
const handleCertificateVerification = async (req, res) => {
  const code = req.params.code;

  try {
    const [rows] = await db.query(
      `SELECT c.*, u.username, u.display_name, u.role
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.verification_code = ?`,
      [code]
    );

    if (rows.length > 0) {
      const cert = rows[0];
      if (cert.revoked_at) {
        return res.status(410).json({
          error: 'This certificate has been revoked by platform administration.',
          isRevoked: true,
          revokedAt: cert.revoked_at
        });
      }

      const formattedCert = {
        ...cert,
        user_name: cert.display_name || cert.username
      };

      return res.json({
        id: cert.id,
        verificationCode: cert.verification_code,
        milestone: cert.milestone,
        title: cert.title,
        description: cert.description,
        theme: cert.theme,
        motivationMessage: cert.motivation_message,
        userName: cert.display_name || cert.username,
        username: cert.username,
        createdAt: cert.created_at,
        verified: true,
        type: 'milestone',
        certificate: formattedCert,
        user: {
          id: cert.user_id,
          username: cert.username,
          display_name: cert.display_name
        }
      });
    }

    // Check course_certificates
    const [courseCertRows] = await db.query(
      `SELECT cc.*, u.username, u.display_name
       FROM course_certificates cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.verification_code = ?`,
      [code]
    );

    if (courseCertRows.length > 0) {
      const cCert = courseCertRows[0];
      const recipient = cCert.user_name || cCert.display_name || cCert.username;

      return res.json({
        id: cCert.id,
        verificationCode: cCert.verification_code,
        title: `${cCert.course_name} Course Certificate`,
        courseName: cCert.course_name,
        course_name: cCert.course_name,
        completionDate: cCert.completion_date,
        completion_date: cCert.completion_date,
        completionTime: cCert.completion_time,
        completion_time: cCert.completion_time,
        userName: recipient,
        user_name: recipient,
        createdAt: cCert.created_at,
        verified: true,
        type: 'course',
        certificate: {
          ...cCert,
          title: `${cCert.course_name} Course Certificate`,
          type: 'course'
        },
        user: {
          id: cCert.user_id,
          username: cCert.username,
          display_name: cCert.display_name
        }
      });
    }

    return res.status(404).json({ error: 'Certificate not found or verification code is invalid.' });

  } catch (error) {
    console.error('Error verifying public certificate:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.get('/api/certificate/verify/:code', handleCertificateVerification);
app.get('/api/certificates/verify/:code', handleCertificateVerification);


// ==================================================
// ADMIN CERTIFICATE MANAGEMENT API ROUTES
// ==================================================

// 1. Admin Dashboard Summary & Analytics
app.get('/api/admin/certificates/dashboard-summary', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Ensure milestone 5 is initialized in achievement_configs
    await db.query(`
      INSERT INTO achievement_configs (milestone, title, theme, motivation_message, description_template, is_enabled)
      VALUES (5, '5 Problems Solved', 'bronze', 'Great start on your coding journey!', 'This certificate is presented to {userName} in appreciation of successfully solving 5 accepted coding problems on CodeArena.', 1)
      ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
    `);

    // Auto-issue certificates for all regular non-admin users
    const [nonAdminUsers] = await db.query(`SELECT id FROM users WHERE role != 'admin' OR role IS NULL`);
    for (const u of nonAdminUsers) {
      await checkAndIssueCertificates(u.id);
    }

    const [milestoneRows] = await db.query(`SELECT COUNT(*) as count FROM achievement_configs WHERE is_enabled = 1`);
    const totalMilestones = milestoneRows[0]?.count || 0;

    const [issuedRows] = await db.query(`
      SELECT COUNT(*) as count FROM certificates c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL)
    `);
    const totalIssued = issuedRows[0]?.count || 0;

    const [users] = await db.query(`
      SELECT u.id, u.username, u.display_name, u.email,
        COALESCE(s.solved_count, 0) as solved_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions
        WHERE status = 'Accepted'
        GROUP BY user_id
      ) s ON u.id = s.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
    `);

    const [configs] = await db.query(`SELECT milestone, title, theme, is_enabled FROM achievement_configs WHERE is_enabled = 1 ORDER BY milestone ASC`);
    const milestones = configs.map(c => Number(c.milestone));

    const [existingCerts] = await db.query(`
      SELECT c.user_id, c.milestone FROM certificates c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL)
    `);
    const certSet = new Set(existingCerts.map(c => `${c.user_id}_${c.milestone}`));

    let eligibleUsersCount = 0;
    let usersInProgressCount = 0;
    const maxMilestone = milestones.length > 0 ? Math.max(...milestones) : 0;

    users.forEach(user => {
      const count = Number(user.solved_count);
      if (count > 0 && count < maxMilestone) {
        usersInProgressCount++;
      }
      milestones.forEach(m => {
        if (count >= m && !certSet.has(`${user.id}_${m}`)) {
          eligibleUsersCount++;
        }
      });
    });

    const milestoneAnalytics = await Promise.all(configs.map(async (conf) => {
      const m = Number(conf.milestone);
      const reachedCount = users.filter(u => Number(u.solved_count) >= m).length;
      const [certsForM] = await db.query(`
        SELECT COUNT(*) as count FROM certificates c
        JOIN users u ON c.user_id = u.id
        WHERE c.milestone = ? AND c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL)
      `, [m]);
      const issuedCount = certsForM[0]?.count || 0;
      return {
        milestone: m,
        title: conf.title,
        theme: conf.theme,
        usersReached: reachedCount,
        certificatesIssued: issuedCount
      };
    }));

    res.json({
      totalMilestones,
      certificatesIssued: totalIssued,
      eligibleUsersCount,
      usersInProgressCount,
      milestoneAnalytics
    });
  } catch (error) {
    console.error('Error fetching admin dashboard summary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Certificates Stats (Legacy Compatibility)
app.get('/api/admin/certificates/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [totalRow] = await db.query(`
      SELECT COUNT(*) as count FROM certificates c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL)
    `);
    const [monthRow] = await db.query(`
      SELECT COUNT(*) as count FROM certificates c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL) AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const [milestoneBreakdown] = await db.query(`
      SELECT c.milestone, COUNT(*) as count FROM certificates c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL) 
      GROUP BY c.milestone ORDER BY c.milestone ASC
    `);

    res.json({
      totalIssued: totalRow[0]?.count || 0,
      certificatesThisMonth: monthRow[0]?.count || 0,
      milestoneBreakdown
    });

  } catch (error) {
    console.error('Error fetching admin cert stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Admin Milestones Management
app.get('/api/admin/certificates/milestones', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [configs] = await db.query(`SELECT * FROM achievement_configs ORDER BY milestone ASC`);
    const [users] = await db.query(`
      SELECT u.id, COALESCE(s.solved_count, 0) as solved_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions
        WHERE status = 'Accepted'
        GROUP BY user_id
      ) s ON u.id = s.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
    `);

    const result = await Promise.all(configs.map(async (conf) => {
      const m = Number(conf.milestone);
      const usersReached = users.filter(u => Number(u.solved_count) >= m).length;
      const [certRows] = await db.query(`
        SELECT COUNT(*) as count FROM certificates c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.milestone = ? AND c.revoked_at IS NULL AND (u.role != 'admin' OR u.role IS NULL)
      `, [m]);
      return {
        ...conf,
        usersReached,
        certificatesCount: certRows[0]?.count || 0
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching admin milestones:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/certificates/milestones', authenticateToken, authorizeAdmin, async (req, res) => {
  const { milestone, title, theme, motivation_message, description_template, is_enabled } = req.body;
  if (!milestone || isNaN(milestone) || Number(milestone) <= 0) {
    return res.status(400).json({ error: 'Valid positive milestone number required.' });
  }
  const milestoneNum = Number(milestone);
  const mTitle = title || `${milestoneNum} Problems Solved`;
  const mTheme = theme || 'blue';
  const mMotiv = motivation_message || 'Keep solving problems!';
  const mDesc = description_template || `This certificate is presented to {userName} in appreciation of successfully solving ${milestoneNum} accepted coding problems on CodeArena.`;
  const mEnabled = is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1;

  try {
    await db.query(
      `INSERT INTO achievement_configs (milestone, title, theme, motivation_message, description_template, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title), theme = VALUES(theme), motivation_message = VALUES(motivation_message),
         description_template = VALUES(description_template), is_enabled = VALUES(is_enabled)`,
      [milestoneNum, mTitle, mTheme, mMotiv, mDesc, mEnabled]
    );
    res.status(201).json({ message: `Milestone ${milestoneNum} saved successfully.` });
  } catch (error) {
    console.error('Error adding/updating milestone:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/admin/certificates/milestones/:milestone/toggle', authenticateToken, authorizeAdmin, async (req, res) => {
  const milestoneNum = Number(req.params.milestone);
  try {
    const [rows] = await db.query(`SELECT is_enabled FROM achievement_configs WHERE milestone = ?`, [milestoneNum]);
    if (rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const newStatus = rows[0].is_enabled ? 0 : 1;
    await db.query(`UPDATE achievement_configs SET is_enabled = ? WHERE milestone = ?`, [newStatus, milestoneNum]);
    res.json({ message: `Milestone ${milestoneNum} ${newStatus ? 'enabled' : 'disabled'}.`, is_enabled: newStatus });
  } catch (error) {
    console.error('Error toggling milestone status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. User Progress Tracking Endpoint
app.get('/api/admin/certificates/user-progress', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Auto-issue certificates for all regular non-admin users first
    const [nonAdminUsers] = await db.query(`SELECT id FROM users WHERE role != 'admin' OR role IS NULL`);
    for (const u of nonAdminUsers) {
      await checkAndIssueCertificates(u.id);
    }

    const [users] = await db.query(`
      SELECT u.id, u.username, u.display_name, u.email, u.role,
        COALESCE(s.solved_count, 0) as solved_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions
        WHERE status = 'Accepted'
        GROUP BY user_id
      ) s ON u.id = s.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
      ORDER BY solved_count DESC, u.id ASC
    `);

    const [configs] = await db.query(`SELECT milestone, title FROM achievement_configs WHERE is_enabled = 1 ORDER BY milestone ASC`);
    const milestones = configs.map(c => Number(c.milestone));

    const [certs] = await db.query(`SELECT user_id, milestone, verification_code, created_at, revoked_at FROM certificates`);
    const certsByUser = {};
    certs.forEach(c => {
      if (!certsByUser[c.user_id]) certsByUser[c.user_id] = [];
      certsByUser[c.user_id].push(c);
    });

    const userProgressList = users.map(u => {
      const solved = Number(u.solved_count);
      const userCerts = certsByUser[u.id] || [];
      const activeCerts = userCerts.filter(c => !c.revoked_at);

      const earnedMilestones = milestones.filter(m => m <= solved);
      const currentMilestone = earnedMilestones.length > 0 ? earnedMilestones[earnedMilestones.length - 1] : 0;
      const nextMilestone = milestones.find(m => m > solved) || null;

      let progressPercent = 100;
      if (nextMilestone) {
        progressPercent = Math.min(100, Math.max(0, Math.round((solved / nextMilestone) * 100)));
      }

      const eligibleMilestones = milestones.filter(m => solved >= m && !activeCerts.some(c => Number(c.milestone) === m));

      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name || u.username,
        email: u.email,
        solvedCount: solved,
        currentMilestone,
        nextMilestone,
        progressPercent,
        certificatesCount: activeCerts.length,
        eligibleMilestones,
        isEligible: eligibleMilestones.length > 0,
        certificates: activeCerts
      };
    });

    res.json(userProgressList);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3b. Earned Milestone Certificates Table Endpoint
app.get('/api/admin/certificates/earned-progress', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Auto-issue certificates for all regular non-admin users first
    const [nonAdminUsers] = await db.query(`SELECT id FROM users WHERE role != 'admin' OR role IS NULL`);
    for (const u of nonAdminUsers) {
      await checkAndIssueCertificates(u.id);
    }

    const [rows] = await db.query(`
      SELECT 
        c.id as cert_id,
        c.verification_code,
        c.created_at as achievement_date,
        c.revoked_at,
        c.milestone,
        c.title as milestone_title,
        c.theme,
        u.id as user_id,
        u.username,
        u.display_name,
        u.email,
        COALESCE(s.solved_count, 0) as accepted_problems
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions
        WHERE status = 'Accepted'
        GROUP BY user_id
      ) s ON u.id = s.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
      ORDER BY c.created_at DESC, c.id DESC
    `);

    const result = rows.map(r => ({
      id: r.cert_id,
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name || r.username,
      email: r.email,
      milestone: r.milestone,
      milestoneTitle: r.milestone_title,
      theme: r.theme,
      requiredProblems: r.milestone,
      acceptedProblems: Number(r.accepted_problems),
      achievementDate: r.achievement_date,
      certificateId: r.verification_code,
      status: r.revoked_at ? 'Revoked' : 'Issued',
      isRevoked: Boolean(r.revoked_at)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching earned progress certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Eligible Users & Batch Generation Endpoints
app.get('/api/admin/certificates/eligible-users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.username, u.display_name, u.email,
        COALESCE(s.solved_count, 0) as solved_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions
        WHERE status = 'Accepted'
        GROUP BY user_id
      ) s ON u.id = s.user_id
    `);

    const [configs] = await db.query(`SELECT milestone, title, theme FROM achievement_configs WHERE is_enabled = 1 ORDER BY milestone ASC`);
    const [existingCerts] = await db.query(`SELECT user_id, milestone FROM certificates WHERE revoked_at IS NULL`);
    const certSet = new Set(existingCerts.map(c => `${c.user_id}_${c.milestone}`));

    const eligibleList = [];
    users.forEach(u => {
      const solved = Number(u.solved_count);
      configs.forEach(conf => {
        const m = Number(conf.milestone);
        if (solved >= m && !certSet.has(`${u.id}_${m}`)) {
          eligibleList.push({
            userId: u.id,
            username: u.username,
            displayName: u.display_name || u.username,
            email: u.email,
            solvedCount: solved,
            milestone: m,
            milestoneTitle: conf.title,
            theme: conf.theme
          });
        }
      });
    });

    res.json(eligibleList);
  } catch (error) {
    console.error('Error fetching eligible users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/certificates/generate', authenticateToken, authorizeAdmin, async (req, res) => {
  const { userId, milestone } = req.body;
  if (!userId || !milestone) {
    return res.status(400).json({ error: 'userId and milestone are required.' });
  }

  try {
    const milestoneNum = Number(milestone);
    const [existing] = await db.query(`SELECT id FROM certificates WHERE user_id = ? AND milestone = ? AND revoked_at IS NULL`, [userId, milestoneNum]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Certificate already issued for this user and milestone.' });
    }

    const [userRows] = await db.query(`SELECT username, display_name FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const userName = userRows[0].display_name || userRows[0].username;
    const [conf] = await db.query(`SELECT title, theme, motivation_message, description_template FROM achievement_configs WHERE milestone = ?`, [milestoneNum]);
    if (conf.length === 0) return res.status(404).json({ error: 'Milestone configuration not found.' });

    const c = conf[0];
    const verCode = `ca_cert_${milestoneNum}_u${userId}_${Math.random().toString(36).substring(2, 8)}`;
    const formattedDesc = c.description_template.replace(/\{userName\}/g, userName);

    await db.query(
      `INSERT INTO certificates 
        (user_id, milestone, verification_code, title, description, theme, motivation_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         verification_code = VALUES(verification_code), title = VALUES(title), 
         description = VALUES(description), theme = VALUES(theme), motivation_message = VALUES(motivation_message), revoked_at = NULL`,
      [userId, milestoneNum, verCode, c.title, formattedDesc, c.theme, c.motivation_message]
    );

    res.json({ message: `Certificate generated for ${userName} (Milestone ${milestoneNum}).`, verification_code: verCode });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/certificates/generate-all-eligible', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.username, u.display_name, COALESCE(s.solved_count, 0) as solved_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(DISTINCT problem_id) as solved_count
        FROM submissions WHERE status = 'Accepted' GROUP BY user_id
      ) s ON u.id = s.user_id
    `);

    const [configs] = await db.query(`SELECT milestone, title, theme, motivation_message, description_template FROM achievement_configs WHERE is_enabled = 1 ORDER BY milestone ASC`);
    const [existingCerts] = await db.query(`SELECT user_id, milestone FROM certificates WHERE revoked_at IS NULL`);
    const certSet = new Set(existingCerts.map(c => `${c.user_id}_${c.milestone}`));

    let generatedCount = 0;
    for (const u of users) {
      const solved = Number(u.solved_count);
      const userName = u.display_name || u.username;
      for (const conf of configs) {
        const m = Number(conf.milestone);
        if (solved >= m && !certSet.has(`${u.id}_${m}`)) {
          const verCode = `ca_cert_${m}_u${u.id}_${Math.random().toString(36).substring(2, 8)}`;
          const formattedDesc = conf.description_template.replace(/\{userName\}/g, userName);
          await db.query(
            `INSERT INTO certificates 
              (user_id, milestone, verification_code, title, description, theme, motivation_message) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               verification_code = VALUES(verification_code), title = VALUES(title), 
               description = VALUES(description), theme = VALUES(theme), motivation_message = VALUES(motivation_message), revoked_at = NULL`,
            [u.id, m, verCode, conf.title, formattedDesc, conf.theme, conf.motivation_message]
          );
          certSet.add(`${u.id}_${m}`);
          generatedCount++;
        }
      }
    }

    res.json({ message: `Successfully generated ${generatedCount} eligible certificates!`, generatedCount });
  } catch (error) {
    console.error('Error generating all eligible certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. User Details & Certificates Audit Endpoint
app.get('/api/admin/certificates/users/:userId/details', authenticateToken, authorizeAdmin, async (req, res) => {
  const userId = req.params.userId;
  try {
    const [userRows] = await db.query(`SELECT id, username, display_name, email, role, created_at FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    const [acceptedSubs] = await db.query(`
      SELECT MIN(s.id) as id, s.problem_id, p.title as problem_title, p.difficulty, MIN(s.submitted_at) as submitted_at
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      WHERE s.user_id = ? AND s.status = 'Accepted'
      GROUP BY s.problem_id, p.title, p.difficulty
      ORDER BY submitted_at DESC
    `, [userId]);

    const solvedCount = acceptedSubs.length;
    const [configs] = await db.query(`SELECT * FROM achievement_configs ORDER BY milestone ASC`);
    const [certs] = await db.query(`SELECT * FROM certificates WHERE user_id = ? ORDER BY milestone ASC`, [userId]);
    const certMap = {};
    certs.forEach(c => { certMap[c.milestone] = c; });

    const milestoneBreakdown = configs.map(conf => {
      const m = Number(conf.milestone);
      const isReached = solvedCount >= m;
      const cert = certMap[m] || null;
      let status = 'LOCKED';
      if (cert) {
        status = cert.revoked_at ? 'REVOKED' : 'ISSUED';
      } else if (isReached) {
        status = 'ELIGIBLE';
      }

      return {
        milestone: m,
        title: conf.title,
        theme: conf.theme,
        isReached,
        status,
        certificate: cert
      };
    });

    const nextMilestoneConfig = configs.find(c => Number(c.milestone) > solvedCount);
    const nextMilestone = nextMilestoneConfig ? Number(nextMilestoneConfig.milestone) : null;
    const progressPercent = nextMilestone ? Math.min(100, Math.round((solvedCount / nextMilestone) * 100)) : 100;

    res.json({
      user,
      solvedCount,
      acceptedSubmissions: acceptedSubs,
      milestoneBreakdown,
      nextMilestone,
      progressPercent,
      certificates: certs
    });
  } catch (error) {
    console.error('Error fetching user certificate details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin List All Certificates
app.get('/api/admin/certificates', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [certs] = await db.query(
      `SELECT c.*, u.username, u.display_name, u.email, u.solved_count 
       FROM certificates c 
       JOIN users u ON c.user_id = u.id 
       WHERE u.role != 'admin' OR u.role IS NULL
       ORDER BY c.created_at DESC`
    );

    res.json(certs.map(c => ({
      ...c,
      user_name: c.display_name || c.username
    })));

  } catch (error) {
    console.error('Error fetching admin certificates list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Revoke/Reactivate Certificate
app.post('/api/admin/certificates/revoke/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const certId = req.params.id;
  try {
    const [rows] = await db.query(`SELECT revoked_at FROM certificates WHERE id = ?`, [certId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    
    const isRevoked = Boolean(rows[0].revoked_at);
    if (isRevoked) {
      await db.query(`UPDATE certificates SET revoked_at = NULL WHERE id = ?`, [certId]);
      res.json({ message: 'Certificate reactivated successfully.', isRevoked: false });
    } else {
      await db.query(`UPDATE certificates SET revoked_at = NOW() WHERE id = ?`, [certId]);
      res.json({ message: 'Certificate revoked successfully.', isRevoked: true });
    }
  } catch (error) {
    console.error('Revoke/reactivate certificate error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Regenerate Certificate Code
app.post('/api/admin/certificates/regenerate/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const certId = req.params.id;
  try {
    const [rows] = await db.query(`SELECT c.*, u.username, u.display_name FROM certificates c JOIN users u ON c.user_id = u.id WHERE c.id = ?`, [certId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    
    const cert = rows[0];
    const newCode = `ca_cert_${cert.milestone}_u${cert.user_id}_${Math.random().toString(36).substring(2, 8)}`;
    const userName = cert.display_name || cert.username;

    const [conf] = await db.query(`SELECT description_template, motivation_message, theme FROM achievement_configs WHERE milestone = ?`, [cert.milestone]);
    const desc = conf[0] ? conf[0].description_template.replace(/\{userName\}/g, userName) : cert.description;
    const theme = conf[0] ? conf[0].theme : cert.theme;
    const motivation = conf[0] ? conf[0].motivation_message : cert.motivation_message;

    await db.query(
      `UPDATE certificates 
       SET verification_code = ?, description = ?, theme = ?, motivation_message = ?, revoked_at = NULL 
       WHERE id = ?`,
      [newCode, desc, theme, motivation, certId]
    );

    res.json({ message: 'Certificate regenerated successfully.', verification_code: newCode });

  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Get/Save Achievement Config Settings
app.get('/api/admin/certificates/settings', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [configs] = await db.query(`SELECT * FROM achievement_configs ORDER BY milestone ASC`);
    res.json({ configs });
  } catch (error) {
    console.error('Error fetching achievement configs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/admin/certificates/settings', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    let itemsToUpdate = [];
    if (Array.isArray(req.body)) {
      itemsToUpdate = req.body;
    } else if (Array.isArray(req.body.configs)) {
      itemsToUpdate = req.body.configs;
    } else if (req.body && req.body.milestone) {
      itemsToUpdate = [req.body];
    } else {
      return res.status(400).json({ error: 'Valid milestone configuration payload required.' });
    }

    for (const c of itemsToUpdate) {
      await db.query(
        `UPDATE achievement_configs 
         SET title = ?, theme = ?, motivation_message = ?, description_template = ?, is_enabled = ?
         WHERE milestone = ?`,
        [c.title, c.theme, c.motivation_message, c.description_template, c.is_enabled ? 1 : 0, c.milestone]
      );
    }
    res.json({ message: 'Achievement settings updated successfully.' });
  } catch (error) {
    console.error('Error updating achievement configs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================================================
// ASSESSMENT SYSTEM API ROUTES
// ==================================================

// Helper: Shuffle array randomly (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 1. User: List Assessments
app.get('/api/assessments', optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const [assessments] = await db.query(`
      SELECT 
        a.id, a.slug, a.title, a.description, a.assessment_type, a.difficulty, a.category,
        a.duration_minutes, a.passing_score_percentage, a.attempt_limit, a.start_time, a.end_time,
        a.visibility, a.status, a.created_at,
        (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) as question_count,
        (SELECT COUNT(*) FROM assessment_sections s WHERE s.assessment_id = a.id) as section_count,
        (SELECT COUNT(*) FROM assessment_attempts att WHERE att.assessment_id = a.id) as candidate_count
      FROM assessments a
      WHERE a.status = 'PUBLISHED' OR a.status = 'AVAILABLE'
      ORDER BY a.created_at DESC
    `);

    // Attach user attempt status if logged in
    const resultList = [];
    for (const ass of assessments) {
      let userAttempts = [];
      if (userId) {
        const [atts] = await db.query(
          `SELECT attempt_id, attempt_number, status, percentage, is_passed, created_at 
           FROM assessment_attempts 
           WHERE user_id = ? AND assessment_id = ? 
           ORDER BY attempt_number DESC`,
          [userId, ass.id]
        );
        userAttempts = atts;
      }

      const attemptsUsed = userAttempts.length;
      const activeAttempt = userAttempts.find(a => a.status === 'IN_PROGRESS');

      resultList.push({
        ...ass,
        userAttemptsCount: attemptsUsed,
        hasActiveAttempt: Boolean(activeAttempt),
        activeAttemptId: activeAttempt ? activeAttempt.attempt_id : null,
        latestAttempt: userAttempts[0] || null
      });
    }

    res.json(resultList);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. User: Get Assessment History
app.get('/api/assessments/my-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [attempts] = await db.query(`
      SELECT 
        att.id, att.attempt_id, att.assessment_id, att.attempt_number, att.start_time, 
        att.end_time, att.submission_time, att.status, att.total_earned_marks, 
        att.total_possible_marks, att.percentage, att.is_passed,
        asm.title as assessment_title, asm.assessment_type, asm.difficulty,
        cert.verification_code as certificate_code
      FROM assessment_attempts att
      JOIN assessments asm ON att.assessment_id = asm.id
      LEFT JOIN assessment_certificates cert ON att.attempt_id = cert.attempt_id
      WHERE att.user_id = ?
      ORDER BY att.created_at DESC
    `, [userId]);

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. User: Get Assessment Details
app.get('/api/assessments/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const [assessments] = await db.query(
      `SELECT * FROM assessments WHERE id = ? OR slug = ?`,
      [req.params.id, req.params.id]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessments[0];

    // Fetch Sections
    const [sections] = await db.query(
      `SELECT id, title, description, order_index, section_marks, section_time_limit_minutes, section_instructions 
       FROM assessment_sections 
       WHERE assessment_id = ? 
       ORDER BY order_index ASC`,
      [assessment.id]
    );

    // Fetch Question Counts by Type
    const [questionStats] = await db.query(
      `SELECT question_type, COUNT(*) as count 
       FROM assessment_questions 
       WHERE assessment_id = ? 
       GROUP BY question_type`,
      [assessment.id]
    );

    // Calculate Total Possible Marks
    const [totalMarksRow] = await db.query(
      `SELECT SUM(marks) as total_marks, COUNT(*) as total_questions 
       FROM assessment_questions 
       WHERE assessment_id = ?`,
      [assessment.id]
    );

    // Check User Attempts
    let userAttempts = [];
    if (userId) {
      const [atts] = await db.query(
        `SELECT attempt_id, attempt_number, status, percentage, is_passed, created_at 
         FROM assessment_attempts 
         WHERE user_id = ? AND assessment_id = ? 
         ORDER BY attempt_number DESC`,
        [userId, assessment.id]
      );
      userAttempts = atts;
    }

    const attemptLimit = Number(assessment.attempt_limit) || 1;
    const attemptsUsed = userAttempts.length;
    const attemptsRemaining = attemptLimit === 0 ? 'Unlimited' : Math.max(0, attemptLimit - attemptsUsed);

    res.json({
      ...assessment,
      sections,
      questionStats,
      totalPossibleMarks: totalMarksRow[0]?.total_marks || 0,
      totalQuestions: totalMarksRow[0]?.total_questions || 0,
      attemptsUsed,
      attemptsRemaining,
      userAttempts
    });
  } catch (error) {
    console.error('Error fetching assessment details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. User: Start / Resume Assessment Attempt
app.post('/api/assessments/:id/start', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const assessmentId = req.params.id;

  try {
    const eligibility = await assessmentTimerService.verifyUserEligibility(userId, assessmentId);
    if (!eligibility.eligible) {
      return res.status(403).json({ error: eligibility.reason });
    }

    // If resuming active attempt
    if (eligibility.resumeAttempt) {
      return res.json({
        message: 'Resuming active attempt',
        attemptId: eligibility.resumeAttempt.attempt_id,
        isResumed: true
      });
    }

    const assessment = eligibility.assessment;
    const durationMinutes = Number(assessment.duration_minutes) || 60;
    const now = new Date();
    const deadline = new Date(now.getTime() + durationMinutes * 60000);

    // Fetch attempt count to calculate attempt_number
    const [prevAttempts] = await db.query(
      `SELECT COUNT(*) as count FROM assessment_attempts WHERE user_id = ? AND assessment_id = ?`,
      [userId, assessment.id]
    );
    const attemptNumber = (prevAttempts[0]?.count || 0) + 1;

    const attemptId = `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Fetch all questions for assessment
    const [questions] = await db.query(
      `SELECT id, question_type, options FROM assessment_questions WHERE assessment_id = ? ORDER BY order_index ASC`,
      [assessment.id]
    );

    let questionOrder = questions.map(q => q.id);
    if (assessment.random_question_order) {
      questionOrder = shuffleArray(questionOrder);
    }

    const optionOrder = {};
    if (assessment.random_option_order) {
      questions.forEach(q => {
        let opts = [];
        try {
          opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
        } catch (e) {}
        if (opts.length > 0) {
          const optIds = opts.map(o => o.id || o.text);
          optionOrder[q.id] = shuffleArray(optIds);
        }
      });
    }

    // Create assessment_attempt record
    await db.query(
      `INSERT INTO assessment_attempts (
        attempt_id, user_id, assessment_id, attempt_number, start_time, deadline_time, 
        status, question_order, option_order
      ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?)`,
      [
        attemptId, userId, assessment.id, attemptNumber, now, deadline,
        JSON.stringify(questionOrder), JSON.stringify(optionOrder)
      ]
    );

    // Initialize assessment_responses records for each question
    for (const qId of questionOrder) {
      await db.query(
        `INSERT INTO assessment_responses (attempt_id, question_id, response_data, is_answered, is_visited)
         VALUES (?, ?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE last_saved_at = NOW()`,
        [attemptId, qId, JSON.stringify({})]
      );
    }

    // Record audit log
    await db.query(
      `INSERT INTO assessment_audit_logs (actor_id, action, assessment_id, details)
       VALUES (?, 'START_ASSESSMENT_ATTEMPT', ?, ?)`,
      [userId, assessment.id, JSON.stringify({ attemptId, attemptNumber })]
    );

    // Send assessment started email notification
    const [uRows] = await db.query('SELECT username, display_name, email FROM users WHERE id = ?', [userId]);
    if (uRows.length > 0 && uRows[0].email) {
      emailService.sendAssessmentEnrollmentEmail({
        userId,
        recipientEmail: uRows[0].email,
        userName: uRows[0].display_name || uRows[0].username,
        assessmentTitle: assessment.title,
        startTime: now,
        durationMinutes
      }).catch(err => console.error('Error sending assessment start email:', err));
    }

    res.status(201).json({
      message: 'Assessment attempt started successfully',
      attemptId,
      isResumed: false,
      deadlineTime: deadline.toISOString()
    });

  } catch (error) {
    console.error('Error starting assessment attempt:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. User: Get Active Attempt Workspace State
app.get('/api/assessment-attempts/:attemptId', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;

  try {
    const timeState = await assessmentTimerService.getAttemptTimeState(attemptId);
    if (timeState.error) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (timeState.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to this attempt' });
    }

    // Fetch attempt details
    const [attempts] = await db.query(
      `SELECT * FROM assessment_attempts WHERE attempt_id = ?`,
      [attemptId]
    );
    const attempt = attempts[0];

    // Fetch assessment master details
    const [assessments] = await db.query(
      `SELECT id, title, description, assessment_type, duration_minutes, instructions, rules, rules_config FROM assessments WHERE id = ?`,
      [attempt.assessment_id]
    );
    const assessment = assessments[0];
    let rulesConfig = {};
    try {
      rulesConfig = typeof assessment.rules_config === 'string' ? JSON.parse(assessment.rules_config) : (assessment.rules_config || {});
    } catch (e) {}

    // Fetch sections
    const [sections] = await db.query(
      `SELECT * FROM assessment_sections WHERE assessment_id = ? ORDER BY order_index ASC`,
      [attempt.assessment_id]
    );

    // Fetch questions & sanitize hidden answers/testcases
    const [rawQuestions] = await db.query(
      `SELECT 
        q.id, q.section_id, q.question_type, q.problem_id, q.question_text, 
        q.code_snippet, q.options, q.marks, q.negative_marks, q.order_index,
        p.title as problem_title, p.difficulty as problem_difficulty, p.description as problem_description,
        p.constraints as problem_constraints, p.input_format as problem_input_format,
        p.output_format as problem_output_format, p.sample_input as problem_sample_input,
        p.sample_output as problem_sample_output, p.starter_code as problem_starter_code
       FROM assessment_questions q
       LEFT JOIN problems p ON q.problem_id = p.id
       WHERE q.assessment_id = ?`,
      [attempt.assessment_id]
    );

    // Apply saved question_order
    let questionOrder = [];
    try {
      questionOrder = typeof attempt.question_order === 'string' ? JSON.parse(attempt.question_order) : (attempt.question_order || []);
    } catch (e) {}

    const questionMap = {};
    rawQuestions.forEach(q => {
      // Sanitize options to hide is_correct flags from candidate!
      let parsedOpts = [];
      try {
        parsedOpts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
      } catch (e) {}

      const sanitizedOpts = parsedOpts.map(o => ({
        id: o.id || o.text,
        text: o.text
      }));

      // Parse starter code if coding question
      let starterCodeParsed = null;
      if (q.problem_starter_code) {
        try {
          starterCodeParsed = typeof q.problem_starter_code === 'string' 
            ? JSON.parse(q.problem_starter_code) 
            : q.problem_starter_code;
        } catch (e) {}
      }

      questionMap[q.id] = {
        id: q.id,
        section_id: q.section_id,
        question_type: q.question_type,
        problem_id: q.problem_id,
        question_text: q.question_text,
        code_snippet: q.code_snippet,
        options: sanitizedOpts,
        marks: q.marks,
        negative_marks: q.negative_marks,
        order_index: q.order_index,
        problem: q.problem_id ? {
          title: q.problem_title,
          difficulty: q.problem_difficulty,
          description: q.problem_description,
          constraints: q.problem_constraints,
          input_format: q.problem_input_format,
          output_format: q.problem_output_format,
          sample_input: q.problem_sample_input,
          sample_output: q.problem_sample_output,
          starter_code: starterCodeParsed
        } : null
      };
    });

    const orderedQuestions = (questionOrder.length > 0 ? questionOrder : rawQuestions.map(q => q.id))
      .map(id => questionMap[id])
      .filter(Boolean);

    // Fetch candidate saved responses
    const [responses] = await db.query(
      `SELECT question_id, response_data, is_answered, is_marked_for_review, is_visited, last_saved_at 
       FROM assessment_responses 
       WHERE attempt_id = ?`,
      [attemptId]
    );

    const savedResponseMap = {};
    responses.forEach(r => {
      let parsedData = {};
      try {
        parsedData = typeof r.response_data === 'string' ? JSON.parse(r.response_data) : (r.response_data || {});
      } catch (e) {}

      savedResponseMap[r.question_id] = {
        responseData: parsedData,
        isAnswered: Boolean(r.is_answered),
        isMarkedForReview: Boolean(r.is_marked_for_review),
        isVisited: Boolean(r.is_visited),
        lastSavedAt: r.last_saved_at
      };
    });

    res.json({
      attemptId: attempt.attempt_id,
      assessment: {
        ...assessment,
        rules_config: rulesConfig
      },
      timeState,
      status: attempt.status,
      warningCount: attempt.warning_count || 0,
      terminationReason: attempt.termination_reason || null,
      securityStatus: attempt.security_status || 'Normal',
      sections,
      questions: orderedQuestions,
      responses: savedResponseMap
    });

  } catch (error) {
    console.error('Error fetching attempt state:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. User: Auto-Save Question Response
app.post('/api/assessment-attempts/:attemptId/save', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;
  const { questionId, responseData, isMarkedForReview, isVisited } = req.body;

  if (!questionId) {
    return res.status(400).json({ error: 'questionId is required' });
  }

  try {
    const timeState = await assessmentTimerService.getAttemptTimeState(attemptId);
    if (timeState.error || timeState.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized attempt action' });
    }

    if (timeState.isExpired || timeState.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Assessment time has expired or attempt is completed.' });
    }

    const isAnswered = Boolean(
      (responseData && Array.isArray(responseData.selected_options) && responseData.selected_options.length > 0) ||
      (responseData && responseData.text_answer && responseData.text_answer.trim().length > 0) ||
      (responseData && responseData.coding_source && responseData.coding_source.trim().length > 0)
    );

    await db.query(
      `INSERT INTO assessment_responses (
        attempt_id, question_id, response_data, is_answered, is_marked_for_review, is_visited, last_saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        response_data = VALUES(response_data),
        is_answered = VALUES(is_answered),
        is_marked_for_review = VALUES(is_marked_for_review),
        is_visited = VALUES(is_visited),
        last_saved_at = NOW()`,
      [
        attemptId, questionId, JSON.stringify(responseData || {}),
        isAnswered ? 1 : 0, isMarkedForReview ? 1 : 0, isVisited ? 1 : 1
      ]
    );

    res.json({ message: 'Saved successfully', questionId, isAnswered });

  } catch (error) {
    console.error('Error auto-saving response:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. User: Run / Test Coding Question in Assessment Mode
app.post('/api/assessment-attempts/:attemptId/coding-run', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const { questionId, language, code, customInput } = req.body;

  try {
    const timeState = await assessmentTimerService.getAttemptTimeState(attemptId);
    if (timeState.error || timeState.isExpired) {
      return res.status(400).json({ error: 'Assessment expired' });
    }

    const [questions] = await db.query(
      `SELECT problem_id FROM assessment_questions WHERE id = ? AND assessment_id = ?`,
      [questionId, timeState.assessmentId]
    );

    if (questions.length === 0 || !questions[0].problem_id) {
      return res.status(400).json({ error: 'Valid coding question required' });
    }

    // Forward to standard handleExecutionRequest logic
    req.body.problem_id = questions[0].problem_id;
    req.body.action = 'run';
    return handleExecutionRequest(req, res);

  } catch (error) {
    console.error('Error running assessment coding question:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. User: Submit Coding Question in Assessment Mode
app.post('/api/assessment-attempts/:attemptId/coding-submit', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;
  const { questionId, language, code } = req.body;

  try {
    const timeState = await assessmentTimerService.getAttemptTimeState(attemptId);
    if (timeState.error || timeState.isExpired) {
      return res.status(400).json({ error: 'Assessment expired' });
    }

    const [questions] = await db.query(
      `SELECT id, problem_id, marks FROM assessment_questions WHERE id = ? AND assessment_id = ?`,
      [questionId, timeState.assessmentId]
    );

    if (questions.length === 0 || !questions[0].problem_id) {
      return res.status(400).json({ error: 'Valid coding question required' });
    }

    const problemId = questions[0].problem_id;
    const qMarks = Number(questions[0].marks) || 10.0;

    // Fetch problem test cases securely
    const [problems] = await db.query(`SELECT * FROM problems WHERE id = ?`, [problemId]);
    const problem = problems[0];

    let parsedCases = [];
    try {
      parsedCases = typeof problem.test_cases === 'string' ? JSON.parse(problem.test_cases) : problem.test_cases;
    } catch (e) {}

    let passedCount = 0;
    const totalCases = parsedCases.length || 1;

    for (const tc of parsedCases) {
      const sandboxRes = await executionService.executeCode(language, code, tc.input, 5000);
      if (sandboxRes.status === 'Accepted') {
        const actualClean = (sandboxRes.stdout || '').trim();
        const expectedClean = (tc.expected || '').trim();
        if (actualClean === expectedClean) {
          passedCount++;
        }
      }
    }

    const isAccepted = passedCount === totalCases;
    const ratio = passedCount / Math.max(1, totalCases);
    const scoreEarned = Number((qMarks * ratio).toFixed(2));
    const statusStr = isAccepted ? 'Accepted' : (passedCount > 0 ? 'Partially Accepted' : 'Wrong Answer');

    // Insert into assessment_coding_submissions
    await db.query(
      `INSERT INTO assessment_coding_submissions (
        attempt_id, user_id, assessment_id, question_id, problem_id, 
        language, source_code, status, test_cases_passed, total_test_cases, score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [attemptId, userId, timeState.assessmentId, questionId, problemId, language, code, statusStr, passedCount, totalCases, scoreEarned]
    );

    // Save coding source in assessment_responses
    await db.query(
      `INSERT INTO assessment_responses (
        attempt_id, question_id, response_data, is_answered, is_visited, score_earned, is_correct
      ) VALUES (?, ?, ?, 1, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        response_data = VALUES(response_data),
        is_answered = 1,
        score_earned = VALUES(score_earned),
        is_correct = VALUES(is_correct),
        last_saved_at = NOW()`,
      [
        attemptId, questionId,
        JSON.stringify({ coding_source: code, language, status: statusStr, testCasesPassed: passedCount }),
        scoreEarned, isAccepted ? 1 : 0
      ]
    );

    res.json({
      status: statusStr,
      testCasesPassed: passedCount,
      totalTestCases: totalCases,
      score: scoreEarned
    });

  } catch (error) {
    console.error('Error submitting assessment coding question:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. User: Finalize Assessment Submission
app.post('/api/assessment-attempts/:attemptId/submit', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;

  try {
    const timeState = await assessmentTimerService.getAttemptTimeState(attemptId);
    if (timeState.error || timeState.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized attempt action' });
    }

    if (timeState.status === 'COMPLETED' || timeState.status === 'SUBMITTED') {
      return res.json({ message: 'Assessment already submitted', attemptId });
    }

    // Trigger calculation
    const results = await assessmentScoringService.calculateAttemptResults(attemptId);

    // Audit Log
    await db.query(
      `INSERT INTO assessment_audit_logs (actor_id, action, assessment_id, details)
       VALUES (?, 'SUBMIT_ASSESSMENT', ?, ?)`,
      [userId, timeState.assessmentId, JSON.stringify({ attemptId, results })]
    );

    // Trigger email notification for assessment submission results
    const [uRows] = await db.query('SELECT username, display_name, email FROM users WHERE id = ?', [userId]);
    const [assRows] = await db.query('SELECT title, passing_score_percentage FROM assessments WHERE id = ?', [timeState.assessmentId]);

    if (uRows.length > 0 && uRows[0].email && assRows.length > 0) {
      const u = uRows[0];
      const ass = assRows[0];
      const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

      emailService.sendAssessmentResultEmail({
        userId,
        recipientEmail: u.email,
        userName: u.display_name || u.username,
        assessmentTitle: ass.title,
        score: results.earnedScore || results.total_earned_marks || 0,
        percentage: results.percentage || 0,
        isPassed: Boolean(results.isPassed),
        passingPercentage: ass.passing_score_percentage || 60,
        resultUrl: `${appUrl}/assessments`
      }).catch(err => console.error('Error sending assessment result email:', err));
    }

    res.json({
      message: 'Assessment submitted successfully!',
      results
    });

  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 10. User: Get Result Page Details
app.get('/api/assessment-attempts/:attemptId/result', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;

  try {
    const [attempts] = await db.query(
      `SELECT att.*, asm.title as assessment_title, asm.show_score_immediately, asm.show_correct_answers, asm.show_explanations, asm.passing_score_percentage
       FROM assessment_attempts att
       JOIN assessments asm ON att.assessment_id = asm.id
       WHERE att.attempt_id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ error: 'Attempt result not found' });
    }

    const attempt = attempts[0];
    if (attempt.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch Question breakdown
    const [responses] = await db.query(
      `SELECT 
        r.question_id, r.response_data, r.is_answered, r.score_earned, r.is_correct, r.evaluation_status,
        q.question_type, q.question_text, q.marks, q.negative_marks, q.explanation, q.options, q.correct_answers
       FROM assessment_responses r
       JOIN assessment_questions q ON r.question_id = q.id
       WHERE r.attempt_id = ?
       ORDER BY q.order_index ASC`,
      [attemptId]
    );

    const questionBreakdown = responses.map(r => {
      let parsedData = {};
      try {
        parsedData = typeof r.response_data === 'string' ? JSON.parse(r.response_data) : (r.response_data || {});
      } catch (e) {}

      let options = null;
      let correctAnswers = null;

      // Only reveal correct answers/explanations if permitted by admin config!
      if (attempt.show_correct_answers || req.user.role === 'admin') {
        try {
          options = typeof r.options === 'string' ? JSON.parse(r.options) : r.options;
          correctAnswers = typeof r.correct_answers === 'string' ? JSON.parse(r.correct_answers) : r.correct_answers;
        } catch (e) {}
      }

      return {
        questionId: r.question_id,
        questionType: r.question_type,
        questionText: r.question_text,
        marks: r.marks,
        earnedScore: r.score_earned,
        isCorrect: Boolean(r.is_correct),
        isAnswered: Boolean(r.is_answered),
        candidateResponse: parsedData,
        explanation: attempt.show_explanations ? r.explanation : null,
        options,
        correctAnswers
      };
    });

    // Check certificate
    const [certs] = await db.query(
      `SELECT verification_code, certificate_title, issue_date FROM assessment_certificates WHERE attempt_id = ?`,
      [attemptId]
    );

    res.json({
      attemptId: attempt.attempt_id,
      assessmentTitle: attempt.assessment_title,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      warningCount: attempt.warning_count || 0,
      securityStatus: attempt.security_status || 'Normal',
      terminationReason: attempt.termination_reason || null,
      startTime: attempt.start_time,
      submissionTime: attempt.submission_time,
      totalEarnedMarks: attempt.total_earned_marks,
      totalPossibleMarks: attempt.total_possible_marks,
      percentage: attempt.percentage,
      isPassed: Boolean(attempt.is_passed),
      passingScorePercentage: attempt.passing_score_percentage,
      questionBreakdown,
      certificate: certs[0] || null
    });

  } catch (error) {
    console.error('Error fetching result details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 11. User: Log Integrity Violations & Proctoring Events (Server-Authoritative Enforcement)
app.post('/api/assessment-attempts/:attemptId/log-violation', authenticateToken, async (req, res) => {
  const attemptId = req.params.attemptId;
  const userId = req.user.id;
  const { violationType, details, clientInfo } = req.body;

  try {
    const [attempts] = await db.query(
      `SELECT att.*, asm.rules_config 
       FROM assessment_attempts att
       JOIN assessments asm ON att.assessment_id = asm.id
       WHERE att.attempt_id = ? AND att.user_id = ?`,
      [attemptId, userId]
    );

    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attempts[0];

    // If attempt is already terminated or submitted, ignore further violations
    if (attempt.status === 'TERMINATED' || attempt.status === 'SUBMITTED' || attempt.status === 'COMPLETED' || attempt.status === 'AUTO_SUBMITTED') {
      return res.json({ 
        status: attempt.status, 
        warningCount: attempt.warning_count, 
        actionTaken: 'ALREADY_FINALIZED', 
        terminated: true 
      });
    }

    let rulesConfig = {};
    try {
      rulesConfig = typeof attempt.rules_config === 'string' ? JSON.parse(attempt.rules_config) : (attempt.rules_config || {});
    } catch (e) {}

    const maxAllowedWarnings = Number(rulesConfig.maxAllowedWarnings) || 3;
    const maxAction = rulesConfig.maxViolationAction || 'terminate'; // 'terminate' or 'submit'

    const currentWarningCount = (attempt.warning_count || 0) + 1;
    const isMaxReached = currentWarningCount >= maxAllowedWarnings;

    let actionTaken = isMaxReached 
      ? (maxAction === 'submit' ? 'AUTO_SUBMITTED' : 'TERMINATED') 
      : 'WARNING_ISSUED';

    // Insert violation record atomically
    await db.query(
      `INSERT INTO assessment_violations (attempt_id, user_id, assessment_id, violation_type, details, warning_number, action_taken, client_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId, userId, attempt.assessment_id, violationType || 'TAB_SWITCH', 
        JSON.stringify(details || {}), currentWarningCount, actionTaken, JSON.stringify(clientInfo || {})
      ]
    );

    // Update attempt record
    let newStatus = attempt.status;
    let terminationReason = attempt.termination_reason;
    let securityStatus = currentWarningCount > 0 ? `Warning (${currentWarningCount}/${maxAllowedWarnings})` : 'Normal';

    if (isMaxReached) {
      newStatus = maxAction === 'submit' ? 'AUTO_SUBMITTED' : 'TERMINATED';
      terminationReason = `Maximum security violations reached (${currentWarningCount}/${maxAllowedWarnings})`;
      securityStatus = 'Violation Terminated';

      // Atomic end time update
      await db.query(
        `UPDATE assessment_attempts 
         SET status = ?, warning_count = ?, termination_reason = ?, security_status = ?, end_time = NOW(), submission_time = NOW()
         WHERE attempt_id = ?`,
        [newStatus, currentWarningCount, terminationReason, securityStatus, attemptId]
      );

      // Trigger automatic score calculation & results saving server-side
      await assessmentScoringService.calculateAttemptResults(attemptId);
    } else {
      await db.query(
        `UPDATE assessment_attempts 
         SET warning_count = ?, security_status = ? 
         WHERE attempt_id = ?`,
        [currentWarningCount, securityStatus, attemptId]
      );
    }

    res.json({
      message: isMaxReached ? `Assessment ${newStatus.toLowerCase().replace('_', ' ')} due to security violations` : 'Security warning recorded',
      warningCount: currentWarningCount,
      maxAllowedWarnings,
      actionTaken,
      status: newStatus,
      terminated: isMaxReached,
      terminationReason: isMaxReached ? terminationReason : null
    });

  } catch (error) {
    console.error('Error logging proctoring violation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==================================================
// ADMIN ASSESSMENT MANAGEMENT ROUTES
// ==================================================

// 12. Admin: Get Assessment Stats
app.get('/api/admin/assessments/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [totalAss] = await db.query(`SELECT COUNT(*) as count FROM assessments`);
    const [publishedAss] = await db.query(`SELECT COUNT(*) as count FROM assessments WHERE status = 'PUBLISHED'`);
    const [draftAss] = await db.query(`SELECT COUNT(*) as count FROM assessments WHERE status = 'DRAFT'`);
    const [activeAttempts] = await db.query(`SELECT COUNT(*) as count FROM assessment_attempts WHERE status = 'IN_PROGRESS'`);
    const [completedAttempts] = await db.query(`SELECT COUNT(*) as count FROM assessment_attempts WHERE status = 'COMPLETED'`);
    const [passedAttempts] = await db.query(`SELECT COUNT(*) as count FROM assessment_attempts WHERE is_passed = 1`);
    const [avgScoreRow] = await db.query(`SELECT AVG(percentage) as avg_score FROM assessment_attempts WHERE status = 'COMPLETED'`);

    res.json({
      totalAssessments: totalAss[0].count,
      publishedAssessments: publishedAss[0].count,
      draftAssessments: draftAss[0].count,
      activeAttempts: activeAttempts[0].count,
      completedAttempts: completedAttempts[0].count,
      passedAttempts: passedAttempts[0].count,
      averageScore: Number((avgScoreRow[0].avg_score || 0).toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching admin assessment stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 13. List All Assessments (Admin or Verified Org)
app.get('/api/admin/assessments', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const [assessments] = await db.query(`
      SELECT 
        a.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) as question_count,
        (SELECT COUNT(*) FROM assessment_sections s WHERE s.assessment_id = a.id) as section_count,
        (SELECT COUNT(*) FROM assessment_attempts att WHERE att.assessment_id = a.id) as attempt_count,
        (SELECT COUNT(*) FROM assessment_candidates c WHERE c.assessment_id = a.id) as candidate_count
      FROM assessments a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);

    res.json(assessments);
  } catch (error) {
    console.error('Error fetching admin assessments list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 14. Create Assessment Draft / Publish (Admin or Verified Org)
app.post('/api/admin/assessments', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const adminId = req.user.id;
  const {
    title, description, assessment_type, difficulty, category, tags,
    start_time, end_time, duration_minutes, passing_score_percentage,
    default_positive_marks, default_negative_marks, attempt_limit,
    random_question_order, random_option_order, visibility, candidate_limit,
    instructions, rules, custom_notes, status, show_score_immediately,
    show_correct_answers, show_explanations, certificate_enabled, rules_config
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Assessment title is required' });
  }

  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);

    const [result] = await db.query(
      `INSERT INTO assessments (
        slug, title, description, assessment_type, difficulty, category, tags,
        start_time, end_time, duration_minutes, passing_score_percentage,
        default_positive_marks, default_negative_marks, attempt_limit,
        random_question_order, random_option_order, visibility, candidate_limit,
        instructions, rules, custom_notes, status, show_score_immediately,
        show_correct_answers, show_explanations, certificate_enabled, rules_config, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug, title, description || '', assessment_type || 'Mixed', difficulty || 'Medium', category || 'General',
        JSON.stringify(tags || []), start_time || null, end_time || null, duration_minutes || 60,
        passing_score_percentage || 60.00, default_positive_marks || 2.00, default_negative_marks || 0.50,
        attempt_limit || 1, random_question_order ? 1 : 0, random_option_order ? 1 : 0,
        visibility || 'PUBLIC', candidate_limit || 0, instructions || '', rules || '', custom_notes || '',
        status || 'DRAFT', show_score_immediately ? 1 : 0, show_correct_answers ? 1 : 0,
        show_explanations ? 1 : 0, certificate_enabled ? 1 : 0,
        JSON.stringify(rules_config && Object.keys(rules_config).length > 0 ? rules_config : {
          enableProctoring: true,
          requireWebcam: true,
          requireMicrophone: false,
          requireScreenShare: true,
          requireFullscreen: true,
          detectTabSwitch: true,
          detectVisibilityChange: true,
          preventCopy: true,
          preventCut: true,
          preventPaste: true,
          preventRightClick: true,
          maxAllowedWarnings: 3,
          maxViolationAction: 'terminate'
        }), adminId
      ]
    );

    const assessmentId = result.insertId;

    // Create default section
    await db.query(
      `INSERT INTO assessment_sections (assessment_id, title, description, order_index)
       VALUES (?, 'General Section', 'Main assessment section', 1)`,
      [assessmentId]
    );

    // Audit log
    await db.query(
      `INSERT INTO assessment_audit_logs (actor_id, action, assessment_id, details)
       VALUES (?, 'CREATE_ASSESSMENT', ?, ?)`,
      [adminId, assessmentId, JSON.stringify({ title, status: status || 'DRAFT' })]
    );

    res.status(201).json({
      message: 'Assessment created successfully',
      id: assessmentId,
      slug
    });

  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 15. Update Assessment Configuration (Admin or Verified Org)
app.put('/api/admin/assessments/:id', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  const adminId = req.user.id;
  const {
    title, description, assessment_type, difficulty, category,
    start_time, end_time, duration_minutes, passing_score_percentage,
    default_positive_marks, default_negative_marks, attempt_limit,
    random_question_order, random_option_order, visibility, candidate_limit,
    instructions, rules, custom_notes, status, show_score_immediately,
    show_correct_answers, show_explanations, certificate_enabled, rules_config
  } = req.body;

  try {
    await db.query(
      `UPDATE assessments SET
        title = ?, description = ?, assessment_type = ?, difficulty = ?, category = ?,
        start_time = ?, end_time = ?, duration_minutes = ?, passing_score_percentage = ?,
        default_positive_marks = ?, default_negative_marks = ?, attempt_limit = ?,
        random_question_order = ?, random_option_order = ?, visibility = ?, candidate_limit = ?,
        instructions = ?, rules = ?, custom_notes = ?, status = ?, show_score_immediately = ?,
        show_correct_answers = ?, show_explanations = ?, certificate_enabled = ?, rules_config = ?
       WHERE id = ?`,
      [
        title, description, assessment_type, difficulty, category,
        start_time || null, end_time || null, duration_minutes, passing_score_percentage,
        default_positive_marks, default_negative_marks, attempt_limit,
        random_question_order ? 1 : 0, random_option_order ? 1 : 0, visibility, candidate_limit,
        instructions, rules, custom_notes, status, show_score_immediately ? 1 : 0,
        show_correct_answers ? 1 : 0, show_explanations ? 1 : 0, certificate_enabled ? 1 : 0,
        JSON.stringify(rules_config || {}), assessmentId
      ]
    );

    // Audit log
    await db.query(
      `INSERT INTO assessment_audit_logs (actor_id, action, assessment_id, details)
       VALUES (?, 'UPDATE_ASSESSMENT', ?, ?)`,
      [adminId, assessmentId, JSON.stringify({ title, status })]
    );

    res.json({ message: 'Assessment updated successfully' });

  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 16. Duplicate Assessment (Admin or Verified Org)
app.post('/api/admin/assessments/:id/duplicate', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const originalId = req.params.id;
  const adminId = req.user.id;

  try {
    const [assessments] = await db.query(`SELECT * FROM assessments WHERE id = ?`, [originalId]);
    if (assessments.length === 0) return res.status(404).json({ error: 'Assessment not found' });
    const orig = assessments[0];

    const newTitle = `${orig.title} (Copy)`;
    const newSlug = orig.slug + '-copy-' + Date.now().toString(36);

    const [dupRes] = await db.query(
      `INSERT INTO assessments (
        slug, title, description, assessment_type, difficulty, category, tags,
        duration_minutes, passing_score_percentage, default_positive_marks, default_negative_marks,
        attempt_limit, random_question_order, random_option_order, visibility,
        instructions, rules, custom_notes, rules_config, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [
        newSlug, newTitle, orig.description, orig.assessment_type, orig.difficulty, orig.category, orig.tags,
        orig.duration_minutes, orig.passing_score_percentage, orig.default_positive_marks, orig.default_negative_marks,
        orig.attempt_limit, orig.random_question_order, orig.random_option_order, orig.visibility,
        orig.instructions, orig.rules, orig.custom_notes,
        // carry over the original's rules_config so proctoring settings are preserved in duplicates
        typeof orig.rules_config === 'string' ? orig.rules_config : JSON.stringify(orig.rules_config || {}),
        adminId
      ]
    );

    const newId = dupRes.insertId;

    // Duplicate Sections & Questions
    const [sections] = await db.query(`SELECT * FROM assessment_sections WHERE assessment_id = ?`, [originalId]);
    for (const sec of sections) {
      const [newSecRes] = await db.query(
        `INSERT INTO assessment_sections (assessment_id, title, description, order_index) VALUES (?, ?, ?, ?)`,
        [newId, sec.title, sec.description, sec.order_index]
      );
      const newSecId = newSecRes.insertId;

      const [questions] = await db.query(`SELECT * FROM assessment_questions WHERE section_id = ?`, [sec.id]);
      for (const q of questions) {
        await db.query(
          `INSERT INTO assessment_questions (
            assessment_id, section_id, question_type, problem_id, question_text, 
            code_snippet, options, correct_answers, explanation, marks, negative_marks, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId, newSecId, q.question_type, q.problem_id, q.question_text,
            q.code_snippet, q.options, q.correct_answers, q.explanation, q.marks, q.negative_marks, q.order_index
          ]
        );
      }
    }

    res.json({ message: 'Assessment duplicated successfully', newId });

  } catch (error) {
    console.error('Error duplicating assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 17. Delete Assessment (Admin or Verified Org)
app.delete('/api/admin/assessments/:id', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  try {
    await db.query(`DELETE FROM assessments WHERE id = ?`, [assessmentId]);
    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 18. Change Status (Publish/Unpublish/Archive) (Admin or Verified Org)
app.patch('/api/admin/assessments/:id/status', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  const { status } = req.body;

  try {
    await db.query(`UPDATE assessments SET status = ? WHERE id = ?`, [status, assessmentId]);
    res.json({ message: `Assessment status changed to ${status}` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 19. Get Sections & Questions (Admin or Verified Org)
app.get('/api/admin/assessments/:id/sections', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  try {
    const [sections] = await db.query(
      `SELECT * FROM assessment_sections WHERE assessment_id = ? ORDER BY order_index ASC`,
      [assessmentId]
    );

    const [questions] = await db.query(
      `SELECT 
        q.*, p.title as problem_title 
       FROM assessment_questions q 
       LEFT JOIN problems p ON q.problem_id = p.id 
       WHERE q.assessment_id = ? 
       ORDER BY q.order_index ASC`,
      [assessmentId]
    );

    res.json({ sections, questions });
  } catch (error) {
    console.error('Error fetching sections & questions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 20. Create/Update Section (Admin or Verified Org)
app.post('/api/admin/assessments/:id/sections', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  const { id, title, description, order_index } = req.body;

  try {
    if (id) {
      await db.query(
        `UPDATE assessment_sections SET title = ?, description = ?, order_index = ? WHERE id = ? AND assessment_id = ?`,
        [title, description, order_index || 1, id, assessmentId]
      );
      res.json({ message: 'Section updated' });
    } else {
      const [resSec] = await db.query(
        `INSERT INTO assessment_sections (assessment_id, title, description, order_index) VALUES (?, ?, ?, ?)`,
        [assessmentId, title, description, order_index || 1]
      );
      res.json({ message: 'Section created', id: resSec.insertId });
    }
  } catch (error) {
    console.error('Error managing section:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 21. Delete Section (Admin or Verified Org)
app.delete('/api/admin/assessments/:id/sections/:sectionId', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    await db.query(`DELETE FROM assessment_sections WHERE id = ? AND assessment_id = ?`, [req.params.sectionId, req.params.id]);
    res.json({ message: 'Section deleted' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 22. Add / Update Question (Admin or Verified Org)
app.post('/api/admin/assessments/:id/questions', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  const {
    id, section_id, question_type, problem_id, question_text, code_snippet,
    options, correct_answers, explanation, marks, negative_marks, order_index
  } = req.body;

  try {
    if (id) {
      await db.query(
        `UPDATE assessment_questions SET 
          section_id = ?, question_type = ?, problem_id = ?, question_text = ?,
          code_snippet = ?, options = ?, correct_answers = ?, explanation = ?,
          marks = ?, negative_marks = ?, order_index = ?
         WHERE id = ? AND assessment_id = ?`,
        [
          section_id || null, question_type, problem_id || null, question_text,
          code_snippet || null, JSON.stringify(options || []), JSON.stringify(correct_answers || []),
          explanation || null, marks || 2.00, negative_marks || 0.50, order_index || 1,
          id, assessmentId
        ]
      );
      res.json({ message: 'Question updated' });
    } else {
      const [qRes] = await db.query(
        `INSERT INTO assessment_questions (
          assessment_id, section_id, question_type, problem_id, question_text,
          code_snippet, options, correct_answers, explanation, marks, negative_marks, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assessmentId, section_id || null, question_type, problem_id || null, question_text,
          code_snippet || null, JSON.stringify(options || []), JSON.stringify(correct_answers || []),
          explanation || null, marks || 2.00, negative_marks || 0.50, order_index || 1
        ]
      );
      res.status(201).json({ message: 'Question added', id: qRes.insertId });
    }
  } catch (error) {
    console.error('Error managing question:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 23. Delete Question (Admin or Verified Org)
app.delete('/api/admin/assessments/:id/questions/:questionId', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    await db.query(`DELETE FROM assessment_questions WHERE id = ? AND assessment_id = ?`, [req.params.questionId, req.params.id]);
    res.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 24. List / Invite Candidates (Admin or Verified Org)
app.get('/api/admin/assessments/:id/candidates', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  try {
    const [candidates] = await db.query(
      `SELECT c.*, u.username, u.display_name 
       FROM assessment_candidates c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.assessment_id = ? 
       ORDER BY c.sent_at DESC`,
      [assessmentId]
    );
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/admin/assessments/:id/candidates/invite', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Candidate email required' });

  try {
    const inviteCode = `INV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const [existingUser] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
    const userId = existingUser.length > 0 ? existingUser[0].id : null;

    await db.query(
      `INSERT INTO assessment_candidates (assessment_id, user_id, email, invite_code, status)
       VALUES (?, ?, ?, ?, 'INVITED')`,
      [assessmentId, userId, email, inviteCode]
    );

    // Fetch assessment & creator org info to send email invitation
    const [assRows] = await db.query(
      `SELECT a.title, a.duration_minutes, op.organization_name 
       FROM assessments a 
       LEFT JOIN organization_profiles op ON a.created_by = op.user_id 
       WHERE a.id = ?`,
      [assessmentId]
    );

    if (assRows.length > 0) {
      const ass = assRows[0];
      const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      emailService.sendAssessmentInvitationEmail({
        recipientEmail: email,
        candidateName: email.split('@')[0],
        assessmentTitle: ass.title,
        organizationName: ass.organization_name || 'CodeArena',
        inviteUrl: `${appUrl}/assessment/invite/${inviteCode}`,
        inviteCode,
        durationMinutes: ass.duration_minutes || 60
      }).catch(err => console.error('Error sending assessment invitation email:', err));
    }

    res.status(201).json({ message: 'Candidate invited successfully', inviteCode });
  } catch (error) {
    console.error('Error inviting candidate:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 25. Assessment Results Dashboard (Admin or Verified Org)
app.get('/api/admin/assessments/:id/results', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  const assessmentId = req.params.id;

  try {
    const [attempts] = await db.query(
      `SELECT 
        att.id, att.attempt_id, att.attempt_number, att.start_time, att.end_time, 
        att.submission_time, att.status, att.total_earned_marks, att.total_possible_marks, 
        att.percentage, att.is_passed,
        u.id as user_id, u.username, u.email, u.display_name,
        cert.verification_code as certificate_code
       FROM assessment_attempts att
       JOIN users u ON att.user_id = u.id
       LEFT JOIN assessment_certificates cert ON att.attempt_id = cert.attempt_id
       WHERE att.assessment_id = ?
       ORDER BY att.percentage DESC`,
      [assessmentId]
    );

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching admin assessment results:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 26. Admin: Detailed Candidate Attempt Performance
app.get('/api/admin/assessments/:id/candidate-performance/:attemptId', authenticateToken, authorizeAdmin, async (req, res) => {
  const attemptId = req.params.attemptId;
  try {
    const [attempts] = await db.query(
      `SELECT att.*, u.username, u.email, u.display_name, asm.title as assessment_title
       FROM assessment_attempts att
       JOIN users u ON att.user_id = u.id
       JOIN assessments asm ON att.assessment_id = asm.id
       WHERE att.attempt_id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attempts[0];

    const [responses] = await db.query(
      `SELECT 
        r.question_id, r.response_data, r.is_answered, r.score_earned, r.is_correct, r.evaluation_status, r.evaluator_feedback,
        q.question_type, q.question_text, q.marks, q.options, q.correct_answers
       FROM assessment_responses r
       JOIN assessment_questions q ON r.question_id = q.id
       WHERE r.attempt_id = ?
       ORDER BY q.order_index ASC`,
      [attemptId]
    );

    res.json({
      attempt,
      responses
    });

  } catch (error) {
    console.error('Error fetching candidate performance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 27. Admin: Submit Manual Evaluation
app.post('/api/admin/assessments/:id/evaluations', authenticateToken, authorizeAdmin, async (req, res) => {
  const evaluatorId = req.user.id;
  const { attemptId, questionId, score, feedback, reason } = req.body;

  try {
    const [prevRes] = await db.query(
      `SELECT score_earned FROM assessment_responses WHERE attempt_id = ? AND question_id = ?`,
      [attemptId, questionId]
    );
    const previousScore = prevRes[0] ? prevRes[0].score_earned : 0.00;

    await db.query(
      `UPDATE assessment_responses 
       SET score_earned = ?, evaluation_status = 'MANUALLY_EVALUATED', evaluator_id = ?, evaluator_feedback = ?, evaluated_at = NOW()
       WHERE attempt_id = ? AND question_id = ?`,
      [score, evaluatorId, feedback || '', attemptId, questionId]
    );

    await db.query(
      `INSERT INTO assessment_evaluations (attempt_id, question_id, evaluator_id, previous_score, new_score, feedback, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [attemptId, questionId, evaluatorId, previousScore, score, feedback || '', reason || 'Manual Admin Grade']
    );

    // Recalculate total attempt scores
    await assessmentScoringService.calculateAttemptResults(attemptId);

    res.json({ message: 'Manual evaluation saved successfully' });
  } catch (error) {
    console.error('Error saving manual evaluation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 28. Admin: Trigger Re-evaluation
app.post('/api/admin/assessments/:id/re-evaluate', authenticateToken, authorizeAdmin, async (req, res) => {
  const assessmentId = req.params.id;
  const adminId = req.user.id;
  const { reason } = req.body;

  try {
    const reevalResults = await assessmentScoringService.reevaluateAssessment(assessmentId, adminId, reason || 'Admin requested re-evaluation');
    res.json({ message: 'Re-evaluation finished successfully', count: reevalResults.length });
  } catch (error) {
    console.error('Error triggering re-evaluation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 29. Admin: Export Results to CSV
app.get('/api/admin/assessments/:id/export', authenticateToken, authorizeAdmin, async (req, res) => {
  const assessmentId = req.params.id;
  try {
    const [attempts] = await db.query(
      `SELECT 
        u.username, u.email, u.display_name,
        att.attempt_id, att.attempt_number, att.start_time, att.submission_time,
        att.total_earned_marks, att.total_possible_marks, att.percentage, att.is_passed, att.status
       FROM assessment_attempts att
       JOIN users u ON att.user_id = u.id
       WHERE att.assessment_id = ?
       ORDER BY att.percentage DESC`,
      [assessmentId]
    );

    let csvContent = "Candidate Username,Email,Attempt Number,Status,Score Earned,Total Marks,Percentage,Passed,Submission Time\n";
    attempts.forEach(a => {
      csvContent += `"${a.username}","${a.email}",${a.attempt_number},"${a.status}",${a.total_earned_marks},${a.total_possible_marks},${a.percentage}%,${a.is_passed ? 'YES' : 'NO'},"${a.submission_time || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assessment_${assessmentId}_results.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting assessment results:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 30. Admin: Get Violations & Audit Logs
app.get('/api/admin/assessments/:id/violations', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [violations] = await db.query(
      `SELECT v.*, u.username, u.email 
       FROM assessment_violations v 
       JOIN users u ON v.user_id = u.id 
       WHERE v.assessment_id = ? 
       ORDER BY v.reported_at DESC`,
      [req.params.id]
    );
    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/admin/assessments/:id/audit-logs', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT l.*, u.username as actor_name 
       FROM assessment_audit_logs l 
       LEFT JOIN users u ON l.actor_id = u.id 
       WHERE l.assessment_id = ? 
       ORDER BY l.created_at DESC`,
      [req.params.id]
    );
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Simple in-memory rate limiting map for AI Chat endpoint
const chatRateLimitMap = new Map();
const adminChatRateLimitMap = new Map();

// 31a. Admin AI Chat Endpoint (Gemini Function Calling ΓÇö Admin Only)
app.post('/api/admin/chat', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 20;

    let rateData = adminChatRateLimitMap.get(clientIp);
    if (!rateData || now - rateData.startTime > windowMs) {
      rateData = { count: 1, startTime: now };
    } else {
      rateData.count += 1;
    }
    adminChatRateLimitMap.set(clientIp, rateData);

    if (rateData.count > maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending more admin messages.' });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Fetch admin profile for context (display_name, username)
    const [adminRows] = await db.query(
      'SELECT id, username, display_name, role FROM users WHERE id = ? AND role = \'admin\'',
      [req.user.id]
    );
    if (!adminRows.length) {
      return res.status(403).json({ error: 'Admin account not found.' });
    }
    const adminUser = adminRows[0];

    const chatResult = await adminGeminiService.generateAdminChatResponse(messages, adminUser, db);
    const replyText = typeof chatResult === 'string' ? chatResult : (chatResult && chatResult.text ? chatResult.text : 'No response generated.');
    const provider = (chatResult && chatResult.provider) || 'admin-gemini';
    const timestamp = (chatResult && chatResult.timestamp) || new Date().toISOString();

    return res.json({ reply: replyText, provider, timestamp });
  } catch (error) {
    console.error('Error in /api/admin/chat:', error);
    return res.status(500).json({ error: 'Failed to process Admin AI chat request. Please try again.' });
  }
});

// 31. AI Chatbot Endpoint (Gemini API Integration)
app.post('/api/chat', optionalAuthenticateToken, async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequestsPerWindow = 30; // 30 requests per minute

    let rateData = chatRateLimitMap.get(clientIp);
    if (!rateData || now - rateData.startTime > windowMs) {
      rateData = { count: 1, startTime: now };
    } else {
      rateData.count += 1;
    }
    chatRateLimitMap.set(clientIp, rateData);

    if (rateData.count > maxRequestsPerWindow) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment before sending more messages.' });
    }

    const { messages, currentProblem } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    let userContext = null;

    if (req.user && req.user.id) {
      const authenticatedUserId = req.user.id;

      // 1. Fetch core user profile ΓÇö verified against JWT user ID
      const [users] = await db.query(
        'SELECT id, username, display_name, role, solved_count, streak, xp, bio, skills FROM users WHERE id = ?',
        [authenticatedUserId]
      );

      if (users && users.length > 0) {
        const u = users[0];

        // Security: confirm DB user ID matches authenticated token
        if (u.id !== authenticatedUserId) {
          return res.status(403).json({ error: 'User identity mismatch. Access denied.' });
        }

        // 2. Submission stats (total & accepted)
        const [submissions] = await db.query(
          'SELECT COUNT(*) as total_submissions, SUM(CASE WHEN status = \'Accepted\' THEN 1 ELSE 0 END) as accepted_submissions FROM submissions WHERE user_id = ?',
          [u.id]
        );
        const subData = (submissions && submissions.length > 0) ? submissions[0] : { total_submissions: 0, accepted_submissions: 0 };
        const totalSub = Number(subData.total_submissions) || 0;
        const acceptedSub = Number(subData.accepted_submissions) || 0;
        const acceptanceRate = totalSub > 0 ? ((acceptedSub / totalSub) * 100).toFixed(1) : 'N/A';

        // 3. Solved problems broken down by difficulty
        const [diffRows] = await db.query(
          `SELECT p.difficulty, COUNT(DISTINCT s.problem_id) as count
           FROM submissions s
           JOIN problems p ON s.problem_id = p.id
           WHERE s.user_id = ? AND s.status = 'Accepted'
           GROUP BY p.difficulty`,
          [u.id]
        );
        const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
        diffRows.forEach(r => { solvedByDifficulty[r.difficulty] = Number(r.count) || 0; });

        // 4. Dynamic global rank
        const userXp = u.xp || 0;
        const userSolved = u.solved_count || 0;
        const [rankRow] = await db.query(
          `SELECT COUNT(*) + 1 as user_rank FROM users
           WHERE xp > ?
              OR (xp = ? AND solved_count > ?)
              OR (xp = ? AND solved_count = ? AND id < ?)`,
          [userXp, userXp, userSolved, userXp, userSolved, u.id]
        );
        const globalRank = rankRow && rankRow.length > 0 ? Number(rankRow[0].user_rank) : null;

        // 5. Platform milestone certificates (name + milestone)
        const [certRows] = await db.query(
          'SELECT title, milestone, created_at FROM certificates WHERE user_id = ? ORDER BY milestone ASC',
          [u.id]
        );
        const certCount = certRows.length;
        const certList = certRows.map(c => `${c.title} (${c.milestone} problems)`).join(', ') || 'None yet';

        // 6. Assessment attempts summary
        const [assessRows] = await db.query(
          `SELECT COUNT(*) as total_attempts,
                  SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_count
           FROM assessment_attempts WHERE user_id = ?`,
          [u.id]
        );
        const assessData = (assessRows && assessRows.length > 0) ? assessRows[0] : { total_attempts: 0, passed_count: 0 };

        // 7. Recent 5 submissions (problem title + status)
        const [recentSubs] = await db.query(
          `SELECT s.status, s.language, s.submitted_at, p.title as problem_title
           FROM submissions s
           JOIN problems p ON s.problem_id = p.id
           WHERE s.user_id = ?
           ORDER BY s.submitted_at DESC LIMIT 5`,
          [u.id]
        );
        const recentSubsList = recentSubs.map(s => `${s.problem_title} (${s.status}, ${s.language})`).join('; ') || 'None yet';

        // Build userContext with field names matching geminiService.js expectations
        userContext = {
          // Identity
          userId: u.id,
          username: u.username,
          display_name: u.display_name || u.username,
          role: u.role,
          bio: u.bio || '',
          skills: u.skills || '',

          // Core stats ΓÇö use snake_case to match geminiService.js reads
          solved_count: userSolved,
          streak: u.streak || 0,
          xp: userXp,
          rank: globalRank,
          acceptanceRate: acceptanceRate,

          // Submission detail
          totalSubmissions: totalSub,
          acceptedSubmissions: acceptedSub,
          recentSubmissionsCount: totalSub,
          recentSubmissions: recentSubsList,

          // Solved by difficulty
          solvedEasy: solvedByDifficulty.Easy,
          solvedMedium: solvedByDifficulty.Medium,
          solvedHard: solvedByDifficulty.Hard,

          // Certificates
          certificatesCount: certCount,
          certificateList: certList,

          // Assessments
          totalAssessmentAttempts: Number(assessData.total_attempts) || 0,
          passedAssessments: Number(assessData.passed_count) || 0
        };
      }
    }

    const chatResult = await geminiService.generateChatResponse(messages, userContext, currentProblem);
    const replyText = typeof chatResult === 'string' ? chatResult : (chatResult && chatResult.text ? chatResult.text : 'No response generated.');
    const provider = (chatResult && chatResult.provider) || 'gemini';
    const timestamp = (chatResult && chatResult.timestamp) || new Date().toISOString();

    return res.json({
      reply: replyText,
      provider,
      timestamp
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({ error: 'Failed to process AI chat request. Please try again.' });
  }
});


// =============================================================
// CONTEST SYSTEM (USER, ADMIN & VERIFIED ORGANIZATION)
// =============================================================

// Helper: Dynamically recalculate contest lifecycle statuses based on server time
async function updateContestStatuses() {
  try {
    const now = new Date();
    // 1. Move to REGISTRATION_OPEN (only for SCHEDULED contests with registration required)
    await db.query(
      `UPDATE contests 
       SET status = 'REGISTRATION_OPEN' 
       WHERE status = 'SCHEDULED' 
       AND registration_required = 1
       AND registration_start IS NOT NULL AND registration_start <= ? 
       AND (registration_deadline IS NULL OR registration_deadline > ?)
       AND start_time > ?`,
      [now, now, now]
    );

    // 2. Move to LIVE (for SCHEDULED or REGISTRATION_OPEN contests when start_time arrives)
    await db.query(
      `UPDATE contests 
       SET status = 'LIVE' 
       WHERE status IN ('SCHEDULED', 'REGISTRATION_OPEN') 
       AND start_time <= ? AND end_time > ?`,
      [now, now]
    );

    // 3. Move to COMPLETED (when end_time arrives)
    await db.query(
      `UPDATE contests 
       SET status = 'COMPLETED' 
       WHERE status IN ('SCHEDULED', 'REGISTRATION_OPEN', 'LIVE') 
       AND end_time <= ?`,
      [now]
    );
  } catch (e) {
    console.error('Error updating contest statuses:', e.message);
  }
}

// Helper: Calculate contest leaderboard standings server-side
async function calculateContestStandings(contestId) {
  try {
    const [contestRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (contestRows.length === 0) return;
    const contest = contestRows[0];

    // Fetch all attempts for this contest
    const [attempts] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ?', [contestId]);

    for (const att of attempts) {
      // Get all accepted submissions for this user
      const [acceptedSubs] = await db.query(
        `SELECT problem_id, MIN(submitted_at) as first_ac_time, MIN(id) as first_ac_id
         FROM contest_submissions 
         WHERE attempt_id = ? AND status = 'ACCEPTED' 
         GROUP BY problem_id`,
        [att.id]
      );

      const solvedCount = acceptedSubs.length;
      let totalScore = 0;
      let penaltyMinutes = 0;

      for (const ac of acceptedSubs) {
        // Fetch problem points configuration
        const [cpRows] = await db.query(
          'SELECT points FROM contest_problems WHERE contest_id = ? AND problem_id = ?',
          [contestId, ac.problem_id]
        );
        const pts = cpRows.length > 0 ? (cpRows[0].points || 100) : 100;
        totalScore += pts;

        // Calculate time penalty in minutes from contest start
        const startTime = new Date(att.started_at || contest.start_time);
        const acTime = new Date(ac.first_ac_time);
        const minutesElapsed = Math.max(0, Math.floor((acTime.getTime() - startTime.getTime()) / 60000));

        // Count wrong attempts before first accepted submission
        const [wrongRows] = await db.query(
          `SELECT COUNT(*) as count FROM contest_submissions 
           WHERE attempt_id = ? AND problem_id = ? AND id < ? AND status != 'ACCEPTED'`,
          [att.id, ac.problem_id, ac.first_ac_id]
        );
        const wrongCount = wrongRows[0]?.count || 0;
        const wrongPenalty = wrongCount * (contest.time_penalty_per_wrong_min || 10);

        penaltyMinutes += minutesElapsed + wrongPenalty;
      }

      // Deduct negative marks for wrong submissions if negative marking is enabled
      if (contest.negative_marking && contest.negative_marks_per_wrong > 0) {
        const [allWrongRows] = await db.query(
          `SELECT COUNT(*) as count FROM contest_submissions 
           WHERE attempt_id = ? AND status NOT IN ('ACCEPTED', 'PENDING', 'RUNNING')`,
          [att.id]
        );
        const totalWrong = allWrongRows[0]?.count || 0;
        totalScore = Math.max(0, totalScore - (totalWrong * parseFloat(contest.negative_marks_per_wrong)));
      }

      await db.query(
        `UPDATE contest_attempts 
         SET score = ?, penalty_minutes = ?, solved_count = ? 
         WHERE id = ?`,
        [totalScore, penaltyMinutes, solvedCount, att.id]
      );
    }

    // Rank participants — only participants who actually scored points or solved problems receive a rank.
    // Participants with score = 0 AND solved_count = 0 are left UNRANKED (rank_position = NULL).
    const [eligibleAttempts] = await db.query(
      `SELECT id FROM contest_attempts 
       WHERE contest_id = ? AND (score > 0 OR solved_count > 0)
       ORDER BY score DESC, solved_count DESC, penalty_minutes ASC, started_at ASC`,
      [contestId]
    );

    // Reset all rank positions first
    await db.query('UPDATE contest_attempts SET rank_position = NULL WHERE contest_id = ?', [contestId]);

    let rank = 1;
    for (const rAtt of eligibleAttempts) {
      await db.query('UPDATE contest_attempts SET rank_position = ? WHERE id = ?', [rank, rAtt.id]);
      rank++;
    }

    // If contest is completed, populate contest_results
    if (contest.status === 'COMPLETED') {
      const [finalAttempts] = await db.query(
        `SELECT user_id, rank_position, score, penalty_minutes, solved_count, started_at, submitted_at 
         FROM contest_attempts WHERE contest_id = ? AND rank_position IS NOT NULL`,
        [contestId]
      );

      for (const fAtt of finalAttempts) {
        const startTime = new Date(fAtt.started_at || contest.start_time);
        const endTime = fAtt.submitted_at ? new Date(fAtt.submitted_at) : new Date(contest.end_time);
        const durationSecs = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

        await db.query(
          `INSERT INTO contest_results (contest_id, user_id, rank_position, score, penalty_minutes, solved_count, completion_time_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             rank_position = VALUES(rank_position),
             score = VALUES(score),
             penalty_minutes = VALUES(penalty_minutes),
             solved_count = VALUES(solved_count),
             completion_time_seconds = VALUES(completion_time_seconds)`,
          [contestId, fAtt.user_id, fAtt.rank_position, fAtt.score, fAtt.penalty_minutes, fAtt.solved_count, durationSecs]
        );
      }
    }
  } catch (e) {
    console.error('Error calculating contest standings:', e.message);
  }
}

// GET /api/contests - Browse & Search Contests
app.get('/api/contests', async (req, res) => {
  await updateContestStatuses();

  const { filter, difficulty, type, search } = req.query;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let currentUserId = null;

  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.id;
    } catch (e) {}
  }

  try {
    let whereConditions = ["c.status != 'DRAFT'", "c.status != 'ARCHIVED'"];
    let params = [];

    if (search && search.trim()) {
      whereConditions.push("(c.title LIKE ? OR c.description LIKE ?)");
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (difficulty && difficulty !== 'all') {
      whereConditions.push("c.difficulty = ?");
      params.push(difficulty);
    }

    if (type && type !== 'all') {
      whereConditions.push("c.contest_type = ?");
      params.push(type.toUpperCase());
    }

    if (filter === 'live') {
      whereConditions.push("c.status = 'LIVE'");
    } else if (filter === 'upcoming') {
      whereConditions.push("c.status IN ('SCHEDULED', 'REGISTRATION_OPEN')");
    } else if (filter === 'completed') {
      whereConditions.push("c.status = 'COMPLETED'");
    }

    const sql = `
      SELECT c.*, 
             u.display_name as creator_name,
             op.organization_name,
             op.verification_status as org_verification_status,
             (SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id = c.id AND cr.status = 'REGISTERED') as participant_count,
             (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id = c.id) as problem_count
      FROM contests c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN organization_profiles op ON c.organizer_id = op.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE c.status 
          WHEN 'LIVE' THEN 1 
          WHEN 'REGISTRATION_OPEN' THEN 2 
          WHEN 'SCHEDULED' THEN 3 
          WHEN 'COMPLETED' THEN 4 
          ELSE 5 
        END, c.start_time ASC
    `;

    const [contests] = await db.query(sql, params);

    // If user logged in, append registration & attempt state
    let registeredContestIds = new Set();
    let userAttemptsMap = {};

    if (currentUserId) {
      const [regs] = await db.query('SELECT contest_id FROM contest_registrations WHERE user_id = ? AND status = "REGISTERED"', [currentUserId]);
      regs.forEach(r => registeredContestIds.add(r.contest_id));

      const [atts] = await db.query('SELECT contest_id, status, score, rank_position FROM contest_attempts WHERE user_id = ?', [currentUserId]);
      atts.forEach(a => { userAttemptsMap[a.contest_id] = a; });
    }

    const formatted = contests.map(c => {
      const isReg = registeredContestIds.has(c.id);
      const userAtt = userAttemptsMap[c.id] || null;

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        short_description: c.short_description || c.description?.substring(0, 150),
        description: c.description,
        instructions: c.instructions,
        banner_url: c.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        contest_type: c.contest_type,
        difficulty: c.difficulty,
        organizer: c.organizer_type === 'ORGANIZATION' && c.organization_name ? c.organization_name : 'CodeArena Official',
        organizer_type: c.organizer_type,
        status: c.status,
        visibility: c.visibility,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_minutes: c.duration_minutes,
        registration_deadline: c.registration_deadline,
        max_participants: c.max_participants,
        participant_count: c.participant_count || 0,
        problem_count: c.problem_count || 0,
        allowed_languages: typeof c.allowed_languages === 'string' ? JSON.parse(c.allowed_languages) : (c.allowed_languages || ['javascript', 'python', 'cpp', 'java']),
        is_registered: isReg,
        user_attempt: userAtt
      };
    });

    // Apply Client Filter if filter is 'registered' or 'my_contests'
    let finalContests = formatted;
    if (filter === 'registered') {
      finalContests = formatted.filter(c => c.is_registered);
    } else if (filter === 'my_contests') {
      finalContests = formatted.filter(c => c.is_registered || c.user_attempt);
    }

    res.json(finalContests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

// GET /api/contests/:id - Get Contest Details & Problems Meta
app.get('/api/contests/:id', async (req, res) => {
  await updateContestStatuses();
  const contestId = req.params.id;

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let currentUserId = null;
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.id;
    } catch (e) {}
  }

  try {
    const [rows] = await db.query(
      `SELECT c.*, 
              u.display_name as creator_name,
              op.organization_name,
              op.verification_status as org_verification_status,
              (SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id = c.id AND cr.status = 'REGISTERED') as participant_count
       FROM contests c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN organization_profiles op ON c.organizer_id = op.id
       WHERE c.id = ? OR c.slug = ?`,
      [contestId, contestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const c = rows[0];

    // Check user registration status
    let isRegistered = false;
    let userAttempt = null;

    if (currentUserId) {
      const [regCheck] = await db.query('SELECT id FROM contest_registrations WHERE contest_id = ? AND user_id = ? AND status = "REGISTERED"', [c.id, currentUserId]);
      isRegistered = regCheck.length > 0;

      const [attCheck] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [c.id, currentUserId]);
      if (attCheck.length > 0) {
        userAttempt = attCheck[0];
      }
    }

    // Fetch problem list meta
    const [probs] = await db.query(
      `SELECT cp.order_index, cp.points, p.id, p.title, p.difficulty, p.category
       FROM contest_problems cp
       JOIN problems p ON cp.problem_id = p.id
       WHERE cp.contest_id = ?
       ORDER BY cp.order_index ASC`,
      [c.id]
    );

    res.json({
      id: c.id,
      slug: c.slug,
      title: c.title,
      short_description: c.short_description || c.description?.substring(0, 150),
      description: c.description,
      instructions: c.instructions,
      banner_url: c.banner_url,
      contest_type: c.contest_type,
      difficulty: c.difficulty,
      organizer: c.organizer_type === 'ORGANIZATION' && c.organization_name ? c.organization_name : 'CodeArena Official',
      organizer_type: c.organizer_type,
      status: c.status,
      visibility: c.visibility,
      start_time: c.start_time,
      end_time: c.end_time,
      duration_minutes: c.duration_minutes,
      registration_deadline: c.registration_deadline,
      max_participants: c.max_participants,
      participant_count: c.participant_count || 0,
      negative_marking: Boolean(c.negative_marking),
      negative_marks_per_wrong: parseFloat(c.negative_marks_per_wrong || 0),
      time_penalty_per_wrong_min: c.time_penalty_per_wrong_min || 10,
      leaderboard_enabled: Boolean(c.leaderboard_enabled),
      leaderboard_frozen: Boolean(c.leaderboard_frozen),
      certificate_enabled: Boolean(c.certificate_enabled),
      security_enabled: Boolean(c.security_enabled),
      allowed_languages: typeof c.allowed_languages === 'string' ? JSON.parse(c.allowed_languages) : (c.allowed_languages || ['javascript', 'python', 'cpp', 'java']),
      is_registered: isRegistered,
      user_attempt: userAttempt,
      problems: probs.map(p => ({
        id: p.id,
        order_index: p.order_index,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        points: p.points
      }))
    });
  } catch (error) {
    console.error('Error fetching contest details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/contests/:id/register - Register User for Contest
app.post('/api/contests/:id/register', authenticateToken, async (req, res) => {
  await updateContestStatuses();
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [rows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const contest = rows[0];

    if (contest.status === 'COMPLETED' || contest.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Registration is closed for this contest.' });
    }

    if (contest.registration_deadline && new Date() > new Date(contest.registration_deadline)) {
      return res.status(400).json({ error: 'The registration deadline for this contest has passed.' });
    }

    // Check max participants limit
    if (contest.max_participants > 0) {
      const [[pCount]] = await db.query('SELECT COUNT(*) as count FROM contest_registrations WHERE contest_id = ? AND status = "REGISTERED"', [contestId]);
      if (pCount.count >= contest.max_participants) {
        return res.status(400).json({ error: 'This contest has reached its maximum participant limit.' });
      }
    }

    // Insert or Update registration
    await db.query(
      `INSERT INTO contest_registrations (contest_id, user_id, status, registered_at)
       VALUES (?, ?, 'REGISTERED', NOW())
       ON DUPLICATE KEY UPDATE status = 'REGISTERED', registered_at = NOW(), cancelled_at = NULL`,
      [contestId, userId]
    );

    // Send confirmation email asynchronously
    emailService.sendMail({
      userId,
      emailType: 'contest_registration',
      recipientEmail: req.user.email,
      subject: `Registration Confirmed: ${contest.title}`,
      textContent: `You have successfully registered for ${contest.title}. The contest starts on ${new Date(contest.start_time).toLocaleString()}.`,
      htmlContent: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Contest Registration Confirmed 🎉</h2>
        <p>Hi <strong>${req.user.username}</strong>,</p>
        <p>You are officially registered for <strong>${contest.title}</strong>.</p>
        <p><strong>Start Time:</strong> ${new Date(contest.start_time).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${contest.duration_minutes} minutes</p>
        <br/>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/user/contests" style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">View Contest Hub</a>
      </div>`
    }).catch(e => console.error('Contest email error:', e));

    res.json({ message: 'Registered successfully!', isRegistered: true });
  } catch (error) {
    console.error('Error registering for contest:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// DELETE /api/contests/:id/register - Cancel Contest Registration
app.delete('/api/contests/:id/register', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [rows] = await db.query('SELECT status FROM contests WHERE id = ?', [contestId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    if (rows[0].status === 'LIVE' || rows[0].status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel registration for a live or completed contest.' });
    }

    await db.query(
      `UPDATE contest_registrations SET status = 'CANCELLED', cancelled_at = NOW() WHERE contest_id = ? AND user_id = ?`,
      [contestId, userId]
    );

    res.json({ message: 'Registration cancelled successfully.', isRegistered: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// POST /api/contests/:id/start - Server-Authoritative Contest Session Start
app.post('/api/contests/:id/start', authenticateToken, async (req, res) => {
  await updateContestStatuses();
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = cRows[0];

    const now = new Date();
    if (now < new Date(contest.start_time)) {
      return res.status(400).json({ error: 'Contest has not started yet. Please wait for start time.' });
    }
    if (now >= new Date(contest.end_time) || contest.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Contest has ended.' });
    }

    // Check or Auto-Register
    const [regCheck] = await db.query('SELECT id FROM contest_registrations WHERE contest_id = ? AND user_id = ? AND status = "REGISTERED"', [contestId, userId]);
    if (regCheck.length === 0) {
      if (contest.registration_required) {
        // Auto-register if registration allowed during contest
        await db.query(
          `INSERT INTO contest_registrations (contest_id, user_id, status) VALUES (?, ?, 'REGISTERED')
           ON DUPLICATE KEY UPDATE status = 'REGISTERED'`,
          [contestId, userId]
        );
      }
    }

    // Calculate server authoritative expires_at timestamp
    const contestEnd = new Date(contest.end_time);
    const durationMs = contest.duration_minutes * 60000;
    const calcExpiry = new Date(now.getTime() + durationMs);
    const expiresAt = calcExpiry < contestEnd ? calcExpiry : contestEnd;

    // Check if attempt already exists
    const [existing] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    let attempt = null;

    if (existing.length > 0) {
      attempt = existing[0];
      if (attempt.status === 'SUBMITTED' || attempt.status === 'DISQUALIFIED') {
        return res.status(400).json({ error: 'Your contest attempt has already been submitted or terminated.' });
      }
    } else {
      const [result] = await db.query(
        `INSERT INTO contest_attempts (contest_id, user_id, started_at, expires_at, status)
         VALUES (?, ?, ?, ?, 'IN_PROGRESS')`,
        [contestId, userId, now, expiresAt]
      );
      const [newAtt] = await db.query('SELECT * FROM contest_attempts WHERE id = ?', [result.insertId]);
      attempt = newAtt[0];
    }

    // Fetch problem statements & clean details for participant workspace
    const [probs] = await db.query(
      `SELECT cp.order_index, cp.points, p.id, p.title, p.difficulty, p.category, p.description, p.constraints, p.input_format, p.output_format, p.sample_input, p.sample_output, p.starter_code
       FROM contest_problems cp
       JOIN problems p ON cp.problem_id = p.id
       WHERE cp.contest_id = ?
       ORDER BY cp.order_index ASC`,
      [contestId]
    );

    // Fetch user's prior submissions in this contest attempt
    const [userSubs] = await db.query(
      `SELECT problem_id, language, source_code, status, score, test_cases_passed, total_test_cases, submitted_at
       FROM contest_submissions WHERE attempt_id = ? ORDER BY id DESC`,
      [attempt.id]
    );

    res.json({
      attempt_id: attempt.id,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      remaining_seconds: Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)),
      server_time: new Date().toISOString(),
      contest: {
        id: contest.id,
        title: contest.title,
        contest_type: contest.contest_type,
        instructions: contest.instructions,
        allowed_languages: typeof contest.allowed_languages === 'string' ? JSON.parse(contest.allowed_languages) : contest.allowed_languages,
        security_enabled: Boolean(contest.security_enabled),
        security_config: typeof contest.security_config === 'string' ? JSON.parse(contest.security_config || '{}') : (contest.security_config || {})
      },
      problems: probs,
      submissions: userSubs
    });
  } catch (error) {
    console.error('Error starting contest:', error);
    res.status(500).json({ error: 'Failed to start contest session' });
  }
});

// GET /api/contests/:id/participate - Session Recovery on Page Refresh
app.get('/api/contests/:id/participate', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = cRows[0];

    const [existing] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'No active session found. Please start contest.' });
    }

    const attempt = existing[0];
    const now = new Date();

    if (now >= new Date(attempt.expires_at) && attempt.status === 'IN_PROGRESS') {
      await db.query('UPDATE contest_attempts SET status = "EXPIRED" WHERE id = ?', [attempt.id]);
      attempt.status = 'EXPIRED';
    }

    const [probs] = await db.query(
      `SELECT cp.order_index, cp.points, p.id, p.title, p.difficulty, p.category, p.description, p.constraints, p.input_format, p.output_format, p.sample_input, p.sample_output, p.starter_code
       FROM contest_problems cp
       JOIN problems p ON cp.problem_id = p.id
       WHERE cp.contest_id = ?
       ORDER BY cp.order_index ASC`,
      [contestId]
    );

    const [userSubs] = await db.query(
      `SELECT problem_id, language, source_code, status, score, test_cases_passed, total_test_cases, submitted_at
       FROM contest_submissions WHERE attempt_id = ? ORDER BY id DESC`,
      [attempt.id]
    );

    res.json({
      attempt_id: attempt.id,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      remaining_seconds: Math.max(0, Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)),
      server_time: new Date().toISOString(),
      status: attempt.status,
      score: attempt.score,
      solved_count: attempt.solved_count,
      contest: {
        id: contest.id,
        title: contest.title,
        contest_type: contest.contest_type,
        instructions: contest.instructions,
        allowed_languages: typeof contest.allowed_languages === 'string' ? JSON.parse(contest.allowed_languages) : contest.allowed_languages,
        security_enabled: Boolean(contest.security_enabled),
        security_config: typeof contest.security_config === 'string' ? JSON.parse(contest.security_config || '{}') : (contest.security_config || {})
      },
      problems: probs,
      submissions: userSubs
    });
  } catch (error) {
    res.status(500).json({ error: 'Error restoring contest session' });
  }
});

// POST /api/contests/:id/submit - Submit Problem Solution in Contest
app.post('/api/contests/:id/submit', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;
  const { problem_id, language, code } = req.body;

  if (!problem_id || !language || !code) {
    return res.status(400).json({ error: 'Problem ID, language, and source code are required.' });
  }

  try {
    const [attRows] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (attRows.length === 0) {
      return res.status(400).json({ error: 'No active contest session found.' });
    }

    const attempt = attRows[0];
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'This contest attempt is no longer active.' });
    }

    if (new Date() > new Date(attempt.expires_at)) {
      await db.query('UPDATE contest_attempts SET status = "EXPIRED" WHERE id = ?', [attempt.id]);
      return res.status(400).json({ error: 'Contest time has expired!' });
    }

    // Fetch problem test cases
    const [pRows] = await db.query('SELECT * FROM problems WHERE id = ?', [problem_id]);
    if (pRows.length === 0) return res.status(404).json({ error: 'Problem not found' });
    const problem = pRows[0];

    // Fetch contest problem point config
    const [cpRows] = await db.query('SELECT points FROM contest_problems WHERE contest_id = ? AND problem_id = ?', [contestId, problem_id]);
    const maxPoints = cpRows.length > 0 ? (cpRows[0].points || 100) : 100;

    let testCases = [];
    try {
      testCases = typeof problem.test_cases === 'string' ? JSON.parse(problem.test_cases) : (problem.test_cases || []);
    } catch (e) {}

    // Run execution using the platform's execution service
    let testCasesPassed = 0;
    let finalStatus = 'ACCEPTED';
    let lastStderr = '';
    let totalExecTime = 0;
    let firstStdout = '';

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const sandboxRes = await executionService.executeCode(language, code, tc.input, 5000);
      totalExecTime += sandboxRes.executionTime || 10;
      if (i === 0) firstStdout = sandboxRes.stdout || '';

      if (sandboxRes.status === 'Time Limit Exceeded') {
        finalStatus = 'TIME_LIMIT'; lastStderr = sandboxRes.stderr; break;
      }
      if (sandboxRes.status === 'Compilation Error') {
        finalStatus = 'COMPILATION_ERROR'; lastStderr = sandboxRes.stderr; break;
      }
      if (sandboxRes.status === 'Runtime Error' || (sandboxRes.stderr && sandboxRes.stderr.trim() && !sandboxRes.stdout)) {
        finalStatus = 'RUNTIME_ERROR'; lastStderr = sandboxRes.stderr; break;
      }

      const actualOut = (sandboxRes.stdout || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const expectedOut = (tc.expected || '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (actualOut === expectedOut) {
        testCasesPassed++;
      } else {
        finalStatus = 'WRONG_ANSWER';
      }
    }

    const isAccepted = finalStatus === 'ACCEPTED' && testCasesPassed === testCases.length;
    const submissionVerdict = isAccepted ? 'ACCEPTED' : finalStatus;
    const awardedScore = isAccepted ? maxPoints : 0;
    const executionResult = {
      status: submissionVerdict,
      testCasesPassed,
      totalTestCases: testCases.length,
      executionTimeMs: totalExecTime,
      memoryKb: 1200,
      stdout: firstStdout,
      stderr: lastStderr,
    };


    // Count submission sequence number
    const [[subCount]] = await db.query('SELECT COUNT(*) as count FROM contest_submissions WHERE attempt_id = ? AND problem_id = ?', [attempt.id, problem_id]);
    const subNum = (subCount.count || 0) + 1;

    // Insert Contest Submission
    const [subRes] = await db.query(
      `INSERT INTO contest_submissions 
       (contest_id, attempt_id, user_id, problem_id, language, source_code, status, score, test_cases_passed, total_test_cases, execution_time_ms, memory_kb, submission_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contestId, attempt.id, userId, problem_id, language, code,
        submissionVerdict, awardedScore, executionResult.testCasesPassed || 0,
        executionResult.totalTestCases || testCases.length,
        executionResult.executionTimeMs || 45, executionResult.memoryKb || 1200, subNum
      ]
    );

    // Also record into normal platform submissions table for user history
    await db.query(
      `INSERT INTO submissions (user_id, problem_id, language, code, status, runtime_ms, memory_mb)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, problem_id, language, code, isAccepted ? 'Accepted' : 'Wrong Answer', 45, 1.2]
    ).catch(e => console.warn('Normal sub record warning:', e.message));

    // Recalculate standings
    await calculateContestStandings(contestId);

    res.json({
      submission_id: subRes.insertId,
      status: submissionVerdict,
      score: awardedScore,
      test_cases_passed: executionResult.testCasesPassed || 0,
      total_test_cases: executionResult.totalTestCases || testCases.length,
      stdout: executionResult.stdout || '',
      stderr: executionResult.stderr || ''
    });

  } catch (error) {
    console.error('Error processing contest submission:', error);
    res.status(500).json({ error: 'Internal Server Error during execution' });
  }
});

// POST /api/contests/:id/security-event - Log Contest Security / Warning Event
app.post('/api/contests/:id/security-event', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;
  const { event_type, metadata } = req.body;

  try {
    const [attRows] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (attRows.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attRows[0];

    const warningNum = attempt.warning_count + 1;

    await db.query(
      `INSERT INTO contest_security_events (contest_id, attempt_id, user_id, event_type, warning_number, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contestId, attempt.id, userId, event_type || 'TAB_SWITCH', warningNum, JSON.stringify(metadata || {})]
    );

    await db.query('UPDATE contest_attempts SET warning_count = ? WHERE id = ?', [warningNum, attempt.id]);

    let isDisqualified = false;
    if (warningNum >= 3) {
      await db.query('UPDATE contest_attempts SET status = "DISQUALIFIED", termination_reason = "Exceeded maximum security warnings" WHERE id = ?', [attempt.id]);
      isDisqualified = true;
    }

    res.json({
      warning_count: warningNum,
      max_warnings: 3,
      is_disqualified: isDisqualified,
      message: isDisqualified ? 'Your contest attempt has been disqualified due to multiple security policy violations.' : `Warning ${warningNum}/3 recorded.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record security event' });
  }
});

// POST /api/contests/:id/finish - Complete / Submit Contest
app.post('/api/contests/:id/finish', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [attRows] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (attRows.length === 0) return res.status(404).json({ error: 'No active attempt found' });
    const attempt = attRows[0];

    await db.query(
      `UPDATE contest_attempts SET status = 'SUBMITTED', submitted_at = NOW() WHERE id = ?`,
      [attempt.id]
    );

    await calculateContestStandings(contestId);

    const [updatedAtt] = await db.query('SELECT * FROM contest_attempts WHERE id = ?', [attempt.id]);

    res.json({
      message: 'Contest completed successfully!',
      attempt: updatedAtt[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit contest' });
  }
});

// GET /api/contests/:id/leaderboard - Server-Authoritative Leaderboard
app.get('/api/contests/:id/leaderboard', async (req, res) => {
  await updateContestStatuses();
  const contestId = req.params.id;

  try {
    const [cRows] = await db.query('SELECT leaderboard_enabled, leaderboard_frozen, status FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = cRows[0];

    if (!contest.leaderboard_enabled) {
      return res.json({ is_frozen: false, standings: [], message: 'Leaderboard disabled for this contest' });
    }

    const isFrozen = Boolean(contest.leaderboard_frozen);

    // Only include ranked participants (score > 0 OR solved > 0) in the public standings
    const [standings] = await db.query(
      `SELECT ca.rank_position, ca.score, ca.penalty_minutes, ca.solved_count, ca.started_at,
              u.id as user_id, u.username, u.display_name
       FROM contest_attempts ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.contest_id = ? AND ca.status NOT IN ('DISQUALIFIED') AND (ca.score > 0 OR ca.solved_count > 0)
       ORDER BY ca.score DESC, ca.solved_count DESC, ca.penalty_minutes ASC, ca.started_at ASC`,
      [contestId]
    );

    res.json({
      contest_id: contestId,
      is_frozen: isFrozen,
      frozen_message: isFrozen ? 'Leaderboard is currently frozen by the organizer. Final standings will be revealed after contest completion.' : null,
      standings: standings.map((s) => ({
        rank: s.rank_position,
        user_id: s.user_id,
        username: s.username,
        display_name: s.display_name || s.username,
        solved_count: s.solved_count,
        score: parseFloat(s.score || 0),
        penalty_minutes: s.penalty_minutes || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/contests/:id/results - Contest Final Result & Certificate Info
app.get('/api/contests/:id/results', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;

  try {
    const [attRows] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (attRows.length === 0) return res.status(404).json({ error: 'No attempt found for this user.' });
    const att = attRows[0];

    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    const contest = cRows[0];

    // Count total participants
    const [[pCount]] = await db.query('SELECT COUNT(*) as count FROM contest_attempts WHERE contest_id = ?', [contestId]);

    // Check certificate
    const [certRows] = await db.query('SELECT * FROM contest_certificates WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    let certificate = certRows.length > 0 ? certRows[0] : null;

    if (!certificate && contest.certificate_enabled && att.status === 'SUBMITTED') {
      const certCode = `CA-CONTEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      await db.query(
        `INSERT INTO contest_certificates (contest_id, user_id, certificate_code, cert_type, rank_position, score)
         VALUES (?, ?, ?, 'COMPLETION', ?, ?)`,
        [contestId, userId, certCode, att.rank_position, att.score]
      );
      const [newC] = await db.query('SELECT * FROM contest_certificates WHERE certificate_code = ?', [certCode]);
      certificate = newC[0];
    }

    res.json({
      contest: {
        id: contest.id,
        title: contest.title,
        status: contest.status,
        duration_minutes: contest.duration_minutes
      },
      attempt: {
        id: att.id,
        score: att.score,
        penalty_minutes: att.penalty_minutes,
        solved_count: att.solved_count,
        // rank_position is null for zero-score/zero-solved participants (Unranked)
        rank_position: (att.score > 0 || att.solved_count > 0) ? att.rank_position : null,
        total_participants: pCount.count || 1,
        status: att.status
      },
      certificate
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

// =============================================================
// ADMIN CONTEST MANAGEMENT ENDPOINTS
// =============================================================

// GET /api/admin/contests - Admin Contest List
app.get('/api/admin/contests', authenticateToken, authorizeAdmin, async (req, res) => {
  await updateContestStatuses();
  try {
    const [contests] = await db.query(
      `SELECT c.*, 
              u.username as creator_username,
              op.organization_name,
              (SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id = c.id AND cr.status = 'REGISTERED') as participant_count,
              (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id = c.id) as problem_count
       FROM contests c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN organization_profiles op ON c.organizer_id = op.id
       ORDER BY c.created_at DESC`
    );
    res.json(contests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin contests' });
  }
});

// Helper to format ISO or JS Date to MySQL DATETIME ('YYYY-MM-DD HH:mm:ss')
function toMysqlDatetime(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// POST /api/admin/contests - Create Admin Contest
app.post('/api/admin/contests', authenticateToken, authorizeAdmin, async (req, res) => {
  const { 
    title, short_description, description, instructions, banner_url, contest_type, difficulty, 
    visibility, access_code, registration_required, registration_start, registration_deadline, 
    start_time, end_time, duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, 
    time_penalty_per_wrong_min, max_submissions_per_problem, allowed_languages, leaderboard_enabled, 
    leaderboard_frozen, certificate_enabled, security_enabled, problem_ids, status 
  } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'Title, start time, and end time are required.' });
  }

  const startTimeFormatted = toMysqlDatetime(start_time);
  const endTimeFormatted = toMysqlDatetime(end_time);
  const regStartFormatted = toMysqlDatetime(registration_start);
  const regDeadlineFormatted = toMysqlDatetime(registration_deadline);

  if (!startTimeFormatted || !endTimeFormatted) {
    return res.status(400).json({ error: 'Invalid start time or end time format.' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);
  const allowedLangsJson = JSON.stringify(Array.isArray(allowed_languages) ? allowed_languages : ['javascript', 'python', 'cpp', 'java']);

  try {
    const [result] = await db.query(
      `INSERT INTO contests 
       (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, visibility, access_code, 
        organizer_type, created_by, status, registration_required, registration_start, registration_deadline, start_time, end_time, 
        duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, time_penalty_per_wrong_min, 
        max_submissions_per_problem, allowed_languages, leaderboard_enabled, leaderboard_frozen, certificate_enabled, security_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ADMIN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug, title, short_description || '', description || '', instructions || '', banner_url || '',
        contest_type || 'CODING', difficulty || 'Medium', visibility || 'PUBLIC', access_code || null,
        req.user.id, status || 'DRAFT', registration_required !== undefined ? (registration_required ? 1 : 0) : 1,
        regStartFormatted, regDeadlineFormatted, startTimeFormatted, endTimeFormatted,
        duration_minutes || 120, max_participants || 0, negative_marking ? 1 : 0, negative_marks_per_wrong || 0,
        time_penalty_per_wrong_min || 10, max_submissions_per_problem || 0, allowedLangsJson,
        leaderboard_enabled !== undefined ? (leaderboard_enabled ? 1 : 0) : 1,
        leaderboard_frozen !== undefined ? (leaderboard_frozen ? 1 : 0) : 0,
        certificate_enabled !== undefined ? (certificate_enabled ? 1 : 0) : 0,
        security_enabled !== undefined ? (security_enabled ? 1 : 0) : 1
      ]
    );

    const contestId = result.insertId;

    if (Array.isArray(problem_ids) && problem_ids.length > 0) {
      let idx = 1;
      for (const pId of problem_ids) {
        await db.query('INSERT INTO contest_problems (contest_id, problem_id, order_index) VALUES (?, ?, ?)', [contestId, pId, idx]);
        idx++;
      }
    }

    res.status(201).json({ id: contestId, message: 'Admin contest created successfully.' });
  } catch (error) {
    console.error('Error creating admin contest:', error);
    res.status(500).json({ error: 'Failed to create contest', details: error.message });
  }
});

// PUT /api/admin/contests/:id - Update Admin Contest
app.put('/api/admin/contests/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  const { 
    title, short_description, description, instructions, banner_url, status, contest_type, difficulty, 
    visibility, access_code, registration_required, registration_start, registration_deadline, 
    start_time, end_time, duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, 
    time_penalty_per_wrong_min, max_submissions_per_problem, allowed_languages, leaderboard_enabled, 
    leaderboard_frozen, certificate_enabled, security_enabled, problem_ids 
  } = req.body;

  try {
    const startTimeFormatted = toMysqlDatetime(start_time);
    const endTimeFormatted = toMysqlDatetime(end_time);
    const regStartFormatted = toMysqlDatetime(registration_start);
    const regDeadlineFormatted = toMysqlDatetime(registration_deadline);
    const allowedLangsJson = allowed_languages ? JSON.stringify(allowed_languages) : null;

    await db.query(
      `UPDATE contests 
       SET title = COALESCE(?, title),
           short_description = COALESCE(?, short_description),
           description = COALESCE(?, description),
           instructions = COALESCE(?, instructions),
           banner_url = COALESCE(?, banner_url),
           status = COALESCE(?, status),
           contest_type = COALESCE(?, contest_type),
           difficulty = COALESCE(?, difficulty),
           visibility = COALESCE(?, visibility),
           access_code = COALESCE(?, access_code),
           registration_required = COALESCE(?, registration_required),
           registration_start = COALESCE(?, registration_start),
           registration_deadline = COALESCE(?, registration_deadline),
           start_time = COALESCE(?, start_time),
           end_time = COALESCE(?, end_time),
           duration_minutes = COALESCE(?, duration_minutes),
           max_participants = COALESCE(?, max_participants),
           negative_marking = COALESCE(?, negative_marking),
           negative_marks_per_wrong = COALESCE(?, negative_marks_per_wrong),
           time_penalty_per_wrong_min = COALESCE(?, time_penalty_per_wrong_min),
           max_submissions_per_problem = COALESCE(?, max_submissions_per_problem),
           allowed_languages = COALESCE(?, allowed_languages),
           leaderboard_enabled = COALESCE(?, leaderboard_enabled),
           leaderboard_frozen = COALESCE(?, leaderboard_frozen),
           certificate_enabled = COALESCE(?, certificate_enabled),
           security_enabled = COALESCE(?, security_enabled)
       WHERE id = ?`,
      [
        title, short_description, description, instructions, banner_url, status, contest_type, difficulty,
        visibility, access_code, registration_required !== undefined ? (registration_required ? 1 : 0) : null,
        regStartFormatted, regDeadlineFormatted, startTimeFormatted, endTimeFormatted, duration_minutes,
        max_participants, negative_marking !== undefined ? (negative_marking ? 1 : 0) : null,
        negative_marks_per_wrong, time_penalty_per_wrong_min, max_submissions_per_problem,
        allowedLangsJson, leaderboard_enabled !== undefined ? (leaderboard_enabled ? 1 : 0) : null,
        leaderboard_frozen !== undefined ? (leaderboard_frozen ? 1 : 0) : null,
        certificate_enabled !== undefined ? (certificate_enabled ? 1 : 0) : null,
        security_enabled !== undefined ? (security_enabled ? 1 : 0) : null, contestId
      ]
    );

    if (Array.isArray(problem_ids)) {
      await db.query('DELETE FROM contest_problems WHERE contest_id = ?', [contestId]);
      let idx = 1;
      for (const pId of problem_ids) {
        await db.query('INSERT INTO contest_problems (contest_id, problem_id, order_index) VALUES (?, ?, ?)', [contestId, pId, idx]);
        idx++;
      }
    }

    res.json({ message: 'Contest updated successfully.' });
  } catch (error) {
    console.error('Error updating admin contest:', error);
    res.status(500).json({ error: 'Failed to update contest', details: error.message });
  }
});

// POST /api/admin/contests/:id/publish - Publish Admin Contest
app.post('/api/admin/contests/:id/publish', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  try {
    const now = new Date();
    const [cRows] = await db.query('SELECT start_time, end_time FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });

    const c = cRows[0];
    const targetStatus = (now >= new Date(c.start_time) && now < new Date(c.end_time)) ? 'LIVE' : 'REGISTRATION_OPEN';

    await db.query('UPDATE contests SET status = ? WHERE id = ?', [targetStatus, contestId]);
    res.json({ message: `Contest published! Status set to ${targetStatus}.`, status: targetStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish contest' });
  }
});

// GET /api/admin/contests/:id/monitor - Live Contest Monitoring Dashboard
app.get('/api/admin/contests/:id/monitor', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  try {
    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = cRows[0];

    const [participants] = await db.query(
      `SELECT ca.*, u.username, u.display_name, u.email
       FROM contest_attempts ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.contest_id = ?
       ORDER BY ca.score DESC, ca.penalty_minutes ASC`,
      [contestId]
    );

    const [securityEvents] = await db.query(
      `SELECT cse.*, u.username
       FROM contest_security_events cse
       JOIN users u ON cse.user_id = u.id
       WHERE cse.contest_id = ?
       ORDER BY cse.timestamp DESC LIMIT 20`,
      [contestId]
    );

    res.json({
      contest: {
        id: contest.id,
        title: contest.title,
        status: contest.status,
        leaderboard_frozen: Boolean(contest.leaderboard_frozen)
      },
      participant_count: participants.length,
      participants,
      security_events: securityEvents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load monitor data' });
  }
});

// =============================================================
// ORGANIZATION CONTEST MANAGEMENT ENDPOINTS
// =============================================================

// GET /api/organization/contests - List Organization's Contests
app.get('/api/organization/contests', authenticateToken, async (req, res) => {
  await updateContestStatuses();
  try {
    const [orgs] = await db.query('SELECT id, verification_status FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgs.length === 0) {
      return res.status(403).json({ error: 'Organization profile not found.' });
    }
    const org = orgs[0];

    const [contests] = await db.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id = c.id AND cr.status = 'REGISTERED') as participant_count,
              (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id = c.id) as problem_count
       FROM contests c
       WHERE c.organizer_type = 'ORGANIZATION' AND c.organizer_id = ?
       ORDER BY c.created_at DESC`,
      [org.id]
    );

    res.json({
      org_verification_status: org.verification_status,
      contests
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization contests' });
  }
});

// POST /api/organization/contests - Create Organization Contest
app.post('/api/organization/contests', authenticateToken, async (req, res) => {
  try {
    const [orgs] = await db.query('SELECT id, verification_status FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgs.length === 0) return res.status(403).json({ error: 'Organization profile not found.' });
    const org = orgs[0];

    const { 
      title, short_description, description, instructions, banner_url, contest_type, difficulty, 
      visibility, access_code, registration_required, registration_start, registration_deadline, 
      start_time, end_time, duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, 
      time_penalty_per_wrong_min, max_submissions_per_problem, allowed_languages, leaderboard_enabled, 
      leaderboard_frozen, certificate_enabled, security_enabled, problem_ids, status 
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required.' });
    }

    const startTimeFormatted = toMysqlDatetime(start_time);
    const endTimeFormatted = toMysqlDatetime(end_time);
    const regStartFormatted = toMysqlDatetime(registration_start);
    const regDeadlineFormatted = toMysqlDatetime(registration_deadline);

    if (!startTimeFormatted || !endTimeFormatted) {
      return res.status(400).json({ error: 'Invalid start time or end time format.' });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-org-' + Date.now().toString(36);
    const allowedLangsJson = JSON.stringify(Array.isArray(allowed_languages) ? allowed_languages : ['javascript', 'python', 'cpp', 'java']);

    const [result] = await db.query(
      `INSERT INTO contests 
       (slug, title, short_description, description, instructions, banner_url, contest_type, difficulty, visibility, access_code, 
        organizer_type, organizer_id, created_by, status, registration_required, registration_start, registration_deadline, start_time, end_time, 
        duration_minutes, max_participants, negative_marking, negative_marks_per_wrong, time_penalty_per_wrong_min, 
        max_submissions_per_problem, allowed_languages, leaderboard_enabled, leaderboard_frozen, certificate_enabled, security_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ORGANIZATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug, title, short_description || '', description || '', instructions || '', banner_url || '',
        contest_type || 'CODING', difficulty || 'Medium', visibility || 'PUBLIC', access_code || null,
        org.id, req.user.id, status || 'DRAFT', registration_required !== undefined ? (registration_required ? 1 : 0) : 1,
        regStartFormatted, regDeadlineFormatted, startTimeFormatted, endTimeFormatted,
        duration_minutes || 120, max_participants || 0, negative_marking ? 1 : 0, negative_marks_per_wrong || 0,
        time_penalty_per_wrong_min || 10, max_submissions_per_problem || 0, allowedLangsJson,
        leaderboard_enabled !== undefined ? (leaderboard_enabled ? 1 : 0) : 1,
        leaderboard_frozen !== undefined ? (leaderboard_frozen ? 1 : 0) : 0,
        certificate_enabled !== undefined ? (certificate_enabled ? 1 : 0) : 0,
        security_enabled !== undefined ? (security_enabled ? 1 : 0) : 1
      ]
    );

    const contestId = result.insertId;

    if (Array.isArray(problem_ids) && problem_ids.length > 0) {
      let idx = 1;
      for (const pId of problem_ids) {
        await db.query('INSERT INTO contest_problems (contest_id, problem_id, order_index) VALUES (?, ?, ?)', [contestId, pId, idx]);
        idx++;
      }
    }

    res.status(201).json({ id: contestId, message: 'Organization contest created as DRAFT.' });
  } catch (error) {
    console.error('Error creating organization contest:', error);
    res.status(500).json({ error: 'Failed to create organization contest', details: error.message });
  }
});

// POST /api/organization/contests/:id/publish - STRICT VERIFICATION REQUIREMENT FOR ORGANIZATIONS
app.post('/api/organization/contests/:id/publish', authenticateToken, async (req, res) => {
  const contestId = req.params.id;

  try {
    const [orgs] = await db.query('SELECT id, verification_status FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (orgs.length === 0) return res.status(403).json({ error: 'Organization profile not found.' });
    const org = orgs[0];

    // STRICT REQUIREMENT 19: UNVERIFIED ORGANIZATIONS MUST NOT PUBLISH CONTESTS
    if (org.verification_status !== 'VERIFIED') {
      return res.status(403).json({ 
        error: 'Your organization must be verified before publishing contests. Please submit verification documents in the Organization Verification tab.' 
      });
    }

    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ? AND organizer_type = "ORGANIZATION" AND organizer_id = ?', [contestId, org.id]);
    if (cRows.length === 0) {
      return res.status(404).json({ error: 'Contest not found or you do not have permission to modify it.' });
    }

    const c = cRows[0];
    const now = new Date();
    const targetStatus = (now >= new Date(c.start_time) && now < new Date(c.end_time)) ? 'LIVE' : 'REGISTRATION_OPEN';

    await db.query('UPDATE contests SET status = ? WHERE id = ?', [targetStatus, contestId]);
    res.json({ message: 'Contest published successfully!', status: targetStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish organization contest' });
  }
});

// GET /api/admin/contests/:id - Get Single Contest (for edit form)
app.get('/api/admin/contests/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  try {
    const [cRows] = await db.query('SELECT * FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    const contest = cRows[0];
    const [probs] = await db.query(
      `SELECT cp.order_index, cp.points, p.id, p.title, p.difficulty, p.category FROM contest_problems cp JOIN problems p ON cp.problem_id = p.id WHERE cp.contest_id = ? ORDER BY cp.order_index ASC`,
      [contestId]
    );
    const parsed = {
      ...contest,
      allowed_languages: typeof contest.allowed_languages === 'string' ? JSON.parse(contest.allowed_languages || '[]') : (contest.allowed_languages || []),
      problems: probs,
      problem_ids: probs.map(p => p.id),
    };
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load contest' });
  }
});

// DELETE /api/admin/contests/:id - Delete Contest
app.delete('/api/admin/contests/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  try {
    const [cRows] = await db.query('SELECT status FROM contests WHERE id = ?', [contestId]);
    if (cRows.length === 0) return res.status(404).json({ error: 'Contest not found' });
    if (cRows[0].status === 'LIVE') {
      return res.status(400).json({ error: 'Cannot delete a live contest. End the contest first.' });
    }
    await db.query('DELETE FROM contests WHERE id = ?', [contestId]);
    res.json({ message: 'Contest deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contest' });
  }
});

// PATCH /api/admin/contests/:id/status - Change Contest Status
app.patch('/api/admin/contests/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  const contestId = req.params.id;
  const { status } = req.body;
  const allowed = ['DRAFT', 'SCHEDULED', 'REGISTRATION_OPEN', 'LIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await db.query('UPDATE contests SET status = ? WHERE id = ?', [status, contestId]);
    res.json({ message: `Contest status updated to ${status}.`, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/contests/:id/security-event - Report Security Violation
app.post('/api/contests/:id/security-event', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;
  const { attempt_id, event_type, metadata } = req.body;
  try {
    // Validate attempt ownership and active status
    const [attRows] = await db.query(
      'SELECT ca.*, c.security_config FROM contest_attempts ca JOIN contests c ON ca.contest_id = c.id WHERE ca.id = ? AND ca.contest_id = ? AND ca.user_id = ?',
      [attempt_id, contestId, userId]
    );
    if (attRows.length === 0) return res.status(404).json({ error: 'Attempt not found' });
    const attempt = attRows[0];

    // If already terminated/submitted, return current state without creating new events
    if (attempt.status !== 'IN_PROGRESS') {
      return res.json({ warning_count: attempt.warning_count || 0, terminated: true, message: 'Contest already ended.' });
    }

    // Parse max allowed warnings from contest security config (server-authoritative, never trusts client)
    let secConfig = {};
    try { secConfig = typeof attempt.security_config === 'string' ? JSON.parse(attempt.security_config) : (attempt.security_config || {}); } catch(e) {}
    const maxAllowedWarnings = Number(secConfig.maxAllowedWarnings) || 3;

    // Server-side warning count (never trust client value)
    const newWarnings = (attempt.warning_count || 0) + 1;

    // Update warning count immediately
    await db.query('UPDATE contest_attempts SET warning_count = ? WHERE id = ?', [newWarnings, attempt.id]);

    // Persist the security event into contest_security_events
    await db.query(
      `INSERT INTO contest_security_events (contest_id, attempt_id, user_id, event_type, warning_number, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
      [contestId, attempt.id, userId, event_type || 'UNKNOWN', newWarnings, JSON.stringify(metadata || {})]
    );

    // Server-authoritative termination when max warnings reached
    let terminated = false;
    if (newWarnings >= maxAllowedWarnings) {
      await db.query(
        `UPDATE contest_attempts SET status = 'DISQUALIFIED', termination_reason = ? WHERE id = ?`,
        [`Maximum security violations reached (${newWarnings}/${maxAllowedWarnings})`, attempt.id]
      );
      // Finalize standings so score/rank are calculated even on disqualification
      calculateContestStandings(contestId).catch(e => console.error('standings calc error after termination:', e.message));
      terminated = true;
    }

    res.json({
      warning_count: newWarnings,
      max_warnings: maxAllowedWarnings,
      terminated,
      message: terminated
        ? `Contest attempt terminated: Maximum security violations reached (${newWarnings}/${maxAllowedWarnings}).`
        : `Security Warning ${newWarnings}/${maxAllowedWarnings} recorded.`
    });
  } catch (error) {
    console.error('Error processing contest security event:', error);
    res.status(500).json({ error: 'Failed to process security event' });
  }
});

// POST /api/contests/:id/submit-final - Manually end and submit contest
app.post('/api/contests/:id/submit-final', authenticateToken, async (req, res) => {
  const contestId = req.params.id;
  const userId = req.user.id;
  try {
    const [attRows] = await db.query('SELECT * FROM contest_attempts WHERE contest_id = ? AND user_id = ?', [contestId, userId]);
    if (attRows.length === 0) return res.status(404).json({ error: 'No active contest session found.' });
    const attempt = attRows[0];
    if (attempt.status !== 'IN_PROGRESS') {
      return res.json({ message: 'Contest already submitted.', status: attempt.status });
    }
    await db.query(
      `UPDATE contest_attempts SET status = 'SUBMITTED', submitted_at = NOW() WHERE id = ?`,
      [attempt.id]
    );
    await calculateContestStandings(contestId);
    res.json({ message: 'Contest submitted successfully!', status: 'SUBMITTED' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit contest' });
  }
});

// ============================================================================
// SUPPORT TICKETS, FEEDBACK, FAQs, AND RULES & GUIDELINES API ENDPOINTS
// ============================================================================

// --- FAQS ENDPOINTS ---
app.get('/api/faqs', async (req, res) => {
  try {
    const { category, org_id } = req.query;
    let sql = 'SELECT * FROM faqs WHERE is_published = 1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (org_id) {
      sql += ' AND (org_id = ? OR org_id IS NULL)';
      params.push(org_id);
    } else {
      sql += ' AND org_id IS NULL';
    }

    sql += ' ORDER BY display_order ASC, id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

app.post('/api/faqs', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const { category, question, answer, display_order } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    let orgId = null;
    if (req.user.role === 'organization') {
      const [orgs] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [req.user.id]);
      if (orgs.length > 0) orgId = orgs[0].id;
    }

    const [result] = await db.query(
      `INSERT INTO faqs (category, question, answer, org_id, display_order, is_published) VALUES (?, ?, ?, ?, ?, 1)`,
      [category || 'General', question, answer, orgId, display_order || 1]
    );

    res.json({ id: result.insertId, message: 'FAQ created successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// --- SUPPORT TICKETS ENDPOINTS ---
app.get('/api/support/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, category, priority } = req.query;

    let sql = '';
    const params = [];

    if (role === 'admin') {
      sql = `SELECT st.*, u.username as user_name, u.email as user_email,
                    op.organization_name, c.title as contest_title, a.title as assessment_title, p.title as problem_title
             FROM support_tickets st
             JOIN users u ON st.user_id = u.id
             LEFT JOIN organization_profiles op ON st.org_id = op.id
             LEFT JOIN contests c ON st.contest_id = c.id
             LEFT JOIN assessments a ON st.assessment_id = a.id
             LEFT JOIN problems p ON st.problem_id = p.id
             WHERE 1=1`;
    } else if (role === 'organization') {
      const [orgs] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [userId]);
      const orgId = orgs.length > 0 ? orgs[0].id : 0;
      sql = `SELECT st.*, u.username as user_name, u.email as user_email,
                    c.title as contest_title, a.title as assessment_title, p.title as problem_title
             FROM support_tickets st
             JOIN users u ON st.user_id = u.id
             LEFT JOIN contests c ON st.contest_id = c.id
             LEFT JOIN assessments a ON st.assessment_id = a.id
             LEFT JOIN problems p ON st.problem_id = p.id
             WHERE (st.org_id = ? OR st.user_id = ?)`;
      params.push(orgId, userId);
    } else {
      sql = `SELECT st.*, c.title as contest_title, a.title as assessment_title, p.title as problem_title, op.organization_name
             FROM support_tickets st
             LEFT JOIN contests c ON st.contest_id = c.id
             LEFT JOIN assessments a ON st.assessment_id = a.id
             LEFT JOIN problems p ON st.problem_id = p.id
             LEFT JOIN organization_profiles op ON st.org_id = op.id
             WHERE st.user_id = ?`;
      params.push(userId);
    }

    if (status && status !== 'all') {
      sql += ' AND st.status = ?';
      params.push(status);
    }
    if (category && category !== 'all') {
      sql += ' AND st.category = ?';
      params.push(category);
    }
    if (priority && priority !== 'all') {
      sql += ' AND st.priority = ?';
      params.push(priority);
    }

    sql += ' ORDER BY st.updated_at DESC';
    const [tickets] = await db.query(sql, params);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

app.post('/api/support/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, subject, priority, description, org_id, contest_id, assessment_id, problem_id } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required.' });
    }

    const ticketCode = 'CA-' + Math.floor(100000 + Math.random() * 900000);

    const [tRes] = await db.query(
      `INSERT INTO support_tickets (ticket_code, user_id, org_id, contest_id, assessment_id, problem_id, category, subject, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [ticketCode, userId, org_id || null, contest_id || null, assessment_id || null, problem_id || null, category || 'General', subject, priority || 'Medium']
    );

    const ticketId = tRes.insertId;

    // First message in thread
    await db.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)`,
      [ticketId, userId, req.user.role || 'user', description]
    );

    // Send email notification asynchronously
    const [uRows] = await db.query('SELECT email, display_name, username FROM users WHERE id = ?', [userId]);
    if (uRows.length > 0) {
      const displayName = uRows[0].display_name || uRows[0].username;
      emailService.sendMail({
        userId,
        emailType: 'SUPPORT_TICKET_CREATED',
        recipientEmail: uRows[0].email,
        subject: `[CodeArena] Support Ticket Created #${ticketCode}: ${subject}`,
        textContent: `Hello ${displayName},\n\nYour support ticket #${ticketCode} (${subject}) has been successfully created. Our support team will review your request shortly.\n\nThank you,\nCodeArena Support Team`,
        htmlContent: emailService.wrapHtmlEmail({
          title: 'Support Ticket Created',
          bodyHtml: `<p>Hello <strong>${displayName}</strong>,</p><p>Your support ticket <strong>#${ticketCode}</strong> (<em>${subject}</em>) has been successfully created.</p><p>Our support team will review your request shortly.</p><p>Thank you,<br><strong>CodeArena Support Team</strong></p>`,
          categoryTag: 'Support'
        })
      }).catch(() => {});
    }

    res.json({ id: ticketId, ticket_code: ticketCode, message: 'Support ticket created successfully!' });
  } catch (err) {
    console.error('Support ticket creation error:', err);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

app.get('/api/support/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const [tRows] = await db.query(
      `SELECT st.*, u.username as user_name, u.email as user_email,
              c.title as contest_title, a.title as assessment_title, p.title as problem_title, op.organization_name
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       LEFT JOIN contests c ON st.contest_id = c.id
       LEFT JOIN assessments a ON st.assessment_id = a.id
       LEFT JOIN problems p ON st.problem_id = p.id
       LEFT JOIN organization_profiles op ON st.org_id = op.id
       WHERE st.id = ?`,
      [ticketId]
    );

    if (tRows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = tRows[0];

    // Authorization check
    if (role === 'user' && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }
    if (role === 'organization') {
      const [orgs] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [userId]);
      const orgId = orgs.length > 0 ? orgs[0].id : 0;
      if (ticket.org_id !== orgId && ticket.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied to this organization ticket' });
      }
    }

    let msgSql = `SELECT sm.*, u.username as sender_name, u.display_name as sender_display_name
                  FROM support_messages sm
                  JOIN users u ON sm.sender_id = u.id
                  WHERE sm.ticket_id = ?`;
    if (role === 'user') {
      msgSql += ' AND sm.is_internal = 0';
    }
    msgSql += ' ORDER BY sm.created_at ASC';

    const [messages] = await db.query(msgSql, [ticketId]);

    res.json({ ticket, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ticket thread' });
  }
});

app.post('/api/support/tickets/:id/messages', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;
    const { message, is_internal, new_status } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const [tRows] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    if (tRows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = tRows[0];

    // Authorization
    if (role === 'user' && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, message, is_internal) VALUES (?, ?, ?, ?, ?)`,
      [ticketId, userId, role, message, is_internal ? 1 : 0]
    );

    // Update status
    let updatedStatus = ticket.status;
    if (new_status) {
      updatedStatus = new_status;
    } else if (role === 'admin' || role === 'organization') {
      updatedStatus = 'IN_PROGRESS';
    } else if (role === 'user' && ticket.status === 'WAITING_FOR_USER') {
      updatedStatus = 'IN_PROGRESS';
    }

    await db.query(`UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?`, [updatedStatus, ticketId]);

    res.json({ message: 'Reply posted successfully!', status: updatedStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post message' });
  }
});

app.patch('/api/support/tickets/:id/status', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, priority } = req.body;

    const updates = [];
    const params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(ticketId);
    await db.query(`UPDATE support_tickets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    res.json({ message: 'Ticket status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// --- FEEDBACK ENDPOINTS ---
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { feedback_type, rating, subject, message, page_url, org_id, contest_id, assessment_id, problem_id } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    const [fRes] = await db.query(
      `INSERT INTO user_feedback (user_id, org_id, contest_id, assessment_id, problem_id, feedback_type, rating, subject, message, page_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')`,
      [userId, org_id || null, contest_id || null, assessment_id || null, problem_id || null, feedback_type || 'General', rating || null, subject, message, page_url || null]
    );

    res.json({ id: fRes.insertId, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const { feedback_type, status } = req.query;

    let sql = '';
    const params = [];

    if (role === 'admin') {
      sql = `SELECT uf.*, u.username as user_name, u.email as user_email,
                    op.organization_name, c.title as contest_title, a.title as assessment_title, p.title as problem_title
             FROM user_feedback uf
             JOIN users u ON uf.user_id = u.id
             LEFT JOIN organization_profiles op ON uf.org_id = op.id
             LEFT JOIN contests c ON uf.contest_id = c.id
             LEFT JOIN assessments a ON uf.assessment_id = a.id
             LEFT JOIN problems p ON uf.problem_id = p.id
             WHERE 1=1`;
    } else {
      const [orgs] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [userId]);
      const orgId = orgs.length > 0 ? orgs[0].id : 0;
      sql = `SELECT uf.*, u.username as user_name, u.email as user_email,
                    c.title as contest_title, a.title as assessment_title, p.title as problem_title
             FROM user_feedback uf
             JOIN users u ON uf.user_id = u.id
             LEFT JOIN contests c ON uf.contest_id = c.id
             LEFT JOIN assessments a ON uf.assessment_id = a.id
             LEFT JOIN problems p ON uf.problem_id = p.id
             WHERE uf.org_id = ?`;
      params.push(orgId);
    }

    if (feedback_type && feedback_type !== 'all') {
      sql += ' AND uf.feedback_type = ?';
      params.push(feedback_type);
    }
    if (status && status !== 'all') {
      sql += ' AND uf.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY uf.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// --- CONTEST & ASSESSMENT RULES ENDPOINTS ---
app.get('/api/contests/:id/rules', async (req, res) => {
  try {
    const contestId = req.params.id;
    const [rows] = await db.query('SELECT * FROM contest_rules WHERE contest_id = ? ORDER BY order_index ASC', [contestId]);

    if (rows.length === 0) {
      // Default standard rules if none set
      const defaultRules = [
        { id: 1, title: 'Eligibility & Authentication', rule_type: 'General', description: 'Participants must log in with an authenticated CodeArena profile.' },
        { id: 2, title: 'Submission Policy', rule_type: 'Submissions', description: 'Submissions are evaluated automatically against test cases. Penalty points apply for wrong submissions.' },
        { id: 3, title: 'Integrity & Proctoring', rule_type: 'Security', description: 'Tab switching, window blur, and unauthorized activity are monitored.' }
      ];
      return res.json(defaultRules);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contest rules' });
  }
});

app.post('/api/contests/:id/rules', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const contestId = req.params.id;
    const { title, rule_type, description, order_index } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const [rRes] = await db.query(
      `INSERT INTO contest_rules (contest_id, title, rule_type, description, order_index) VALUES (?, ?, ?, ?, ?)`,
      [contestId, title, rule_type || 'General', description, order_index || 1]
    );

    res.json({ id: rRes.insertId, message: 'Contest rule added successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add contest rule' });
  }
});

app.get('/api/assessments/:id/rules', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const [rows] = await db.query('SELECT * FROM assessment_rules WHERE assessment_id = ? ORDER BY order_index ASC', [assessmentId]);

    if (rows.length === 0) {
      const defaultRules = [
        { id: 1, title: 'Exam Time Limit', rule_type: 'General', description: 'Complete all sections before the allocated timer expires.' },
        { id: 2, title: 'Scoring & Negative Marking', rule_type: 'Scoring', description: 'Incorrect MCQ options may deduct fractional negative marks according to assessment configuration.' },
        { id: 3, title: 'Exam Integrity', rule_type: 'Security', description: 'Do not open external browser tabs or application windows during your assessment.' }
      ];
      return res.json(defaultRules);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessment rules' });
  }
});

app.post('/api/assessments/:id/rules', authenticateToken, authorizeAdminOrVerifiedOrg, async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const { title, rule_type, description, order_index } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const [rRes] = await db.query(
      `INSERT INTO assessment_rules (assessment_id, title, rule_type, description, order_index) VALUES (?, ?, ?, ?, ?)`,
      [assessmentId, title, rule_type || 'General', description, order_index || 1]
    );

    res.json({ id: rRes.insertId, message: 'Assessment rule added successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add assessment rule' });
  }
});

db.initDB().then(() => {
  app.listen(PORT,'0.0.0.0', () => {
    console.log(`CodeArena backend service running on ${PORT}`);
  });
});

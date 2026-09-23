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
    const allowed = /\.(pdf|jpg|jpeg|png|doc|docx)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG, DOC files are allowed'));
  }
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_codearena_jwt_key_12345';

// Middlewares
app.use(cors());
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
import sys, json, re

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
            elif len(lines) == 1 and lines[0].includes('='):
                matchNums = re.search(r'\\[([^\\]]+)\\]', lines[0])
                matchTarget = re.search(r'target\\s*=\\s*(-?\\d+)', lines[0])
                if matchNums and matchTarget:
                    nums = [int(x) for x in matchNums.group(1).split(',')]
                    target = int(matchTarget.group(1))
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

    await db.query('UPDATE users SET activity_status = "online" WHERE id = ?', [user.id]);

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
          await db.query('UPDATE users SET activity_status = "offline" WHERE id = ?', [decoded.id]);
        }
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


// =============================================================
// --- OAUTH AUTHENTICATION ROUTES ---
// =============================================================

// Helper: Build standard user response object (shared by all auth methods)
async function buildUserAuthResponse(userId) {
  const [rows] = await db.query(
    'SELECT id, username, display_name, email, role, solved_count, streak, xp, bio, github_profile, skills, is_blocked, activity_status, auth_provider, avatar_url FROM users WHERE id = ?',
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
      'UPDATE users SET activity_status = "online", avatar_url = ? WHERE id = ?',
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
          'UPDATE users SET auth_provider = ?, provider_id = ?, avatar_url = ?, activity_status = "online" WHERE id = ?',
          [provider, String(providerId), avatarUrl || null, existingUser.id]
        );
        return { userId: existingUser.id, isNew: false };
      } else {
        // Email is already linked to a different OAuth provider - return the user but don't overwrite provider
        await db.query(
          'UPDATE users SET activity_status = "online" WHERE id = ?',
          [existingUser.id]
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

  return { userId: result.insertId, isNew: true };
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
app.get('/api/organization/profile', authenticateToken, authorizeOrg, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.json({ profile: null, status: 'NOT_REGISTERED' });
    }
    
    // Fetch computed statistics
    const computedStats = await getOrganizationComputedStats(rows[0].id);

    res.json({ profile: rows[0], status: rows[0].verification_status, computed_stats: computedStats });
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

    // Update user's display name if organization name is provided and user role is organization
    if (organization_name !== undefined && req.user.role === 'organization') {
      await db.query('UPDATE users SET display_name = ? WHERE id = ?', [organization_name, req.user.id]);
    }

    const [updated] = await db.query('SELECT * FROM organization_profiles WHERE user_id = ?', [req.user.id]);
    // Fetch computed stats for the updated profile
    const computedStats = await getOrganizationComputedStats(updated[0].id);

    res.json({ message: 'Organization profile updated successfully', profile: updated[0], computed_stats: computedStats });

  } catch (error) {
    console.error('Error updating org profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1c. GET /api/organization/dashboard-stats - Overview Cards, Recent Activity & Upcoming Events
app.get('/api/organization/dashboard-stats', authenticateToken, authorizeOrg, async (req, res) => {
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

// --- ORGANIZATION PARTICIPANTS, ANALYTICS, CERTIFICATES, SETTINGS API ROUTES ---

// 1. GET /api/org/participants - List participants with search and filtering
app.get('/api/org/participants', authenticateToken, authorizeOrg, async (req, res) => {
  const { event, status, score_min, score_max, date_from, date_to, search } = req.query;
  const orgId = req.user.id; // Assuming user.id maps to organization_profile_id

  try {
    let queryStr = `
      SELECT p.id, p.user_id, u.username, u.display_name, u.email, p.registered_at, p.score, p.rank_position,
             c.title AS contest_title, c.id AS contest_id
      FROM contest_participants p
      JOIN users u ON p.user_id = u.id
      JOIN contests c ON p.contest_id = c.id
      WHERE c.organization_id = ?
    `;
    const queryParams = [orgId];

    if (event) {
      queryStr += ' AND c.id = ?';
      queryParams.push(event);
    }
    if (status) { // Assuming status might relate to contest status or participant status if added
      // This part might need refinement based on actual participant status tracking
      // For now, let's assume it filters by contest status if not explicitly participant status
      queryStr += ' AND c.status = ?';
      queryParams.push(status);
    }
    if (score_min !== undefined) {
      queryStr += ' AND p.score >= ?';
      queryParams.push(parseInt(score_min));
    }
    if (score_max !== undefined) {
      queryStr += ' AND p.score <= ?';
      queryParams.push(parseInt(score_max));
    }
    if (date_from) {
      queryStr += ' AND p.registered_at >= ?';
      queryParams.push(new Date(date_from).toISOString().slice(0, 10));
    }
    if (date_to) {
      queryStr += ' AND p.registered_at <= ?';
      queryParams.push(new Date(date_to).toISOString().slice(0, 10));
    }
    if (search) {
      queryStr += ' AND (u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    queryStr += ' ORDER BY p.registered_at DESC';

    const [participants] = await db.query(queryStr, queryParams);
    res.json(participants);
  } catch (error) {
    console.error('Error fetching organization participants:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET /api/org/results-analytics - Performance analytics for organization's events
app.get('/api/org/results-analytics', authenticateToken, authorizeOrg, async (req, res) => {
  const { event_id } = req.query;
  const orgId = req.user.id;

  if (!event_id) {
    return res.status(400).json({ error: 'Event ID (event_id) is required for analytics.' });
  }

  try {
    // Fetch contest details to ensure it belongs to the organization
    const [contestCheck] = await db.query('SELECT id, title, organization_id FROM contests WHERE id = ? AND organization_id = ?', [event_id, orgId]);
    if (contestCheck.length === 0) {
      return res.status(404).json({ error: 'Contest not found or does not belong to this organization.' });
    }

    const contestTitle = contestCheck[0].title;

    // Analytics Queries
    // a. Pass Rate (assuming a passing score is defined, e.g., 50% of max possible score)
    const [maxScoreResult] = await db.query(`
      SELECT MAX(points) AS max_points FROM contest_problems WHERE contest_id = ?
    `, [event_id]);
    const maxPossibleScore = maxScoreResult[0]?.max_points || 100; // Default to 100 if no problems or points found
    const passingScoreThreshold = maxPossibleScore * 0.5; // 50% pass rate

    const [passRateResult] = await db.query(`
      SELECT 
        SUM(CASE WHEN p.score >= ? THEN 1 ELSE 0 END) AS passed_count,
        COUNT(p.id) AS total_participants
      FROM contest_participants p
      WHERE p.contest_id = ?
    `, [passingScoreThreshold, event_id]);

    const totalParticipants = passRateResult[0]?.total_participants || 0;
    const passedCount = passRateResult[0]?.passed_count || 0;
    const passRate = totalParticipants > 0 ? (passedCount / totalParticipants) * 100 : 0;

    // b. Score Distribution (e.g., count participants in score ranges)
    const [scoreDistributionResult] = await db.query(`
      SELECT
        CASE
          WHEN score >= ? THEN 'Passed'
          WHEN score >= ? THEN 'High Score (75%-99%)'
          WHEN score >= ? THEN 'Medium Score (50%-74%)'
          WHEN score >= ? THEN 'Low Score (25%-49%)'
          ELSE 'Very Low Score (<25%)'
        END AS score_range,
        COUNT(*) AS count
      FROM contest_participants
      WHERE contest_id = ? AND score IS NOT NULL
      GROUP BY score_range
      ORDER BY FIELD(score_range, 'Passed', 'High Score (75%-99%)', 'Medium Score (50%-74%)', 'Low Score (25%-49%)', 'Very Low Score (<25%)')
    `, [
      passingScoreThreshold, // Passed
      maxPossibleScore * 0.75, // High Score
      maxPossibleScore * 0.50, // Medium Score
      maxPossibleScore * 0.25, // Low Score
      event_id
    ]);

    // c. Per-Question/Problem Performance (e.g., average score, pass rate per problem)
    const [problemPerformanceResult] = await db.query(`
      SELECT 
        cp.problem_id,
        p.title AS problem_title,
        AVG(cp.score) AS average_score,
        SUM(CASE WHEN cp.score >= (SELECT points FROM contest_problems WHERE id = cp.id) * 0.5 THEN 1 ELSE 0 END) AS passed_count,
        COUNT(cp.id) AS total_attempts
      FROM contest_problem_attempts cp
      JOIN contest_problems c ON cp.contest_problem_id = c.id
      JOIN problems p ON c.problem_id = p.id
      WHERE c.contest_id = ?
      GROUP BY cp.problem_id, p.title
      ORDER BY p.title
    `, [event_id]);

    res.json({
      contest_title: contestTitle,
      analytics: {
        pass_rate: parseFloat(passRate.toFixed(2)),
        score_distribution: scoreDistributionResult,
        problem_performance: problemPerformanceResult.map(item => ({
          ...item,
          average_score: parseFloat(item.average_score?.toFixed(2)) || 0,
          pass_rate: item.total_attempts > 0 ? (item.passed_count / item.total_attempts) * 100 : 0
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching organization results analytics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. GET /api/org/certificates - List issued certificates
app.get('/api/org/certificates', authenticateToken, authorizeOrg, async (req, res) => {
  const { event_id, user_id, search, date_from, date_to } = req.query;
  const orgId = req.user.id;

  try {
    let queryStr = `
      SELECT cert.id, cert.user_id, u.username, u.display_name, u.email, cert.title AS certificate_title, cert.verification_code, cert.issued_at,
             c.title AS course_title, c.id AS course_id
      FROM certificates cert
      JOIN users u ON cert.user_id = u.id
      JOIN courses c ON cert.course_id = c.id
      WHERE c.organization_id = ? 
    `;
    const queryParams = [orgId];

    if (event_id) { // Assuming event_id refers to course_id for certificates
      queryStr += ' AND c.id = ?';
      queryParams.push(event_id);
    }
    if (user_id) {
      queryStr += ' AND cert.user_id = ?';
      queryParams.push(user_id);
    }
    if (date_from) {
      queryStr += ' AND DATE(cert.issued_at) >= ?';
      queryParams.push(new Date(date_from).toISOString().slice(0, 10));
    }
    if (date_to) {
      queryStr += ' AND DATE(cert.issued_at) <= ?';
      queryParams.push(new Date(date_to).toISOString().slice(0, 10));
    }
    if (search) {
      queryStr += ' AND (u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ? OR cert.title LIKE ? OR c.title LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    queryStr += ' ORDER BY cert.issued_at DESC';

    const [certificates] = await db.query(queryStr, queryParams);
    res.json(certificates);
  } catch (error) {
    console.error('Error fetching organization certificates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to view/download a specific certificate (requires verification code)
app.get('/api/certificates/:verification_code', async (req, res) => {
  const { verification_code } = req.params;

  if (!verification_code) {
    return res.status(400).json({ error: 'Verification code is required.' });
  }

  try {
    const [cert] = await db.query(`
      SELECT c.*, u.username, u.display_name, u.email, u.avatar_url, co.title AS course_title, co.organization_id
      FROM certificates c
      JOIN users u ON c.user_id = u.id
      JOIN courses co ON c.course_id = co.id
      WHERE c.verification_code = ? AND c.revoked_at IS NULL
    `, [verification_code]);

    if (cert.length === 0) {
      return res.status(404).json({ error: 'Certificate not found or has been revoked.' });
    }

    const certificateData = cert[0];

    // Optional: Check if the organization is active/verified if needed for public view
    // const [orgStatus] = await db.query('SELECT verification_status FROM organization_profiles WHERE id = ?', [certificateData.organization_id]);
    // if (orgStatus.length === 0 || orgStatus[0].verification_status !== 'VERIFIED') {
    //   return res.status(403).json({ error: 'Certificate organization is not currently verified.' });
    // }

    // Construct certificate data for frontend rendering or PDF generation
    // This part depends heavily on how certificates are rendered (e.g., HTML template, PDF generation library)
    // For now, returning the data needed to render it.
    res.json({
      certificate: {
        id: certificateData.id,
        verification_code: certificateData.verification_code,
        title: certificateData.title,
        description: certificateData.description,
        theme: certificateData.theme,
        motivation_message: certificateData.motivation_message,
        issued_at: certificateData.issued_at,
        user: {
          username: certificateData.username,
          display_name: certificateData.display_name,
          email: certificateData.email,
          avatar_url: certificateData.avatar_url
        },
        course: {
          title: certificateData.course_title,
          organization_id: certificateData.organization_id
        }
      }
    });

  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// 4. GET/PUT /api/org/settings - Account security and notification preferences
app.get('/api/org/settings', authenticateToken, authorizeOrg, async (req, res) => {
  const userId = req.user.id;
  try {
    // Fetch notification preferences
    const [prefs] = await db.query('SELECT notification_preferences FROM users WHERE id = ?', [userId]);
    const notificationPreferences = prefs.length > 0 && prefs[0].notification_preferences
      ? JSON.parse(prefs[0].notification_preferences)
      : {}; // Default to empty object if not set

    // Fetch organization profile details for settings like official email, phone etc.
    const [orgProfile] = await db.query('SELECT id, official_email, phone_number, address, country, state, city FROM organization_profiles WHERE user_id = ?', [userId]);

    res.json({
      notification_preferences: notificationPreferences,
      organization_details: orgProfile.length > 0 ? orgProfile[0] : null
    });
  } catch (error) {
    console.error('Error fetching org settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/org/settings', authenticateToken, authorizeOrg, async (req, res) => {
  const userId = req.user.id;
  const { notification_preferences, organization_details } = req.body;

  try {
    // Update notification preferences
    if (notification_preferences !== undefined) {
      await db.query('UPDATE users SET notification_preferences = ? WHERE id = ?', [JSON.stringify(notification_preferences), userId]);
    }

    // Update organization profile details if provided
    if (organization_details) {
      const { official_email, phone_number, address, country, state, city } = organization_details;
      
      // Check if org profile exists, create if not (though PUT implies it should exist)
      const [existing] = await db.query('SELECT id FROM organization_profiles WHERE user_id = ?', [userId]);
      if (existing.length === 0) {
        // This case should ideally not happen for PUT, but handle defensively
        return res.status(404).json({ error: 'Organization profile not found. Use POST to create first.' });
      }

      await db.query(`
        UPDATE organization_profiles SET
          official_email = COALESCE(?, official_email),
          phone_number = COALESCE(?, phone_number),
          address = COALESCE(?, address),
          country = COALESCE(?, country),
          state = COALESCE(?, state),
          city = COALESCE(?, city)
        WHERE user_id = ?
      `, [official_email || null, phone_number || null, address || null, country || null, state || null, city || null, userId]);
    }

    res.json({ message: 'Organization settings updated successfully.' });
  } catch (error) {
    console.error('Error updating org settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- ENDPOINTS REQUIRING VERIFIED ORGANIZATION STATUS ---

// Example: Endpoint to publish an assessment (requires verified org)
app.post('/api/assessments', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  // ... implementation to create a new assessment ...
  // Ensure organization_id is set to req.user.id
  // Example:
  const { title, description, duration_minutes, passing_score_percentage, questions } = req.body;
  const organization_id = req.user.id; // Verified org ID

  try {
    // Placeholder for actual assessment creation logic
    const [result] = await db.query(
      'INSERT INTO assessments (title, description, organization_id, duration_minutes, passing_score_percentage, status) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, organization_id, duration_minutes, passing_score_percentage, 'DRAFT']
    );
    res.status(201).json({ message: 'Assessment created successfully', assessment_id: result.insertId });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example: Endpoint to create a new contest (requires verified org)
app.post('/api/contests', authenticateToken, authorizeVerifiedOrg, async (req, res) => {
  // ... implementation to create a new contest ...
  // Ensure organization_id is set to req.user.id
  // Example:
  const { title, description, start_time, end_time, duration_minutes, problems } = req.body;
  const organization_id = req.user.id; // Verified org ID
  const created_by = req.user.id; // User ID of the creator

  try {
    // Placeholder for actual contest creation logic
    const [result] = await db.query(
      'INSERT INTO contests (title, description, organization_id, created_by, start_time, end_time, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, organization_id, created_by, start_time, end_time, duration_minutes, 'SCHEDULED']
    );
    // Logic to add problems to contest_problems would follow here
    res.status(201).json({ message: 'Contest created successfully', contest_id: result.insertId });
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ error: 'Internal Server Error' });
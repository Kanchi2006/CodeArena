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
      const nums = lines[0].split(/\\s+/
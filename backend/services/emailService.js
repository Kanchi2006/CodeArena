const nodemailer = require('nodemailer');
const db = require('../db');

let tableChecked = false;
let transporter = null;

// Initialize Nodemailer SMTP Transporter using Brevo or custom SMTP credentials
function initTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    console.warn('[EmailService] SMTP credentials missing in process.env. Emails will fail or fall back to simulation.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection during initialization (non-blocking)
  transporter.verify((err) => {
    if (err) {
      console.error(`[EmailService] SMTP Connection failed to ${host}:${port}:`, err.message);
    } else {
      console.log(`[EmailService] Brevo SMTP Transporter successfully connected and verified (${host}:${port}).`);
    }
  });

  return transporter;
}

// Auto-initialize transporter on module load
initTransporter();

// Ensure email_logs and user_notification_preferences tables exist
async function ensureTablesExist() {
  if (tableChecked) return;
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS email_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      org_profile_id INT NULL,
      email_type VARCHAR(100) NOT NULL,
      recipient_email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      provider_message_id VARCHAR(255) NULL,
      status ENUM('SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SUPPRESSED') NOT NULL DEFAULT 'SENT',
      error_message TEXT DEFAULT NULL,
      event_key VARCHAR(255) DEFAULT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email_recipient (recipient_email),
      INDEX idx_event_key (event_key),
      INDEX idx_provider_msg (provider_message_id)
    ) ENGINE=InnoDB`);

    await db.query(`CREATE TABLE IF NOT EXISTS user_notification_preferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNIQUE NOT NULL,
      email_notifications_enabled TINYINT(1) DEFAULT 1,
      marketing_emails_enabled TINYINT(1) DEFAULT 1,
      assessment_updates_enabled TINYINT(1) DEFAULT 1,
      contest_updates_enabled TINYINT(1) DEFAULT 1,
      course_updates_enabled TINYINT(1) DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

    tableChecked = true;
  } catch (err) {
    console.error('[EmailService] Error checking email tables:', err.message);
  }
}

// Log email delivery result to database
async function logEmailToDatabase({ userId, orgProfileId, emailType, recipientEmail, subject, providerMessageId, status, errorMessage, eventKey }) {
  await ensureTablesExist();
  try {
    await db.query(
      `INSERT INTO email_logs 
       (user_id, org_profile_id, email_type, recipient_email, subject, provider_message_id, status, error_message, event_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, orgProfileId || null, emailType, recipientEmail, subject, providerMessageId || null, status, errorMessage || null, eventKey || null]
    );
  } catch (err) {
    console.error('[EmailService] Failed to log email to email_logs table:', err.message);
  }
}

// Check user notification preferences
async function isEmailAllowedForUser(userId, emailCategory = 'transactional') {
  if (!userId) return true;
  await ensureTablesExist();
  try {
    const [rows] = await db.query('SELECT * FROM user_notification_preferences WHERE user_id = ?', [userId]);
    if (rows.length === 0) return true;
    const pref = rows[0];
    if (pref.email_notifications_enabled === 0) return false;
    if (emailCategory === 'assessment' && pref.assessment_updates_enabled === 0) return false;
    if (emailCategory === 'contest' && pref.contest_updates_enabled === 0) return false;
    if (emailCategory === 'course' && pref.course_updates_enabled === 0) return false;
    return true;
  } catch (err) {
    return true;
  }
}

// Helper to format date & time strings
function getFormattedDateTime(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return { dateStr, timeStr };
}

// Clean up expired OTPs (Task 14)
async function cleanupExpiredOtps() {
  try {
    const [res] = await db.query('DELETE FROM email_otps WHERE expires_at < NOW() AND verified_at IS NULL');
    if (res.affectedRows > 0) {
      console.log(`[EmailService] Cleaned up ${res.affectedRows} expired unverified OTPs.`);
    }
  } catch (err) {
    // Non-fatal if table doesn't exist yet
  }
}

// Core send function using Nodemailer Brevo SMTP with idempotency duplicate suppression and DB logging
async function sendMail({ userId, orgProfileId, emailType, recipientEmail, subject, textContent, htmlContent, eventKey, category = 'transactional' }) {
  if (!recipientEmail || !recipientEmail.trim()) {
    console.warn(`[EmailService] No recipient email specified for type ${emailType}. Skipping.`);
    return { success: false, error: 'Recipient email missing' };
  }

  await ensureTablesExist();

  // 1. Check user notification preferences
  if (userId) {
    const allowed = await isEmailAllowedForUser(userId, category);
    if (!allowed) {
      console.log(`[EmailService] Email type '${emailType}' suppressed by user notification preferences for user ${userId}.`);
      await logEmailToDatabase({
        userId, orgProfileId, emailType, recipientEmail, subject, status: 'SUPPRESSED',
        errorMessage: 'User opted out of email category', eventKey
      });
      return { success: true, suppressed: true };
    }
  }

  // 2. Check for duplicate email via eventKey or 2-minute duplicate window for same recipient + emailType
  try {
    if (eventKey) {
      const [existingKey] = await db.query(
        `SELECT id FROM email_logs WHERE event_key = ? AND status IN ('SENT', 'DELIVERED') LIMIT 1`,
        [eventKey]
      );
      if (existingKey.length > 0) {
        console.log(`[EmailService] Duplicate email suppressed by eventKey '${eventKey}'.`);
        return { success: true, duplicateSuppressed: true };
      }
    } else {
      const [recent] = await db.query(
        `SELECT id FROM email_logs 
         WHERE recipient_email = ? AND email_type = ? AND status IN ('SENT', 'DELIVERED')
         AND sent_at > NOW() - INTERVAL 2 MINUTE LIMIT 1`,
        [recipientEmail.trim(), emailType]
      );
      if (recent.length > 0) {
        console.log(`[EmailService] Duplicate email '${emailType}' suppressed for ${recipientEmail} (sent within 2 mins).`);
        return { success: true, duplicateSuppressed: true };
      }
    }
  } catch (e) {
    // Continue if idempotency lookup encounters query error
  }

  const fromEmail = process.env.EMAIL_FROM || 'CodeArena <k83460914@gmail.com>';
  const activeTransporter = initTransporter();

  let status = 'SENT';
  let errorMessage = null;
  let providerMessageId = null;

  try {
    if (!activeTransporter) {
      console.log(`[EmailService - DRY RUN / LOCAL LOG] Sending '${subject}' to ${recipientEmail} (No SMTP Transporter)`);
      await logEmailToDatabase({
        userId,
        orgProfileId,
        emailType,
        recipientEmail,
        subject,
        providerMessageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        status: 'SENT',
        errorMessage: 'Dispatched via CodeArena Local Simulation (SMTP credentials missing)',
        eventKey
      });
      return { success: true, localSimulated: true };
    }

    const info = await activeTransporter.sendMail({
      from: fromEmail,
      to: recipientEmail.trim(),
      subject: subject,
      text: textContent,
      html: htmlContent
    });

    providerMessageId = info.messageId || (info.response ? String(info.response) : null);
    console.log(`[EmailService] Brevo SMTP email '${emailType}' successfully sent to ${recipientEmail}. MessageId: ${providerMessageId}`);
  } catch (err) {
    console.error(`[EmailService] Exception sending '${emailType}' via Brevo SMTP to ${recipientEmail}:`, err.message);
    status = 'FAILED';
    errorMessage = err.message;
  }

  // 4. Log attempt to DB
  await logEmailToDatabase({
    userId,
    orgProfileId,
    emailType,
    recipientEmail,
    subject,
    providerMessageId,
    status,
    errorMessage,
    eventKey
  });

  return { success: status === 'SENT', providerMessageId, error: errorMessage };
}

// Development / Admin Email System Test Trigger (Task 4)
async function testEmailService(recipientEmail) {
  const targetEmail = recipientEmail || process.env.SMTP_USER || 'k83460914@gmail.com';
  const subject = 'CodeArena Email Service Test';
  const textContent = `This is a test email from CodeArena.\n\nBrevo SMTP Dispatch Time: ${new Date().toISOString()}`;
  const bodyHtml = `
    <h3 style="color: #6366f1; margin-top: 0;">CodeArena Brevo SMTP Live Test</h3>
    <p>This is an automated test email dispatched via <strong>Nodemailer + Brevo SMTP</strong> pipeline.</p>
    <div style="background: #0f172a; padding: 12px 18px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
      <p style="margin: 4px 0; color: #10b981;"><strong>Status:</strong> Connected & Verified</p>
      <p style="margin: 4px 0; color: #94a3b8;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    </div>
  `;

  return sendMail({
    emailType: 'SYSTEM_TEST',
    recipientEmail: targetEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'CodeArena Email Service Test', bodyHtml, categoryTag: 'System Audit' }),
    eventKey: `test_${Date.now()}`
  });
}

// Global Branded CodeArena HTML Wrapper Template
function wrapHtmlEmail({ title, bodyHtml, actionBtn, categoryTag = 'CodeArena Notification' }) {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #0b0f19; color: #f8fafc; -webkit-font-smoothing: antialiased;">
      <div style="background-color: #0b0f19; padding: 32px 16px; min-height: 100vh;">
        <div style="max-width: 620px; margin: 0 auto; background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 30px rgba(0,0,0,0.6);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%); padding: 28px 36px; text-align: center; position: relative;">
            <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 14px; margin-bottom: 8px;">
              <span style="color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">${categoryTag}</span>
            </div>
            <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">CodeArena</h1>
          </div>
          
          <!-- Body Content -->
          <div style="padding: 36px; font-size: 15px; line-height: 1.65; color: #cbd5e1;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 22px; font-weight: 700; border-bottom: 1px solid #334155; padding-bottom: 12px;">${title}</h2>
            ${bodyHtml}
            
            ${actionBtn ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${actionBtn.url}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 14px rgba(99,102,241,0.45); font-family: sans-serif;">${actionBtn.text} &rarr;</a>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background-color: #0f172a; padding: 24px 36px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #94a3b8;">CodeArena &bull; Enterprise Coding & Verification Platform</p>
            <p style="margin: 0;">This is an automated operational notification. Visit <a href="${appUrl}" style="color: #818cf8; text-decoration: none;">CodeArena Dashboard</a> to manage your account settings.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & ACCOUNT EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendWelcomeEmail({ userId, recipientEmail, userName }) {
  const name = userName || 'Developer';
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = 'Welcome to CodeArena! 🚀';

  const textContent = `Welcome to CodeArena, ${name}!
Thank you for joining CodeArena - the ultimate platform for competitive programming, skill assessments, courses, and coding challenges.

Get started by taking practice challenges or taking your enrolled courses: ${appUrl}

Happy Coding!
The CodeArena Team`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Welcome to <strong>CodeArena</strong>! We're thrilled to have you join our global community of developers, problem solvers, and tech innovators.</p>
    
    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <h3 style="color: #818cf8; margin-top: 0; font-size: 16px;">What you can do on CodeArena:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #e2e8f0;">
        <li style="margin-bottom: 8px;"><strong>Practice Algorithmic Challenges:</strong> Solve curated problems across arrays, graphs, dynamic programming, and data structures.</li>
        <li style="margin-bottom: 8px;"><strong>Interactive Courses:</strong> Master C, C++, Java, Python, and Modern Web Development.</li>
        <li style="margin-bottom: 8px;"><strong>Timed Technical Assessments:</strong> Benchmark your real-world coding skills.</li>
        <li style="margin-bottom: 0;"><strong>Earn Recognized Certificates:</strong> Unlock verified milestone certificates as you solve problems.</li>
      </ul>
    </div>
    
    <p style="margin-top: 24px;">Happy Coding!<br><strong>The CodeArena Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'WELCOME',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Welcome to CodeArena', bodyHtml, actionBtn: { text: 'Explore CodeArena Dashboard', url: appUrl }, categoryTag: 'Welcome' }),
    eventKey: `welcome_${userId || recipientEmail}`
  });
}

async function sendEmailVerificationEmail({ userId, recipientEmail, userName, verificationUrl, code }) {
  const name = userName || 'Developer';
  const targetUrl = verificationUrl || `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${code}`;
  const subject = 'CodeArena - Verify Your Email Address';

  const textContent = `Hello ${name},
Please verify your email address for CodeArena by using the link below:
${targetUrl}

Verification Code: ${code || 'N/A'}

If you did not request this verification, please ignore this email.

Regards,
CodeArena Team`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Please confirm your email address to complete your CodeArena account setup and access all features.</p>
    
    ${code ? `
      <div style="background-color: #0f172a; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0; border: 1px dashed #6366f1;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Verification Code</p>
        <div style="font-size: 28px; font-weight: 800; color: #818cf8; letter-spacing: 4px;">${code}</div>
      </div>
    ` : ''}

    <p>Or click the button below to verify directly:</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'EMAIL_VERIFICATION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Verify Your Email Address', bodyHtml, actionBtn: { text: 'Verify Email Address', url: targetUrl }, categoryTag: 'Account Verification' }),
    eventKey: `email_verify_${userId || recipientEmail}_${code || Date.now()}`
  });
}

async function sendPasswordResetEmail({ userId, recipientEmail, userName, resetUrl, resetToken }) {
  const name = userName || 'User';
  const targetUrl = resetUrl || `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const subject = 'CodeArena - Password Reset Request';

  const textContent = `Hello ${name},

We received a request to reset your password for your CodeArena account.

Click the link below to set a new password:
${targetUrl}

This link is valid for 1 hour. If you did not request a password reset, please ignore this email.

Regards,
CodeArena Team`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your password for your <strong>CodeArena</strong> account.</p>
    
    <div style="background-color: #0f172a; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #334155;">
      <p style="margin: 0; color: #e2e8f0;">🔒 For your security, this password reset link will expire in <strong>60 minutes</strong>.</p>
    </div>

    <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Security Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'PASSWORD_RESET',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Password Reset Request', bodyHtml, actionBtn: { text: 'Reset Password', url: targetUrl }, categoryTag: 'Security Alert' }),
    eventKey: `pw_reset_${userId || recipientEmail}_${Date.now()}`
  });
}

// -------------------------------------------------------------
// 2. ORGANIZATION VERIFICATION EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendOrganizationVerificationSubmittedEmail({ orgProfileId, recipientEmail, repName, orgName, submittedAt }) {
  const { dateStr, timeStr } = getFormattedDateTime(submittedAt);
  const displayName = repName || orgName || 'Organization Representative';
  const subject = 'CodeArena - Organization Verification Submitted';

  const textContent = `Hello ${displayName},
Your organization verification request for ${orgName} has been submitted to CodeArena.
Status: Pending Review
Date: ${dateStr} ${timeStr}

Our admin compliance team will review your organization details and uploaded documents.`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>Your organization verification request has been successfully submitted to CodeArena.</p>
    
    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Verification Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Review</span></p>
      <p style="margin: 4px 0;"><strong>Submission Date:</strong> ${dateStr} at ${timeStr}</p>
    </div>

    <p>Our admin compliance team will evaluate your uploaded verification documents. You will receive another notification as soon as the review is complete.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_VERIFICATION_SUBMITTED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Organization Verification Submitted', bodyHtml, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationUnderReviewEmail({ orgProfileId, recipientEmail, repName, orgName, reviewAt }) {
  const { dateStr, timeStr } = getFormattedDateTime(reviewAt);
  const displayName = repName || orgName || 'Organization Representative';
  const subject = 'CodeArena - Organization Verification Under Review';

  const textContent = `Hello ${displayName},
Your organization verification request for ${orgName} is now under active review by the CodeArena Admin team.
Date: ${dateStr} ${timeStr}`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>Your organization verification request is now under active review by the CodeArena compliance team.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #3b82f6;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Verification Status:</strong> <span style="color: #3b82f6; font-weight: bold;">Under Review</span></p>
      <p style="margin: 4px 0;"><strong>Review Started:</strong> ${dateStr} at ${timeStr}</p>
    </div>

    <p>We are validating your submitted credentials and documents. You will receive an update shortly.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Compliance Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_UNDER_REVIEW',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Verification Under Active Review', bodyHtml, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationApprovedEmail({ orgProfileId, recipientEmail, repName, orgName, verifiedAt, dashboardUrl }) {
  const { dateStr, timeStr } = getFormattedDateTime(verifiedAt);
  const displayName = repName || orgName || 'Organization Representative';
  const targetUrl = dashboardUrl || `${process.env.APP_URL || 'http://localhost:5173'}/organization/dashboard`;
  const subject = 'CodeArena - Organization Verification Approved! 🎉';

  const textContent = `Congratulations!
Your organization ${orgName} has been verified by CodeArena.
Verified Date: ${dateStr} ${timeStr}

You can now log in and host coding contests and technical assessments: ${targetUrl}`;

  const bodyHtml = `
    <p style="font-size: 18px; color: #10b981; font-weight: bold; margin-top: 0;">Congratulations!</p>
    <p>Your organization has been successfully verified by CodeArena compliance administrators.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #10b981;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">VERIFIED</span></p>
      <p style="margin: 4px 0;"><strong>Verified Date:</strong> ${dateStr} at ${timeStr}</p>
    </div>

    <p>Your organization account has full access to the CodeArena Organization Portal. You can now:</p>
    <ul style="color: #cbd5e1; padding-left: 20px;">
      <li>Create and manage custom Coding Contests</li>
      <li>Publish technical recruitment assessments</li>
      <li>Invite candidates and issue verified certificates</li>
    </ul>

    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_APPROVED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Organization Verification Approved', bodyHtml, actionBtn: { text: 'Go to Organization Dashboard', url: targetUrl }, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationRejectedEmail({ orgProfileId, recipientEmail, repName, orgName, rejectionReason, rejectionAt }) {
  const { dateStr } = getFormattedDateTime(rejectionAt);
  const displayName = repName || orgName || 'Organization Representative';
  const subject = 'CodeArena - Organization Verification Status Update';

  const textContent = `Hello ${displayName},
Verification status update for ${orgName}: Rejected.
Reason: ${rejectionReason || 'Submitted documents failed validation.'}
Date: ${dateStr}`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>We have an update regarding your organization verification request on CodeArena.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #ef4444;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Rejected</span></p>
      <p style="margin: 4px 0;"><strong>Reason:</strong> ${rejectionReason || 'Submitted credentials could not be validated.'}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
    </div>

    <p>You may log in to your CodeArena account to review feedback and resubmit updated verification documents.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_REJECTED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Organization Verification Update', bodyHtml, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationResubmissionRequiredEmail({ orgProfileId, recipientEmail, repName, orgName, rejectionReason, requestedAt }) {
  const { dateStr } = getFormattedDateTime(requestedAt);
  const displayName = repName || orgName || 'Organization Representative';
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = 'CodeArena - Action Required: Verification Documents Resubmission';

  const textContent = `Hello ${displayName},
Action required for ${orgName} verification.
Feedback: ${rejectionReason || 'Uploaded documents require correction.'}
Please log in to resubmit documents: ${appUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>Action is required regarding your organization verification request on CodeArena.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #f59e0b;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Resubmission Required</span></p>
      <p style="margin: 4px 0;"><strong>Admin Feedback:</strong> ${rejectionReason || 'Please upload updated document proof.'}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
    </div>

    <p>Please log in to update your details and resubmit your documents for review.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Compliance Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_RESUBMISSION_REQUIRED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Resubmission Required', bodyHtml, actionBtn: { text: 'Resubmit Documents', url: `${appUrl}/organization/verification` }, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationResubmittedEmail({ orgProfileId, recipientEmail, repName, orgName, resubmissionAt }) {
  const { dateStr } = getFormattedDateTime(resubmissionAt);
  const displayName = repName || orgName || 'Organization Representative';
  const subject = 'CodeArena - Verification Documents Resubmitted';

  const textContent = `Hello ${displayName},
Updated verification documents received for ${orgName} on ${dateStr}.
Status: Pending Review`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>We have successfully received your updated organization verification details.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Review</span></p>
      <p style="margin: 4px 0;"><strong>Resubmission Date:</strong> ${dateStr}</p>
    </div>

    <p>Our admin compliance team will re-examine your updated submission shortly.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_RESUBMITTED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Documents Resubmitted', bodyHtml, categoryTag: 'Organization Portal' })
  });
}

async function sendOrganizationSuspendedEmail({ orgProfileId, recipientEmail, repName, orgName, suspensionReason, suspensionAt }) {
  const { dateStr } = getFormattedDateTime(suspensionAt);
  const displayName = repName || orgName || 'Organization Representative';
  const subject = 'CodeArena - Organization Account Status Alert';

  const textContent = `Hello ${displayName},
Your organization account for ${orgName} has been suspended on ${dateStr}.
Reason: ${suspensionReason || 'Account suspended by administrator.'}`;

  const bodyHtml = `
    <p>Hello <strong>${displayName}</strong>,</p>
    <p>Your organization account status on CodeArena has been updated to <strong>Suspended</strong>.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #ef4444;">
      <p style="margin: 4px 0;"><strong>Organization:</strong> ${orgName}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Suspended</span></p>
      <p style="margin: 4px 0;"><strong>Reason:</strong> ${suspensionReason || 'Admin compliance decision.'}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${dateStr}</p>
    </div>

    <p>Your permissions to create or host new contests and technical assessments have been suspended. Contact support if you believe this is in error.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Admin Team</strong></p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_SUSPENDED',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Organization Account Suspended', bodyHtml, categoryTag: 'Organization Portal' })
  });
}

// -------------------------------------------------------------
// 3. ASSESSMENT EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendAssessmentInvitationEmail({ recipientEmail, candidateName, assessmentTitle, organizationName, inviteUrl, inviteCode, durationMinutes, deadlineDate }) {
  const name = candidateName || 'Candidate';
  const org = organizationName || 'CodeArena Host';
  const targetUrl = inviteUrl || `${process.env.APP_URL || 'http://localhost:5173'}/assessment/invite/${inviteCode}`;
  const subject = `Invitation: Technical Assessment - ${assessmentTitle}`;

  const textContent = `Hello ${name},

You have been invited by ${org} to take the technical assessment "${assessmentTitle}" on CodeArena.

Assessment Details:
- Assessment Title: ${assessmentTitle}
- Host Organization: ${org}
- Duration: ${durationMinutes || 60} Minutes
- Access Link: ${targetUrl}

Best of luck!
CodeArena Team`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>You have been invited by <strong>${org}</strong> to complete an official technical assessment on <strong>CodeArena</strong>.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <p style="margin: 4px 0;"><strong>Assessment:</strong> ${assessmentTitle}</p>
      <p style="margin: 4px 0;"><strong>Host Organization:</strong> ${org}</p>
      <p style="margin: 4px 0;"><strong>Duration:</strong> ${durationMinutes || 60} minutes</p>
      ${deadlineDate ? `<p style="margin: 4px 0;"><strong>Deadline:</strong> ${new Date(deadlineDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
      <p style="margin: 4px 0;"><strong>Invite Code:</strong> <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #818cf8;">${inviteCode}</code></p>
    </div>

    <p style="color: #94a3b8; font-size: 14px;">Make sure you have a quiet environment and a stable internet connection before beginning.</p>
    <p style="margin-top: 24px;">Good luck!<br><strong>The CodeArena Team</strong></p>
  `;

  return sendMail({
    emailType: 'ASSESSMENT_INVITATION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: `Assessment Invitation: ${assessmentTitle}`, bodyHtml, actionBtn: { text: 'Start Assessment Now', url: targetUrl }, categoryTag: 'Assessment Portal' }),
    category: 'assessment',
    eventKey: `invite_${inviteCode || recipientEmail}`
  });
}

async function sendAssessmentEnrollmentEmail({ userId, recipientEmail, userName, assessmentTitle, startTime, durationMinutes }) {
  const name = userName || 'Candidate';
  const { dateStr, timeStr } = getFormattedDateTime(startTime);
  const subject = `Assessment Started: ${assessmentTitle}`;

  const textContent = `Hello ${name},
You have officially started your attempt for "${assessmentTitle}".
Started At: ${dateStr} ${timeStr}
Duration: ${durationMinutes} minutes.`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your attempt for technical assessment <strong>${assessmentTitle}</strong> has successfully commenced.</p>

    <div style="background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <p style="margin: 4px 0;"><strong>Assessment:</strong> ${assessmentTitle}</p>
      <p style="margin: 4px 0;"><strong>Started At:</strong> ${dateStr} at ${timeStr}</p>
      <p style="margin: 4px 0;"><strong>Duration:</strong> ${durationMinutes || 60} Minutes</p>
    </div>

    <p>Be sure to submit your answers before the timer runs out!</p>
  `;

  return sendMail({
    userId,
    emailType: 'ASSESSMENT_ENROLLMENT',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Assessment Started', bodyHtml, categoryTag: 'Assessment Portal' }),
    category: 'assessment'
  });
}

async function sendAssessmentResultEmail({ userId, recipientEmail, userName, assessmentTitle, score, percentage, isPassed, passingPercentage, resultUrl, totalQuestions }) {
  const name = userName || 'Candidate';
  const passStatus = isPassed ? 'PASSED' : 'COMPLETED';
  const statusColor = isPassed ? '#10b981' : '#f59e0b';
  const targetUrl = resultUrl || `${process.env.APP_URL || 'http://localhost:5173'}/assessments`;
  const subject = `Assessment Result: ${assessmentTitle} - ${passStatus}`;

  const textContent = `Hello ${name},

Your assessment "${assessmentTitle}" has been evaluated.

Result Summary:
- Status: ${passStatus}
- Earned Score: ${score} points
- Percentage: ${percentage}%
- Required Passing Score: ${passingPercentage}%

View full result details: ${targetUrl}

CodeArena Team`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your submission for <strong>${assessmentTitle}</strong> has been evaluated.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid ${statusColor};">
      <p style="margin: 4px 0;"><strong>Assessment:</strong> ${assessmentTitle}</p>
      <p style="margin: 4px 0;"><strong>Result:</strong> <span style="color: ${statusColor}; font-weight: bold;">${passStatus}</span></p>
      <p style="margin: 4px 0;"><strong>Score:</strong> ${score} Points (${percentage}%)</p>
      <p style="margin: 4px 0;"><strong>Passing Requirement:</strong> ${passingPercentage}%</p>
      ${totalQuestions ? `<p style="margin: 4px 0;"><strong>Total Questions:</strong> ${totalQuestions}</p>` : ''}
    </div>

    ${isPassed ? '<p style="color: #10b981;">Congratulations on successfully passing the assessment! Your certificate has been issued if enabled.</p>' : '<p>Keep practicing and reviewing concepts to improve your technical performance!</p>'}
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'ASSESSMENT_RESULT',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: `Assessment Result: ${passStatus}`, bodyHtml, actionBtn: { text: 'View Detailed Assessment Report', url: targetUrl }, categoryTag: 'Assessment Portal' }),
    category: 'assessment'
  });
}

// -------------------------------------------------------------
// 4. COURSE EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendCourseEnrollmentEmail({ userId, recipientEmail, userName, courseTitle, courseUrl }) {
  const name = userName || 'Student';
  const targetUrl = courseUrl || `${process.env.APP_URL || 'http://localhost:5173'}/courses`;
  const subject = `Enrolled: ${courseTitle} on CodeArena`;

  const textContent = `Hello ${name},
You have successfully enrolled in "${courseTitle}".
Start learning now: ${targetUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>You have successfully enrolled in <strong>${courseTitle}</strong> on CodeArena.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <h3 style="color: #818cf8; margin-top: 0;">Course: ${courseTitle}</h3>
      <p style="margin: 0; color: #cbd5e1;">Access video lessons, interactive code examples, quizzes, and earn your verified completion certificate.</p>
    </div>

    <p style="margin-top: 24px;">Happy Learning!<br><strong>CodeArena Academy</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'COURSE_ENROLLMENT',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Course Enrollment Confirmed', bodyHtml, actionBtn: { text: 'Start Learning Now', url: targetUrl }, categoryTag: 'CodeArena Academy' }),
    category: 'course'
  });
}

async function sendCourseCompletionEmail({ userId, recipientEmail, userName, courseTitle, completionDate, certificateUrl, verificationCode }) {
  const name = userName || 'Student';
  const targetUrl = certificateUrl || `${process.env.APP_URL || 'http://localhost:5173'}/certificates`;
  const subject = `🎓 Course Completed: ${courseTitle}!`;

  const textContent = `Congratulations ${name}!
You have successfully completed "${courseTitle}".
Verification Code: ${verificationCode || 'N/A'}
View Certificate: ${targetUrl}`;

  const bodyHtml = `
    <p style="font-size: 18px; color: #10b981; font-weight: bold; margin-top: 0;">Congratulations!</p>
    <p>You have officially completed all lessons and requirements for <strong>${courseTitle}</strong>.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #10b981;">
      <p style="margin: 4px 0;"><strong>Course:</strong> ${courseTitle}</p>
      <p style="margin: 4px 0;"><strong>Completion Date:</strong> ${completionDate || new Date().toLocaleDateString()}</p>
      ${verificationCode ? `<p style="margin: 4px 0;"><strong>Verification Code:</strong> <code style="color: #818cf8;">${verificationCode}</code></p>` : ''}
    </div>

    <p>Your official CodeArena Course Completion Certificate has been generated and added to your profile.</p>
    <p style="margin-top: 24px;">Best regards,<br><strong>CodeArena Learning Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'COURSE_COMPLETION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Course Completed Successfully!', bodyHtml, actionBtn: { text: 'View & Download Certificate', url: targetUrl }, categoryTag: 'CodeArena Certificates' }),
    category: 'course'
  });
}

// -------------------------------------------------------------
// 5. CONTEST EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendContestRegistrationEmail({ userId, recipientEmail, userName, contestTitle, startTime, contestUrl }) {
  const name = userName || 'Coder';
  const { dateStr, timeStr } = getFormattedDateTime(startTime);
  const targetUrl = contestUrl || `${process.env.APP_URL || 'http://localhost:5173'}/contests`;
  const subject = `Registered: ${contestTitle} Coding Contest`;

  const textContent = `Hello ${name},
You are registered for "${contestTitle}".
Start Time: ${dateStr} ${timeStr}
Contest Arena: ${targetUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your registration for competitive coding contest <strong>${contestTitle}</strong> is confirmed!</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <p style="margin: 4px 0;"><strong>Contest:</strong> ${contestTitle}</p>
      <p style="margin: 4px 0;"><strong>Scheduled Date:</strong> ${dateStr}</p>
      <p style="margin: 4px 0;"><strong>Start Time:</strong> ${timeStr}</p>
    </div>

    <p>Get your environment ready before the contest starts.</p>
    <p style="margin-top: 24px;">Good luck!<br><strong>CodeArena Contest Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'CONTEST_REGISTRATION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Contest Registration Confirmed', bodyHtml, actionBtn: { text: 'Go to Contest Arena', url: targetUrl }, categoryTag: 'Contest Arena' }),
    category: 'contest',
    eventKey: `contest_reg_${userId}_${contestTitle.replace(/[^a-zA-Z0-9]/g, '')}`
  });
}

async function sendContestReminderEmail({ userId, recipientEmail, userName, contestTitle, startTime, contestUrl }) {
  const name = userName || 'Coder';
  const { timeStr } = getFormattedDateTime(startTime);
  const targetUrl = contestUrl || `${process.env.APP_URL || 'http://localhost:5173'}/contests`;
  const subject = `⚡ Reminder: ${contestTitle} Starting Soon!`;

  const textContent = `Hello ${name},
Contest "${contestTitle}" is starting soon (${timeStr}).
Join here: ${targetUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>This is a quick reminder that competitive contest <strong>${contestTitle}</strong> is starting soon!</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #6366f1;">
      <p style="margin: 4px 0;"><strong>Contest:</strong> ${contestTitle}</p>
      <p style="margin: 4px 0;"><strong>Start Time:</strong> ${timeStr}</p>
    </div>

    <p>Click below to enter the live arena before time starts.</p>
  `;

  return sendMail({
    userId,
    emailType: 'CONTEST_REMINDER',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Contest Starting Soon', bodyHtml, actionBtn: { text: 'Enter Contest Arena', url: targetUrl }, categoryTag: 'Contest Arena' }),
    category: 'contest'
  });
}

async function sendContestResultEmail({ userId, recipientEmail, userName, contestTitle, rank, score, totalParticipants, leaderboardUrl }) {
  const name = userName || 'Coder';
  const targetUrl = leaderboardUrl || `${process.env.APP_URL || 'http://localhost:5173'}/contests`;
  const subject = `🏆 Results Published: ${contestTitle}`;

  const textContent = `Hello ${name},
Results are live for "${contestTitle}".
Your Rank: #${rank || 'N/A'} of ${totalParticipants || 'all'} participants
Score: ${score} points
View Leaderboard: ${targetUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Final standings have been published for <strong>${contestTitle}</strong>.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #f59e0b;">
      <p style="margin: 4px 0;"><strong>Contest:</strong> ${contestTitle}</p>
      <p style="margin: 4px 0;"><strong>Your Rank:</strong> <span style="color: #f59e0b; font-size: 18px; font-weight: bold;">#${rank || 'N/A'}</span> ${totalParticipants ? `(out of ${totalParticipants})` : ''}</p>
      <p style="margin: 4px 0;"><strong>Total Score:</strong> ${score} Points</p>
    </div>

    <p>Great effort! Check out full solution editorials and detailed leaderboard rankings.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'CONTEST_RESULT',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Contest Results & Rankings', bodyHtml, actionBtn: { text: 'View Full Leaderboard', url: targetUrl }, categoryTag: 'Contest Arena' }),
    category: 'contest'
  });
}

// -------------------------------------------------------------
// 6. CERTIFICATE & MILESTONE EMAIL TEMPLATES
// -------------------------------------------------------------

async function sendMilestoneAchievementEmail({ userId, recipientEmail, userName, milestoneCount, title, certificateUrl, verificationCode }) {
  const name = userName || 'Developer';
  const certTitle = title || `${milestoneCount} Problems Solved`;
  const targetUrl = certificateUrl || `${process.env.APP_URL || 'http://localhost:5173'}/certificates`;
  const subject = `🎉 Achievement Unlocked: ${certTitle}!`;

  const textContent = `Congratulations ${name}!
You unlocked a new platform milestone on CodeArena: ${certTitle}!
Verification Code: ${verificationCode || 'N/A'}
View Certificate: ${targetUrl}`;

  const bodyHtml = `
    <p style="font-size: 18px; color: #818cf8; font-weight: bold; margin-top: 0;">Milestone Unlocked! 🎉</p>
    <p>Congratulations <strong>${name}</strong>! Your consistency and problem-solving skills have unlocked an official CodeArena platform milestone certificate.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #818cf8; text-align: center;">
      <h3 style="color: #ffffff; margin-top: 0; font-size: 22px;">🏅 ${certTitle}</h3>
      <p style="margin: 4px 0; color: #cbd5e1;">Successfully solved ${milestoneCount} accepted coding challenges on CodeArena.</p>
      ${verificationCode ? `<p style="margin-top: 12px; color: #94a3b8; font-size: 13px;">Verification Code: <strong style="color: #818cf8;">${verificationCode}</strong></p>` : ''}
    </div>

    <p>Keep up the amazing work! Share your certificate on LinkedIn or GitHub.</p>
    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Team</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'MILESTONE_CERTIFICATE',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'New Achievement Certificate Unlocked', bodyHtml, actionBtn: { text: 'View Milestone Certificate', url: targetUrl }, categoryTag: 'CodeArena Achievements' }),
    eventKey: `milestone_${userId}_${milestoneCount}`
  });
}

async function sendCertificateIssuanceEmail({ userId, recipientEmail, userName, title, certificateType, verificationCode, issueDate, certificateUrl }) {
  const name = userName || 'Developer';
  const certTitle = title || 'CodeArena Official Certificate';
  const targetUrl = certificateUrl || `${process.env.APP_URL || 'http://localhost:5173'}/certificates`;
  const subject = `📜 Certificate Issued: ${certTitle}`;

  const textContent = `Hello ${name},
An official certificate "${certTitle}" has been issued to you on CodeArena.
Verification Code: ${verificationCode || 'N/A'}
View Certificate: ${targetUrl}`;

  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>An official verified certificate has been issued to your CodeArena profile.</p>

    <div style="background-color: #0f172a; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #6366f1;">
      <p style="margin: 4px 0;"><strong>Certificate Title:</strong> ${certTitle}</p>
      <p style="margin: 4px 0;"><strong>Category:</strong> ${certificateType || 'Verified Skill Certificate'}</p>
      <p style="margin: 4px 0;"><strong>Issued Date:</strong> ${issueDate || new Date().toLocaleDateString()}</p>
      ${verificationCode ? `<p style="margin: 4px 0;"><strong>Verification Code:</strong> <code style="color: #818cf8;">${verificationCode}</code></p>` : ''}
    </div>

    <p style="margin-top: 24px;">Regards,<br><strong>CodeArena Certificate Authority</strong></p>
  `;

  return sendMail({
    userId,
    emailType: 'CERTIFICATE_ISSUANCE',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Certificate Issued', bodyHtml, actionBtn: { text: 'View Verified Certificate', url: targetUrl }, categoryTag: 'CodeArena Certificates' })
  });
}

// -------------------------------------------------------------
// 7. RESEND WEBHOOK HANDLER
// -------------------------------------------------------------

async function handleResendWebhook(eventPayload) {
  if (!eventPayload || !eventPayload.type || !eventPayload.data) {
    return { success: false, error: 'Invalid webhook payload structure' };
  }
  await ensureTablesExist();

  const type = eventPayload.type; // e.g. 'email.delivered', 'email.bounced', 'email.complained'
  const messageId = eventPayload.data.email_id || eventPayload.data.id;

  if (!messageId) {
    return { success: false, error: 'No provider message ID in webhook payload' };
  }

  let newStatus = 'SENT';
  if (type === 'email.delivered') newStatus = 'DELIVERED';
  else if (type === 'email.bounced') newStatus = 'BOUNCED';
  else if (type === 'email.failed') newStatus = 'FAILED';

  try {
    const [res] = await db.query(
      `UPDATE email_logs SET status = ?, updated_at = NOW() WHERE provider_message_id = ?`,
      [newStatus, messageId]
    );
    console.log(`[EmailService Webhook] Updated message ID ${messageId} to status '${newStatus}'. Rows updated: ${res.affectedRows}`);
    return { success: true, affectedRows: res.affectedRows };
  } catch (err) {
    console.error(`[EmailService Webhook] DB error updating status for message ID ${messageId}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendMail,
  testEmailService,
  cleanupExpiredOtps,
  wrapHtmlEmail,
  isEmailAllowedForUser,
  handleResendWebhook,

  // Auth
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,

  // Organization
  sendOrganizationVerificationSubmittedEmail,
  sendOrganizationUnderReviewEmail,
  sendOrganizationApprovedEmail,
  sendOrganizationRejectedEmail,
  sendOrganizationResubmissionRequiredEmail,
  sendOrganizationResubmittedEmail,
  sendOrganizationSuspendedEmail,

  // Assessment
  sendAssessmentInvitationEmail,
  sendAssessmentEnrollmentEmail,
  sendAssessmentResultEmail,

  // Course
  sendCourseEnrollmentEmail,
  sendCourseCompletionEmail,

  // Contest
  sendContestRegistrationEmail,
  sendContestReminderEmail,
  sendContestResultEmail,

  // Certificate & Milestone
  sendMilestoneAchievementEmail,
  sendCertificateIssuanceEmail,

  // OTP Verification
  sendUserEmailVerificationOtpEmail,
  sendOrgEmailVerificationOtpEmail,
  sendUserEmailVerifiedEmail,
  sendOrgEmailVerifiedEmail
};

// -------------------------------------------------------------
// 8. OTP EMAIL VERIFICATION TEMPLATES
// -------------------------------------------------------------

async function sendUserEmailVerificationOtpEmail({ userId, recipientEmail, userName, otp, expiryMinutes = 10 }) {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const subject = `Your CodeArena Verification Code: ${otp}`;
  
  const textContent = `Hello ${userName || 'Developer'},\n\nYour 6-digit CodeArena verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes. If you did not request this verification, please ignore this email.`;

  const bodyHtml = `
    <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">Verify Your Email Address</h2>
    <p>Hi <strong>${userName || 'Developer'}</strong>,</p>
    <p>Welcome to CodeArena! Use the 6-digit verification code below to confirm your account email address:</p>

    <div style="margin: 28px 0; text-align: center;">
      <div style="display: inline-block; padding: 16px 36px; background: #0f172a; border: 2px solid #6366f1; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818cf8; shadow: 0 10px 25px rgba(99, 102, 241, 0.25);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">If you did not initiate this request on CodeArena, no action is required.</p>
  `;

  return sendMail({
    userId,
    emailType: 'USER_EMAIL_VERIFICATION_OTP',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Email Verification OTP', bodyHtml, categoryTag: 'Security Verification' })
  });
}

async function sendOrgEmailVerificationOtpEmail({ orgProfileId, recipientEmail, orgName, otp, expiryMinutes = 10 }) {
  const subject = `CodeArena Organization Verification Code: ${otp}`;
  
  const textContent = `Hello ${orgName || 'Organization'},\n\nYour 6-digit Organization verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.`;

  const bodyHtml = `
    <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0;">Verify Organization Email</h2>
    <p>Hello <strong>${orgName || 'Organization Team'}</strong>,</p>
    <p>Please enter the following 6-digit OTP code to verify your official organization email on CodeArena:</p>

    <div style="margin: 28px 0; text-align: center;">
      <div style="display: inline-block; padding: 16px 36px; background: #0f172a; border: 2px solid #10b981; border-radius: 12px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #34d399; shadow: 0 10px 25px rgba(16, 185, 129, 0.25);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Code expires in <strong>${expiryMinutes} minutes</strong>.</p>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">Note: Verifying your email address is the first step toward organization approval on CodeArena.</p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_EMAIL_VERIFICATION_OTP',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Organization Email Verification', bodyHtml, categoryTag: 'Organization Verification' })
  });
}

async function sendUserEmailVerifiedEmail({ userId, recipientEmail, userName }) {
  const subject = `Your CodeArena Email has been Verified!`;
  const textContent = `Hi ${userName},\n\nYour email address (${recipientEmail}) has been successfully verified! You now have full access to CodeArena assessments and features.`;

  const bodyHtml = `
    <h2 style="font-size: 20px; font-weight: 700; color: #10b981; margin: 0 0 12px 0;">Email Successfully Verified!</h2>
    <p>Hi <strong>${userName}</strong>,</p>
    <p>Your email address <strong>${recipientEmail}</strong> has been successfully verified on CodeArena!</p>
    <p>You can now participate in coding contests, complete protected assessments, earn verified certificates, and track your developer progress.</p>
  `;

  return sendMail({
    userId,
    emailType: 'USER_EMAIL_VERIFIED_CONFIRMATION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Email Verified', bodyHtml, categoryTag: 'Account Verified' })
  });
}

async function sendOrgEmailVerifiedEmail({ orgProfileId, recipientEmail, orgName }) {
  const subject = `CodeArena Organization Email Verified`;
  const textContent = `Hello ${orgName},\n\nYour organization email (${recipientEmail}) has been verified. Our admin team will review your business compliance documents shortly.`;

  const bodyHtml = `
    <h2 style="font-size: 20px; font-weight: 700; color: #34d399; margin: 0 0 12px 0;">Organization Email Verified</h2>
    <p>Hello <strong>${orgName}</strong>,</p>
    <p>Your official organization email <strong>${recipientEmail}</strong> has been confirmed.</p>
    <p>Our verification team will review your uploaded business registration documents and notify you upon complete verification approval.</p>
  `;

  return sendMail({
    orgProfileId,
    emailType: 'ORG_EMAIL_VERIFIED_CONFIRMATION',
    recipientEmail,
    subject,
    textContent,
    htmlContent: wrapHtmlEmail({ title: 'Org Email Verified', bodyHtml, categoryTag: 'Organization Verification' })
  });
}

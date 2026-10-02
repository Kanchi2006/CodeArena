/**
 * Assessment Timer & Lifecycle Service for CodeArena
 * Server-authoritative timer calculation, attempt status verification, and auto-expiry handling.
 */

const db = require('../db');
const scoringService = require('./assessmentScoringService');

/**
 * Validate active attempt timer and compute remaining time
 */
async function getAttemptTimeState(attemptId) {
  const [attempts] = await db.query(
    `SELECT a.*, asm.duration_minutes, asm.title as assessment_title
     FROM assessment_attempts a
     JOIN assessments asm ON a.assessment_id = asm.id
     WHERE a.attempt_id = ?`,
    [attemptId]
  );

  if (attempts.length === 0) {
    return { error: 'Attempt not found' };
  }

  const attempt = attempts[0];
  const now = new Date();
  const deadline = new Date(attempt.deadline_time);

  const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
  const isExpired = remainingSeconds <= 0;

  // Auto-finalize if time expired and status is still IN_PROGRESS
  if (isExpired && attempt.status === 'IN_PROGRESS') {
    await db.query(
      `UPDATE assessment_attempts SET status = 'EXPIRED', end_time = NOW() WHERE attempt_id = ?`,
      [attemptId]
    );
    await scoringService.calculateAttemptResults(attemptId);
    attempt.status = 'EXPIRED';
  }

  // Update last activity timestamp
  await db.query(
    `UPDATE assessment_attempts SET last_activity_at = NOW() WHERE attempt_id = ?`,
    [attemptId]
  );

  return {
    attemptId: attempt.attempt_id,
    assessmentId: attempt.assessment_id,
    assessmentTitle: attempt.assessment_title,
    userId: attempt.user_id,
    status: attempt.status,
    startTime: attempt.start_time,
    deadlineTime: attempt.deadline_time,
    serverTime: now.toISOString(),
    remainingSeconds,
    isExpired,
    durationMinutes: attempt.duration_minutes
  };
}

/**
 * Check if user is eligible to start or resume an assessment attempt
 */
async function verifyUserEligibility(userId, assessmentId) {
  // 1. Check assessment availability
  const [assessments] = await db.query(
    `SELECT * FROM assessments WHERE id = ?`,
    [assessmentId]
  );

  if (assessments.length === 0) {
    return { eligible: false, reason: 'Assessment not found' };
  }

  const assessment = assessments[0];

  if (assessment.status !== 'PUBLISHED' && assessment.status !== 'AVAILABLE') {
    return { eligible: false, reason: 'Assessment is not currently published' };
  }

  const now = new Date();
  if (assessment.start_time && new Date(assessment.start_time) > now) {
    return { eligible: false, reason: `Assessment starts at ${new Date(assessment.start_time).toLocaleString()}` };
  }

  if (assessment.end_time && new Date(assessment.end_time) < now) {
    return { eligible: false, reason: 'Assessment availability period has expired' };
  }

  // 2. Check existing active attempt
  const [activeAttempts] = await db.query(
    `SELECT * FROM assessment_attempts WHERE user_id = ? AND assessment_id = ? AND status = 'IN_PROGRESS'`,
    [userId, assessmentId]
  );

  if (activeAttempts.length > 0) {
    const timeState = await getAttemptTimeState(activeAttempts[0].attempt_id);
    if (!timeState.isExpired) {
      return { eligible: true, resumeAttempt: activeAttempts[0], message: 'Resuming active attempt' };
    }
  }

  // 3. Check attempt limit
  const attemptLimit = Number(assessment.attempt_limit) || 1;
  if (attemptLimit > 0) {
    const [completedAttempts] = await db.query(
      `SELECT COUNT(*) as count FROM assessment_attempts WHERE user_id = ? AND assessment_id = ?`,
      [userId, assessmentId]
    );

    const attemptsUsed = completedAttempts[0].count;
    if (attemptsUsed >= attemptLimit) {
      return { eligible: false, reason: `Attempt limit reached (${attemptsUsed}/${attemptLimit} attempts used)` };
    }
  }

  return { eligible: true, assessment };
}

module.exports = {
  getAttemptTimeState,
  verifyUserEligibility
};

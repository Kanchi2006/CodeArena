/**
 * Assessment Scoring Service for CodeArena
 * Handles automated evaluation of MCQ, Multiple Select, Output Prediction, and Coding questions.
 * Supports positive marks, negative marking, partial scoring, percentage calculation, and re-evaluation.
 */

const db = require('../db');

/**
 * Evaluate an individual question response
 */
function evaluateResponse(question, responseData, codingSubmission = null) {
  let isCorrect = false;
  let scoreEarned = 0.0;
  const maxMarks = Number(question.marks) || 0;
  const negativeMarks = Number(question.negative_marks) || 0;
  const qType = question.question_type;

  // Parse correct answers from question
  let correctAnswers = [];
  try {
    correctAnswers = typeof question.correct_answers === 'string' 
      ? JSON.parse(question.correct_answers) 
      : (question.correct_answers || []);
  } catch (e) {
    correctAnswers = [];
  }

  // Parse options if present
  let options = [];
  try {
    options = typeof question.options === 'string' ? JSON.parse(question.options) : (question.options || []);
  } catch (e) {}

  // If no correct_answers array in question, derive from options array where is_correct === true
  if (correctAnswers.length === 0 && options.length > 0) {
    correctAnswers = options.filter(o => o.is_correct).map(o => o.id || o.text);
  }

  const userSelected = responseData && responseData.selected_options ? responseData.selected_options : [];
  const textAnswer = responseData && responseData.text_answer ? String(responseData.text_answer).trim().toLowerCase() : '';

  if (qType === 'mcq' || qType === 'output_based') {
    if (userSelected.length > 0 || textAnswer) {
      const selected = userSelected[0] || textAnswer;
      const isMatch = correctAnswers.some(ans => String(ans).trim().toLowerCase() === String(selected).trim().toLowerCase());
      if (isMatch) {
        isCorrect = true;
        scoreEarned = maxMarks;
      } else {
        isCorrect = false;
        scoreEarned = -Math.abs(negativeMarks);
      }
    } else {
      // Unanswered
      isCorrect = false;
      scoreEarned = 0.0;
    }
  } else if (qType === 'multiple_select') {
    if (userSelected.length > 0) {
      const correctSet = new Set(correctAnswers.map(a => String(a).trim().toLowerCase()));
      const userSet = new Set(userSelected.map(a => String(a).trim().toLowerCase()));
      
      let matchedCount = 0;
      let incorrectCount = 0;

      for (const sel of userSet) {
        if (correctSet.has(sel)) {
          matchedCount++;
        } else {
          incorrectCount++;
        }
      }

      if (incorrectCount === 0 && matchedCount === correctSet.size) {
        // Fully correct
        isCorrect = true;
        scoreEarned = maxMarks;
      } else if (incorrectCount === 0 && matchedCount > 0) {
        // Partial credit (if enabled)
        isCorrect = false;
        const ratio = matchedCount / Math.max(1, correctSet.size);
        scoreEarned = Number((maxMarks * ratio).toFixed(2));
      } else {
        // Wrong selection included
        isCorrect = false;
        scoreEarned = -Math.abs(negativeMarks);
      }
    } else {
      // Unanswered
      isCorrect = false;
      scoreEarned = 0.0;
    }
  } else if (qType === 'coding') {
    if (codingSubmission) {
      const totalCases = codingSubmission.total_test_cases || 1;
      const passedCases = codingSubmission.test_cases_passed || 0;

      if (codingSubmission.status === 'Accepted' || passedCases === totalCases) {
        isCorrect = true;
        scoreEarned = maxMarks;
      } else if (passedCases > 0) {
        isCorrect = false;
        const ratio = passedCases / totalCases;
        scoreEarned = Number((maxMarks * ratio).toFixed(2));
      } else {
        isCorrect = false;
        scoreEarned = -Math.abs(negativeMarks);
      }
    } else {
      isCorrect = false;
      scoreEarned = 0.0;
    }
  }

  return {
    isCorrect,
    scoreEarned: Number(scoreEarned.toFixed(2))
  };
}

/**
 * Recalculate total attempt scores and pass/fail status
 */
async function calculateAttemptResults(attemptId) {
  // 1. Fetch attempt and assessment details
  const [attempts] = await db.query(
    `SELECT a.*, asm.passing_score_percentage, asm.passing_score_absolute, asm.certificate_enabled, asm.certificate_title
     FROM assessment_attempts a
     JOIN assessments asm ON a.assessment_id = asm.id
     WHERE a.attempt_id = ?`,
    [attemptId]
  );

  if (attempts.length === 0) return null;
  const attempt = attempts[0];

  // 2. Fetch all questions for this assessment
  const [questions] = await db.query(
    `SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY order_index ASC`,
    [attempt.assessment_id]
  );

  // 3. Fetch all saved responses for this attempt
  const [responses] = await db.query(
    `SELECT * FROM assessment_responses WHERE attempt_id = ?`,
    [attemptId]
  );

  // 4. Fetch coding submissions for this attempt
  const [codingSubmissions] = await db.query(
    `SELECT * FROM assessment_coding_submissions WHERE attempt_id = ? ORDER BY id DESC`,
    [attemptId]
  );

  const responseMap = {};
  responses.forEach(r => {
    let parsedData = null;
    try {
      parsedData = typeof r.response_data === 'string' ? JSON.parse(r.response_data) : r.response_data;
    } catch (e) {}
    responseMap[r.question_id] = { ...r, parsedData };
  });

  const codingMap = {};
  codingSubmissions.forEach(c => {
    if (!codingMap[c.question_id]) {
      codingMap[c.question_id] = c;
    }
  });

  let totalPossibleMarks = 0.0;
  let totalEarnedMarks = 0.0;

  for (const q of questions) {
    const qMarks = Number(q.marks) || 0;
    totalPossibleMarks += qMarks;

    const resp = responseMap[q.id];
    const codingSub = codingMap[q.id];

    if (resp && resp.is_answered) {
      const evalRes = evaluateResponse(q, resp.parsedData, codingSub);
      totalEarnedMarks += evalRes.scoreEarned;

      // Update response record in DB
      await db.query(
        `UPDATE assessment_responses 
         SET score_earned = ?, is_correct = ?, evaluation_status = 'AUTO_EVALUATED', evaluated_at = NOW() 
         WHERE attempt_id = ? AND question_id = ?`,
        [evalRes.scoreEarned, evalRes.isCorrect ? 1 : 0, attemptId, q.id]
      );
    } else {
      // Unanswered question
      await db.query(
        `UPDATE assessment_responses 
         SET score_earned = 0.00, is_correct = 0, evaluation_status = 'AUTO_EVALUATED', evaluated_at = NOW() 
         WHERE attempt_id = ? AND question_id = ?`,
        [attemptId, q.id]
      );
    }
  }

  // Ensure total earned marks doesn't fall below 0
  totalEarnedMarks = Math.max(0, Number(totalEarnedMarks.toFixed(2)));
  totalPossibleMarks = Math.max(1, Number(totalPossibleMarks.toFixed(2)));

  const percentage = Number(((totalEarnedMarks / totalPossibleMarks) * 100).toFixed(2));
  
  const passingPercentageThreshold = Number(attempt.passing_score_percentage) || 60.00;
  const isPassed = percentage >= passingPercentageThreshold;

  // Update attempt status
  await db.query(
    `UPDATE assessment_attempts 
     SET total_earned_marks = ?, total_possible_marks = ?, percentage = ?, is_passed = ?, status = 'COMPLETED', submission_time = NOW()
     WHERE attempt_id = ?`,
    [totalEarnedMarks, totalPossibleMarks, percentage, isPassed ? 1 : 0, attemptId]
  );

  // Check and issue assessment certificate if eligible
  if (isPassed && attempt.certificate_enabled) {
    try {
      const [existingCert] = await db.query(
        `SELECT id FROM assessment_certificates WHERE attempt_id = ?`,
        [attemptId]
      );

      if (existingCert.length === 0) {
        const verificationCode = `CA-CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const certTitle = attempt.certificate_title || `Certificate of Achievement - ${attempt.assessment_id}`;

        await db.query(
          `INSERT INTO assessment_certificates (attempt_id, user_id, assessment_id, verification_code, certificate_title)
           VALUES (?, ?, ?, ?, ?)`,
          [attemptId, attempt.user_id, attempt.assessment_id, verificationCode, certTitle]
        );
      }
    } catch (certErr) {
      console.error('Error generating assessment certificate:', certErr.message);
    }
  }

  return {
    attemptId,
    totalEarnedMarks,
    totalPossibleMarks,
    percentage,
    isPassed
  };
}

/**
 * Re-evaluate all completed attempts for a given assessment
 */
async function reevaluateAssessment(assessmentId, evaluatorId = null, reason = 'Administrative Re-evaluation') {
  const [attempts] = await db.query(
    `SELECT attempt_id FROM assessment_attempts WHERE assessment_id = ? AND status IN ('COMPLETED', 'SUBMITTED', 'EXPIRED')`,
    [assessmentId]
  );

  const reevaluatedResults = [];

  for (const a of attempts) {
    const res = await calculateAttemptResults(a.attempt_id);
    if (res) {
      reevaluatedResults.push(res);
    }
  }

  // Record audit log
  await db.query(
    `INSERT INTO assessment_audit_logs (actor_id, action, assessment_id, details)
     VALUES (?, 'RE_EVALUATE_ASSESSMENT', ?, ?)`,
    [evaluatorId, assessmentId, JSON.stringify({ count: reevaluatedResults.length, reason })]
  );

  return reevaluatedResults;
}

module.exports = {
  evaluateResponse,
  calculateAttemptResults,
  reevaluateAssessment
};

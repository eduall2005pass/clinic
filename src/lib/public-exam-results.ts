import { parseJsonColumn, query } from "@/lib/mysql";

/**
 * Admin → Result Control → Public Exam Result.
 * Read-only views over the data the existing exam system already stores:
 *   exam_results (score = FINAL marks incl. negative marking + second-timer
 *   penalty; merit_position uses the existing ranking: higher final marks
 *   first, less time taken wins ties), exam_attempts (start time / session
 *   status) and exam_questions + the stored answers snapshot for the answer
 *   sheet. Nothing here recomputes or re-ranks — stored results are truth.
 */

export type PublicExamResultSummary = {
  examId: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  participants: number;
  totalMarks: number;
  durationMinutes: number;
  /** Admin-scheduled start time (may be null). */
  scheduledAt: string | null;
  /** When the exam was actually last conducted (latest submission). */
  lastSubmittedAt: string | null;
  highestMark: number | null;
  lowestMark: number | null;
  averageMark: number | null;
};

export type PublicExamResultRow = {
  resultId: number;
  rank: number | null;
  studentUid: string;
  studentName: string;
  studentId: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  institution: string | null;
  obtained: number;
  totalMarks: number;
  rawMarks: number | null;
  negativeDeduction: number;
  timerPenalty: number;
  isSecondTimer: boolean;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeTakenSeconds: number | null;
  startedAt: string | null;
  submittedAt: string;
  /** Derived from is_second_timer + store; auto flag optional for older rows. */
  submissionType: "manual" | "auto";
};

export type AnswerSheetQuestion = {
  questionId: number;
  order: number;
  question: string;
  options: string[];
  studentAnswer: number | null;
  correctAnswer: number;
  status: "correct" | "wrong" | "unanswered";
  marks: number;
  obtained: number;
  explanation: string | null;
};

export type PublicExamStudentResult = {
  examId: string;
  examTitle: string;
  categoryName: string | null;
  rank: number | null;
  participantCount: number;
  studentUid: string;
  studentName: string;
  studentId: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  institution: string | null;
  hscBatch: string | null;
  contactNumber: string | null;
  totalMarks: number;
  rawMarks: number;
  negativeDeduction: number;
  negativePerWrong: number;
  negativeEnabled: boolean;
  secondTimerEnabled: boolean;
  timerPenalty: number;
  isSecondTimer: boolean;
  finalMarks: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeTakenSeconds: number | null;
  startedAt: string | null;
  submittedAt: string;
  attemptStatus: string | null;
  questions: AnswerSheetQuestion[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type SummaryRow = {
  exam_id: string;
  title: string;
  category_id: string | null;
  category_name: string | null;
  total_marks: string | number;
  duration_minutes: number;
  scheduled_at: Date | string | null;
  last_submitted: Date | string | null;
  participants: string | number;
  highest: string | number | null;
  lowest: string | number | null;
  average: string | number | null;
};

/** All public exams that have at least one submitted result. */
export async function fetchPublicExamResultSummaries(): Promise<
  PublicExamResultSummary[]
> {
  try {
    const rows = await query<SummaryRow[]>(
      `SELECT e.id AS exam_id, e.title,
              e.category_id, cat.name AS category_name,
              e.total_marks, e.duration_minutes, e.scheduled_at,
              MAX(r.submitted_at) AS last_submitted,
              COUNT(r.id) AS participants,
              MAX(r.score) AS highest, MIN(r.score) AS lowest,
              AVG(r.score) AS average
         FROM exam_results r
         JOIN exams e ON e.id = r.exam_id AND e.kind = 'public'
         LEFT JOIN course_categories cat ON cat.id = e.category_id
        GROUP BY e.id, e.title, e.category_id, cat.name,
                 e.total_marks, e.duration_minutes, e.scheduled_at
        ORDER BY MAX(r.submitted_at) DESC`,
    );
    return rows.map((row) => ({
      examId: row.exam_id,
      title: row.title,
      categoryId: row.category_id ?? null,
      categoryName: row.category_name ?? null,
      participants: toNumber(row.participants),
      totalMarks: toNumber(row.total_marks),
      durationMinutes: toNumber(row.duration_minutes),
      scheduledAt: toIso(row.scheduled_at),
      lastSubmittedAt: toIso(row.last_submitted),
      highestMark:
        row.highest === null || row.highest === undefined
          ? null
          : toNumber(row.highest),
      lowestMark:
        row.lowest === null || row.lowest === undefined
          ? null
          : toNumber(row.lowest),
      averageMark:
        row.average === null || row.average === undefined
          ? null
          : Math.round(toNumber(row.average) * 100) / 100,
    }));
  } catch {
    return [];
  }
}

type ExamMetaRow = {
  id: string;
  title: string;
  category_name: string | null;
  total_marks: string | number;
  duration_minutes: number;
  scheduled_at: Date | string | null;
  course_type: string;
  rule_template: string | null;
  negative_enabled: number | boolean | undefined;
  negative_per_wrong: string | number | undefined;
  second_timer_enabled: number | boolean | undefined;
  second_timer_deduction: string | number | undefined;
};

async function fetchPublicExamMeta(examId: string) {
  const rows = await query<ExamMetaRow[]>(
    `SELECT e.id, e.title, cat.name AS category_name,
            e.total_marks, e.duration_minutes, e.scheduled_at,
            e.course_type, e.rule_template, e.negative_enabled, e.negative_per_wrong,
            e.second_timer_enabled, e.second_timer_deduction
       FROM exams e
       LEFT JOIN course_categories cat ON cat.id = e.category_id
      WHERE e.id = ? AND e.kind = 'public' LIMIT 1`,
    [examId],
  );
  return rows[0] ?? null;
}

export type PublicExamResultHeader = {
  examId: string;
  title: string;
  categoryName: string | null;
  totalMarks: number;
  durationMinutes: number;
  scheduledAt: string | null;
};

/** Header info for ONE public exam's result details page. */
export async function fetchPublicExamResultHeader(
  examId: string,
): Promise<PublicExamResultHeader | null> {
  try {
    const meta = await fetchPublicExamMeta(examId);
    if (!meta) return null;
    return {
      examId: meta.id,
      title: meta.title,
      categoryName: meta.category_name ?? null,
      totalMarks: toNumber(meta.total_marks),
      durationMinutes: toNumber(meta.duration_minutes),
      scheduledAt: toIso(meta.scheduled_at),
    };
  } catch {
    return null;
  }
}

type ResultDetailRow = {
  id: number;
  merit_position: number | null;
  student_uid: string;
  student_name: string;
  score: string | number;
  total_marks: string | number;
  answers: string | null;
  negative_deduction: string | number | null;
  timer_penalty: string | number | null;
  is_second_timer: number | null;
  time_taken_seconds: number | null;
  submitted_at: Date | string;
};

/**
 * Ranked participant list for ONE exam. Stored merit_position first
 * (existing ranking rules); rows without a stored position fall back to
 * the same ordering (final marks desc → less time → earlier submission).
 * Now also computes correct/wrong/unanswered per student from the stored
 * answers snapshot so the admin table can show them without opening detail.
 */
export async function fetchPublicExamRankedResults(
  examId: string,
): Promise<PublicExamResultRow[]> {
  try {
    const meta = await fetchPublicExamMeta(examId);
    if (!meta) return [];
    // Try to include auto_submitted when the column exists (best-effort).
    let rows: (ResultDetailRow & { auto_submitted?: number | null })[] = [];
    try {
      rows = await query<(ResultDetailRow & { auto_submitted?: number | null })[]>(
        `SELECT r.id, r.merit_position, r.student_uid, r.student_name,
                r.score, r.total_marks, r.answers,
                r.negative_deduction, r.timer_penalty, r.is_second_timer,
                r.time_taken_seconds, r.submitted_at, r.auto_submitted
           FROM exam_results r
          WHERE r.exam_id = ?
          ORDER BY r.merit_position IS NULL ASC,
                   r.merit_position ASC,
                   r.score DESC,
                   COALESCE(r.time_taken_seconds, 2147483647) ASC,
                   r.submitted_at ASC
          LIMIT 1000`,
        [examId],
      );
    } catch {
      rows = await query<ResultDetailRow[]>(
        `SELECT r.id, r.merit_position, r.student_uid, r.student_name,
                r.score, r.total_marks, r.answers,
                r.negative_deduction, r.timer_penalty, r.is_second_timer,
                r.time_taken_seconds, r.submitted_at
           FROM exam_results r
          WHERE r.exam_id = ?
          ORDER BY r.merit_position IS NULL ASC,
                   r.merit_position ASC,
                   r.score DESC,
                   COALESCE(r.time_taken_seconds, 2147483647) ASC,
                   r.submitted_at ASC
          LIMIT 1000`,
        [examId],
      );
    }

    // Load active questions once for counting; also for negativePerWrong.
    let questionMeta: Map<number, number> = new Map();
    try {
      const qRows = await query<{ id: number; correct_index: number }[]>(
        `SELECT id, correct_index FROM exam_questions WHERE exam_id = ? AND is_active = 1`,
        [examId],
      );
      for (const q of qRows) questionMeta.set(Number(q.id), Number(q.correct_index) || 0);
    } catch {
      // No questions → counts stay 0
    }

    // Student IDs + profile info from the registration system (optional).
    const uids = rows.map((row) => row.student_uid);
    const profileMap = new Map<string, {
      student_id: string | null;
      email: string | null;
      profile_picture_url: string | null;
      institution: string | null;
    }>();
    if (uids.length > 0) {
      try {
        const placeholders = uids.map(() => "?").join(",");
        const profileRows = await query<
          {
            uid: string;
            student_id: string | null;
            email: string | null;
            profile_picture_url: string | null;
            institution: string | null;
          }[]
        >(
          `SELECT uid, student_id, email, profile_picture_url, institution
              FROM students WHERE uid IN (${placeholders})`,
          uids,
        );
        for (const row of profileRows) {
          profileMap.set(row.uid, row);
        }
      } catch {
        // Profile enrichment is optional — keep result-only rows.
      }
    }

    return rows.map((row) => {
      const profile = profileMap.get(row.student_uid);
      // Derive correct/wrong/unanswered from answers snapshot.
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      let rawMarks: number | null = null;
      try {
        const ans = parseJsonColumn<Record<string, number>>(row.answers) ?? {};
        if (questionMeta.size > 0) {
          for (const [qid, correctIdx] of questionMeta.entries()) {
            const chosen = ans[String(qid)];
            if (typeof chosen !== "number") unanswered += 1;
            else if (chosen === correctIdx) correct += 1;
            else wrong += 1;
          }
          // rawMarks is not stored per-row efficiently; leave null and let detail compute.
        } else {
          // Fallback: count from whatever answers exist
          const keys = Object.keys(ans);
          // Can't determine unanswered without question count, leave -1 fallback? Use 0.
        }
      } catch {
        // Leave zeros
      }
      // If no questionMeta (e.g., exam deleted), keep counts as raw snapshot size.
      const hasCounts = questionMeta.size > 0;
      return {
        resultId: row.id,
        rank: row.merit_position ?? null,
        studentUid: row.student_uid,
        studentName: row.student_name,
        studentId: profile?.student_id ?? null,
        email: profile?.email ?? null,
        profilePictureUrl: profile?.profile_picture_url ?? null,
        institution: profile?.institution ?? null,
        obtained: Math.round(toNumber(row.score) * 100) / 100,
        totalMarks: toNumber(row.total_marks),
        rawMarks,
        negativeDeduction: toNumber(row.negative_deduction),
        timerPenalty: toNumber(row.timer_penalty),
        isSecondTimer: (row.is_second_timer ?? 0) === 1,
        correctCount: hasCounts ? correct : -1,
        wrongCount: hasCounts ? wrong : -1,
        unansweredCount: hasCounts ? unanswered : -1,
        timeTakenSeconds: row.time_taken_seconds ?? null,
        startedAt: null,
        submittedAt: toIso(row.submitted_at) ?? "",
        submissionType: (row as { auto_submitted?: number | null }).auto_submitted === 1 ? "auto" : "manual",
      };
    });
  } catch {
    return [];
  }
}

/**
 * One student's complete result inside ONE exam (exam-specific isolation):
 * marks breakdown, attempt info and the full question-by-question answer
 * sheet built from the stored submission + admin's answer key.
 */
export async function fetchPublicExamStudentResult(
  examId: string,
  studentUid: string,
): Promise<PublicExamStudentResult | null> {
  try {
    const meta = await fetchPublicExamMeta(examId);
    if (!meta) return null;

    const resultRows = await query<ResultDetailRow[]>(
      `SELECT id, merit_position, student_uid, student_name,
              score, total_marks, answers,
              negative_deduction, timer_penalty, is_second_timer,
              time_taken_seconds, submitted_at
         FROM exam_results
        WHERE exam_id = ? AND student_uid = ?
        ORDER BY id DESC LIMIT 1`,
      [examId, studentUid],
    );
    const result = resultRows[0];
    if (!result) return null;

    // Question order = insertion order of the exam's active questions.
    const questionRows = await query<
      { id: number; question: string; options: string; correct_index: number; marks: string | number; explanation: string | null }[]
    >(
      `SELECT id, question, options, correct_index, marks, explanation
          FROM exam_questions
         WHERE exam_id = ? AND is_active = 1
         ORDER BY id ASC`,
      [examId],
    );

    // Attempt info (started_at / status) — optional, never fabricated.
    let attemptStatus: string | null = null;
    let startedAt: string | null = null;
    try {
      const attemptRows = await query<
        { status: string; started_at: Date | string }[]
      >(
        `SELECT status, started_at FROM exam_attempts
          WHERE exam_id = ? AND student_uid = ? LIMIT 1`,
        [examId, studentUid],
      );
      attemptStatus = attemptRows[0]?.status ?? null;
      startedAt = toIso(attemptRows[0]?.started_at ?? null);
    } catch {
      // Attempts table may be missing on very old data — leave nulls.
    }

    let profile: {
      student_id: string | null;
      email: string | null;
      profile_picture_url: string | null;
      institution: string | null;
      hsc_batch: string | null;
      contact_number: string | null;
    } | null = null;
    try {
      const profileRows = await query<
        {
          student_id: string | null;
          email: string | null;
          profile_picture_url: string | null;
          institution: string | null;
          hsc_batch: string | null;
          contact_number: string | null;
        }[]
      >(
        `SELECT student_id, email, profile_picture_url, institution,
                hsc_batch, contact_number
           FROM students WHERE uid = ? LIMIT 1`,
        [studentUid],
      );
      profile = profileRows[0] ?? null;
    } catch {
      // Optional.
    }

    const answers =
      parseJsonColumn<Record<string, number>>(result.answers) ??
      ({} as Record<string, number>);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let rawMarks = 0;
    // Rule template is source of truth when present; fallback to stored flags for legacy rows.
    let negativePerWrong = 0;
    if (meta.rule_template) {
      negativePerWrong = meta.rule_template === "medical" || meta.rule_template === "university" ? 0.25 : 0;
    } else if (meta.negative_enabled === undefined) {
      negativePerWrong = meta.course_type === "Admission" ? 0.25 : 0;
    } else {
      negativePerWrong = meta.negative_enabled ? Math.max(0, Number(meta.negative_per_wrong ?? 0.25) || 0) : 0;
    }

    const questions: AnswerSheetQuestion[] = questionRows.map((row, index) => {
      const options = parseJsonColumn<string[]>(row.options) ?? [];
      const chosen = answers[String(row.id)];
      const marks = toNumber(row.marks) || 1;
      const status: AnswerSheetQuestion["status"] =
        typeof chosen !== "number"
          ? "unanswered"
          : chosen === row.correct_index
            ? "correct"
            : "wrong";
      if (status === "correct") {
        correctCount += 1;
        rawMarks += marks;
      } else if (status === "wrong") wrongCount += 1;
      else unansweredCount += 1;
      return {
        questionId: row.id,
        order: index + 1,
        question: row.question,
        options,
        studentAnswer: typeof chosen === "number" ? chosen : null,
        correctAnswer: row.correct_index,
        status,
        marks,
        // Per Spec §17: do not display negative beside each question; wrong → 0 per-question, negative accounted globally.
        obtained: status === "correct" ? marks : 0,
        explanation: row.explanation ?? null,
      };
    });

    return {
      examId,
      examTitle: meta.title,
      categoryName: meta.category_name ?? null,
      rank: result.merit_position ?? null,
      participantCount: 0,
      studentUid,
      studentName: result.student_name,
      studentId: profile?.student_id ?? null,
      email: profile?.email ?? null,
      profilePictureUrl: profile?.profile_picture_url ?? null,
      institution: profile?.institution ?? null,
      hscBatch: profile?.hsc_batch ?? null,
      contactNumber: profile?.contact_number ?? null,
      totalMarks: toNumber(result.total_marks),
      rawMarks: Math.round(rawMarks * 100) / 100,
      negativeDeduction: toNumber(result.negative_deduction),
      negativePerWrong,
      negativeEnabled: negativePerWrong > 0,
      secondTimerEnabled: meta.rule_template ? meta.rule_template === "medical" : Boolean(meta.second_timer_enabled),
      timerPenalty: toNumber(result.timer_penalty),
      isSecondTimer: (result.is_second_timer ?? 0) === 1,
      finalMarks: Math.round(toNumber(result.score) * 100) / 100,
      correctCount,
      wrongCount,
      unansweredCount,
      timeTakenSeconds: result.time_taken_seconds ?? null,
      startedAt,
      submittedAt: toIso(result.submitted_at) ?? "",
      attemptStatus,
      questions,
    };
  } catch {
    return null;
  }
}

/** Participant count + summary stats for one exam (details page header). */
export async function fetchPublicExamResultStats(examId: string): Promise<{
  participants: number;
  completed: number;
  autoSubmitted: number;
  firstTimers: number;
  secondTimers: number;
  highestMark: number | null;
  lowestMark: number | null;
  averageMark: number | null;
  averageTimeSeconds: number | null;
} | null> {
  try {
    // Base stats that always exist
    const baseRows = await query<
      {
        participants: string | number;
        highest: string | number | null;
        lowest: string | number | null;
        average: string | number | null;
        avgTime: string | number | null;
      }[]
    >(
      `SELECT COUNT(*) AS participants,
              MAX(score) AS highest, MIN(score) AS lowest, AVG(score) AS average,
              AVG(time_taken_seconds) AS avgTime
         FROM exam_results WHERE exam_id = ?`,
      [examId],
    );
    const row = baseRows[0];
    if (!row || toNumber(row.participants) === 0) return null;

    // Timer type breakdown (always available via is_second_timer)
    let firstTimers = 0;
    let secondTimers = 0;
    try {
      const timerRows = await query<{ firstTimers: string | number; secondTimers: string | number }[]>(
        `SELECT SUM(CASE WHEN is_second_timer = 0 OR is_second_timer IS NULL THEN 1 ELSE 0 END) AS firstTimers,
                SUM(CASE WHEN is_second_timer = 1 THEN 1 ELSE 0 END) AS secondTimers
           FROM exam_results WHERE exam_id = ?`,
        [examId],
      );
      firstTimers = toNumber(timerRows[0]?.firstTimers ?? 0);
      secondTimers = toNumber(timerRows[0]?.secondTimers ?? 0);
    } catch {
      // keep 0
    }

    // Auto-submitted count — best-effort when column exists; otherwise 0.
    let autoSubmitted = 0;
    try {
      const autoRows = await query<{ n: string | number }[]>(
        `SELECT COUNT(*) AS n FROM exam_results WHERE exam_id = ? AND auto_submitted = 1`,
        [examId],
      );
      autoSubmitted = toNumber(autoRows[0]?.n ?? 0);
    } catch {
      autoSubmitted = 0;
    }

    return {
      participants: toNumber(row.participants),
      completed: toNumber(row.participants),
      autoSubmitted,
      firstTimers,
      secondTimers,
      highestMark:
        row.highest === null || row.highest === undefined
          ? null
          : toNumber(row.highest),
      lowestMark:
        row.lowest === null || row.lowest === undefined
          ? null
          : toNumber(row.lowest),
      averageMark:
        row.average === null || row.average === undefined
          ? null
          : Math.round(toNumber(row.average) * 100) / 100,
      averageTimeSeconds:
        row.avgTime === null || row.avgTime === undefined
          ? null
          : Math.round(toNumber(row.avgTime)),
    };
  } catch {
    return null;
  }
}

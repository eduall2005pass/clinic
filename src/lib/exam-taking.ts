import { exec, parseJsonColumn, query } from "@/lib/mysql";
import { fetchExams, type Exam } from "@/lib/exams-admin";

// Student-facing exam taking: load sanitized questions (no answers) and
// grade submissions server-side, persisting results in exam_results.

export type TakingExam = {
  id: string;
  title: string;
  subject: string;
  batchId: string;
  courseType: "Academic" | "Admission";
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
};

export type TakingQuestion = {
  id: number;
  question: string;
  options: string[];
  marks: number;
};

type GradingQuestionRow = {
  id: number;
  correct_index: number;
  marks: string | number;
};

function isLivePublished(exam: Exam): boolean {
  return exam.status === "published";
}

export async function getExamForTaking(
  examId: string,
): Promise<{ exam: TakingExam; questions: TakingQuestion[] } | null> {
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  if (!found || !isLivePublished(found)) return null;

  const optionRows = await query<
    { id: number; question: string; options: string; marks: string | number }[]
  >(
    `SELECT id, question, options, marks FROM exam_questions
     WHERE exam_id = ? AND is_active = 1 ORDER BY id ASC`,
    [examId],
  );

  const questions: TakingQuestion[] = [];
  for (const row of optionRows) {
    const parsed = parseJsonColumn<unknown[]>(row.options);
    if (Array.isArray(parsed)) {
      questions.push({
        id: row.id,
        question: row.question,
        options: parsed.map(String),
        marks: Number(row.marks) || 1,
      });
    }
  }

  return {
    exam: {
      id: found.id,
      title: found.title,
      subject: found.subject,
      batchId: found.batchId,
      courseType: found.courseType,
      durationMinutes: found.durationMinutes,
      totalMarks: questions.reduce((sum, item) => sum + item.marks, 0),
      negativeMarks: found.negativeMarks,
    },
    questions,
  };
}

export type SubmissionOutcome = {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
};

export async function submitExamAttempt(
  examId: string,
  uid: string,
  studentName: string,
  answers: Record<string, number>,
): Promise<SubmissionOutcome | null> {
  const exams = await fetchExams();
  const found = exams.find((exam) => exam.id === examId);
  if (!found || !isLivePublished(found)) return null;

  const rows = await query<GradingQuestionRow[]>(
    `SELECT id, correct_index, marks FROM exam_questions
     WHERE exam_id = ? AND is_active = 1`,
    [examId],
  );

  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const chosen = answers[String(row.id)];
    const marks = Number(row.marks) || 1;
    if (typeof chosen !== "number") {
      skippedCount += 1;
      continue;
    }
    if (chosen === row.correct_index) {
      score += marks;
      correctCount += 1;
    } else {
      score -= found.negativeMarks;
      wrongCount += 1;
    }
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const totalMarks =
    Math.round(rows.reduce((sum, row) => sum + (Number(row.marks) || 1), 0) * 100) / 100;

  await exec(
    `INSERT INTO exam_enrollments (exam_id, student_uid, student_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE student_name = VALUES(student_name)`,
    [examId, uid, studentName],
  );
  await exec(
    `INSERT INTO exam_results (exam_id, student_uid, student_name, score, total_marks, answers)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [examId, uid, studentName, score, totalMarks, JSON.stringify(answers)],
  );

  return { score, totalMarks, correctCount, wrongCount, skippedCount };
}

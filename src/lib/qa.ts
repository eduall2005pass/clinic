export type QaSubject = {
  id: string;
  name: string;
  order: number;
};

export type QaQuestionStatus = "answered" | "unanswered";

export type TeacherAnswer = {
  id: string;
  teacherName: string;
  content: string;
  answeredAt: string;
};

export type QaQuestion = {
  id: string;
  subjectId: string;
  /** Course context saved with every question (Course Control ids). */
  categoryId: string | null;
  courseId: string | null;
  categoryName: string | null;
  courseName: string | null;
  subjectName: string | null;
  imageUrl: string | null;
  studentName: string;
  studentAvatar: string;
  text: string;
  hasPicture: boolean;
  createdAt: string;
  status: QaQuestionStatus;
  answer?: TeacherAnswer;
};

/** Ask-a-question dropdown data — derived from real Course Control +
 *  enrollment data, never a separate Q&A list. */
export type QaCategoryOption = {
  id: string;
  name: string;
};

export type QaCourseOption = {
  id: string;
  name: string;
  categoryId: string | null;
};

export type QaSubjectOption = {
  id: string;
  name: string;
  courseId: string;
};

export type QaAskOptions = {
  categories: QaCategoryOption[];
  courses: QaCourseOption[];
  subjects: QaSubjectOption[];
};

export type QaGuidelineSection = {
  title: string;
  items: string[];
};

export const qaGuideline: QaGuidelineSection[] = [
  {
    title: "How to Ask a Question",
    items: [
      "Use the Ask a Question button, pick your Category, Enrolled Course and Subject, then write your question clearly.",
      "You can attach an optional picture when it helps explain your question.",
    ],
  },
  {
    title: "Writing a Good Question",
    items: [
      "Be specific — mention the chapter, topic or exam (HSC, admission) you are asking about.",
      "Write the full question in one clear paragraph instead of many short messages.",
      "Type your question text whenever possible; avoid blurry screenshots.",
    ],
  },
  {
    title: "How Answers Work",
    items: [
      "Teachers answer questions in their own time; answered questions are marked Answered.",
      "Unanswered questions stay open until a teacher provides an answer.",
      "You will be notified once your question receives an answer.",
    ],
  },
  {
    title: "Community Rules",
    items: [
      "One question per submission — keep each question focused on a single topic.",
      "Be respectful to teachers and fellow students; no abusive or off-topic content.",
      "Do not share personal contact information or promote outside services.",
      "Questions that violate the rules may be removed by moderators.",
    ],
  },
];
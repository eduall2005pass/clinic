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
  studentName: string;
  studentAvatar: string;
  text: string;
  hasPicture: boolean;
  hasAudio: boolean;
  createdAt: string;
  status: QaQuestionStatus;
  answer?: TeacherAnswer;
};

export type QaGuidelineSection = {
  title: string;
  items: string[];
};

export const qaGuideline: QaGuidelineSection[] = [
  {
    title: "How to Ask a Question",
    items: [
      "Choose the correct subject for your question so the right teachers can answer it.",
      "Use the Ask a Question button, pick a subject and write your question clearly.",
      "You can attach a picture or an audio recording when it helps explain your question.",
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
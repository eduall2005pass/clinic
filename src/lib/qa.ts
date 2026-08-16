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

export const qaSubjects: QaSubject[] = [
  { id: "biology", name: "Biology", order: 1 },
  { id: "chemistry", name: "Chemistry", order: 2 },
  { id: "physics", name: "Physics", order: 3 },
  { id: "higher-mathematics", name: "Higher Mathematics", order: 4 },
  { id: "english", name: "English", order: 5 },
  { id: "medical-admission", name: "Medical Admission", order: 6 },
];

export const qaQuestions: QaQuestion[] = [
  {
    id: "q-1",
    subjectId: "biology",
    studentName: "Student 1",
    studentAvatar: "/avatars/student.svg",
    text: "What is the best way to memorize the stages of mitosis for the HSC board exam?",
    hasPicture: true,
    hasAudio: false,
    createdAt: "12 Aug 2026, 3:40 PM",
    status: "answered",
    answer: {
      id: "a-1",
      teacherName: "Teacher 1",
      content:
        "Use a mnemonic like 'PMAT' — Prophase, Metaphase, Anaphase, Telophase. Draw each stage once a day and label the key events, then practice with the model test questions.",
      answeredAt: "12 Aug 2026, 6:15 PM",
    },
  },
  {
    id: "q-2",
    subjectId: "biology",
    studentName: "Student 2",
    studentAvatar: "/avatars/student.svg",
    text: "Can photosynthesis questions appear in the medical admission exam?",
    hasPicture: false,
    hasAudio: true,
    createdAt: "13 Aug 2026, 10:05 AM",
    status: "answered",
    answer: {
      id: "a-2",
      teacherName: "Teacher 1",
      content:
        "Yes, basic photosynthesis concepts are frequently tested in admission exams. Focus on the light and dark reactions, the role of chlorophyll, and the overall equation.",
      answeredAt: "13 Aug 2026, 12:30 PM",
    },
  },
  {
    id: "q-3",
    subjectId: "biology",
    studentName: "Student 3",
    studentAvatar: "/avatars/student.svg",
    text: "Which topics should I prioritize in genetics for HSC second year?",
    hasPicture: false,
    hasAudio: false,
    createdAt: "14 Aug 2026, 9:20 AM",
    status: "unanswered",
  },
  {
    id: "q-4",
    subjectId: "chemistry",
    studentName: "Student 1",
    studentAvatar: "/avatars/student.svg",
    text: "How do I balance redox equations quickly in organic chemistry problems?",
    hasPicture: false,
    hasAudio: false,
    createdAt: "11 Aug 2026, 5:50 PM",
    status: "answered",
    answer: {
      id: "a-3",
      teacherName: "Teacher 2",
      content:
        "Separate the half-reactions first, balance atoms other than O and H, then balance oxygen with water and hydrogen with H+. Finally balance charge with electrons and combine.",
      answeredAt: "11 Aug 2026, 8:00 PM",
    },
  },
  {
    id: "q-5",
    subjectId: "chemistry",
    studentName: "Student 4",
    studentAvatar: "/avatars/student.svg",
    text: "Is the periodic table trend of ionization energy important for admission tests?",
    hasPicture: true,
    hasAudio: false,
    createdAt: "14 Aug 2026, 11:45 AM",
    status: "unanswered",
  },
  {
    id: "q-6",
    subjectId: "physics",
    studentName: "Student 2",
    studentAvatar: "/avatars/student.svg",
    text: "Can someone explain the difference between scalar and vector quantities with examples?",
    hasPicture: false,
    hasAudio: true,
    createdAt: "10 Aug 2026, 2:15 PM",
    status: "answered",
    answer: {
      id: "a-4",
      teacherName: "Teacher 3",
      content:
        "Scalars have only magnitude, like speed and mass. Vectors have both magnitude and direction, like velocity and force. Speed is 60 km/h; velocity is 60 km/h north.",
      answeredAt: "10 Aug 2026, 4:45 PM",
    },
  },
  {
    id: "q-7",
    subjectId: "medical-admission",
    studentName: "Student 5",
    studentAvatar: "/avatars/student.svg",
    text: "What is the current admission exam format and how many questions should I practice daily?",
    hasPicture: false,
    hasAudio: false,
    createdAt: "14 Aug 2026, 8:30 AM",
    status: "unanswered",
  },
  {
    id: "q-8",
    subjectId: "english",
    studentName: "Student 3",
    studentAvatar: "/avatars/student.svg",
    text: "How can I improve my English grammar for the HSC board exam quickly?",
    hasPicture: false,
    hasAudio: false,
    createdAt: "9 Aug 2026, 7:10 PM",
    status: "answered",
    answer: {
      id: "a-5",
      teacherName: "Teacher 4",
      content:
        "Practice one grammar topic per day — tense, voice, narration — and solve the past board questions on that topic the same day. Consistency beats cramming.",
      answeredAt: "9 Aug 2026, 9:25 PM",
    },
  },
];

export function getSubject(subjectId: string): QaSubject | undefined {
  return qaSubjects.find((subject) => subject.id === subjectId);
}

export function getQuestionsBySubject(subjectId: string): QaQuestion[] {
  return qaQuestions.filter((question) => question.subjectId === subjectId);
}
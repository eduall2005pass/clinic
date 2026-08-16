export type FaqStatus = "published" | "unpublished";

export type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  status: FaqStatus;
};

export const faqs: Faq[] = [
  {
    id: "faq-1",
    question: "What is MediSpark?",
    answer:
      "MediSpark is a preparation platform for HSC students. It brings HSC Academic courses and Medical Admission Preparation together with model exams and an expert Q&A section in one clean platform.",
    order: 1,
    status: "published",
  },
  {
    id: "faq-2",
    question: "Which courses and batches are available?",
    answer:
      "Courses are organised by batch — HSC 26, HSC 27 and HSC 28. Each batch offers Biology, Chemistry, Physics, Higher Mathematics and English, plus a Medical Admission Preparation course.",
    order: 2,
    status: "published",
  },
  {
    id: "faq-3",
    question: "How do I enroll in a course?",
    answer:
      "Open the Courses page, choose your batch and course type, open the course you want, and use the Enroll button on the course page. The course fee is shown clearly before you enroll.",
    order: 3,
    status: "published",
  },
  {
    id: "faq-4",
    question: "How does the model exam system work?",
    answer:
      "Model exams are listed in the Exams section with their marks, duration and status. Each exam page is the entry point for the exam engine, which will add questions, a timer, marking and results step by step.",
    order: 4,
    status: "published",
  },
  {
    id: "faq-5",
    question: "How can I ask a question in the Q&A section?",
    answer:
      "Open the Q&A page, pick your subject, and ask your question — you can attach a picture or audio. Teachers review the questions and post answers that stay visible to every student.",
    order: 5,
    status: "published",
  },
  {
    id: "faq-6",
    question: "How do I track my learning progress?",
    answer:
      "Your dashboard shows enrolled courses, course progress, continue-learning suggestions, exam results, favourites and notifications, so you always know where to pick up next.",
    order: 6,
    status: "published",
  },
];

export function getPublishedFaqs(): Faq[] {
  return faqs
    .filter((faq) => faq.status === "published")
    .sort((a, b) => a.order - b.order);
}
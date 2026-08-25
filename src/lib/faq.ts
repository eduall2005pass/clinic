export type FaqStatus = "published" | "unpublished";

/** Answer presentation — text only, video only, or both. */
export type FaqAnswerType = "text" | "video" | "text_video";

export type Faq = {
  id: string;
  question: string;
  /** Rich-text (sanitised HTML) answer shown when type includes text. */
  answer: string;
  /** Embeddable video URL shown when type includes video. */
  videoUrl: string | null;
  answerType: FaqAnswerType;
  order: number;
  status: FaqStatus;
  /** Enabled/Disabled — disabled FAQs never render on the website. */
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// Seed content only — inserted into the MySQL `faqs` table the first time
// it is created. The website NEVER reads these directly: everything is
// served from the database via /api/faqs and Admin Panel → Content → FAQ.
export const faqs: Faq[] = [
  {
    id: "faq-registration",
    question: "MediSpark ওয়েবসাইটে কীভাবে Registration করব?",
    answer:
      "<p>ওয়েবসাইটের Register / Log In অপশনে ক্লিক করে Continue with Google নির্বাচন করুন। প্রথমবার প্রবেশের পর প্রয়োজনীয় তথ্য পূরণ করলেই আপনার Registration সম্পন্ন হবে।</p>",
    videoUrl: null,
    answerType: "text",
    order: 1,
    status: "published",
    isActive: true,
  },
  {
    id: "faq-buy-course",
    question: "কীভাবে Course কিনব?",
    answer:
      "<p>Courses অপশনে গিয়ে পছন্দের Course নির্বাচন করুন। এরপর Enroll / Buy Course অপশনে ক্লিক করে payment সম্পন্ন করুন। Payment সফল হলে Courseটি আপনার My Enrolled Courses-এ যুক্ত হবে।</p>",
    videoUrl: null,
    answerType: "text",
    order: 2,
    status: "published",
    isActive: true,
  },
  {
    id: "faq-jersey",
    question: "Jersey কীভাবে পাব?",
    answer:
      "<p>MediSpark-এর Mega Exam-এ সেরা ফলাফল করে Top Position অর্জন করলে আপনি MediSpark-এর বিশেষ Jersey পাওয়ার সুযোগ পাবেন।</p>",
    videoUrl: null,
    answerType: "text",
    order: 3,
    status: "published",
    isActive: true,
  },
  {
    id: "faq-qa",
    question: "Q&A কীভাবে পাব?",
    answer:
      "<p>আপনার enrolled Course-এর Q&A Section থেকে প্রশ্ন করতে পারবেন। শিক্ষক আপনার প্রশ্নের উত্তর দিলে একই Section থেকেই উত্তরটি দেখতে পারবেন।</p>",
    videoUrl: null,
    answerType: "text",
    order: 4,
    status: "published",
    isActive: true,
  },
  {
    id: "faq-website-guide",
    question: "MediSpark Website কীভাবে ব্যবহার করব?",
    answer:
      "<p>MediSpark-এর Website কীভাবে ব্যবহার করবেন, কোর্সে কীভাবে Enroll করবেন, Exam কীভাবে দেবেন এবং Dashboard-এর বিভিন্ন সুবিধা কীভাবে ব্যবহার করবেন—এসব বিস্তারিত জানতে নিচের ভিডিওটি দেখুন।</p>",
    // Video URL is set from Admin Panel → Content → FAQ (never hardcoded).
    videoUrl: null,
    answerType: "text_video",
    order: 5,
    status: "published",
    isActive: true,
  },
];

/**
 * Direct static access is intentionally limited to server-side seeding in
 * src/lib/faq-store.ts. UI components must always use the DB-backed store.
 */

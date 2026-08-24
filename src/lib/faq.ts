export type FaqStatus = "published" | "unpublished";

export type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  status: FaqStatus;
};

// Live homepage FAQ content — exactly these four items, in Bangla.
// Editable from Admin Panel → Content → FAQ (faqs table overrides these
// defaults once rows exist).
export const faqs: Faq[] = [
  {
    id: "faq-registration",
    question: "MediSpark ওয়েবসাইটে কীভাবে Registration করব?",
    answer:
      "ওয়েবসাইটের Register / Log In অপশনে ক্লিক করে Continue with Google নির্বাচন করুন। প্রথমবার প্রবেশের পর প্রয়োজনীয় তথ্য পূরণ করলেই আপনার Registration সম্পন্ন হবে।",
    order: 1,
    status: "published",
  },
  {
    id: "faq-buy-course",
    question: "কীভাবে Course কিনব?",
    answer:
      "Courses অপশনে গিয়ে পছন্দের Course নির্বাচন করুন। এরপর Enroll / Buy Course অপশনে ক্লিক করে payment সম্পন্ন করুন। Payment সফল হলে Courseটি আপনার My Enrolled Courses-এ যুক্ত হবে।",
    order: 2,
    status: "published",
  },
  {
    id: "faq-jersey",
    question: "Jersey কীভাবে পাব?",
    answer:
      "MediSpark-এর Course-এ ভর্তি হলেই আপনি MediSpark Jersey পাবেন।",
    order: 3,
    status: "published",
  },
  {
    id: "faq-qa",
    question: "Q&A কীভাবে পাব?",
    answer:
      "আপনার enrolled Course-এর Q&A Section থেকে প্রশ্ন করতে পারবেন। শিক্ষক আপনার প্রশ্নের উত্তর দিলে একই Section থেকেই উত্তরটি দেখতে পারবেন।",
    order: 4,
    status: "published",
  },
];

export function getPublishedFaqs(): Faq[] {
  return faqs
    .filter((faq) => faq.status === "published")
    .sort((a, b) => a.order - b.order);
}
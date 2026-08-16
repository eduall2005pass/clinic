export type SuccessStatus = "published" | "unpublished";

export type SuccessIcon =
  | "graduation"
  | "exam"
  | "users"
  | "target"
  | "trophy"
  | "chart";

export type SuccessItem = {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: SuccessIcon;
  order: number;
  status: SuccessStatus;
};

export const successItems: SuccessItem[] = [
  {
    id: "success-1",
    title: "Students Guided",
    value: "500+",
    description: "Students preparing for HSC and medical admission.",
    icon: "users",
    order: 1,
    status: "published",
  },
  {
    id: "success-2",
    title: "Model Exams",
    value: "40+",
    description: "Chapter-wise and full model tests across all subjects.",
    icon: "exam",
    order: 2,
    status: "published",
  },
  {
    id: "success-3",
    title: "Answered Questions",
    value: "200+",
    description: "Questions resolved by mentors in the Q&A section.",
    icon: "graduation",
    order: 3,
    status: "published",
  },
  {
    id: "success-4",
    title: "Success Rate",
    value: "90%",
    description: "Students reporting improved exam preparation.",
    icon: "trophy",
    order: 4,
    status: "published",
  },
];

export function getPublishedSuccessItems(): SuccessItem[] {
  return successItems
    .filter((item) => item.status === "published")
    .sort((a, b) => a.order - b.order);
}
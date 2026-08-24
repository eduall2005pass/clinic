export type Batch = {
  id: string;
  label: string;
};

export type CourseType =
  | "SSC Academic"
  | "HSC Academic"
  | "Medical Admission"
  | "Varsity Admission";

export type CourseCategory = CourseType;

export type CourseStatus = "published" | "unpublished";

export type CourseAvailability = "available" | "hidden";

export type Course = {
  slug: string;
  name: string;
  category: CourseCategory;
  batchId: string;
  image: string;
  shortDescription: string;
  description: string;
  teacherName: string;
  teacherPhoto: string;
  designation: string;
  duration: string;
  fee: number;
  discountFee: number | null;
  features: string[];
  overviewTitle: string;
  overview: string[];
  status: CourseStatus;
  availability: CourseAvailability;
  couponEnabled: boolean;
};

export const batches: Batch[] = [
  { id: "hsc-28", label: "HSC 28" },
  { id: "hsc-27", label: "HSC 27" },
  { id: "hsc-26", label: "HSC 26" },
  { id: "ssc-28", label: "SSC 28" },
  { id: "ssc-27", label: "SSC 27" },
  { id: "ssc-26", label: "SSC 26" },
];

/** One batch-filter chip on a course category page. */
export type BatchFilterOption = { id: string; label: string };

/**
 * Per-category batch filters shown at the top of every Course Category
 * page — exactly 4 options each. Ids reuse the course `batchId` values so
 * filtering works against live catalog data.
 */
export const batchFilterOptions: {
  ssc: BatchFilterOption[];
  hsc: BatchFilterOption[];
} = {
  ssc: [
    { id: "all", label: "All Batch" },
    { id: "ssc-29", label: "SSC 2029" },
    { id: "ssc-28", label: "SSC 2028" },
    { id: "ssc-27", label: "SSC 2027" },
  ],
  hsc: [
    { id: "all", label: "All Batch" },
    { id: "hsc-29", label: "HSC 2029" },
    { id: "hsc-28", label: "HSC 2028" },
    { id: "hsc-27", label: "HSC 2027" },
  ],
};

export const courseTypes: CourseType[] = [
  "SSC Academic",
  "HSC Academic",
  "Medical Admission",
  "Varsity Admission",
];

export const courses: Course[] = [
  // ── HSC 28 — Academic ────────────────────────────────────────────────
  {
    slug: "botany",
    name: "Botany Complete Course",
    category: "HSC Academic",
    batchId: "hsc-28",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Botany preparation — cell biology to plant physiology, morphology and genetics with exam-focused explanations.",
    description:
      "A complete HSC Botany course for the HSC 28 batch. Every chapter of the Botany syllabus is covered step by step — from cell biology and cell division to plant tissues, morphology, physiology, reproduction, genetics and ecology — with board exam-focused explanations, class notes and chapter-wise tests.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Board question analysis",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Cell Biology & Cell Division",
      "Plant Tissues & Morphology",
      "Plant Physiology",
      "Plant Reproduction & Development",
      "Genetics & Evolution",
      "Microbiology, Fungi & Ecology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  {
    slug: "zoology",
    name: "Zoology Complete Course",
    category: "HSC Academic",
    batchId: "hsc-28",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Zoology preparation — animal diversity, human physiology, genetics and applied zoology with exam-focused practice.",
    description:
      "A complete HSC Zoology course for the HSC 28 batch. The full Zoology syllabus is covered — animal diversity, tissues, human physiology, nervous and endocrine systems, reproduction, genetics and applied zoology — with clear explanations, diagrams and board exam-focused practice.",
    teacherName: "Dr. Farhana Akter",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Diagram & practical-based preparation",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Animal Diversity & Classification",
      "Animal Tissues & Organisation",
      "Human Physiology — Digestion & Respiration",
      "Human Physiology — Circulation & Excretion",
      "Nervous, Endocrine & Reproductive Systems",
      "Genetics, Evolution & Applied Zoology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: false,
  },
  {
    slug: "biology-revision",
    name: "Biology Revision Course",
    category: "HSC Academic",
    batchId: "hsc-28",
    image: "/courses/biology.svg",
    shortDescription:
      "Rapid revision of the complete HSC Biology syllabus — both papers with past board questions and model tests.",
    description:
      "A focused revision course for the HSC 28 batch covering the complete HSC Biology syllabus — both 1st and 2nd papers. Rapid concept reviews, past board question practice and full model tests help you consolidate everything before the board exam.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Rapid Revision",
    fee: 4000,
    discountFee: 3500,
    features: [
      "Rapid concept revision of all chapters",
      "Past board question practice",
      "Full model tests with solutions",
      "Common mistakes & exam tips",
    ],
    overviewTitle: "Revision Papers",
    overview: [
      "Biology 1st Paper — Complete Revision",
      "Biology 2nd Paper — Complete Revision",
      "Past Board Question Practice",
      "Model Test Papers",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  // ── HSC 28 — Admission ───────────────────────────────────────────────
  {
    slug: "medical-admission",
    name: "Special Medical Admission Course",
    category: "Medical Admission",
    batchId: "hsc-28",
    image: "/courses/medical-admission.svg",
    shortDescription:
      "Focused medical admission preparation for the HSC 28 batch — combined syllabus training with exam strategy for the medical entrance race.",
    description:
      "A special medical admission preparation course for the HSC 28 batch. Biology, Chemistry, Physics and Higher Mathematics are combined into one admission-focused program with chapter-wise classes, MCQ practice and full model tests — plus admission exam strategy and analysis to keep you ready for the medical entrance race.",
    teacherName: "Prof. Shafiqul Islam",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Medical Admission Program Lead",
    duration: "Full Syllabus",
    fee: 8500,
    discountFee: 7500,
    features: [
      "Combined Biology, Chemistry, Physics & Math",
      "Admission-focused concept classes",
      "Chapter-wise & full model tests",
      "MCQ & written practice",
      "Exam strategy & result analysis",
    ],
    overviewTitle: "Subjects",
    overview: [
      "Biology (Botany & Zoology)",
      "Chemistry",
      "Physics",
      "Higher Mathematics",
      "Admission Model Tests",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  // ── HSC 27 — Academic ────────────────────────────────────────────────
  {
    slug: "botany-27",
    name: "Botany Complete Course",
    category: "HSC Academic",
    batchId: "hsc-27",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Botany preparation for the HSC 27 batch — every chapter with board exam-focused explanations.",
    description:
      "A complete HSC Botany course for the HSC 27 batch. The full Botany syllabus is covered chapter by chapter — cell biology, division, tissues, morphology, physiology, reproduction, genetics and ecology — with board exam-focused classes, notes and tests.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Board question analysis",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Cell Biology & Cell Division",
      "Plant Tissues & Morphology",
      "Plant Physiology",
      "Plant Reproduction & Development",
      "Genetics & Evolution",
      "Microbiology, Fungi & Ecology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  {
    slug: "zoology-27",
    name: "Zoology Complete Course",
    category: "HSC Academic",
    batchId: "hsc-27",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Zoology preparation for the HSC 27 batch — animal diversity, human physiology and applied zoology.",
    description:
      "A complete HSC Zoology course for the HSC 27 batch. The full Zoology syllabus — animal diversity, tissues, human physiology, nervous and endocrine systems, reproduction, genetics and applied zoology — is covered with clear explanations and exam-focused practice.",
    teacherName: "Dr. Farhana Akter",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Diagram & practical-based preparation",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Animal Diversity & Classification",
      "Animal Tissues & Organisation",
      "Human Physiology — Digestion & Respiration",
      "Human Physiology — Circulation & Excretion",
      "Nervous, Endocrine & Reproductive Systems",
      "Genetics, Evolution & Applied Zoology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  {
    slug: "biology-revision-27",
    name: "Biology Revision Course",
    category: "HSC Academic",
    batchId: "hsc-27",
    image: "/courses/biology.svg",
    shortDescription:
      "Rapid revision of the complete HSC Biology syllabus for the HSC 27 batch — both papers with model tests.",
    description:
      "A focused revision course for the HSC 27 batch covering the complete HSC Biology syllabus — both 1st and 2nd papers. Rapid concept reviews, past board questions and full model tests consolidate everything before the board exam.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Rapid Revision",
    fee: 4000,
    discountFee: 3500,
    features: [
      "Rapid concept revision of all chapters",
      "Past board question practice",
      "Full model tests with solutions",
      "Common mistakes & exam tips",
    ],
    overviewTitle: "Revision Papers",
    overview: [
      "Biology 1st Paper — Complete Revision",
      "Biology 2nd Paper — Complete Revision",
      "Past Board Question Practice",
      "Model Test Papers",
    ],
    status: "published",
    availability: "available",
    couponEnabled: false,
  },
  // ── HSC 27 — Admission ───────────────────────────────────────────────
  {
    slug: "medical-admission-27",
    name: "Special Medical Admission Course",
    category: "Medical Admission",
    batchId: "hsc-27",
    image: "/courses/medical-admission.svg",
    shortDescription:
      "Focused medical admission preparation for the HSC 27 batch — combined syllabus training with exam strategy.",
    description:
      "A special medical admission preparation course for the HSC 27 batch. Biology, Chemistry, Physics and Higher Mathematics are combined into one admission-focused program with chapter-wise classes, MCQ practice and full model tests — plus admission exam strategy and analysis.",
    teacherName: "Prof. Shafiqul Islam",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Medical Admission Program Lead",
    duration: "Full Syllabus",
    fee: 8500,
    discountFee: 7500,
    features: [
      "Combined Biology, Chemistry, Physics & Math",
      "Admission-focused concept classes",
      "Chapter-wise & full model tests",
      "MCQ & written practice",
      "Exam strategy & result analysis",
    ],
    overviewTitle: "Subjects",
    overview: [
      "Biology (Botany & Zoology)",
      "Chemistry",
      "Physics",
      "Higher Mathematics",
      "Admission Model Tests",
    ],
    status: "published",
    availability: "available",
    couponEnabled: false,
  },
  // ── HSC 26 — Academic ────────────────────────────────────────────────
  {
    slug: "botany-26",
    name: "Botany Complete Course",
    category: "HSC Academic",
    batchId: "hsc-26",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Botany preparation for the HSC 26 batch — every chapter with board exam-focused explanations.",
    description:
      "A complete HSC Botany course for the HSC 26 batch. The full Botany syllabus is covered chapter by chapter — cell biology, division, tissues, morphology, physiology, reproduction, genetics and ecology — with board exam-focused classes, notes and tests.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Board question analysis",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Cell Biology & Cell Division",
      "Plant Tissues & Morphology",
      "Plant Physiology",
      "Plant Reproduction & Development",
      "Genetics & Evolution",
      "Microbiology, Fungi & Ecology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: false,
  },
  {
    slug: "zoology-26",
    name: "Zoology Complete Course",
    category: "HSC Academic",
    batchId: "hsc-26",
    image: "/courses/biology.svg",
    shortDescription:
      "Complete HSC Zoology preparation for the HSC 26 batch — animal diversity, human physiology and applied zoology.",
    description:
      "A complete HSC Zoology course for the HSC 26 batch. The full Zoology syllabus — animal diversity, tissues, human physiology, nervous and endocrine systems, reproduction, genetics and applied zoology — is covered with clear explanations and exam-focused practice.",
    teacherName: "Dr. Farhana Akter",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Full Syllabus",
    fee: 4500,
    discountFee: 4000,
    features: [
      "Full chapter-wise video classes",
      "Class notes & chapter PDFs",
      "Chapter-wise exam with answer solutions",
      "Diagram & practical-based preparation",
      "Doubt solving support",
    ],
    overviewTitle: "Chapters",
    overview: [
      "Animal Diversity & Classification",
      "Animal Tissues & Organisation",
      "Human Physiology — Digestion & Respiration",
      "Human Physiology — Circulation & Excretion",
      "Nervous, Endocrine & Reproductive Systems",
      "Genetics, Evolution & Applied Zoology",
    ],
    status: "published",
    availability: "available",
    couponEnabled: false,
  },
  {
    slug: "biology-revision-26",
    name: "Biology Revision Course",
    category: "HSC Academic",
    batchId: "hsc-26",
    image: "/courses/biology.svg",
    shortDescription:
      "Rapid revision of the complete HSC Biology syllabus for the HSC 26 batch — both papers with model tests.",
    description:
      "A focused revision course for the HSC 26 batch covering the complete HSC Biology syllabus — both 1st and 2nd papers. Rapid concept reviews, past board questions and full model tests consolidate everything before the board exam.",
    teacherName: "Dr. Anika Rahman",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Senior Biology Faculty",
    duration: "Rapid Revision",
    fee: 4000,
    discountFee: 3500,
    features: [
      "Rapid concept revision of all chapters",
      "Past board question practice",
      "Full model tests with solutions",
      "Common mistakes & exam tips",
    ],
    overviewTitle: "Revision Papers",
    overview: [
      "Biology 1st Paper — Complete Revision",
      "Biology 2nd Paper — Complete Revision",
      "Past Board Question Practice",
      "Model Test Papers",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
  // ── HSC 26 — Admission ───────────────────────────────────────────────
  {
    slug: "medical-admission-26",
    name: "Special Medical Admission Course",
    category: "Medical Admission",
    batchId: "hsc-26",
    image: "/courses/medical-admission.svg",
    shortDescription:
      "Focused medical admission preparation for the HSC 26 batch — combined syllabus training with exam strategy.",
    description:
      "A special medical admission preparation course for the HSC 26 batch. Biology, Chemistry, Physics and Higher Mathematics are combined into one admission-focused program with chapter-wise classes, MCQ practice and full model tests — plus admission exam strategy and analysis.",
    teacherName: "Prof. Shafiqul Islam",
    teacherPhoto: "/avatars/teacher.svg",
    designation: "Medical Admission Program Lead",
    duration: "Full Syllabus",
    fee: 8500,
    discountFee: 7500,
    features: [
      "Combined Biology, Chemistry, Physics & Math",
      "Admission-focused concept classes",
      "Chapter-wise & full model tests",
      "MCQ & written practice",
      "Exam strategy & result analysis",
    ],
    overviewTitle: "Subjects",
    overview: [
      "Biology (Botany & Zoology)",
      "Chemistry",
      "Physics",
      "Higher Mathematics",
      "Admission Model Tests",
    ],
    status: "published",
    availability: "available",
    couponEnabled: true,
  },
];

export function getBatch(batchId: string): Batch | undefined {
  return batches.find((batch) => batch.id === batchId);
}

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getPublicCourses(): Course[] {
  return courses.filter(
    (course) =>
      course.status === "published" && course.availability === "available",
  );
}

export function getFeaturedCourses(): Course[] {
  const latestBatch = batches[0];
  return getPublicCourses().filter(
    (course) => course.batchId === latestBatch.id,
  );
}

export function getPayableFee(course: Course): number {
  return course.discountFee != null ? course.discountFee : course.fee;
}

export function hasDiscount(course: Course): boolean {
  return course.discountFee != null && course.discountFee < course.fee;
}

export function formatFee(fee: number): string {
  return `৳ ${fee.toLocaleString("en-IN")}`;
}
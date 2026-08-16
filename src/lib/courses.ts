export type Batch = {
  id: string;
  label: string;
};

export type CourseType = "Academic" | "Admission";

export type Course = {
  slug: string;
  name: string;
  batchId: string;
  type: CourseType;
  fee: number;
  image: string;
  duration: string;
  description: string;
};

export const batches: Batch[] = [
  { id: "hsc-28", label: "HSC 28" },
  { id: "hsc-27", label: "HSC 27" },
  { id: "hsc-26", label: "HSC 26" },
];

export const courseTypes: CourseType[] = ["Academic", "Admission"];

export const courses: Course[] = [
  {
    slug: "biology",
    name: "Biology",
    batchId: "hsc-28",
    type: "Academic",
    fee: 4500,
    image: "/courses/biology.svg",
    duration: "12 chapters",
    description:
      "Complete HSC Biology preparation — cell biology to genetics, physiology, and plant science with exam-focused explanations.",
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    batchId: "hsc-28",
    type: "Academic",
    fee: 4500,
    image: "/courses/chemistry.svg",
    duration: "12 chapters",
    description:
      "HSC Chemistry made clear — physical, inorganic, and organic chemistry fundamentals with step-by-step problem solving.",
  },
  {
    slug: "physics",
    name: "Physics",
    batchId: "hsc-28",
    type: "Academic",
    fee: 4500,
    image: "/courses/physics.svg",
    duration: "12 chapters",
    description:
      "Mechanics, waves, electricity, and modern physics — conceptual clarity and numerical practice for HSC success.",
  },
  {
    slug: "higher-mathematics",
    name: "Higher Mathematics",
    batchId: "hsc-28",
    type: "Academic",
    fee: 4500,
    image: "/courses/higher-mathematics.svg",
    duration: "12 chapters",
    description:
      "Systematic higher math preparation — algebra, calculus, trigonometry, and geometry with worked examples.",
  },
  {
    slug: "english",
    name: "English",
    batchId: "hsc-28",
    type: "Academic",
    fee: 4000,
    image: "/courses/english.svg",
    duration: "8 chapters",
    description:
      "Grammar, composition, and HSC board exam skills — build strong English fundamentals step by step.",
  },
  {
    slug: "medical-admission",
    name: "Medical Admission Preparation",
    batchId: "hsc-28",
    type: "Admission",
    fee: 8500,
    image: "/courses/medical-admission.svg",
    duration: "Full syllabus",
    description:
      "Targeted preparation for medical admission — biology, chemistry, physics, and math combined with exam strategy.",
  },
  {
    slug: "biology-27",
    name: "Biology",
    batchId: "hsc-27",
    type: "Academic",
    fee: 4500,
    image: "/courses/biology.svg",
    duration: "12 chapters",
    description:
      "Complete HSC Biology preparation — cell biology to genetics, physiology, and plant science with exam-focused explanations.",
  },
  {
    slug: "physics-27",
    name: "Physics",
    batchId: "hsc-27",
    type: "Academic",
    fee: 4500,
    image: "/courses/physics.svg",
    duration: "12 chapters",
    description:
      "Mechanics, waves, electricity, and modern physics — conceptual clarity and numerical practice for HSC success.",
  },
  {
    slug: "medical-admission-27",
    name: "Medical Admission Preparation",
    batchId: "hsc-27",
    type: "Admission",
    fee: 8500,
    image: "/courses/medical-admission.svg",
    duration: "Full syllabus",
    description:
      "Targeted preparation for medical admission — biology, chemistry, physics, and math combined with exam strategy.",
  },
  {
    slug: "physics-26",
    name: "Physics",
    batchId: "hsc-26",
    type: "Academic",
    fee: 4500,
    image: "/courses/physics.svg",
    duration: "12 chapters",
    description:
      "Mechanics, waves, electricity, and modern physics — conceptual clarity and numerical practice for HSC success.",
  },
  {
    slug: "medical-admission-26",
    name: "Medical Admission Preparation",
    batchId: "hsc-26",
    type: "Admission",
    fee: 8500,
    image: "/courses/medical-admission.svg",
    duration: "Full syllabus",
    description:
      "Targeted preparation for medical admission — biology, chemistry, physics, and math combined with exam strategy.",
  },
];

export function getBatch(batchId: string): Batch | undefined {
  return batches.find((batch) => batch.id === batchId);
}

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getFeaturedCourses(): Course[] {
  const latestBatch = batches[0];
  return courses.filter((course) => course.batchId === latestBatch.id);
}

export function formatFee(fee: number): string {
  return `৳ ${fee.toLocaleString("en-IN")}`;
}
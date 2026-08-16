import type { Eligibility } from "@/lib/eligibility";

export type ExamStatus = "Upcoming" | "Live" | "Closed";

export type CourseType = "Academic" | "Admission";

export type PublicExam = {
  id: string;
  name: string;
  batch: string;
  courseType: CourseType;
  totalMarks: number;
  durationMinutes: number;
  examDate: string;
  examTime: string;
  status: ExamStatus;
  published: boolean;
  eligibility: Eligibility;
};

export const batches: string[] = ["HSC 26", "HSC 27", "HSC 28"];

export const courseTypes: CourseType[] = ["Academic", "Admission"];

export const publishedExams: PublicExam[] = [
  {
    id: "hsc28-biology-model-test",
    name: "HSC 28 Biology Model Test",
    batch: "HSC 28",
    courseType: "Academic",
    totalMarks: 100,
    durationMinutes: 60,
    examDate: "2026-08-20",
    examTime: "10:00 AM",
    status: "Upcoming",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 28" }, { target: "academic" }],
    },
  },
  {
    id: "hsc28-physics-model-test",
    name: "HSC 28 Physics Model Test",
    batch: "HSC 28",
    courseType: "Academic",
    totalMarks: 100,
    durationMinutes: 60,
    examDate: "2026-08-22",
    examTime: "3:00 PM",
    status: "Upcoming",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 28" }, { target: "academic" }],
    },
  },
  {
    id: "medical-admission-full-syllabus-test-1",
    name: "Medical Admission Full Syllabus Test 1",
    batch: "HSC 28",
    courseType: "Admission",
    totalMarks: 200,
    durationMinutes: 120,
    examDate: "2026-08-16",
    examTime: "9:00 AM",
    status: "Live",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 28" }, { target: "admission" }],
    },
  },
  {
    id: "hsc27-chemistry-model-test",
    name: "HSC 27 Chemistry Model Test",
    batch: "HSC 27",
    courseType: "Academic",
    totalMarks: 100,
    durationMinutes: 60,
    examDate: "2026-08-25",
    examTime: "11:00 AM",
    status: "Upcoming",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 27" }, { target: "academic" }],
    },
  },
  {
    id: "medical-admission-biology-test",
    name: "Medical Admission Biology Test",
    batch: "HSC 27",
    courseType: "Admission",
    totalMarks: 100,
    durationMinutes: 60,
    examDate: "2026-08-16",
    examTime: "2:00 PM",
    status: "Live",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 27" }, { target: "admission" }],
    },
  },
  {
    id: "hsc26-physics-model-test",
    name: "HSC 26 Physics Model Test",
    batch: "HSC 26",
    courseType: "Academic",
    totalMarks: 100,
    durationMinutes: 60,
    examDate: "2026-07-10",
    examTime: "10:00 AM",
    status: "Closed",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 26" }, { target: "academic" }],
    },
  },
  {
    id: "medical-admission-mock-test-2",
    name: "Medical Admission Mock Test 2",
    batch: "HSC 28",
    courseType: "Admission",
    totalMarks: 150,
    durationMinutes: 90,
    examDate: "2026-07-05",
    examTime: "9:00 AM",
    status: "Closed",
    published: true,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 28" }, { target: "admission" }],
    },
  },
  {
    id: "hsc27-biology-practice-test",
    name: "HSC 27 Biology Practice Test",
    batch: "HSC 27",
    courseType: "Academic",
    totalMarks: 50,
    durationMinutes: 40,
    examDate: "2026-09-01",
    examTime: "4:00 PM",
    status: "Upcoming",
    published: false,
    eligibility: {
      mode: "all",
      rules: [{ target: "hscBatch", batch: "HSC 27" }, { target: "academic" }],
    },
  },
];
export type BannerSlide = {
  id: string;
  image?: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  href?: string;
};

export const bannerSlides: BannerSlide[] = [
  {
    id: "hsc-28-biology",
    image: "/courses/biology.svg",
    title: "HSC 28 Biology Complete Course",
    subtitle:
      "The full Botany & Zoology syllabus — recorded lessons, notes and model exams in one place.",
    buttonLabel: "Enroll Now",
    href: "/courses/botany",
  },
  {
    id: "medical-admission",
    image: "/courses/medical-admission.svg",
    title: "Special Medical Admission Course",
    subtitle:
      "Targeted preparation for medical admission — the complete guide to your dream college.",
    buttonLabel: "View Course",
    href: "/courses/medical-admission",
  },
  {
    id: "public-exam",
    title: "MediSpark Public Exam",
    subtitle:
      "Test yourself against the best — chapter-wise and full-syllabus model exams for HSC 28.",
    buttonLabel: "Take the Exam",
    href: "/exam",
  },
  {
    id: "our-success",
    title: "Your Success Story Starts Here",
    subtitle:
      "Hundreds of students have already achieved their medical admission dream with MediSpark.",
    buttonLabel: "See Our Success",
    href: "/#our-success",
  },
];
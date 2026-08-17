export type BannerSlide = {
  id: string;
  image: string;
  href?: string;
  alt?: string;
  title?: string;
  buttonLabel?: string;
};

export const bannerSlides: BannerSlide[] = [
  {
    id: "hsc-28-biology",
    image: "/banners/biology.svg",
    href: "/courses/botany",
    alt: "HSC 28 Biology Complete Course",
    title: "HSC 28 Biology Complete Course",
    buttonLabel: "Enroll Now",
  },
  {
    id: "medical-admission",
    image: "/banners/medical.svg",
    href: "/courses/medical-admission",
    alt: "Special Medical Admission Course",
    title: "Special Medical Admission Course",
    buttonLabel: "View Course",
  },
  {
    id: "public-exam",
    image: "/banners/exam.svg",
    href: "/exam",
    alt: "MediSpark Public Exam",
    title: "MediSpark Public Exam",
    buttonLabel: "Take the Exam",
  },
  {
    id: "our-success",
    image: "/banners/success.svg",
    href: "/#our-success",
    alt: "Your Success Story Starts Here",
    title: "Your Success Story Starts Here",
    buttonLabel: "See Our Success",
  },
];
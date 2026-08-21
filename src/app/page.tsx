import BannerSlider from "@/components/home/BannerSlider";
import Hero from "@/components/home/Hero";
import HomepageCourses from "@/components/home/HomepageCourses";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import OurSuccess from "@/components/home/OurSuccess";
import JerseyGallery from "@/components/home/JerseyGallery";
import Mentors from "@/components/home/Mentors";
import StudentReviews from "@/components/home/StudentReviews";
import FaqSection from "@/components/home/FaqSection";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { fetchHeroSettings } from "@/lib/hero-settings";
import type { HomepageSection } from "@/lib/homepage-sections-constants";

function renderSection(section: HomepageSection) {
  const textProps = {
    title: section.title ?? undefined,
    description: section.description ?? undefined,
  };

  switch (section.key) {
    case "banner":
      return <BannerSlider key={section.key} />;
    case "hero":
      return <Hero key={section.key} />;
    case "homepage-courses":
      return <HomepageCourses key={section.key} {...textProps} />;
    case "featured-courses":
      return <FeaturedCourses key={section.key} {...textProps} />;
    case "why-medispark":
      return <WhyMediSpark key={section.key} {...textProps} />;
    case "our-success":
      return <OurSuccess key={section.key} {...textProps} />;
    case "jersey":
      return <JerseyGallery key={section.key} {...textProps} />;
    case "mentors":
      return <Mentors key={section.key} {...textProps} />;
    case "reviews":
      return <StudentReviews key={section.key} {...textProps} />;
    case "faq":
      return <FaqSection key={section.key} {...textProps} />;
    default:
      return null;
  }
}

export default async function HomePage() {
  const [sections, heroSettings] = await Promise.all([
    fetchHomepageSections(),
    fetchHeroSettings(),
  ]);
  const activeSections = sections.filter((section) => section.isActive);

  return (
    <main className="flex-1 bg-dark-950">
      {activeSections.map((section) => {
        if (section.key === "hero") {
          // Hero visibility is controlled from Admin → Website → Hero Section.
          if (!heroSettings.isActive) return null;
          return <Hero key={section.key} hero={heroSettings} />;
        }
        return renderSection(section);
      })}
    </main>
  );
}

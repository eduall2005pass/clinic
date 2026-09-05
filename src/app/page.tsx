import BannerSlider from "@/components/home/BannerSlider";
import Hero from "@/components/home/Hero";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import OurSuccess from "@/components/home/OurSuccess";
import JerseyGallery from "@/components/home/JerseyGallery";
import Mentors from "@/components/home/Mentors";
import StudentReviews from "@/components/home/StudentReviews";
import FaqSection from "@/components/home/FaqSection";
import JoinWithUs from "@/components/home/JoinWithUs";
import PromotionsSection from "@/components/home/PromotionsSection";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { fetchHeroSettings } from "@/lib/hero-settings";
import { fetchPublishedReviewRecords } from "@/lib/reviews-store";
import { fetchPublishedFaqs } from "@/lib/faq-store";
import { fetchActiveJerseys } from "@/lib/content-admin";
import type { StudentReview } from "@/lib/reviews";
import type { HomepageSection } from "@/lib/homepage-sections-constants";
import type { ReactNode } from "react";

// Always fetch live MySQL data (jerseys, sections, reviews, faqs) on each
// request so Admin Panel changes appear immediately on the home page.
// Cached at the edge; admin changes appear within 60s.
export const revalidate = 300;

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
    case "featured-courses":
      return <FeaturedCourses key={section.key} {...textProps} />;
    case "why-medispark":
      return <WhyMediSpark key={section.key} {...textProps} />;
    case "our-success":
      return <OurSuccess key={section.key} {...textProps} />;
    case "mentors":
      return <Mentors key={section.key} {...textProps} />;
    case "reviews":
      return <StudentReviews key={section.key} {...textProps} />;
    default:
      return null;
  }
}

export default async function HomePage() {
  const [sections, heroSettings, reviewRecords, publishedFaqs, activeJerseys] = await Promise.all([
    fetchHomepageSections(),
    fetchHeroSettings(),
    fetchPublishedReviewRecords(),
    fetchPublishedFaqs(),
    fetchActiveJerseys(),
  ]);
  const activeSections = sections.filter((section) => section.isActive);

  const publishedReviews: StudentReview[] = reviewRecords.map((record, index) => ({
    id: record.id,
    studentName: record.studentName,
    studentAvatar: record.studentAvatar ?? "/avatars/student.svg",
    courseName: record.courseName,
    batchLabel: record.batchLabel,
    rating: record.rating,
    text: record.text,
    createdAt: new Date(record.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    order: index,
    status: "published",
  }));

  // Jersey visibility is driven by Admin → Content → Jersey (MySQL `jerseys`
  // table): the section renders only while an active jersey with an image
  // exists, and always sits exactly between Our Success and Mentors.
  const jerseySection = sections.find((section) => section.key === "jersey");
  const showJersey = Boolean(jerseySection?.isActive) && activeJerseys.length > 0;

  function renderHomeSection(section: HomepageSection): ReactNode {
    if (section.key === "hero") {
      // Hero visibility is controlled from Admin → Website → Hero Section.
      if (!heroSettings.isActive) return null;
      return <Hero key={section.key} hero={heroSettings} />;
    }
    if (section.key === "reviews") {
      return (
        <StudentReviews
          key={section.key}
          reviews={publishedReviews}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
        />
      );
    }
    if (section.key === "faq") {
      return (
        <FaqSection
          key={section.key}
          faqs={publishedFaqs}
          title={section.title ?? undefined}
          description={section.description ?? undefined}
        />
      );
    }
    return renderSection(section);
  }

  const jerseyNode: ReactNode = (
    <JerseyGallery
      key="jersey"
      jerseys={activeJerseys}
      title={jerseySection?.title ?? undefined}
      description={jerseySection?.description ?? undefined}
    />
  );

  const ourSuccessActive = activeSections.some(
    (section) => section.key === "our-success",
  );

  // Join With Us Now !! — immediately after FAQ, before Footer (admin-managed social_links)
  // Title/description are admin-editable via homepage_sections (Admin → Website → Homepage)
  const joinSectionDef = sections.find((s) => s.key === "join-with-us");
  const joinNode = (
    <JoinWithUs
      key="join-with-us"
      title={joinSectionDef?.title ?? undefined}
      description={joinSectionDef?.description ?? undefined}
    />
  );

  return (
    <main className="flex-1 bg-dark-950">
      <PromotionsSection />
      {activeSections
        .filter((section) => section.key !== "jersey")
        .flatMap((section) => {
          const nodes = [renderHomeSection(section)];
          // Exact order: Our Success → Jersey → Mentors.
          if (showJersey && section.key === "our-success") {
            nodes.push(jerseyNode);
          } else if (
            showJersey &&
            !ourSuccessActive &&
            section.key === "mentors"
          ) {
            nodes.unshift(jerseyNode);
          }
          // Required order: FAQ → Join With Us Now !! → Footer
          if (section.key === "faq") {
            nodes.push(joinNode);
          }
          return nodes;
        })}
      {/* Fallback: both neighbours disabled but jersey still published. */}
      {showJersey &&
        !activeSections.some(
          (section) =>
            section.key === "our-success" || section.key === "mentors",
        ) &&
        jerseyNode}
      {/* If FAQ is disabled/hidden, still show Join With Us before Footer */}
      {!activeSections.some((s) => s.key === "faq") && joinNode}
    </main>
  );
}

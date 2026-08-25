import BannerSlider from "@/components/home/BannerSlider";
import Hero from "@/components/home/Hero";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import OurSuccess from "@/components/home/OurSuccess";
import JerseyGallery from "@/components/home/JerseyGallery";
import Mentors from "@/components/home/Mentors";
import StudentReviews from "@/components/home/StudentReviews";
import FaqSection from "@/components/home/FaqSection";
import PromotionsSection from "@/components/home/PromotionsSection";
import AdminSectionManage from "@/components/admin/AdminSectionManage";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { fetchHeroSettings } from "@/lib/hero-settings";
import { fetchPublishedReviewRecords } from "@/lib/reviews-store";
import { fetchPublishedFaqs } from "@/lib/faq-store";
import { fetchActiveJerseys } from "@/lib/content-admin";
import type { StudentReview } from "@/lib/reviews";
import type { HomepageSection } from "@/lib/homepage-sections-constants";
import type { ReactNode } from "react";

/**
 * Admin → Home. A same-to-same visual replica of the Main Website Home Page
 * (same components, same live MySQL data), with a floating "Manage" chip on
 * every section linking to its backend-backed manager. No separate
 * dashboard-style layout — this IS the website with controls attached.
 */
export const dynamic = "force-dynamic";

/** Section key → MySQL-backed manager route. */
const MANAGE_HREF: Record<string, { href: string; label: string }> = {
  banner: { href: "/admin/website/homepage/hero", label: "Banners" },
  hero: { href: "/admin/website/homepage/hero", label: "Hero" },
  "featured-courses": {
    href: "/admin/marketing/featured-courses",
    label: "Featured Courses",
  },
  "homepage-courses": {
    href: "/admin/homepage-courses",
    label: "Course Cards",
  },
  "why-medispark": {
    href: "/admin/website/homepage",
    label: "Why MediSpark",
  },
  "our-success": { href: "/admin/website/homepage", label: "Our Success" },
  mentors: { href: "/admin/mentors/all", label: "Mentors" },
  reviews: { href: "/admin/website/homepage/reviews", label: "Reviews" },
  faq: { href: "/admin/content/faq", label: "FAQ" },
  jersey: { href: "/admin/content/jersey", label: "Jersey" },
};

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

function wrap(sectionKey: string, node: ReactNode): ReactNode {
  const meta = MANAGE_HREF[sectionKey];
  if (!meta || !node) return node;
  return (
    <AdminSectionManage key={`${sectionKey}-manage`} href={meta.href} label={meta.label}>
      {node}
    </AdminSectionManage>
  );
}

export default async function AdminHomePage() {
  const [sections, heroSettings, reviewRecords, publishedFaqs, activeJerseys] =
    await Promise.all([
      fetchHomepageSections(),
      fetchHeroSettings(),
      fetchPublishedReviewRecords(),
      fetchPublishedFaqs(),
      fetchActiveJerseys(),
    ]);
  const activeSections = sections.filter((section) => section.isActive);

  const publishedReviews: StudentReview[] = reviewRecords.map(
    (record, index) => ({
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
    }),
  );

  // Same jersey placement rule as the Main Website Home:
  // exactly between Our Success and Mentors.
  const jerseySection = sections.find((section) => section.key === "jersey");
  const showJersey =
    Boolean(jerseySection?.isActive) && activeJerseys.length > 0;

  function renderHomeSection(section: HomepageSection): ReactNode {
    if (section.key === "hero") {
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

  const jerseyNode: ReactNode = wrap(
    "jersey",
    <JerseyGallery
      key="jersey"
      jerseys={activeJerseys}
      title={jerseySection?.title ?? undefined}
      description={jerseySection?.description ?? undefined}
    />,
  );

  const ourSuccessActive = activeSections.some(
    (section) => section.key === "our-success",
  );

  return (
    <div className="bg-dark-950">
      {wrap(
        "promotions",
        <PromotionsSection key="promotions" />,
      )}
      {activeSections
        .filter((section) => section.key !== "jersey")
        .flatMap((section) => {
          const nodes = [
            wrap(section.key, renderHomeSection(section)),
          ];
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
          return nodes;
        })}
      {/* Fallback: both neighbours disabled but jersey still published. */}
      {showJersey &&
        !activeSections.some(
          (section) =>
            section.key === "our-success" || section.key === "mentors",
        )
        ? jerseyNode
        : null}

      {/* Quick access to the remaining homepage-wide managers. */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/admin/website/homepage"
            className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            Sections &amp; Ordering
          </a>
          <a
            href="/admin/homepage-courses"
            className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            Course Cards
          </a>
          <a
            href="/admin/mentors/all"
            className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            Add New Mentor
          </a>
          <a
            href="/admin/content/faq"
            className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
          >
            Add New FAQ
          </a>
        </div>
      </section>
    </div>
  );
}

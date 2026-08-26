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
import Footer from "@/components/Footer";
import HomeControlBar from "@/components/admin/HomeControlBar";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { fetchHeroSettings } from "@/lib/hero-settings";
import { fetchPublishedReviewRecords } from "@/lib/reviews-store";
import { fetchPublishedFaqs } from "@/lib/faq-store";
import { fetchActiveJerseys } from "@/lib/content-admin";
import { fetchActiveSocialLinks } from "@/lib/social-links";
import type { StudentReview } from "@/lib/reviews";
import type { HomepageSection } from "@/lib/homepage-sections-constants";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * Admin → Home Control: the exact Main Website Home Page (same structure,
 * layout, design, content and responsiveness) with one admin-only control
 * bar BELOW each section: [Edit] everywhere, plus [+ Add ...] only where
 * new items can be added. Edit/Add open the section's MySQL-backed
 * interfaces; every target API re-verifies admin authorization.
 */
export default async function HomeControlPage() {
  const [sections, heroSettings, reviewRecords, publishedFaqs, activeJerseys, socialLinks] =
    await Promise.all([
      fetchHomepageSections(),
      fetchHeroSettings(),
      fetchPublishedReviewRecords(),
      fetchPublishedFaqs(),
      fetchActiveJerseys(),
      fetchActiveSocialLinks(),
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

  // Jersey visibility mirrors the Main Website exactly.
  const jerseySection = sections.find((section) => section.key === "jersey");
  const showJersey = Boolean(jerseySection?.isActive) && activeJerseys.length > 0;

  function renderSectionNode(section: HomepageSection): ReactNode | null {
    const textProps = {
      title: section.title ?? undefined,
      description: section.description ?? undefined,
    };

    switch (section.key) {
      case "banner":
        return <BannerSlider />;
      case "hero":
        // Hero visibility is controlled from Admin → Website → Hero Section.
        return heroSettings.isActive ? <Hero hero={heroSettings} /> : null;
      case "featured-courses":
        return <FeaturedCourses {...textProps} />;
      case "why-medispark":
        return <WhyMediSpark {...textProps} />;
      case "our-success":
        return <OurSuccess {...textProps} />;
      case "mentors":
        return <Mentors {...textProps} />;
      case "reviews":
        return <StudentReviews reviews={publishedReviews} {...textProps} />;
      case "faq":
        return <FaqSection faqs={publishedFaqs} {...textProps} />;
      default:
        return null;
    }
  }

  /** Section content + its bottom control bar ([Edit] / [+ Add ...]). */
  function controlled(
    key: string,
    node: ReactNode | null,
    editHref: string,
    add?: { href: string; label: string },
  ): ReactNode | null {
    if (node === null) return null;
    return (
      <div key={key}>
        {node}
        <HomeControlBar sectionKey={key} editHref={editHref} add={add} />
      </div>
    );
  }

  function renderControlledSection(section: HomepageSection): ReactNode | null {
    switch (section.key) {
      case "banner":
        // The slider is fully dynamic — no manual banner entries exist.
        // Edit opens the Sliding Banner interface showing its live sources.
        return controlled("banner", renderSectionNode(section), "/admin/home-control/banner");
      case "hero":
        return controlled("hero", renderSectionNode(section), "/admin/website/homepage/hero");
      case "featured-courses":
        return controlled("featured-courses", renderSectionNode(section), "/admin/marketing/featured-courses", {
          href: "/admin/marketing/featured-courses",
          label: "Course",
        });
      case "why-medispark":
        return controlled("why-medispark", renderSectionNode(section), "/admin/website/homepage/cards");
      case "our-success":
        return controlled("our-success", renderSectionNode(section), "/admin/website/homepage/cards");
      case "mentors":
        return controlled("mentors", renderSectionNode(section), "/admin/mentors/all", {
          href: "/admin/mentors/all",
          label: "Mentor",
        });
      case "faq":
        return controlled("faq", renderSectionNode(section), "/admin/content/faq", {
          href: "/admin/content/faq",
          label: "FAQ",
        });
      default:
        return null;
    }
  }

  const jerseyNode: ReactNode = (
    <JerseyGallery
      jerseys={activeJerseys}
      title={jerseySection?.title ?? undefined}
      description={jerseySection?.description ?? undefined}
    />
  );

  const ourSuccessActive = activeSections.some((section) => section.key === "our-success");

  const socialLinksNode: ReactNode = (
    <div className="border-t border-white/10 bg-[#f1f5f9] admin-dark:bg-[#0a162e] px-4 py-12 text-center sm:px-6">
      <p className="text-lg font-extrabold tracking-tight text-heading">Social Links</p>
      <p className="mt-1 text-xs text-neutral-500">Follow MediSpark</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {socialLinks.length > 0 ? (
          socialLinks.map((link) => (
            <a
              key={link.key}
              href={link.url ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border border-white/15 bg-white admin-dark:bg-[#112544] px-4 py-2 text-xs font-bold text-neutral-200 transition hover:border-[#93c5fd] hover:text-primary-300"
            >
              {link.label}
            </a>
          ))
        ) : (
          <p className="text-xs text-neutral-500">No social links yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <section className="pb-10">
      {/* Live copy of the homepage — identical to the Main Website */}
      <PromotionsSection />
      {activeSections
        .filter((section) => section.key !== "jersey")
        .flatMap((section) => {
          const nodes = [renderControlledSection(section)];
          // Exact website order: Our Success → Jersey → Mentors.
          if (showJersey && section.key === "our-success") {
            nodes.push(
              controlled("jersey", jerseyNode, "/admin/content/jersey", {
                href: "/admin/content/jersey",
                label: "Jersey",
              }),
            );
          } else if (showJersey && !ourSuccessActive && section.key === "mentors") {
            nodes.unshift(
              controlled("jersey", jerseyNode, "/admin/content/jersey", {
                href: "/admin/content/jersey",
                label: "Jersey",
              }),
            );
          }
          return nodes;
        })}
      {/* Fallback: both neighbours disabled but jersey still published. */}
      {showJersey &&
      !activeSections.some((section) => section.key === "our-success" || section.key === "mentors")
        ? controlled("jersey", jerseyNode, "/admin/content/jersey", {
            href: "/admin/content/jersey",
            label: "Jersey",
          })
        : null}

      {/* Social Links — lives in the site footer on the Main Website */}
      <div>
        {socialLinksNode}
        <HomeControlBar
          sectionKey="social-links"
          editHref="/admin/website/social-links"
          add={{ href: "/admin/website/social-links", label: "Social Link" }}
        />
      </div>

      {/* Footer — the EXACT Main Website footer component (same layout,
          design, typography, links, social icons and responsiveness).
          The bar below adds admin-only [Edit] / [+ Add ...] controls; Edit
          opens one dedicated interface for every editable footer element. */}
      <div>
        <Footer />
        <HomeControlBar
          sectionKey="footer"
          editHref="/admin/home-control/footer"
          adds={[
            {
              href: "/admin/home-control/footer?add=footer-link",
              label: "Footer Link",
            },
            {
              href: "/admin/home-control/footer?add=contact-info",
              label: "Contact Info",
            },
          ]}
        />
      </div>
    </section>
  );
}

import Link from "next/link";
import BannerSlider from "@/components/home/BannerSlider";
import Hero from "@/components/home/Hero";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyMediSpark from "@/components/home/WhyMediSpark";
import OurSuccess from "@/components/home/OurSuccess";
import JerseyGallery from "@/components/home/JerseyGallery";
import Mentors from "@/components/home/Mentors";
import StudentReviews from "@/components/home/StudentReviews";
import FaqSection from "@/components/home/FaqSection";
import { fetchHomepageSections } from "@/lib/homepage-sections";
import { fetchHeroSettings } from "@/lib/hero-settings";
import { fetchPublishedReviewRecords } from "@/lib/reviews-store";
import { fetchPublishedFaqs } from "@/lib/faq-store";
import { fetchActiveJerseys } from "@/lib/content-admin";
import AdminSectionHold from "@/components/admin/AdminSectionHold";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * Admin → Home: a live copy of the Main Website Home Page with one Add
 * button per manageable section. Each button opens the existing manager
 * where the Add form lives (MySQL-backed, reflects on the website instantly).
 */
function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
    >
      + {label}
    </Link>
  );
}

function SectionWithAdd({
  children,
  add,
  hold,
}: {
  children: ReactNode;
  add: { href: string; label: string };
  /** Press & Hold → Edit / Remove (admins only). */
  hold?: { key: string; editHref: string; label: string };
}) {
  return (
    <div className="relative">
      {hold ? (
        <AdminSectionHold
          sectionKey={hold.key}
          editHref={hold.editHref}
          label={hold.label}
        >
          {children}
        </AdminSectionHold>
      ) : (
        children
      )}
      <div className="flex justify-end px-4 pt-4 sm:px-6">
        <AddButton {...add} />
      </div>
    </div>
  );
}

export default async function HomeControlPage() {
  const [sections, heroSettings, reviewRecords, publishedFaqs, activeJerseys] =
    await Promise.all([
      fetchHomepageSections(),
      fetchHeroSettings(),
      fetchPublishedReviewRecords(),
      fetchPublishedFaqs(),
      fetchActiveJerseys(),
    ]);
  const activeSections = sections.filter((section) => section.isActive);
  const text = (section: (typeof sections)[number]) => ({
    title: section.title ?? undefined,
    description: section.description ?? undefined,
  });

  const publishedReviews = reviewRecords.map((record) => ({
    id: record.id,
    studentName: record.studentName,
    studentAvatar: record.studentAvatar ?? "/avatars/student.svg",
    courseName: record.courseName,
    batchLabel: record.batchLabel,
    rating: record.rating,
    text: record.text,
    createdAt: new Date(record.createdAt).toLocaleDateString("en-GB"),
    order: 0,
    status: "published" as const,
  }));

  function render(section: (typeof sections)[number]): ReactNode | null {
    switch (section.key) {
      case "banner":
        return (
          <SectionWithAdd
            key="banner"
            add={{ href: "/admin/marketing/banners", label: "Add Banner" }}
            hold={{ key: "banner", editHref: "/admin/website/homepage/hero", label: "Banner Slider" }}
          >
            <BannerSlider />
          </SectionWithAdd>
        );
      case "hero":
        return heroSettings.isActive ? (
          <SectionWithAdd
            key="hero"
            add={{ href: "/admin/website/homepage", label: "Add Banner" }}
            hold={{ key: "hero", editHref: "/admin/website/homepage/hero", label: "Hero" }}
          >
            <Hero hero={heroSettings} />
          </SectionWithAdd>
        ) : null;
      case "featured-courses":
        return (
          <SectionWithAdd
            key="featured-courses"
            add={{ href: "/admin/marketing/featured-courses", label: "Add Course" }}
            hold={{ key: "featured-courses", editHref: "/admin/marketing/featured-courses", label: "Featured Courses" }}
          >
            <FeaturedCourses {...text(section)} />
          </SectionWithAdd>
        );
      case "why-medispark":
        return (
          <SectionWithAdd
            key="why-medispark"
            add={{ href: "/admin/website/homepage", label: "Add Card" }}
            hold={{ key: "why-medispark", editHref: "/admin/website/homepage", label: "Why MediSpark" }}
          >
            <WhyMediSpark {...text(section)} />
          </SectionWithAdd>
        );
      case "our-success":
        return (
          <SectionWithAdd
            key="our-success"
            add={{ href: "/admin/website/homepage", label: "Add Card" }}
            hold={{ key: "our-success", editHref: "/admin/website/homepage", label: "Our Success" }}
          >
            <OurSuccess {...text(section)} />
          </SectionWithAdd>
        );
      case "mentors":
        return (
          <SectionWithAdd
            key="mentors"
            add={{ href: "/admin/mentors/all", label: "Add Mentor" }}
            hold={{ key: "mentors", editHref: "/admin/mentors/all", label: "Mentor" }}
          >
            <Mentors {...text(section)} />
          </SectionWithAdd>
        );
      case "reviews":
        return (
          <SectionWithAdd
            key="reviews"
            add={{ href: "/admin/website/homepage/reviews", label: "Add Review" }}
            hold={{ key: "reviews", editHref: "/admin/website/homepage/reviews", label: "Review" }}
          >
            <StudentReviews reviews={publishedReviews} {...text(section)} />
          </SectionWithAdd>
        );
      case "faq":
        return (
          <SectionWithAdd
            key="faq"
            add={{ href: "/admin/content/faq", label: "Add FAQ" }}
            hold={{ key: "faq", editHref: "/admin/content/faq", label: "FAQ" }}
          >
            <FaqSection faqs={publishedFaqs} {...text(section)} />
          </SectionWithAdd>
        );
      default:
        return null;
    }
  }

  const jerseySection = sections.find((section) => section.key === "jersey");
  const showJersey =
    Boolean(jerseySection?.isActive) && activeJerseys.length > 0;

  return (
    <section className="pb-10">
      {/* Live copy of the homepage */}
      {activeSections.map((section) => {
        if (section.key === "jersey") return null;
        if (showJersey && section.key === "our-success") {
          return (
            <div key={`group-${section.key}`}>
              {render(section)}
              <SectionWithAdd
                add={{ href: "/admin/content/jersey", label: "Add Jersey" }}
                hold={{
                  key: "jersey",
                  editHref: "/admin/content/jersey",
                  label: "Jersey",
                }}
              >
                <JerseyGallery
                  jerseys={activeJerseys}
                  title={jerseySection?.title ?? undefined}
                  description={jerseySection?.description ?? undefined}
                />
              </SectionWithAdd>
            </div>
          );
        }
        return render(section);
      })}

      {/* Social Links — lives in the site footer */}
      <SectionWithAdd
        add={{ href: "/admin/website/social-links", label: "Add Social Link" }}
      >
        <div className="border-t border-ink/10 bg-dark-950 px-4 py-10 text-center sm:px-6">
          <p className="text-sm font-semibold text-heading">Social Links</p>
          <p className="mt-1 text-xs text-neutral-500">
            Managed in Website Settings — shown in the site footer.
          </p>
        </div>
      </SectionWithAdd>
    </section>
  );
}

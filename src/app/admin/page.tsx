import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";

/**
 * Admin → Home. Mirrors the Main Website Home flow: every card manages one
 * section of the live homepage. Changes appear on the website instantly.
 */
export default function AdminHomeHub() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Home"
        title="Home Page Management"
        description="Manage every section of the live homepage — hero, banners, courses, mentors, reviews, FAQ and more. Changes reflect on the Main Website immediately."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/admin/website/homepage"
          title="Hero & Homepage Sections"
          description="Headline, sections on/off, titles and ordering of the homepage."
        />
        <ManagementCard
          href="/admin/website/homepage/hero"
          title="Hero / Banner Slider"
          description="Upload banners and manage the top slider shown to visitors."
        />
        <ManagementCard
          href="/admin/homepage-courses"
          title="Homepage Courses Cards"
          description="SSC / HSC / Medical course highlight cards on the homepage."
        />
        <ManagementCard
          href="/admin/marketing/featured-courses"
          title="Featured Courses"
          description="Choose which courses appear in the Featured section."
        />
        <ManagementCard
          href="/admin/mentors/all"
          title="Mentors"
          description="Mentor profiles, photos and designation containers."
        />
        <ManagementCard
          href="/admin/content/reviews"
          title="Student Reviews"
          description="Publish or hide student reviews on the homepage."
        />
        <ManagementCard
          href="/admin/content/faq"
          title="FAQ Section"
          description="The four homepage questions and answers (Bangla)."
        />
        <ManagementCard
          href="/admin/content/jersey"
          title="Jersey Gallery"
          description="Upload jerseys shown between Our Success and Mentors."
        />
        <ManagementCard
          href="/admin/marketing/campaigns"
          title="Promotions"
          description="Top promotional strip above the homepage banner."
        />
        <ManagementCard
          href="/admin/content/announcements"
          title="Announcements / Popup"
          description="Site-wide announcement bar content and schedule."
        />
        <ManagementCard
          href="/admin/website/seo"
          title="SEO Settings"
          description="Site title, description and social preview image."
        />
        <ManagementCard
          href="/admin/branding"
          title="Logo & Branding"
          description="Light/dark mode logos and favicon for the whole site."
        />
      </div>
    </section>
  );
}

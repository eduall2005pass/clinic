import { HubHeader, ManagementCard } from "@/components/admin/hub-ui";

/**
 * Admin → Course. Mirrors the Main Website Courses flow
 * (Categories → Courses → Subject → Paper → Class/Exam/Materials → Chapter)
 * and links the matching management pages for every level.
 */
export default function AdminCourseHub() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <HubHeader
        eyebrow="Admin · Course"
        title="Course Management"
        description="The same course browsing flow as the Main Website — manage categories, courses, subjects, papers, chapters, classes, exams, materials and pricing."
      />

      {/* Category level — same 4 categories as the website */}
      <h2 className="mt-8 text-base font-extrabold text-heading">Course Categories</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ManagementCard
          href="/admin/courses/ssc"
          title="SSC Academic"
          description="Manage SSC academic courses shown on the website."
        />
        <ManagementCard
          href="/admin/courses/academic"
          title="HSC Academic"
          description="Manage HSC academic courses shown on the website."
        />
        <ManagementCard
          href="/admin/courses/admission"
          title="Medical Admission"
          description="Manage medical admission courses."
        />
        <ManagementCard
          href="/admin/courses/varsity"
          title="Varsity Admission"
          description="Manage varsity admission courses."
        />
      </div>

      {/* Structure management */}
      <h2 className="mt-10 text-base font-extrabold text-heading">
        Course Content Hierarchy
      </h2>
      <p className="mt-1 text-xs text-neutral-400">
        Course → Subject → Paper / Segment → Class · Exam · Materials → Chapter → Content
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/admin/courses/all"
          title="All Courses"
          description="Add, edit, delete courses — name, thumbnail, description, status."
        />
        <ManagementCard
          href="/admin/courses/categories"
          title="Course Categories"
          description="Category cards on the /courses landing page."
        />
        <ManagementCard
          href="/admin/courses/subjects"
          title="Subjects"
          description="Subjects assigned to each course."
        />
        <ManagementCard
          href="/admin/courses/papers"
          title="Papers & Materials"
          description="১ম/২য় পত্র per subject, chapter assignment and PDF materials."
        />
        <ManagementCard
          href="/admin/courses/chapters"
          title="Chapters"
          description="Add, rename, reorder chapters per subject."
        />
        <ManagementCard
          href="/admin/courses/classes"
          title="Classes"
          description="Video classes under each chapter."
        />
        <ManagementCard
          href="/admin/courses/pricing"
          title="Pricing & Discounts"
          description="Course fees and discount prices."
        />
        <ManagementCard
          href="/admin/courses/coupons"
          title="Coupons"
          description="Coupon codes students can apply at enrollment."
        />
      </div>
    </section>
  );
}

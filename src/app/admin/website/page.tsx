import { redirect } from "next/navigation";

/**
 * The old manual banner management page. Banners are now fully dynamic —
 * managed through Featured Courses, Featured Public Exams, and Featured Jerseys.
 * Redirect to the new control page.
 */
export default function WebsiteSettingsPage() {
  redirect("/admin/home-control/banner");
}

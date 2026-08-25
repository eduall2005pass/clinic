import { redirect } from "next/navigation";

export const metadata = { title: "Mentor Profiles — MediSpark Admin" };

/**
 * Mentor profiles are managed in the full mentor manager (photo, role,
 * socials, order) — route kept for compatibility.
 */
export default function MentorProfilesPage() {
  redirect("/admin/mentors/all");
}

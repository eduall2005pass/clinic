import { redirect } from "next/navigation";

// Reviews are managed by the live MySQL-backed manager — this legacy
// placeholder route forwards there so no dead-end remains in the admin IA.
export default function ContentReviewsPage() {
  redirect("/admin/website/homepage/reviews");
}

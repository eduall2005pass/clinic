import { redirect } from "next/navigation";

// Mirrors the Main Website flow — this control lives at /admin/my-enrolled-course.
export default function coursecontentcontrolPage() {
  redirect("/admin/my-enrolled-course");
}

import { redirect } from "next/navigation";

// Mirrors the Main Website flow — this control lives at /admin/course.
export default function coursecontrolPage() {
  redirect("/admin/course");
}

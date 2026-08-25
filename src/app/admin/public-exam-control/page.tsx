import { redirect } from "next/navigation";

// Mirrors the Main Website flow — this control lives at /admin/public-exam.
export default function publicexamcontrolPage() {
  redirect("/admin/public-exam");
}

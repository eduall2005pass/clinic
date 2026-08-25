import { redirect } from "next/navigation";

// Mirrors the Main Website flow — this control lives at /admin/qa.
export default function qacontrolPage() {
  redirect("/admin/qa");
}

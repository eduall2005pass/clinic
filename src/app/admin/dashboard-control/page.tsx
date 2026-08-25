import { redirect } from "next/navigation";

// Mirrors the Main Website flow — this control lives at /admin/dashboard.
export default function dashboardcontrolPage() {
  redirect("/admin/dashboard");
}

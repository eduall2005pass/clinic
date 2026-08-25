import { redirect } from "next/navigation";

export const metadata = { title: "Account Status — MediSpark Admin" };

/** Account status lives in Student Control (All / Active / Inactive tabs). */
export default function AdminStudentsAccountStatusPage() {
  redirect("/admin/student-control");
}

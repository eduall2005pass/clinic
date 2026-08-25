import { redirect } from "next/navigation";

export const metadata = { title: "Student Details — MediSpark Admin" };

/** Per-student details are managed from Student Control and Enrollments. */
export default function AdminStudentsDetailsPage() {
  redirect("/admin/students/all");
}

import type { Metadata } from "next";
import StudentProfileView from "@/components/auth/StudentProfileView";

export const metadata: Metadata = {
  title: "Student Profile",
  description:
    "View and manage your MediSpark student profile.",
};

export default function StudentProfilePage() {
  return <StudentProfileView />;
}
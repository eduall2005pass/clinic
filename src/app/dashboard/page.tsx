import type { Metadata } from "next";
import DashboardHome from "@/components/auth/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "MediSpark dashboard — track your preparation and manage your personal information.",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
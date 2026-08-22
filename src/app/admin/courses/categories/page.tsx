import type { Metadata } from "next";
import CourseCategoryManager from "@/components/admin/CourseCategoryManager";

export const metadata: Metadata = {
  title: "Categories — MediSpark Admin",
  description: "Organize courses into categories for the website.",
};

export default function CourseCategoriesPage() {
  return <CourseCategoryManager loadingLabel="Loading categories…" />;
}

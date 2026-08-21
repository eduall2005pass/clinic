import type { Metadata } from "next";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";
import { PaletteIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Theme & Appearance — MediSpark Admin",
  description: "Control website colors, fonts and overall appearance.",
};

export default function ThemeAppearancePage() {
  return <AdminPlaceholder title="Theme & Appearance" description="Control website colors, fonts and overall appearance." icon={PaletteIcon} />;
}

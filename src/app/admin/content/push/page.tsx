import type { Metadata } from "next";
import PushManager from "@/components/admin/PushManager";

export const metadata: Metadata = {
  title: "Push Notifications | MediSpark Admin",
};

export default function AdminPushPage() {
  return <PushManager />;
}

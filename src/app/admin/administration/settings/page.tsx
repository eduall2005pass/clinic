import { redirect } from "next/navigation";

export const metadata = { title: "Admin Settings — MediSpark Admin" };

/**
 * Admin panel configuration lives in Security Settings (session/lockout
 * policy) and Role Management (access matrix); the admin's own account is
 * managed under Profile. This route forwards there.
 */
export default function AdministrationSettingsPage() {
  redirect("/admin/administration/security");
}

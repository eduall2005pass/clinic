import Link from "next/link";
import DashboardHome from "@/components/auth/DashboardHome";

/**
 * Admin → Dashboard Control. Renders the EXACT Main Website Student
 * Dashboard (same layout, cards, flow) — not an admin dashboard. Authorized
 * admins get Press & Hold Edit/Remove on each card plus a "+ Add Card"
 * shortcut to the MySQL-backed card manager.
 */
export const metadata = { title: "Dashboard Control — MediSpark Admin" };

export default function DashboardControlPage() {
  return (
    <div className="relative">
      {/* Same Student Dashboard the website renders */}
      <DashboardHome adminControls />

      {/* + Add Card — natural placement, opens the live card manager */}
      <div className="flex justify-end px-4 pb-10 sm:px-6">
        <Link
          href="/admin/dashboard-control/manage"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          + Add Card
        </Link>
      </div>
    </div>
  );
}

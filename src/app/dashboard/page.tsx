import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { rolePermissions } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "MediSpark dashboard — track your preparation and manage your personal information.",
};

export default function DashboardPage() {
  return (
    <main className="flex-1 bg-neutral-50">
      <PageHeader
        title="Dashboard"
        description="Your personal dashboard — track preparation progress and manage your information. Dashboard features will be enabled after login is introduced."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-dark-900">Student</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Students will view their enrolled courses, exam results, and Q&A
              activity — and edit only their own permitted personal
              information.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {rolePermissions.student.map((permission) => (
                <li key={permission} className="flex items-center gap-2">
                  <span className="text-primary-600">✓</span> {permission}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-dark-900">Admin</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Admins will manage and edit website content — courses, exams, and
              Q&A — without accessing students&apos; personal editing rights.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {rolePermissions.admin.map((permission) => (
                <li key={permission} className="flex items-center gap-2">
                  <span className="text-primary-600">✓</span> {permission}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-primary-200 bg-primary-50 p-6 text-center">
          <p className="font-semibold text-primary-800">
            Sign in to access your dashboard.
          </p>
          <p className="mt-1 text-sm text-primary-700">
            Login will be available soon.
          </p>
        </div>
      </section>
    </main>
  );
}
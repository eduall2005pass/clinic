"use client";

import { useCallback, useEffect, useState } from "react";
import ExamCategoryCards from "@/components/ExamCategoryCards";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminGate } from "@/components/admin/admin-ui";
import ExamManager from "@/components/admin/ExamManager";

/**
 * Admin Panel → Public Exams — the SAME entry page as the main website's
 * /exam section (identical 4 category cards, layout, typography, spacing),
 * with one extra admin toolbar: "Add / Manage Exams" opens the management
 * panel (add, edit, delete, publish, questions, answer keys).
 */
export default function AdminPublicExamHub() {
  const gate = useAdminGate();
  const [showManager, setShowManager] = useState(false);

  if (!gate.ready) {
    return gate.denied ? (
      <AccessMessage title="Administrators only" message="Restricted to authorized administrators." actionLabel="Back to Admin Home" actionHref="/admin" />
    ) : (
      <AccessLoading label="Loading Public Exams…" />
    );
  }

  return (
    <main className="flex-1 bg-dark-950">
      {/* Admin-only toolbar — the website does not have this. */}
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-600/30 bg-dark-900 p-4 shadow-lg shadow-black/20 sm:p-5">
          <div>
            <h1 className="text-lg font-extrabold text-heading">Public Exams — Admin</h1>
            <p className="mt-0.5 text-sm text-neutral-400">
              Same pages students see — plus full management controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowManager((current) => !current)}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-500 active:scale-[0.98]"
          >
            {showManager ? "Hide Manager" : "+ Add / Manage Exams"}
          </button>
        </div>
      </section>

      {/* Identical category cards as the main website /exam page. */}
      <ExamCategoryCards basePath="/admin/exams/public/category" />

      {/* Management panel (add/edit/delete/publish/questions/answer keys). */}
      {showManager && (
        <ExamManager
          title="Manage Public Exams"
          description="Add, edit, delete, publish/unpublish public exams and manage their questions and answer keys."
          kindFilter={["public", "practice"]}
        />
      )}
    </main>
  );
}

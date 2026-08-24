"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccessLoading, AccessMessage } from "@/components/auth/AccessGuard";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import type { Mentor } from "@/lib/mentors";

type MentorDraft = {
  id: string;
  name: string;
  subject: string;
  qualification: string;
  isFounder: boolean;
  isCoFounder: boolean;
  isDeveloper: boolean;
  note: string;
  bio: string;
  isActive: boolean;
  photoUrl: string | null;
  socialFacebook: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialYoutube: string;
};

const SOCIAL_FIELDS: Array<{ key: "socialFacebook" | "socialInstagram" | "socialLinkedin" | "socialYoutube"; label: string; placeholder: string }> = [
  { key: "socialFacebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "socialInstagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "socialLinkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { key: "socialYoutube", label: "YouTube", placeholder: "https://youtube.com/@…" },
];

function toDraft(mentor: Mentor): MentorDraft {
  return {
    id: mentor.id,
    name: mentor.name,
    subject: mentor.subject,
    qualification: mentor.qualification ?? "",
    isFounder: mentor.isFounder,
    isCoFounder: mentor.isCoFounder,
    isDeveloper: mentor.isDeveloper,
    note: mentor.note,
    bio: mentor.bio ?? "",
    isActive: mentor.isActive,
    photoUrl: mentor.photoUrl,
    socialFacebook: mentor.socialFacebook ?? "",
    socialInstagram: mentor.socialInstagram ?? "",
    socialLinkedin: mentor.socialLinkedin ?? "",
    socialYoutube: mentor.socialYoutube ?? "",
  };
}

export default function AllMentorsPage() {
  const { user, authLoading } = useAuth();
  const toast = useAdminToast();
  const [adminStatus, setAdminStatus] = useState<"checking" | "admin" | "denied">("checking");
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<MentorDraft[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MentorDraft | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({
    name: "",
    subject: "",
    qualification: "",
    isFounder: false,
    isCoFounder: false,
    isDeveloper: false,
    note: "",
    bio: "",
    isActive: true,
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  });
  const [adding, setAdding] = useState(false);

  // Photo uploads
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const [addPhoto, setAddPhoto] = useState<File | null>(null);
  const [editPhotos, setEditPhotos] = useState<Record<string, File>>({});
  const editPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Admin check
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { isAdmin?: boolean } | null) => {
        if (!cancelled) setAdminStatus(data?.isAdmin ? "admin" : "denied");
      })
      .catch(() => {
        if (!cancelled) setAdminStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load mentors
  useEffect(() => {
    if (adminStatus !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/mentors", { cache: "no-store" });
        const data = (await res.json()) as { mentors?: Mentor[] };
        if (!cancelled && data.mentors) {
          setMentors(data.mentors.map(toDraft));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminStatus]);

  if (authLoading || adminStatus === "checking" || (adminStatus === "admin" && loading)) {
    return <AccessLoading label="Loading mentors…" />;
  }

  if (adminStatus === "denied") {
    return (
      <AccessMessage
        title="Administrators only"
        message="Mentor management is restricted to authorized administrators."
        actionLabel="Back to Admin Home"
        actionHref="/admin"
      />
    );
  }

  if (!mentors) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-semibold text-red-500">
          Failed to load mentors. Please refresh the page.
        </p>
      </section>
    );
  }

  function patchMentor(id: string, patch: Partial<MentorDraft>) {
    setMentors((prev) =>
      prev
        ? prev.map((mentor) =>
            mentor.id === id ? { ...mentor, ...patch } : mentor,
          )
        : prev,
    );
  }

  function moveMentor(index: number, direction: -1 | 1) {
    setMentors((prev) => {
      if (!prev) return prev;
      const items = [...prev];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return items;
    });
  }

  function toPayload(mentor: MentorDraft) {
    return {
      id: mentor.id,
      name: mentor.name.trim(),
      subject: mentor.subject.trim(),
      qualification: mentor.qualification.trim(),
      isFounder: mentor.isFounder,
      isCoFounder: mentor.isCoFounder,
      isDeveloper: mentor.isDeveloper,
      note: mentor.note.trim(),
      bio: mentor.bio.trim(),
      initials: mentor.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      isActive: mentor.isActive,
      socialFacebook: mentor.socialFacebook.trim() || null,
      socialInstagram: mentor.socialInstagram.trim() || null,
      socialLinkedin: mentor.socialLinkedin.trim() || null,
      socialYoutube: mentor.socialYoutube.trim() || null,
    };
  }

  async function handleAdd() {
    if (!user || !mentors) return;
    if (addForm.name.trim().length === 0) {
      toast.showToast("error", "Mentor name is required.");
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      // Step 1: save the mentor via bulk PUT (creates with next sort order).
      const response = await fetch("/api/mentors", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentors: [
            ...mentors.map(toPayload),
            {
              name: addForm.name.trim(),
              subject: addForm.subject.trim(),
              qualification: addForm.qualification.trim(),
              isFounder: addForm.isFounder,
              isCoFounder: addForm.isCoFounder,
              isDeveloper: addForm.isDeveloper,
              note: addForm.note.trim(),
              bio: addForm.bio.trim(),
              isActive: addForm.isActive,
              socialFacebook: addForm.facebook.trim() || null,
              socialInstagram: addForm.instagram.trim() || null,
              socialLinkedin: addForm.linkedin.trim() || null,
              socialYoutube: addForm.youtube.trim() || null,
            },
          ],
        }),
      });
      const data = (await response.json()) as { error?: string; mentors?: Mentor[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to add the mentor.");
        return;
      }
      let updated = data.mentors ?? [];
      // Step 2: upload photo for the newly created mentor.
      if (addPhoto) {
        const created =
          updated.find(
            (mentor) =>
              mentor.name.toLowerCase() === addForm.name.trim().toLowerCase(),
          ) ?? updated[updated.length - 1];
        if (created) {
          const formData = new FormData();
          formData.append("id", created.id);
          formData.append("photo", addPhoto);
          const photoResponse = await fetch("/api/mentors", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const photoData = (await photoResponse.json()) as {
            error?: string;
            mentors?: Mentor[];
          };
          if (photoResponse.ok && photoData.mentors) {
            updated = photoData.mentors;
          } else {
            toast.showToast(
              "error",
              photoData.error ?? "Mentor added but the photo failed to upload.",
            );
          }
        }
      }
      setMentors(updated.map(toDraft));
      setAddForm({
        name: "",
        subject: "",
        qualification: "",
        isFounder: false,
        isCoFounder: false,
        isDeveloper: false,
        note: "",
        bio: "",
        isActive: true,
        facebook: "",
        instagram: "",
        linkedin: "",
        youtube: "",
      });
      setAddPhoto(null);
      if (addPhotoRef.current) addPhotoRef.current.value = "";
      toast.showToast("success", "Mentor added successfully.");
    } catch {
      toast.showToast("error", "Failed to add the mentor.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveMentor(mentor: MentorDraft) {
    if (!user || !mentors) return;
    if (mentor.name.trim().length === 0) {
      toast.showToast("error", "Mentor name is required.");
      return;
    }
    setSavingId(mentor.id);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      // Persist full ordered list so order changes are saved too.
      const response = await fetch("/api/mentors", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mentors: mentors.map(toPayload) }),
      });
      const data = (await response.json()) as { error?: string; mentors?: Mentor[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to save the mentor.");
        return;
      }
      // Upload replacement photo if selected.
      const photo = editPhotos[mentor.id];
      if (photo) {
        const formData = new FormData();
        formData.append("id", mentor.id);
        formData.append("photo", photo);
        const photoResponse = await fetch("/api/mentors", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const photoData = (await photoResponse.json()) as {
          error?: string;
          mentors?: Mentor[];
        };
        if (!photoResponse.ok) {
          toast.showToast("error", photoData.error ?? "Failed to upload the photo.");
          return;
        }
        if (photoData.mentors) {
          setMentors(photoData.mentors.map(toDraft));
          setEditPhotos((prev) => {
            const next = { ...prev };
            delete next[mentor.id];
            return next;
          });
          const ref = editPhotoRefs.current[mentor.id];
          if (ref) ref.value = "";
          toast.showToast("success", "Mentor and photo saved.");
          return;
        }
      }
      toast.showToast("success", "Mentor saved. Live website updated.");
    } catch {
      toast.showToast("error", "Failed to save the mentor.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(mentor: MentorDraft) {
    if (!user) return;
    setBusyIds((prev) => new Set(prev).add(mentor.id));
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/mentors", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: mentor.id }),
      });
      const data = (await response.json()) as { error?: string; mentors?: Mentor[] };
      if (!response.ok) {
        toast.showToast("error", data.error ?? "Failed to delete the mentor.");
        return;
      }
      setMentors((data.mentors ?? []).map(toDraft));
      toast.showToast("success", "Mentor deleted.");
    } catch {
      toast.showToast("error", "Failed to delete the mentor.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(mentor.id);
        return next;
      });
    }
  }

  async function handleSaveOrder() {
    if (!user || !mentors) return;
    setSavingOrder(true);
    setNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/mentors", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mentors: mentors.map(toPayload) }),
      });
      if (!response.ok) {
        toast.showToast("error", "Failed to save the order.");
        return;
      }
      toast.showToast("success", "Display order saved. Live website updated.");
    } catch {
      toast.showToast("error", "Failed to save the order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors duration-300 sm:p-6 admin-dark:border-zinc-800 admin-dark:bg-zinc-900";
  const inputClass =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-primary-500/60 focus:bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:text-zinc-100";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-zinc-400";

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 admin-dark:text-zinc-50">
          All Mentors
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 admin-dark:text-zinc-400">
          Add, edit, reorder or hide mentors shown on the homepage. Changes go
          live immediately after saving.
        </p>
      </header>

      {/* Add mentor */}
      <div className={`${cardClass} mt-6`}>
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          Add New Mentor
        </h3>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Name *</span>
              <input
                type="text"
                value={addForm.name}
                maxLength={255}
                onChange={(event) => setAddForm({ ...addForm, name: event.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Designation / Subject</span>
              <input
                type="text"
                value={addForm.subject}
                maxLength={255}
                placeholder="Subject Teacher"
                onChange={(event) => setAddForm({ ...addForm, subject: event.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Qualification</span>
              <input
                type="text"
                value={addForm.qualification}
                maxLength={255}
                placeholder="MBBS, ShSMC"
                onChange={(event) => setAddForm({ ...addForm, qualification: event.target.value })}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-end gap-4 pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={addForm.isFounder}
                  onChange={(event) => setAddForm({ ...addForm, isFounder: event.target.checked })}
                  className="h-4 w-4 accent-primary-600"
                />
                Show Founder
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={addForm.isCoFounder}
                  onChange={(event) => setAddForm({ ...addForm, isCoFounder: event.target.checked })}
                  className="h-4 w-4 accent-primary-600"
                />
                Show Co-Founder
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={addForm.isDeveloper}
                  onChange={(event) => setAddForm({ ...addForm, isDeveloper: event.target.checked })}
                  className="h-4 w-4 accent-primary-600"
                />
                Show Developer
              </label>
            </div>
          </div>
          <label className="block">
            <span className={labelClass}>Short Note</span>
            <input
              type="text"
              value={addForm.note}
              maxLength={1000}
              onChange={(event) => setAddForm({ ...addForm, note: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Bio</span>
            <textarea
              value={addForm.bio}
              rows={3}
              maxLength={2000}
              onChange={(event) => setAddForm({ ...addForm, bio: event.target.value })}
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className={labelClass}>{field.label}</span>
                <input
                  type="url"
                  value={
                    addForm[
                      field.key === "socialFacebook"
                        ? "facebook"
                        : field.key === "socialInstagram"
                          ? "instagram"
                          : field.key === "socialLinkedin"
                            ? "linkedin"
                            : "youtube"
                    ]
                  }
                  placeholder={field.placeholder}
                  onChange={(event) => {
                    const formKey =
                      field.key === "socialFacebook"
                        ? "facebook"
                        : field.key === "socialInstagram"
                          ? "instagram"
                          : field.key === "socialLinkedin"
                            ? "linkedin"
                            : "youtube";
                    setAddForm({ ...addForm, [formKey]: event.target.value });
                  }}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className={labelClass}>Photo</span>
            <input
              ref={addPhotoRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={(event) => setAddPhoto(event.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
            />
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
            <input
              type="checkbox"
              checked={addForm.isActive}
              onChange={(event) => setAddForm({ ...addForm, isActive: event.target.checked })}
              className="h-4 w-4 accent-primary-600"
            />
            Show on website
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-fit rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-900/30 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add Mentor"}
          </button>
        </div>
      </div>

      {/* Existing mentors */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-zinc-900 admin-dark:text-zinc-100">
          All Mentors ({mentors.length})
        </h3>
        <button
          type="button"
          onClick={handleSaveOrder}
          disabled={savingOrder}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:opacity-60 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
        >
          {savingOrder ? "Saving…" : "Save Order"}
        </button>
      </div>

      <ul className="mt-3 space-y-3">
        {mentors.length === 0 && (
          <li className={cardClass}>
            <p className="py-4 text-center text-sm font-semibold text-zinc-500">
              No mentors yet. Add the first one above.
            </p>
          </li>
        )}
        {mentors.map((mentor, index) => {
          const busy = busyIds.has(mentor.id);
          const saving = savingId === mentor.id;
          const editPhoto = editPhotos[mentor.id];
          return (
            <li key={mentor.id} className={`${cardClass} ${mentor.isActive ? "" : "opacity-75"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-primary-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      editPhoto
                        ? URL.createObjectURL(editPhoto)
                        : mentor.photoUrl ?? ""
                    }
                    alt={mentor.name}
                    className={`h-full w-full object-cover ${mentor.photoUrl || editPhoto ? "" : "hidden"}`}
                  />
                  {!mentor.photoUrl && !editPhoto && (
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">
                      {mentor.name
                        .trim()
                        .split(/\s+/)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900 admin-dark:text-zinc-100">
                    {mentor.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{mentor.subject || "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${mentor.name} up`}
                    onClick={() => moveMentor(index, -1)}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${mentor.name} down`}
                    onClick={() => moveMentor(index, 1)}
                    disabled={index === mentors.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs text-zinc-600 transition hover:border-primary-500/50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-300"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mentor.isActive}
                    aria-label={`Toggle ${mentor.name}`}
                    onClick={() => patchMentor(mentor.id, { isActive: !mentor.isActive })}
                    className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition ${
                      mentor.isActive ? "bg-primary-600" : "bg-zinc-300 admin-dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        mentor.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Name *</span>
                    <input
                      type="text"
                      value={mentor.name}
                      maxLength={255}
                      onChange={(event) => patchMentor(mentor.id, { name: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Designation / Subject</span>
                    <input
                      type="text"
                      value={mentor.subject}
                      maxLength={255}
                      placeholder="Subject Teacher"
                      onChange={(event) => patchMentor(mentor.id, { subject: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Qualification</span>
                    <input
                      type="text"
                      value={mentor.qualification}
                      maxLength={255}
                      placeholder="MBBS, ShSMC"
                      onChange={(event) => patchMentor(mentor.id, { qualification: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-4 pb-1">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={mentor.isFounder}
                        onChange={(event) => patchMentor(mentor.id, { isFounder: event.target.checked })}
                        className="h-4 w-4 accent-primary-600"
                      />
                      Show Founder
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={mentor.isCoFounder}
                        onChange={(event) => patchMentor(mentor.id, { isCoFounder: event.target.checked })}
                        className="h-4 w-4 accent-primary-600"
                      />
                      Show Co-Founder
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 admin-dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={mentor.isDeveloper}
                        onChange={(event) => patchMentor(mentor.id, { isDeveloper: event.target.checked })}
                        className="h-4 w-4 accent-primary-600"
                      />
                      Show Developer
                    </label>
                  </div>
                </div>
                <label className="block">
                  <span className={labelClass}>Short Note</span>
                  <input
                    type="text"
                    value={mentor.note}
                    maxLength={1000}
                    onChange={(event) => patchMentor(mentor.id, { note: event.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Bio</span>
                  <textarea
                    value={mentor.bio}
                    rows={3}
                    maxLength={2000}
                    onChange={(event) => patchMentor(mentor.id, { bio: event.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map((field) => (
                    <label key={field.key} className="block">
                      <span className={labelClass}>{field.label}</span>
                      <input
                        type="url"
                        value={mentor[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          patchMentor(mentor.id, { [field.key]: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className={labelClass}>Replace Photo</span>
                  <input
                    ref={(el) => {
                      editPhotoRefs.current[mentor.id] = el;
                    }}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file)
                        setEditPhotos((prev) => ({ ...prev, [mentor.id]: file }));
                    }}
                    className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 admin-dark:border-zinc-800">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    mentor.isActive
                      ? "bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-500 admin-dark:bg-zinc-800 admin-dark:text-zinc-400"
                  }`}
                >
                  {mentor.isActive ? "Shown" : "Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveMentor(mentor)}
                  disabled={busy || saving}
                  className="ml-auto rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(mentor)}
                  disabled={busy}
                  className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/15 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {notice && (
        <p
          role="status"
          className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 admin-dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 admin-dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        title="Delete this mentor?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the live website permanently.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}

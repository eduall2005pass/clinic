"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateStudentProfile } from "@/lib/student-id";

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-dark-950 px-4 py-3 text-sm text-heading placeholder-neutral-500 outline-none transition focus:border-primary-500/70 focus:ring-2 focus:ring-primary-500/20";

const readOnlyClass =
  "w-full rounded-xl border border-ink/10 bg-dark-800 px-4 py-3 text-sm text-neutral-300";

const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-400";

type InfoField = {
  label: string;
  value: string;
  href?: string;
};

export default function StudentProfileView() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading, configured, refreshProfile, logout } =
    useAuth();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, configured, router]);

  useEffect(() => {
    if (profile) {
      // Sync editable fields with the latest Firestore profile.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(profile.fullName);
       
      setInstitution(profile.institution);
       
      setPictureUrl(profile.profilePictureUrl);
    }
  }, [profile]);

  if (authLoading || profileLoading || !user || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Loading your profile...</p>
        </div>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handlePictureChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    setError(null);
    setPictureFile(file);
    setPictureUrl(URL.createObjectURL(file));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const trimmedName = fullName.trim();
    const trimmedInstitution = institution.trim();
    if (!trimmedName || !trimmedInstitution) {
      setError("Name and institution cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateStudentProfile(
        user,
        {
          fullName: trimmedName,
          gender: profile.gender,
          institution: trimmedInstitution,
          hscBatch: profile.hscBatch,
          contactNumber: profile.contactNumber,
          email: profile.email,
          facebookUrl: profile.facebookUrl,
        },
        pictureFile,
      );

      await refreshProfile();
      setPictureFile(null);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const infoFields: InfoField[] = [
    { label: "Student ID", value: profile.studentId },
    { label: "Gender", value: profile.gender },
    { label: "HSC Batch", value: profile.hscBatch },
    { label: "Contact Number", value: profile.contactNumber },
    { label: "Email", value: profile.email },
    {
      label: "Facebook Account",
      value: profile.facebookUrl || "Not provided",
      href: profile.facebookUrl || undefined,
    },
  ];

  const editableFields: InfoField[] = [
    { label: "Institution", value: editing ? institution : profile.institution },
  ];

  return (
    <main className="flex-1 bg-dark-950">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-dark-900 shadow-lg shadow-black/20">
          <div className="pointer-events-none absolute inset-0 bg-medical-cross opacity-50" />
          <div className="relative h-20 bg-gradient-to-r from-primary-700 via-primary-800 to-[#0a0a0a]" />

          <div className="relative px-6 pb-6 pt-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative -mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dark-900 bg-dark-800 shadow-lg shadow-black/40">
                  {profile.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.profilePictureUrl}
                      alt={profile.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      className="h-full w-full p-4 text-neutral-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-heading">
                    {profile.fullName}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-neutral-400">
                    ID: {profile.studentId}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setFullName(profile.fullName);
                      setInstitution(profile.institution);
                      setPictureUrl(profile.profilePictureUrl);
                      setPictureFile(null);
                      setError(null);
                      setEditing(true);
                    }}
                    className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
                  >
                    Edit Profile
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-primary-500/40 bg-primary-600/10 px-4 py-2.5 text-sm font-semibold text-primary-300 transition hover:bg-primary-600/20"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[...editableFields, ...infoFields].map((field) => (
                <div key={field.label}>
                  <p className={labelClass}>{field.label}</p>
                  {field.href ? (
                    <a
                      href={field.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate rounded-xl border border-ink/10 bg-dark-800 px-4 py-3 text-sm text-primary-300 transition hover:border-primary-500/50"
                    >
                      {field.value}
                    </a>
                  ) : (
                    <p className={readOnlyClass}>{field.value}</p>
                  )}
                </div>
              ))}
            </div>

            {editing && (
              <form
                onSubmit={handleSave}
                className="mt-8 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-5"
              >
                <h3 className="text-sm font-bold text-heading">Edit Profile</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  You can update your profile picture, name, and institution.
                  Other details are managed by your account.
                </p>

                <div className="mt-4 flex flex-col items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-dark-800 bg-dark-800">
                      {pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pictureUrl}
                          alt="Profile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg
                          className="h-full w-full p-3 text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21a8 8 0 0 1 16 0" />
                        </svg>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handlePictureChange(event.target.files?.[0])
                      }
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-xs font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
                    >
                      {pictureFile ? "Replace Photo" : "Change Photo"}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="editName" className={labelClass}>
                    Full Name
                  </label>
                  <input
                    id="editName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="editInstitution" className={labelClass}>
                    Institution
                  </label>
                  <input
                    id="editInstitution"
                    type="text"
                    value={institution}
                    onChange={(event) => setInstitution(event.target.value)}
                    className={inputClass}
                  />
                </div>

                {error && (
                  <p className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setError(null);
                      setPictureFile(null);
                      setFullName(profile.fullName);
                      setInstitution(profile.institution);
                      setPictureUrl(profile.profilePictureUrl);
                    }}
                    className="rounded-xl border border-ink/15 bg-ink/5 px-5 py-2.5 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
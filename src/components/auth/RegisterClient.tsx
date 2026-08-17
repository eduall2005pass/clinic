"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { saveProfileWithUniqueStudentId } from "@/lib/student-id";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const GENDERS = ["Male", "Female", "Other"];

function hscBatches(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear - 6; year <= currentYear + 2; year++) {
    years.push(String(year));
  }
  return years;
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-dark-950 px-4 py-3 text-sm text-heading placeholder-neutral-500 outline-none transition focus:border-primary-500/70 focus:ring-2 focus:ring-primary-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-400";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { user, profile, authLoading, configured } = useAuth();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [institution, setInstitution] = useState("");
  const [hscBatch, setHscBatch] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || !configured) return;
    if (!user) {
      router.replace(
        next ? `/login?next=${encodeURIComponent(next)}` : "/login",
      );
      return;
    }
    if (profile) {
      router.replace(next || "/dashboard");
    }
  }, [user, profile, authLoading, configured, router, next]);

  useEffect(() => {
    if (!user) return;
    // Prefill the registration form with the Google account's details.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName((previous) => previous || user.displayName || "");
     
    setPictureUrl((previous) => previous || user.photoURL || "");
  }, [user]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !db) return;

    const trimmedName = fullName.trim();
    const trimmedInstitution = institution.trim();
    const trimmedContact = contactNumber.trim();
    const trimmedFacebook = facebookUrl.trim();

    if (!trimmedName || !gender || !trimmedInstitution || !hscBatch || !trimmedContact) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let finalPictureUrl = pictureUrl;
      if (pictureFile) {
        if (!storage) {
          throw new Error("Firebase Storage is not configured.");
        }
        const extension = pictureFile.name.split(".").pop() || "jpg";
        const fileRef = ref(
          storage,
          `student-profiles/${user.uid}/profile-picture-${Date.now()}.${extension}`,
        );
        await uploadBytes(fileRef, pictureFile);
        finalPictureUrl = await getDownloadURL(fileRef);
      }

      await saveProfileWithUniqueStudentId(db, user.uid, {
        fullName: trimmedName,
        gender,
        institution: trimmedInstitution,
        hscBatch,
        contactNumber: trimmedContact,
        email: user.email ?? "",
        facebookUrl: trimmedFacebook,
        profilePictureUrl: finalPictureUrl,
      });

      router.replace(next || "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-dark-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-neutral-dots opacity-60" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary-900/30 blur-3xl" />

      <div className="relative w-full max-w-xl rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-2xl shadow-black/40">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold text-heading">
          Complete Your Registration
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Welcome! Finish your MediSpark student profile to continue. Your Student
          ID will be generated automatically.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-dark-800 bg-dark-800 shadow-lg shadow-black/40">
              {pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pictureUrl}
                  alt="Profile preview"
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handlePictureChange(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-ink/15 bg-ink/5 px-4 py-2 text-sm font-semibold text-heading transition hover:border-primary-500/60 hover:bg-primary-600/15 hover:text-primary-400"
            >
              {pictureFile ? "Replace Photo" : "Change Photo"}
            </button>
          </div>

          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full Name *
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email (from your Google account)
            </label>
            <input
              id="email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className={`${inputClass} cursor-not-allowed opacity-60`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="gender" className={labelClass}>
                Gender *
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select gender
                </option>
                {GENDERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hscBatch" className={labelClass}>
                HSC Batch *
              </label>
              <select
                id="hscBatch"
                value={hscBatch}
                onChange={(event) => setHscBatch(event.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select batch year
                </option>
                {hscBatches().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="institution" className={labelClass}>
              Institution *
            </label>
            <input
              id="institution"
              type="text"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="Your college or institution"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="contactNumber" className={labelClass}>
              Contact Number *
            </label>
            <input
              id="contactNumber"
              type="tel"
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              placeholder="e.g. 01XXXXXXXXX"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="facebookUrl" className={labelClass}>
              Facebook Account Link
            </label>
            <input
              id="facebookUrl"
              type="url"
              value={facebookUrl}
              onChange={(event) => setFacebookUrl(event.target.value)}
              placeholder="https://facebook.com/yourprofile"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !user}
            className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Completing Registration..." : "Complete Registration"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block rounded-xl border border-ink/15 bg-ink/5 px-6 py-3 text-center font-semibold text-heading transition hover:border-primary-500/60 hover:bg-ink/10"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { user, profile, authLoading, profileLoading, configured, signInWithGoogle } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  useEffect(() => {
    if (authLoading || !configured) return;
    if (user && !profileLoading) {
      router.replace(profile ? next || "/dashboard" : registerHref);
    }
  }, [user, profile, profileLoading, authLoading, configured, router, next, registerHref]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setError(null);
    try {
      const studentProfile = await signInWithGoogle();
      router.replace(studentProfile ? next || "/dashboard" : registerHref);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google sign-in failed. Please try again.",
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-dark-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-neutral-dots opacity-60" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary-900/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-ink/10 bg-dark-900 p-8 shadow-2xl shadow-black/40">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold text-heading">
          Login to MediSpark
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Continue with your Google account to access your student dashboard.
        </p>

        {!configured ? (
          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-center">
            <p className="text-sm font-semibold text-yellow-400">
              Firebase is not configured yet
            </p>
            <p className="mt-1 text-xs text-yellow-200/70">
              Add your Firebase environment variables to enable Google sign-in.
              See <code className="rounded bg-yellow-500/10 px-1">.env.example</code> for
              the required keys.
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn || authLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 font-semibold text-neutral-900 shadow-lg transition hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {signingIn ? "Signing in..." : "Continue with Google"}
            </button>

            {error && (
              <p className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/10 p-3 text-center text-sm text-primary-300">
                {error}
              </p>
            )}

            <p className="mt-5 text-center text-xs text-neutral-500">
              New students are automatically taken to complete their registration
              after the first Google sign-in.
            </p>
          </>
        )}

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
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to MediSpark — HSC academic and medical admission preparation.",
};

export default function LoginPage() {
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
          The full login system will be added in an upcoming step. Both
          Student and Admin accounts will be supported.
        </p>
        <div className="mt-8 rounded-xl border border-primary-500/30 bg-primary-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-primary-300">
            Login is coming soon
          </p>
          <p className="mt-1 text-xs text-primary-200/70">
            No login or registration is available yet — this is just the entry
            point for the future authentication system.
          </p>
        </div>
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
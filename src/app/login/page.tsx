import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to MediSpark — HSC academic and medical admission preparation.",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-dark-950 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900 p-8 shadow-2xl">
        <div className="flex justify-center">
          <Logo light />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold text-white">
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
          <p className="mt-1 text-xs text-primary-200/80">
            No login or registration is available yet — this is just the entry
            point for the future authentication system.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 block rounded-xl border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
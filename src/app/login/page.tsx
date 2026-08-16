import type { Metadata } from "next";
import LoginClient from "@/components/auth/LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to MediSpark — HSC academic and medical admission preparation.",
};

export default function LoginPage() {
  return <LoginClient />;
}
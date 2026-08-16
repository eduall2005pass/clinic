import type { Metadata } from "next";
import RegisterClient from "@/components/auth/RegisterClient";

export const metadata: Metadata = {
  title: "Complete Registration",
  description:
    "Complete your MediSpark student registration — HSC academic and medical admission preparation.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
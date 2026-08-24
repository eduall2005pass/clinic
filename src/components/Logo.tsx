"use client";

import { useState } from "react";
import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";
import { useTheme } from "@/components/ThemeProvider";
import { DEFAULT_LOGO } from "@/lib/logo";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const { logo, light, dark } = useLogo();
  const { theme } = useTheme();
  const [failedSource, setFailedSource] = useState<string | null>(null);

  // Theme-based dual logo: the VISITOR'S CURRENT THEME decides which logo is
  // shown. Falls back to the shared logo, then the default — never by upload
  // time or admin preference.
  const themed =
    theme === "light" ? (light ?? logo) : (dark ?? logo);

  const imageClass =
    size === "large"
      ? "h-auto w-full object-contain"
      : "h-9 w-auto object-contain sm:h-10";
  const logoSource = `${themed.url}:${themed.updatedAt}`;
  const active = failedSource === logoSource ? DEFAULT_LOGO : themed;
  // Ensure browser cache bust: active.url already contains ?v= on MySQL path,
  // but defensively add if missing and updatedAt exists.
  const displayUrl =
    active.updatedAt > 0 && !active.url.includes("v=")
      ? `${active.url}${active.url.includes("?") ? "&" : "?"}v=${active.updatedAt}`
      : active.url;

  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <Image
        key={displayUrl}
        src={displayUrl}
        alt="MediSpark — Together we Achieve Dream"
        width={active.width}
        height={active.height}
        priority
        unoptimized={displayUrl.startsWith("/api/files/") || displayUrl.startsWith("/uploads/")}
        onError={() => setFailedSource(logoSource)}
        className={imageClass}
      />
    </span>
  );
}

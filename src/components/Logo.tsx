"use client";

import { useState } from "react";
import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";
import { DEFAULT_LOGO } from "@/lib/logo";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const { logo } = useLogo();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageClass =
    size === "large"
      ? "h-auto w-full object-contain"
      : "h-9 w-auto object-contain sm:h-10";
  const logoSource = `${logo.url}:${logo.updatedAt}`;
  const active = failedSource === logoSource ? DEFAULT_LOGO : logo;
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
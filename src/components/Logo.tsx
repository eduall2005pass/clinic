"use client";

import { useState } from "react";
import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";
import { DEFAULT_LOGO } from "@/lib/logo";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const { logo } = useLogo();
  const [failed, setFailed] = useState(false);
  const imageClass =
    size === "large"
      ? "h-auto w-full object-contain"
      : "h-9 w-auto object-contain sm:h-10";

  const active = failed ? DEFAULT_LOGO : logo;

  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <Image
        src={active.url}
        alt="MediSpark — Together we Achieve Dream"
        width={active.width}
        height={active.height}
        priority
        onError={() => setFailed(true)}
        className={imageClass}
      />
    </span>
  );
}
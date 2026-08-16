"use client";

import Image from "next/image";
import { useLogo } from "@/components/LogoProvider";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const { logo } = useLogo();
  const imageClass =
    size === "large"
      ? "h-auto w-full object-contain"
      : "h-9 w-auto object-contain sm:h-10";

  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <Image
        src={logo.url}
        alt="MediSpark — Together we Achieve Dream"
        width={logo.width}
        height={logo.height}
        priority
        className={imageClass}
      />
    </span>
  );
}
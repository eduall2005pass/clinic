import Image from "next/image";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
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
        src="/medispark_logo_transparent.png"
        alt="MediSpark — Together we Achieve Dream"
        width={1536}
        height={683}
        priority
        className={imageClass}
      />
    </span>
  );
}
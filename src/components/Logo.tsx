import Image from "next/image";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const containerClass =
    size === "large"
      ? "flex items-center overflow-hidden rounded-lg border border-primary-950/60 bg-black/90 px-2 py-0.5 shadow-[0_0_18px_rgba(229,9,20,0.25)]"
      : "flex items-center overflow-hidden rounded-lg border border-primary-950/60 bg-black/90 p-1 shadow-[0_0_18px_rgba(229,9,20,0.25)]";

  const imageClass =
    size === "large" ? "h-10 w-auto object-contain sm:h-11" : "h-9 w-auto object-contain sm:h-10";

  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <span className={containerClass}>
        <Image
          src="/medispark-official-logo.jpg"
          alt="MediSpark — Together we Achieve Dream"
          width={180}
          height={44}
          priority
          className={imageClass}
        />
      </span>
    </span>
  );
}
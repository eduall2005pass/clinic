import Image from "next/image";

export default function Logo({ size = "default" }: { size?: "default" | "large" }) {
  const imageClass =
    size === "large" ? "h-10 w-auto object-contain sm:h-11" : "h-9 w-auto object-contain sm:h-10";

  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <Image
        src="/medispark-official-logo.jpg"
        alt="MediSpark — Together we Achieve Dream"
        width={180}
        height={44}
        priority
        className={imageClass}
      />
    </span>
  );
}
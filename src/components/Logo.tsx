import Image from "next/image";

export default function Logo() {
  return (
    <span
      className="inline-flex select-none items-center"
      aria-label="MediSpark — Together we Achieve Dream"
    >
      <span className="flex items-center overflow-hidden rounded-lg border border-primary-950/60 bg-black/90 p-1 shadow-[0_0_18px_rgba(229,9,20,0.25)]">
        <Image
          src="/medispark-official-logo.jpg"
          alt="MediSpark — Together we Achieve Dream"
          width={180}
          height={44}
          priority
          className="h-9 w-auto object-contain sm:h-10"
        />
      </span>
    </span>
  );
}
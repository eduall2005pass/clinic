import Link from "next/link";
import {
  fetchActivePromotions,
  type Promotion,
} from "@/lib/promotions";

function PromotionCard({
  promotion,
  accent,
}: {
  promotion: Promotion;
  accent: string;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border bg-dark-900 p-6 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 ${accent}`}
    >
      <h3 className="text-lg font-extrabold text-heading">
        {promotion.title}
      </h3>
      {promotion.description && (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
          {promotion.description}
        </p>
      )}
      {promotion.linkHref && (
        <Link
          href={promotion.linkHref}
          className="mt-4 inline-block self-start rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/40 transition hover:bg-primary-700 active:scale-[0.98]"
        >
          Learn More →
        </Link>
      )}
    </article>
  );
}

/** Active offers + campaigns within their date window — live website only. */
export default async function PromotionsSection() {
  const [offers, campaigns] = await Promise.all([
    fetchActivePromotions("offer"),
    fetchActivePromotions("campaign"),
  ]);

  if (offers.length === 0 && campaigns.length === 0) return null;

  const items = [
    ...campaigns.map((promotion) => ({ promotion, accent: "border-primary-600/50 hover:border-primary-500" })),
    ...offers.map((promotion) => ({ promotion, accent: "border-emerald-500/30 hover:border-emerald-400/60" })),
  ];

  return (
    <section id="promotions" className="scroll-mt-24 border-t border-ink/5 bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-primary-500">
          What&apos;s happening now
        </p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ promotion, accent }) => (
            <PromotionCard
              key={`${promotion.kind}-${promotion.id}`}
              promotion={promotion}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

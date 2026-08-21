"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCategories,
  adminProfileCategory,
  type AdminCategory,
} from "@/lib/admin-nav";
import { SearchIcon } from "@/components/admin/icons";

type SearchEntry = {
  label: string;
  href: string;
  section: string;
};

const SEARCH_INDEX: SearchEntry[] = [
  ...adminCategories,
  adminProfileCategory,
].flatMap((category: AdminCategory) => [
  { label: category.name, href: category.href, section: "Section" },
  ...category.subsections.map((sub) => ({
    label: sub.label,
    href: sub.href,
    section: category.name,
  })),
]);

export default function AdminSearch({
  autoFocus = false,
  onNavigate,
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return SEARCH_INDEX.filter(
      (entry) =>
        entry.label.toLowerCase().includes(trimmed) ||
        entry.section.toLowerCase().includes(trimmed)
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function go(href: string) {
    setQuery("");
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition focus-within:border-primary-500/60 focus-within:bg-white md:flex admin-dark:border-zinc-700 admin-dark:bg-zinc-800 admin-dark:focus-within:bg-zinc-800">
        <SearchIcon className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          type="search"
          autoFocus={autoFocus}
          value={query}
          placeholder="Search sections…"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results.length > 0) {
              go(results[0].href);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          aria-label="Search Admin Panel sections"
          className="w-full min-w-0 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 admin-dark:text-zinc-100"
        />
      </label>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-black/10 admin-dark:border-zinc-700 admin-dark:bg-zinc-900">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm font-semibold text-zinc-500">
              No matching sections found.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((entry) => (
                <li key={entry.label + entry.href}>
                  <button
                    type="button"
                    onClick={() => go(entry.href)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-neutral-50 admin-dark:hover:bg-zinc-800"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-zinc-700 admin-dark:text-zinc-200">
                      {entry.label}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {entry.section}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

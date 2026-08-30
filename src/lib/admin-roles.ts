/**
 * Client-safe role constants.
 *
 * Do NOT import "@/lib/administration" or "@/lib/mysql" here — this module is
 * pulled into browser bundles (client components). Keeping the role constants
 * isolated avoids dragging the server-only mysql2 stack into the client bundle,
 * which otherwise breaks `next build` (net/tls can't be resolved in the browser).
 */

export const AVAILABLE_ROLES = [
  "admin",
  "moderator",
  "teacher",
] as const;

export type AdminRole = (typeof AVAILABLE_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  teacher: "Teacher",
};

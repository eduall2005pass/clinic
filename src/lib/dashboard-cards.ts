import { exec, isMysqlConfigured, query } from "@/lib/mysql";
import {
  DASHBOARD_ICON_OPTIONS,
  type DashboardIconName,
} from "@/lib/dashboard";

/** One custom card on the Student Dashboard — managed via Dashboard Control. */
export type DashboardCard = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  isActive: boolean;
  order: number;
};

type DashboardCardRow = {
  card_key: string;
  title: string;
  description: string | null;
  href: string;
  icon: string;
  is_active: number | boolean;
  sort_order: number;
};

export function isDashboardIconName(value: unknown): value is DashboardIconName {
  return (
    typeof value === "string" &&
    (DASHBOARD_ICON_OPTIONS as readonly string[]).includes(value)
  );
}

async function ensureSchema(): Promise<void> {
  // GIPK databases generate an invisible my_row_id PK — the logical key
  // lives in the uq_dashboard_cards_pk UNIQUE index (see AGENTS.md).
  await exec(
    `CREATE TABLE IF NOT EXISTS dashboard_cards (
      card_key VARCHAR(191) NOT NULL,
      title VARCHAR(191) NOT NULL,
      description VARCHAR(512) NULL,
      href VARCHAR(512) NOT NULL,
      icon VARCHAR(64) NOT NULL DEFAULT 'book',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dashboard_cards_pk (card_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

function rowToCard(row: DashboardCardRow): DashboardCard {
  return {
    key: row.card_key,
    title: row.title,
    description: row.description ?? "",
    href: row.href,
    icon: row.icon,
    isActive: Boolean(row.is_active),
    order: Number(row.sort_order),
  };
}

function generateCardKey(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Every card (including hidden ones) — used by the admin manager. */
export async function fetchAllDashboardCards(): Promise<DashboardCard[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureSchema();
    const rows = await query<DashboardCardRow[]>(
      `SELECT card_key, title, description, href, icon, is_active, sort_order
       FROM dashboard_cards ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.map(rowToCard);
  } catch {
    return [];
  }
}

/** Active cards only — used by the live student dashboard. */
export async function fetchActiveDashboardCards(): Promise<DashboardCard[]> {
  if (!isMysqlConfigured) return [];
  try {
    await ensureSchema();
    const rows = await query<DashboardCardRow[]>(
      `SELECT card_key, title, description, href, icon, is_active, sort_order
       FROM dashboard_cards WHERE is_active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    );
    return rows.map(rowToCard);
  } catch {
    return [];
  }
}

export async function insertDashboardCard(input: {
  title: string;
  description: string;
  href: string;
  icon: string;
}): Promise<DashboardCard[]> {
  await ensureSchema();
  const maxRow = await query<{ next_order: number }[]>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM dashboard_cards",
  );
  await exec(
    `INSERT INTO dashboard_cards (card_key, title, description, href, icon, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      generateCardKey(),
      input.title,
      input.description || null,
      input.href,
      input.icon,
      Number(maxRow[0]?.next_order ?? 1),
    ],
  );
  return fetchAllDashboardCards();
}

export type DashboardCardPatch = {
  title?: string;
  description?: string;
  href?: string;
  icon?: string;
  isActive?: boolean;
};

export async function updateDashboardCard(
  key: string,
  patch: DashboardCardPatch,
): Promise<DashboardCard[]> {
  await ensureSchema();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.title !== undefined) {
    sets.push("title = ?");
    values.push(patch.title);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    values.push(patch.description || null);
  }
  if (patch.href !== undefined) {
    sets.push("href = ?");
    values.push(patch.href);
  }
  if (patch.icon !== undefined) {
    sets.push("icon = ?");
    values.push(isDashboardIconName(patch.icon) ? patch.icon : "link");
  }
  if (patch.isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(patch.isActive ? 1 : 0);
  }

  if (sets.length > 0) {
    values.push(key);
    await exec(
      `UPDATE dashboard_cards SET ${sets.join(", ")} WHERE card_key = ?`,
      values,
    );
  }
  return fetchAllDashboardCards();
}

export async function deleteDashboardCard(key: string): Promise<DashboardCard[]> {
  await ensureSchema();
  await exec("DELETE FROM dashboard_cards WHERE card_key = ?", [key]);
  return fetchAllDashboardCards();
}

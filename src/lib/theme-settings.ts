import { query } from "@/lib/mysql";

export const THEME_SETTINGS_ID = "active";

export type ButtonStyle = "default" | "pill" | "square";
export type BorderRadius = "default" | "small" | "large" | "sharp";
export type ThemeMode = "dark" | "light";

export type ThemeSettings = {
  /** Empty string = use the built-in palette. */
  primaryColor: string;
  /** Empty string = use the built-in palette. */
  secondaryColor: string;
  buttonStyle: ButtonStyle;
  borderRadius: BorderRadius;
  themeMode: ThemeMode;
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  primaryColor: "",
  secondaryColor: "",
  buttonStyle: "default",
  borderRadius: "default",
  themeMode: "dark",
};

const BUTTON_STYLES: ButtonStyle[] = ["default", "pill", "square"];
const BORDER_RADII: BorderRadius[] = ["default", "small", "large", "sharp"];
const THEME_MODES: ThemeMode[] = ["dark", "light"];

type ThemeRow = {
  primary_color: string;
  secondary_color: string;
  button_style: string;
  border_radius: string;
  theme_mode: string;
};

async function ensureThemeSettingsTable(): Promise<void> {
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS theme_settings (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        primary_color VARCHAR(9) NOT NULL DEFAULT '',
        secondary_color VARCHAR(9) NOT NULL DEFAULT '',
        button_style VARCHAR(20) NOT NULL DEFAULT 'default',
        border_radius VARCHAR(20) NOT NULL DEFAULT 'default',
        theme_mode VARCHAR(10) NOT NULL DEFAULT 'dark',
        updated_by VARCHAR(191) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await query(
      `INSERT IGNORE INTO theme_settings (id) VALUES (?)`,
      [THEME_SETTINGS_ID],
    );
  } catch {
    // Table creation best-effort — may fail if DB not configured.
  }
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return "";
}

function rowToSettings(row: ThemeRow): ThemeSettings {
  return {
    primaryColor: normalizeHex(row.primary_color ?? ""),
    secondaryColor: normalizeHex(row.secondary_color ?? ""),
    buttonStyle: (BUTTON_STYLES as string[]).includes(row.button_style)
      ? (row.button_style as ButtonStyle)
      : "default",
    borderRadius: (BORDER_RADII as string[]).includes(row.border_radius)
      ? (row.border_radius as BorderRadius)
      : "default",
    themeMode: (THEME_MODES as string[]).includes(row.theme_mode)
      ? (row.theme_mode as ThemeMode)
      : "dark",
  };
}

/** Current theme settings — used by the root layout and the Admin Panel. */
export async function fetchThemeSettings(): Promise<ThemeSettings> {
  try {
    await ensureThemeSettingsTable();
    const rows = await query<ThemeRow[]>(
      `SELECT primary_color, secondary_color, button_style, border_radius, theme_mode
       FROM theme_settings WHERE id = ? LIMIT 1`,
      [THEME_SETTINGS_ID],
    );
    if (!rows || rows.length === 0) return { ...DEFAULT_THEME_SETTINGS };
    return rowToSettings(rows[0]);
  } catch {
    // Table not migrated yet — fall back to defaults.
    return { ...DEFAULT_THEME_SETTINGS };
  }
}

export type ThemeSettingsInput = {
  primaryColor?: unknown;
  secondaryColor?: unknown;
  buttonStyle?: unknown;
  borderRadius?: unknown;
  themeMode?: unknown;
};

export function normalizeThemeSettingsInput(
  raw: Record<string, unknown>,
): ThemeSettings {
  const color = (value: unknown): string =>
    typeof value === "string" ? normalizeHex(value) : "";

  const pick = <T extends string>(
    value: unknown,
    allowed: T[],
    fallback: T,
  ): T => (allowed as string[]).includes(value as string) ? (value as T) : fallback;

  return {
    primaryColor: color(raw.primaryColor),
    secondaryColor: color(raw.secondaryColor),
    buttonStyle: pick(raw.buttonStyle, BUTTON_STYLES, "default"),
    borderRadius: pick(raw.borderRadius, BORDER_RADII, "default"),
    themeMode: pick(raw.themeMode, THEME_MODES, "dark"),
  };
}

export async function saveThemeSettings(
  input: ThemeSettings,
  adminUid: string,
): Promise<ThemeSettings> {
  await ensureThemeSettingsTable();
  await query(
    `UPDATE theme_settings SET
       primary_color = ?,
       secondary_color = ?,
       button_style = ?,
       border_radius = ?,
       theme_mode = ?,
       updated_by = ?
     WHERE id = ?`,
    [
      input.primaryColor,
      input.secondaryColor,
      input.buttonStyle,
      input.borderRadius,
      input.themeMode,
      adminUid ?? null,
      THEME_SETTINGS_ID,
    ],
  );
  return fetchThemeSettings();
}

/**
 * Build the CSS override block that derives the full primary/secondary palettes
 * from the admin-chosen base colors. Scoped to the public website only — the
 * Admin Panel always renders inside [data-admin-theme] (AdminShell), so it is
 * never affected. Returns null when no custom colors are configured.
 */
export function buildThemeOverrideCss(settings: ThemeSettings): string | null {
  function palette(hex: string, prefix: string): string {
    return [
      `--${prefix}-50: color-mix(in srgb, ${hex} 10%, #ffffff)`,
      `--${prefix}-100: color-mix(in srgb, ${hex} 22%, #ffffff)`,
      `--${prefix}-200: color-mix(in srgb, ${hex} 40%, #ffffff)`,
      `--${prefix}-300: color-mix(in srgb, ${hex} 62%, #ffffff)`,
      `--${prefix}-400: color-mix(in srgb, ${hex} 82%, #ffffff)`,
      `--${prefix}-500: ${hex}`,
      `--${prefix}-600: color-mix(in srgb, ${hex} 90%, #000000)`,
      `--${prefix}-700: color-mix(in srgb, ${hex} 78%, #000000)`,
      `--${prefix}-800: color-mix(in srgb, ${hex} 64%, #000000)`,
      `--${prefix}-900: color-mix(in srgb, ${hex} 52%, #000000)`,
    ].join(";\n    ");
  }

  const blocks: string[] = [];
  if (settings.primaryColor) {
    blocks.push(palette(settings.primaryColor, "primary"));
  }
  if (settings.secondaryColor) {
    blocks.push(palette(settings.secondaryColor, "secondary"));
  }

  if (blocks.length === 0) return null;

  return `/* Injected by Admin → Website → Theme & Appearance (public site only). */\nhtml:not(:has([data-admin-theme])) {\n    ${blocks.join(
    ";\n    ",
  )};\n}`;
}

import { query, parseDate } from "@/lib/mysql";
import { fetchAdminAccount } from "@/lib/admin";
import {
  DEFAULT_NAVBAR_CONFIG,
  type NavbarConfig,
  type NavbarItem,
} from "@/lib/navbar-constants";

type NavbarSettingsRow = {
  id: number;
  show_navbar: number | boolean;
  show_more_menu: number | boolean;
  show_theme_toggle: number | boolean;
  show_login_button: number | boolean;
  updated_by: string | null;
};

type NavbarItemRow = {
  item_key: string;
  label: string;
  href: string | null;
  sort_order: number;
  is_active: number | boolean;
};

export async function fetchNavbarConfig(): Promise<NavbarConfig> {
  try {
    const settingsRows = await query<NavbarSettingsRow[]>(
      `SELECT id, show_navbar, show_more_menu, show_theme_toggle, show_login_button, updated_by
       FROM navbar_settings WHERE id = 1 LIMIT 1`,
    );
    const itemRows = await query<NavbarItemRow[]>(
      `SELECT item_key, label, href, sort_order, is_active
       FROM navbar_items ORDER BY sort_order ASC`,
    );

    if (!settingsRows[0] && itemRows.length === 0) {
      return DEFAULT_NAVBAR_CONFIG;
    }

    const settings = settingsRows[0];
    let items: NavbarItem[];
    if (itemRows.length > 0) {
      items = itemRows.map((row) => ({
        key: row.item_key,
        label: row.label,
        href: row.href ?? null,
        isActive: Boolean(row.is_active),
      }));
    } else {
      items = DEFAULT_NAVBAR_CONFIG.items;
    }

    return {
      showNavbar: settings ? Boolean(settings.show_navbar) : true,
      showMoreMenu: settings ? Boolean(settings.show_more_menu) : true,
      showThemeToggle: settings ? Boolean(settings.show_theme_toggle) : true,
      showLoginButton: settings ? Boolean(settings.show_login_button) : true,
      items,
    };
  } catch {
    // Table not migrated yet — fall back to current hardcoded behaviour.
    return DEFAULT_NAVBAR_CONFIG;
  }
}

type SaveInput = {
  showNavbar?: boolean;
  showMoreMenu?: boolean;
  showThemeToggle?: boolean;
  showLoginButton?: boolean;
  items?: NavbarItem[];
};

function validateLabel(label: string) {
  if (label.length === 0 || label.length > 100) {
    throw new Error("Navigation name is required and must be under 100 characters.");
  }
}

function validateHref(href: string | null) {
  if (href === null || href === "") return;
  if (href.length > 500) {
    throw new Error("Navigation URL must be under 500 characters.");
  }
  if (!href.startsWith("/") && !isValidHttpUrl(href)) {
    throw new Error("Navigation URL must be a valid https:// link or an internal path (/...).");
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function saveNavbarConfig(
  input: SaveInput,
  adminUid: string,
): Promise<NavbarConfig> {
  const existing = await fetchNavbarConfig();

  const showNavbar = input.showNavbar ?? existing.showNavbar;
  const showMoreMenu = input.showMoreMenu ?? existing.showMoreMenu;
  const showThemeToggle = input.showThemeToggle ?? existing.showThemeToggle;
  const showLoginButton = input.showLoginButton ?? existing.showLoginButton;

  const items =
    input.items && input.items.length > 0
      ? [...input.items]
      : existing.items;

  const seenKeys = new Set<string>();
  for (const item of items) {
    if (seenKeys.has(item.key)) {
      throw new Error("Duplicate navigation item detected.");
    }
    seenKeys.add(item.key);
    validateLabel(item.label.trim());
    validateHref(item.href?.trim() ?? null);
  }

  await query(
    `INSERT INTO navbar_settings (id, show_navbar, show_more_menu, show_theme_toggle, show_login_button, updated_at, updated_by)
     VALUES (1, ?, ?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE
       show_navbar = VALUES(show_navbar),
       show_more_menu = VALUES(show_more_menu),
       show_theme_toggle = VALUES(show_theme_toggle),
       show_login_button = VALUES(show_login_button),
       updated_by = VALUES(updated_by)`,
    [
      showNavbar ? 1 : 0,
      showMoreMenu ? 1 : 0,
      showThemeToggle ? 1 : 0,
      showLoginButton ? 1 : 0,
      adminUid,
    ],
  );

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    await query(
      `INSERT INTO navbar_items (item_key, label, href, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         href = VALUES(href),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [
        item.key,
        item.label.trim(),
        item.href?.trim() || null,
        index + 1,
        item.isActive ? 1 : 0,
      ],
    );
  }

  return {
    showNavbar,
    showMoreMenu,
    showThemeToggle,
    showLoginButton,
    items,
  };
}

export async function fetchNavbarUpdatedByLabel(adminUid: string): Promise<string> {
  const account = await fetchAdminAccount(adminUid);
  return account?.displayName ?? account?.email ?? adminUid;
}

export function parseUpdatedAt(value: Date | string | null): string | null {
  return value ? parseDate(value) : null;
}

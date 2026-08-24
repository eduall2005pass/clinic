import { query } from "@/lib/mysql";
import {
  DEFAULT_HOMEPAGE_ORDER,
  getSectionConfig,
  type HomepageSection,
  type HomepageSectionKey,
} from "@/lib/homepage-sections-constants";

type HomepageSectionRow = {
  section_key: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  is_active: number | boolean;
};

function buildDefaults(): HomepageSection[] {
  return DEFAULT_HOMEPAGE_ORDER.map((key) => {
    const config = getSectionConfig(key);
    return {
      key,
      label: config.label,
      title: config.editableText ? config.defaultTitle : null,
      description: config.editableText ? config.defaultDescription : null,
      isActive: true,
    };
  });
}

export async function fetchHomepageSections(): Promise<HomepageSection[]> {
  try {
    const rows = await query<HomepageSectionRow[]>(
      `SELECT section_key, title, description, sort_order, is_active
       FROM homepage_sections ORDER BY sort_order ASC`,
    );

    if (!rows || rows.length === 0) return buildDefaults();

    const defaults = buildDefaults();
    const sections: HomepageSection[] = [];

    for (const row of rows) {
      const key = row.section_key as HomepageSectionKey;
      if (!DEFAULT_HOMEPAGE_ORDER.includes(key)) continue;
      const fallback = defaults.find((section) => section.key === key)!;
      const config = getSectionConfig(key);
      sections.push({
        key,
        label: fallback.label,
        // Only header-based sections store custom text; others stay null.
        title: config.editableText ? (row.title ?? fallback.title) : null,
        description: config.editableText
          ? (row.description ?? fallback.description)
          : null,
        isActive: Boolean(row.is_active),
      });
    }

    // Ensure every known section exists even if the DB row is missing,
    // slotted into its default position (Our Success → Jersey → Mentors)
    // instead of being appended at the end of the list.
    for (const fallback of defaults) {
      if (sections.some((section) => section.key === fallback.key)) continue;
      const defaultIndex = DEFAULT_HOMEPAGE_ORDER.indexOf(fallback.key);
      const insertAt = sections.findIndex(
        (section) =>
          DEFAULT_HOMEPAGE_ORDER.indexOf(section.key) > defaultIndex,
      );
      if (insertAt === -1) sections.push(fallback);
      else sections.splice(insertAt, 0, fallback);
    }

    return sections;
  } catch {
    // Table not migrated yet — fall back to current static behaviour.
    return buildDefaults();
  }
}

export async function saveHomepageSections(
  input: HomepageSection[],
  adminUid: string,
): Promise<HomepageSection[]> {
  const seen = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const section = input[index];
    if (seen.has(section.key)) {
      throw new Error("Duplicate homepage section detected.");
    }
    seen.add(section.key);
    if (
      section.title !== null &&
      (section.title.trim().length === 0 || section.title.length > 255)
    ) {
      throw new Error("Section title must be between 1 and 255 characters.");
    }
    if (section.description !== null && section.description.length > 1000) {
      throw new Error("Section description must be under 1000 characters.");
    }
    await query(
      `INSERT INTO homepage_sections (section_key, title, description, sort_order, is_active, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active),
         updated_by = VALUES(updated_by)`,
      [
        section.key,
        section.title?.trim() || null,
        section.description?.trim() || null,
        index + 1,
        section.isActive ? 1 : 0,
        adminUid,
      ],
    );
  }
  return input;
}

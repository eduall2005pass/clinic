import fs from "node:fs/promises";
import path from "node:path";
import type { LogoInfo } from "@/lib/logo";
import {
  ALLOWED_LOGO_EXTENSIONS,
  MAX_LOGO_FILE_SIZE,
} from "@/lib/logo";
import { parseImageDimensions } from "@/lib/image-dimensions";

const LOGO_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logo");
const LOGO_METADATA_PATH = path.join(LOGO_UPLOAD_DIR, "logo.json");
const ACTIVE_FILE_PREFIX = "active-logo-";
const LEGACY_FILE_PREFIX = "active-logo";

export async function getActiveLogo(): Promise<LogoInfo | null> {
  try {
    const metadata = await readLogoMetadata();
    if (!metadata) return null;
    await fs.access(path.join(LOGO_UPLOAD_DIR, metadata.fileName));
    return metadata;
  } catch {
    return null;
  }
}

export async function saveActiveLogo(file: File): Promise<LogoInfo> {
  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_LOGO_EXTENSIONS.includes(extension as never)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WebP, GIF or SVG.");
  }
  if (file.size > MAX_LOGO_FILE_SIZE) {
    throw new Error("Logo file must be 5 MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = parseImageDimensions(
    new Uint8Array(buffer),
    extension,
  );

  await fs.mkdir(LOGO_UPLOAD_DIR, { recursive: true });
  await removeActiveLogoFiles();

  const fileName = `${ACTIVE_FILE_PREFIX}${Date.now()}${extension}`;
  await fs.writeFile(path.join(LOGO_UPLOAD_DIR, fileName), buffer);

  const logo: LogoInfo = {
    fileName,
    url: `/uploads/logo/${fileName}`,
    width,
    height,
    updatedAt: Date.now(),
  };
  await fs.writeFile(LOGO_METADATA_PATH, JSON.stringify(logo));
  return logo;
}

export async function removeActiveLogo(): Promise<void> {
  await removeActiveLogoFiles();
  await fs.rm(LOGO_METADATA_PATH, { force: true });
}

async function readLogoMetadata(): Promise<LogoInfo | null> {
  try {
    const raw = await fs.readFile(LOGO_METADATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as LogoInfo;
    if (
      !parsed.fileName ||
      !parsed.url ||
      !parsed.width ||
      !parsed.height ||
      !parsed.updatedAt
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function removeActiveLogoFiles(): Promise<void> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(LOGO_UPLOAD_DIR);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => name.startsWith(LEGACY_FILE_PREFIX))
      .map((name) => fs.rm(path.join(LOGO_UPLOAD_DIR, name), { force: true })),
  );
}

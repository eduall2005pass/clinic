import fs from "node:fs/promises";
import path from "node:path";
import type { LogoInfo } from "@/lib/logo";
import {
  ALLOWED_LOGO_EXTENSIONS,
  MAX_LOGO_FILE_SIZE,
} from "@/lib/logo";

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
  const { width, height } = parseImageDimensions(buffer, extension);

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

function parseImageDimensions(
  buffer: Buffer,
  extension: string,
): { width: number; height: number } {
  switch (extension) {
    case ".png":
      return parsePngDimensions(buffer);
    case ".jpg":
    case ".jpeg":
      return parseJpegDimensions(buffer);
    case ".webp":
      return parseWebpDimensions(buffer);
    case ".gif":
      return parseGifDimensions(buffer);
    case ".svg":
      return parseSvgDimensions(buffer.toString("utf8"));
    default:
      throw new Error("Unsupported file type.");
  }
}

function parsePngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24) throw new Error("Invalid PNG file.");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseJpegDimensions(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  throw new Error("Invalid JPEG file.");
}

function parseWebpDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 30) throw new Error("Invalid WebP file.");
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
      height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16),
    };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      throw new Error("Invalid WebP file.");
    }
    return {
      width: (buffer[26] | ((buffer[27] & 0x3f) << 8)) & 0x3fff,
      height: (buffer[28] | ((buffer[29] & 0x3f) << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) throw new Error("Invalid WebP file.");
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  throw new Error("Invalid WebP file.");
}

function parseGifDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 10) throw new Error("Invalid GIF file.");
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function parseSvgDimensions(source: string): { width: number; height: number } {
  const tagMatch = source.match(/<svg[^>]*>/i);
  if (!tagMatch) throw new Error("Invalid SVG file.");
  const tag = tagMatch[0];
  const widthMatch = tag.match(/\bwidth=["']?([\d.]+)/i);
  const heightMatch = tag.match(/\bheight=["']?([\d.]+)/i);
  const viewBoxMatch = tag.match(
    /\bviewBox=["']?\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i,
  );
  const width = widthMatch
    ? Math.round(parseFloat(widthMatch[1]))
    : viewBoxMatch
      ? Math.round(parseFloat(viewBoxMatch[1]))
      : 0;
  const height = heightMatch
    ? Math.round(parseFloat(heightMatch[1]))
    : viewBoxMatch
      ? Math.round(parseFloat(viewBoxMatch[2]))
      : 0;
  if (!width || !height) {
    throw new Error("SVG must declare width and height or a viewBox.");
  }
  return { width, height };
}
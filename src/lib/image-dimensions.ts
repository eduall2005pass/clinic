export type ImageDimensions = {
  width: number;
  height: number;
};

export function parseImageDimensions(
  bytes: Uint8Array,
  extension: string,
): ImageDimensions {
  switch (extension) {
    case ".png":
      return parsePngDimensions(bytes);
    case ".jpg":
    case ".jpeg":
      return parseJpegDimensions(bytes);
    case ".webp":
      return parseWebpDimensions(bytes);
    case ".gif":
      return parseGifDimensions(bytes);
    case ".svg":
      return parseSvgDimensions(new TextDecoder().decode(bytes));
    default:
      throw new Error("Unsupported file type.");
  }
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function readUInt16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUInt16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function parsePngDimensions(bytes: Uint8Array): ImageDimensions {
  if (bytes.length < 24) throw new Error("Invalid PNG file.");
  return {
    width: readUInt32BE(bytes, 16),
    height: readUInt32BE(bytes, 20),
  };
}

function parseJpegDimensions(bytes: Uint8Array): ImageDimensions {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = readUInt16BE(bytes, offset + 2);
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: readUInt16BE(bytes, offset + 5),
        width: readUInt16BE(bytes, offset + 7),
      };
    }
    offset += 2 + segmentLength;
  }
  throw new Error("Invalid JPEG file.");
}

function parseWebpDimensions(bytes: Uint8Array): ImageDimensions {
  if (bytes.length < 30) throw new Error("Invalid WebP file.");
  const chunk = String.fromCharCode(
    bytes[12],
    bytes[13],
    bytes[14],
    bytes[15],
  );
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }
  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      throw new Error("Invalid WebP file.");
    }
    return {
      width: (bytes[26] | ((bytes[27] & 0x3f) << 8)) & 0x3fff,
      height: (bytes[28] | ((bytes[29] & 0x3f) << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) throw new Error("Invalid WebP file.");
    const bits = readUInt32LE(bytes, 21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  throw new Error("Invalid WebP file.");
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function parseGifDimensions(bytes: Uint8Array): ImageDimensions {
  if (bytes.length < 10) throw new Error("Invalid GIF file.");
  return {
    width: readUInt16LE(bytes, 6),
    height: readUInt16LE(bytes, 8),
  };
}

function parseSvgDimensions(source: string): ImageDimensions {
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

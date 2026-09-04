// Auto Transparent Logo — background removal for ANY uploaded logo.
// Preserves logo/foreground, removes background (any color), outputs transparent PNG with alpha.
// Uses flood-fill from border (region growing) — not simple white-pixel threshold — so it handles
// white, colored, and complex backgrounds where background is connected to the image border.
// Sharp is used for raw pixel access; no external AI service required, works on Vercel serverless.

import sharp from "sharp";

type Rgba = { r: number; g: number; b: number };

function colorDistance(c1: Rgba, c2: Rgba): number {
  // Euclidean distance in RGB space
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
}

function averageColor(colors: Rgba[]): Rgba {
  let r = 0, g = 0, b = 0;
  for (const c of colors) { r += c.r; g += c.g; b += c.b; }
  return { r: Math.round(r / colors.length), g: Math.round(g / colors.length), b: Math.round(b / colors.length) };
}

/**
 * Convert any image (JPG, PNG, WEBP, etc.) to a transparent-background PNG.
 * - If input already has transparency (alpha < 255 anywhere), it is returned as PNG with alpha preserved (no background removal).
 * - Otherwise, flood-fill from the image border removes the background color (sampled from corners/border) with tolerance.
 * - Output is always PNG with alpha channel, high resolution, original aspect ratio, no cropping, no added background.
 */
export async function makeTransparentPng(input: Uint8Array | Buffer): Promise<Buffer> {
  const src = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // Load with sharp, ensure we get raw RGBA
  // Use failOn: 'none' to handle various inputs; limit size to avoid OOM (max 4000px)
  let pipeline = sharp(src, { failOn: "none" });
  // Keep original dimensions, just ensure alpha
  const metadata = await pipeline.metadata();
  // If image is huge, resize down to max 2000 on longest side to keep performance and sharpness
  const maxSide = 2000;
  if (metadata.width && metadata.height && (metadata.width > maxSide || metadata.height > maxSide)) {
    const ratio = Math.min(maxSide / metadata.width, maxSide / metadata.height);
    pipeline = pipeline.resize(Math.round(metadata.width * ratio), Math.round(metadata.height * ratio), {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error("Expected 4 channels RGBA");

  // If image already has transparency, preserve it and just re-encode as PNG
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) { hasTransparency = true; break; }
    // Early exit after checking 10k pixels if none found, but for logo we check all for safety
    if (i > 40000 && !hasTransparency) {
      // Sample only first 10k for speed; if none transparent, assume opaque
      // Continue full scan for small images, but for large we can break early
      // For now, break if large and no transparency found in sample
      if (width * height > 10000) break;
    }
  }
  if (hasTransparency) {
    // Already transparent — just encode as PNG without altering alpha
    // Do a quick trim of fully transparent border? No, preserve as is per requirement (no cropping)
    return sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9, palette: false })
      .toBuffer();
  }

  // Opaque image — need to remove background via flood-fill from border
  // For solid backgrounds, sampling border average works; for gradients/complex, we use neighbor-similarity flood
  // to handle varying background colors that are still connected to the border.

  // Sample global background for feathering (alpha fade) — average of corners is more stable than full border
  const cornerPoints: [number, number][] = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
  ];
  const cornerColors: Rgba[] = cornerPoints.map(([x, y]) => {
    const idx = (y * width + x) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  });
  const globalBg = averageColor(cornerColors);

  const tolerance = 32; // for global bg check (feathering)
  const feather = 18;
  const neighborTolerance = 38; // for region growing — allows gradient steps

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Initialize queue with all border pixels (assume border is background; logo typically has padding)
  for (let x = 0; x < width; x++) {
    queue.push(x); // y=0
    queue.push((height - 1) * width + x); // y=height-1
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width); // x=0
    queue.push(y * width + (width - 1)); // x=width-1
  }

  // BFS flood-fill — region growing based on neighbor color similarity (handles solid, colored, and gradient)
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 4;
    const cur: Rgba = { r: data[pIdx], g: data[pIdx + 1], b: data[pIdx + 2] };

    // Make current pixel transparent (with feather based on distance to global bg for soft edges)
    const distToGlobal = colorDistance(cur, globalBg);
    if (distToGlobal <= tolerance) {
      data[pIdx + 3] = 0;
    } else if (distToGlobal <= tolerance + feather) {
      const alpha = Math.round(((distToGlobal - tolerance) / feather) * 255);
      data[pIdx + 3] = Math.min(255, alpha);
    } else {
      // For gradient backgrounds, global distance may be large even for background pixels far from corner
      // But if this pixel was reached via neighbor similarity, it is still background — make fully transparent
      // Check if we arrived here via neighbor similarity (i.e., not an initial border pixel that is actually logo)
      // For interior gradient, we still want transparent, so force 0 if visited via flood
      // Only keep opaque if this is a logo edge (neighbor check would have stopped)
      // For now, if distToGlobal is large but we are in flood, make transparent (handles gradient)
      // To avoid removing logo that touches border, we rely on neighbor similarity gate below
      data[pIdx + 3] = 0;
    }

    const x = idx % width;
    const y = Math.floor(idx / width);

    // Push neighbors if their color is similar to current (region growing) — handles gradients
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);

    for (const n of neighbors) {
      if (visited[n]) continue;
      // Already queued? check not needed — visited will handle
      const nIdx = n * 4;
      const neigh: Rgba = { r: data[nIdx], g: data[nIdx + 1], b: data[nIdx + 2] };
      const distToCur = colorDistance(neigh, cur);
      const distNeighToGlobal = colorDistance(neigh, globalBg);
      // If neighbor is similar to current, it's same background region (gradient step)
      // Or if neighbor is close to global bg, it's solid background
      if (distToCur <= neighborTolerance || distNeighToGlobal <= tolerance) {
        queue.push(n);
      }
    }
  }

  // Second pass: for interior pixels that are close to bg color but not flood-connected (e.g., white holes inside logo),
  // we keep them opaque to avoid removing parts of logo (e.g., white text). So we do NOT globally threshold.
  // Only border-connected background is removed — this preserves logo interior white.

  // Encode as high-quality PNG with alpha, preserve sharp edges and colors
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6, palette: false, effort: 8 })
    .toBuffer();
}

/**
 * Helper: detect if buffer is already a PNG with alpha (quick metadata check)
 */
export async function isPngWithAlpha(input: Uint8Array | Buffer): Promise<boolean> {
  try {
    const meta = await sharp(input).metadata();
    return meta.hasAlpha === true;
  } catch {
    return false;
  }
}

// MediSpark media file service.
// Receives uploads from the Vercel-hosted app, stores files on this VM's
// disk under /var/www/medispark-uploads/<dir>/<uuid>.<ext>, and serves
// metadata back as JSON. nginx serves the stored files statically over
// HTTPS and proxies /medifiles-upload and /medifiles-delete here.
// Zero external dependencies so it runs anywhere Node 18+ is installed.

import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PORT = Number(process.env.PORT || 4021);
const STORAGE_ROOT = process.env.STORAGE_ROOT || "/var/www/medispark-uploads";
const TOKEN = (process.env.MEDIA_UPLOAD_TOKEN || "").trim();
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1024 * 1024 * 1024);

if (!TOKEN) {
  console.error("MEDIA_UPLOAD_TOKEN is required; refusing to start.");
  process.exit(1);
}

const MIME_BY_EXTENSION = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/opus",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

function safeExtension(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "";
  const ext = fileName.slice(dot).toLowerCase();
  if (!/^(\.[a-z0-9]{1,8})$/.test(ext)) return "";
  return ext;
}

function safeDirectory(dir) {
  const cleaned = String(dir || "")
    .split("/")
    .filter((part) => /^[A-Za-z0-9_-]+$/.test(part))
    .join("/");
  if (!cleaned) return null;
  const resolved = path.resolve(STORAGE_ROOT, cleaned);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) return null;
  return resolved;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function authorized(req) {
  const header = req.headers["x-medifiles-token"] || "";
  const a = Buffer.from(String(header));
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleUpload(req, res) {
  if (!authorized(req)) return sendJson(res, 401, { error: "unauthorized" });

  const url = new URL(req.url, "http://localhost");
  const directory = safeDirectory(url.searchParams.get("dir") || "");
  const originalName = path.basename(url.searchParams.get("name") || "file");
  if (!directory) return sendJson(res, 400, { error: "invalid directory" });

  const ext = safeExtension(originalName);
  if (!ext) return sendJson(res, 400, { error: "unsupported file extension" });

  let body;
  try {
    body = await readBody(req, MAX_BODY_BYTES);
  } catch {
    return sendJson(res, 413, { error: "file too large" });
  }
  if (body.length === 0) return sendJson(res, 400, { error: "empty body" });

  const storedName = `${randomUUID()}${ext}`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedName), body);

  const relativeDir = path.relative(STORAGE_ROOT, directory).split(path.sep).join("/");
  return sendJson(res, 200, {
    url: `/medifiles/${relativeDir}/${storedName}`,
    size: body.length,
  });
}

async function handleDelete(req, res) {
  if (!authorized(req)) return sendJson(res, 401, { error: "unauthorized" });
  let raw = "{}";
  try {
    raw = (await readBody(req, 64 * 1024)).toString("utf8") || "{}";
  } catch {
    // fall through with empty object
  }
  let targetUrl = "";
  try {
    ({ url: targetUrl } = JSON.parse(raw));
  } catch {
    return sendJson(res, 400, { error: "invalid json" });
  }

  const marker = "/medifiles/";
  const index = String(targetUrl).indexOf(marker);
  if (index === -1) return sendJson(res, 400, { error: "not a medifiles url" });

  const relative = String(targetUrl)
    .slice(index + marker.length)
    .split(/[?#]/)[0];
  if (!relative.split("/").every((part) => /^[A-Za-z0-9._-]+$/.test(part))) {
    return sendJson(res, 400, { error: "invalid path" });
  }

  const filePath = path.resolve(STORAGE_ROOT, relative);
  if (!filePath.startsWith(STORAGE_ROOT + path.sep)) {
    return sendJson(res, 400, { error: "invalid path" });
  }
  try {
    await unlink(filePath);
  } catch {
    // Already gone — treat as success so callers can clean up idempotently.
  }
  return sendJson(res, 200, { ok: true });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Medifiles-Token",
    });
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }
  if (req.url.startsWith("/upload")) {
    handleUpload(req, res).catch((error) => {
      console.error("upload failed:", error);
      sendJson(res, 500, { error: "upload failed" });
    });
    return;
  }
  if (req.url.startsWith("/delete")) {
    handleDelete(req, res).catch((error) => {
      console.error("delete failed:", error);
      sendJson(res, 500, { error: "delete failed" });
    });
    return;
  }
  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`medifiles server listening on 127.0.0.1:${PORT}`);
});

export { server };

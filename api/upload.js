import { put } from "@vercel/blob";
import getRawBody from "raw-body";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map();

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  if (rateLimitStore.size > 5000) rateLimitStore.clear();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — please slow down and try again shortly." });
  }

  try {
    const filename = sanitizeFilename(req.headers["x-filename"] || `photo-${Date.now()}.jpg`);
    const contentType = (req.headers["content-type"] || "application/octet-stream").toLowerCase().split(";")[0].trim();

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return res.status(400).json({ error: "Unsupported file type — please attach a JPEG, PNG, WEBP, GIF, or HEIC photo." });
    }

    const buffer = await getRawBody(req, { limit: "10mb" });

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "No file data received" });
    }

    const blob = await put(`havenbrook-demo/${Date.now()}-${filename}`, buffer, {
      access: "public",
      contentType,
    });

    res.status(200).json({ url: blob.url });
  } catch (error) {
    if (error?.type === "entity.too.large" || error?.statusCode === 413) {
      return res.status(413).json({ error: "That file is too large — please attach a photo under 10MB." });
    }
    console.error("upload handler error:", error);
    res.status(500).json({ error: "Upload failed — please try again." });
  }
}

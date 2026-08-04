import { put } from "@vercel/blob";
import getRawBody from "raw-body";
import convert from "heic-convert";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

// Determine the real image type from the file's own bytes, not the client-supplied
// Content-Type header. A visitor's browser (or a crafted request) can claim any
// Content-Type it likes; the header alone was previously trusted outright.
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand)) {
      return "heic";
    }
  }
  return null;
}

const CONTENT_TYPE_FOR = {
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — please slow down and try again shortly." });
  }

  try {
    const filenameBase = sanitizeFilename(req.headers["x-filename"] || `photo-${Date.now()}.jpg`).replace(/\.[a-zA-Z0-9]+$/, "");

    const buffer = await getRawBody(req, { limit: "10mb" });

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "No file data received" });
    }

    const detectedType = detectImageType(buffer);

    if (!detectedType) {
      return res.status(400).json({ error: "Unsupported file type — please attach a JPEG, PNG, WEBP, GIF, or HEIC photo." });
    }

    let uploadBuffer = buffer;
    let contentType = CONTENT_TYPE_FOR[detectedType];
    let extension = detectedType === "jpeg" ? "jpg" : detectedType;

    if (detectedType === "heic") {
      // Claude's vision API supports JPEG, PNG, GIF, and WebP only — not HEIC/HEIF, the
      // default capture format on iPhones. Convert server-side so an iPhone photo doesn't
      // upload successfully and then silently fail the vision call a moment later.
      try {
        uploadBuffer = Buffer.from(await convert({ buffer, format: "JPEG", quality: 0.9 }));
        contentType = "image/jpeg";
        extension = "jpg";
      } catch (conversionError) {
        console.error("HEIC conversion failed:", conversionError);
        return res.status(400).json({ error: "That photo couldn't be processed — please try a JPEG or PNG instead." });
      }
    }

    const blob = await put(`havenbrook-demo/${Date.now()}-${filenameBase}.${extension}`, uploadBuffer, {
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


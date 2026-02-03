let cloudinary = null;
try {
  cloudinary = require("../config/cloudinary"); 
} catch (e) {
  cloudinary = null;
}

/* ===================== validate ===================== */

// Only allow Cloudinary URLs 
const isCloudinaryUrl = (url) => {
  const s = String(url || "").trim();
  return /^https?:\/\/res\.cloudinary\.com\//i.test(s);
};

const isAllowedMediaUrl = (url) => {
  const s = String(url || "").trim();
  if (!s) return true;
  return isCloudinaryUrl(s);
};

function isYoutubeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(s);
}

function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x || "").trim()).filter(Boolean);
}

function uniqueArray(arr) {
  return [...new Set(normalizeStringArray(arr))];
}

/* ===================== cloudinary helpers ===================== */

function cloudinaryPublicIdFromUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (!isCloudinaryUrl(s)) return "";

  try {
    const u = new URL(s);
    const p = u.pathname;
    const idx = p.indexOf("/upload/");
    if (idx === -1) return "";

    let tail = p.slice(idx + "/upload/".length); // v123/folder/file.jpg OR folder/file.jpg
    let parts = tail.split("/").filter(Boolean);

    // drop version like v123456
    if (parts[0] && /^v\d+$/.test(parts[0])) parts = parts.slice(1);

    if (!parts.length) return "";

    const last = parts[parts.length - 1];
    const dot = last.lastIndexOf(".");
    if (dot === -1) return "";

    parts[parts.length - 1] = last.slice(0, dot); 
    return parts.join("/");
  } catch {
    return "";
  }
}

async function deleteCloudinaryByPublicId(publicId) {
  const pid = String(publicId || "").trim();
  if (!pid) return;
  if (!cloudinary?.uploader?.destroy) return;

  
  try {
    const r1 = await cloudinary.uploader.destroy(pid, { resource_type: "image" });
    if (r1?.result && r1.result !== "not found") return;
  } catch {}

  try {
    await cloudinary.uploader.destroy(pid, { resource_type: "video" });
  } catch {}
}

/* ===================== compatibility exports ===================== */


function extractUploadsPath(u) {
  const pid = cloudinaryPublicIdFromUrl(u);
  return pid || null;
}

/**
 * Delete a single Cloudinary URL (or publicId if you pass it)
 */
async function deleteLocalUploadByUrl(u) {
  const s = String(u || "").trim();
  if (!s) return;

  // If caller passed a URL, extract PID. If passed PID directly, use it.
  const pid = isCloudinaryUrl(s) ? cloudinaryPublicIdFromUrl(s) : s;
  if (!pid) return;

  await deleteCloudinaryByPublicId(pid);
}

/**
 * Delete many Cloudinary URLs / publicIds
 */
async function deleteLocalUploads(urls) {
  const arr = uniqueArray(urls);
  await Promise.allSettled(arr.map(deleteLocalUploadByUrl));
}


function diffRemovedLocalUploads(oldArr, newArr) {
  const toPairs = (arr) => {
    const a = uniqueArray(arr);
    return a
      .map((url) => ({ url, pid: cloudinaryPublicIdFromUrl(url) }))
      .filter((x) => x.pid);
  };

  const oldPairs = toPairs(oldArr);
  const newPairs = toPairs(newArr);

  const newPids = new Set(newPairs.map((x) => x.pid));

  const removed = [];
  for (const it of oldPairs) {
    if (!newPids.has(it.pid)) removed.push(it.url);
  }
  return removed;
}

/* ===================== GAME MEDIA HELPERS ===================== */

function normalizeCoverMedia(v) {
  return String(v || "").trim();
}

function normalizeScreenshots(arr) {
  return uniqueArray(arr);
}

function collectGameMedia(coverMedia, screenshots) {
  const cover = normalizeCoverMedia(coverMedia);
  const shots = Array.isArray(screenshots) ? screenshots : [];
  return [cover, ...shots].filter(Boolean);
}

module.exports = {
  isAllowedMediaUrl,
  isYoutubeUrl,
  normalizeStringArray,
  uniqueArray,

  
  extractUploadsPath,
  deleteLocalUploadByUrl,
  deleteLocalUploads,
  diffRemovedLocalUploads,

  
  normalizeCoverMedia,
  normalizeScreenshots,
  collectGameMedia,

  
  cloudinaryPublicIdFromUrl,
};

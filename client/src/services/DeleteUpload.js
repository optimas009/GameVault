import AuthFetch from "./AuthFetch";

const cloudinaryPublicIdFromUrl = (url) => {
  const s = String(url || "").trim();
  if (!s) return "";

  try {
    const u = new URL(s);
    const p = u.pathname;
    const idx = p.indexOf("/upload/");
    if (idx === -1) return "";

    let tail = p.slice(idx + "/upload/".length);
    let parts = tail.split("/").filter(Boolean);

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
};

const DeleteUpload = async (cloudUrlOrPublicId) => {
  const s = String(cloudUrlOrPublicId || "").trim();
  if (!s) return;

  const publicId = s.startsWith("http") ? cloudinaryPublicIdFromUrl(s) : s;
  if (!publicId) return;

  const res = await AuthFetch("/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: publicId }),
  });

  if (!res) throw new Error("Delete failed (no response)");

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Delete failed");
};

export default DeleteUpload;

const cloudinary = require("../config/cloudinary");
const { getGamesCloudFolder } = require("../helpers/uploadGames.helper");

function uploadSingle(req, res) {
  if (!req.file) return res.status(400).send({ message: "No file uploaded" });

  const isVideo = req.file.mimetype.startsWith("video/");
  const resource_type = isVideo ? "video" : "image";

  // Decide folder:
  // normal user upload -> "uploads"
  // admin game upload -> "games/cover" or "games/screenshots" 
  const isAdminGameUpload = req.originalUrl.includes("/admin/upload-game");
  const folder = isAdminGameUpload ? getGamesCloudFolder(req) : "uploads";

  const b64 = req.file.buffer.toString("base64");
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;

  cloudinary.uploader.upload(
    dataUri,
    { folder, resource_type },
    (err, result) => {
      if (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).send({ message: "Upload failed" });
      }

      
      return res.send({
        url: result.secure_url,
        path: result.public_id, // use this for delete
      });
    }
  );
}

async function deleteUpload(req, res) {
  const { path } = req.body || {};
  const publicId = String(path || "").trim();
  if (!publicId) return res.status(400).send({ message: "path required" });

  // Try image first, then video (simple & works)
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (e) {}

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (e) {}

  return res.send({ ok: true });
}

module.exports = { uploadSingle, deleteUpload };

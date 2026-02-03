const multer = require("multer");

const uploadGames = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    if (!ok) return cb(new Error("Only image/video allowed"));
    cb(null, true);
  },
});

function getGamesCloudFolder(req) {
  const t = String(req.query.type || "").toLowerCase();
  if (t === "cover") return "games/cover";
  if (t === "screenshot") return "games/screenshots";
  return "games/other";
}

module.exports = { uploadGames, getGamesCloudFolder };

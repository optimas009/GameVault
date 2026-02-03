import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AuthFetch from "../../services/AuthFetch";
import UploadFile from "../../services/UploadFile";
import MediaUtil from "../../services/MediaUtil";
import DeleteUpload from "../../services/DeleteUpload";

import "../../css/Form.css";

const UpdateGame = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    price: "",
    developer: "",
    sizeGB: "",
    platform: "",
    genre: "",
    description: "",

    trailerUrl: "",
    modesText: "",
    languagesText: "",
    onlineRequired: false,
    crossplay: false,
    controllerSupport: false,

    min_os: "",
    min_cpu: "",
    min_ram: "",
    min_gpu: "",
    min_storage: "",

    rec_os: "",
    rec_cpu: "",
    rec_ram: "",
    rec_gpu: "",
    rec_storage: "",
  });

  // DB fields (Cloudinary URLs)
  const [coverMedia, setCoverMedia] = useState("");
  const [screenshots, setScreenshots] = useState([]);

  // original snapshot (for cancel restore)
  const [initialCover, setInitialCover] = useState("");
  const [initialShots, setInitialShots] = useState([]);

  // ONLY for cleanup if user cancels (uploads done in THIS edit screen)
  const [newUploads, setNewUploads] = useState([]); // [url, url, ...]

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingShots, setUploadingShots] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [nextRoute, setNextRoute] = useState("");

  const openPopup = (type, msg, routeAfterOk = "") => {
    setMessageType(type);
    setMessage(msg);
    setNextRoute(routeAfterOk);
  };

  const handleOk = () => {
    const route = nextRoute;
    setMessage("");
    setMessageType("");
    setNextRoute("");
    if (route) navigate(route, { replace: true });
  };

  useEffect(() => {
    const loadGame = async () => {
      try {
        const res = await AuthFetch(`/admin/games/${id}`);
        if (!res) return openPopup("error", "Failed to load game. Please try again.");

        if (res.status === 401) return openPopup("error", "Session expired. Please login again.", "/login");
        if (res.status === 403) return openPopup("error", "Admin access required", "/games");
        if (res.status === 404) return openPopup("error", "Game not found", "/update");

        const game = await res.json().catch(() => ({}));

        setForm({
          title: game.title || "",
          price: game.price ?? "",
          developer: game.developer || "",
          sizeGB: game.sizeGB ?? "",
          platform: game.platform || "",
          genre: game.genre || "",
          description: game.description || "",

          trailerUrl: game.trailerUrl || "",
          modesText: Array.isArray(game.modes) ? game.modes.join(", ") : "",
          languagesText: Array.isArray(game.languages) ? game.languages.join(", ") : "",
          onlineRequired: Boolean(game.onlineRequired),
          crossplay: Boolean(game.crossplay),
          controllerSupport: Boolean(game.controllerSupport),

          min_os: game.minimumRequirements?.os || "",
          min_cpu: game.minimumRequirements?.cpu || "",
          min_ram: game.minimumRequirements?.ram || "",
          min_gpu: game.minimumRequirements?.gpu || "",
          min_storage: game.minimumRequirements?.storage || "",

          rec_os: game.recommendedRequirements?.os || "",
          rec_cpu: game.recommendedRequirements?.cpu || "",
          rec_ram: game.recommendedRequirements?.ram || "",
          rec_gpu: game.recommendedRequirements?.gpu || "",
          rec_storage: game.recommendedRequirements?.storage || "",
        });

        const dbCover = String(game.coverMedia || "").trim();
        const dbShots = Array.isArray(game.screenshots) ? game.screenshots : [];

        setCoverMedia(dbCover);
        setScreenshots(dbShots);

        setInitialCover(dbCover);
        setInitialShots(dbShots);

        // reset temp uploads for this edit session
        setNewUploads([]);
      } catch {
        openPopup("error", "Something went wrong while loading the game.");
      }
    };

    loadGame();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toCommaArray = (text) =>
    String(text || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const isNewUpload = (url) => newUploads.includes(url);

  // COVER upload
  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setUploadingCover(true);

      const data = await UploadFile(file, "/admin/upload-game?type=cover");
      if (!data?.url) throw new Error("Upload failed");

      // if current cover is a NEW unsaved upload in this screen -> delete it (replace)
      if (coverMedia && isNewUpload(coverMedia)) {
        try {
          await DeleteUpload(coverMedia);
        } catch {}
        setNewUploads((prev) => prev.filter((x) => x !== coverMedia));
      }

      setCoverMedia(data.url);
      setNewUploads((prev) => [...prev, data.url]);
    } catch (err) {
      openPopup("error", err.message || "Cover upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  // SCREENSHOTS upload (multiple)
  const handleScreenshotsFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    try {
      setUploadingShots(true);

      const uploaded = await Promise.all(
        files.map((f) => UploadFile(f, "/admin/upload-game?type=screenshot"))
      );

      const urls = uploaded.map((u) => u?.url).filter(Boolean);

      setScreenshots((prev) => Array.from(new Set([...prev, ...urls])));
      setNewUploads((prev) => Array.from(new Set([...prev, ...urls])));
    } catch (err) {
      openPopup("error", err.message || "Screenshots upload failed");
    } finally {
      setUploadingShots(false);
    }
  };

  // Remove cover:
  
  const removeCover = async () => {
    const url = coverMedia;
    if (!url) return;

    if (isNewUpload(url)) {
      try {
        await DeleteUpload(url);
      } catch {}
      setNewUploads((prev) => prev.filter((x) => x !== url));
    }

    setCoverMedia("");
  };

  // Remove screenshot:
 
  const removeScreenshot = async (url) => {
    if (!url) return;

    if (isNewUpload(url)) {
      try {
        await DeleteUpload(url);
      } catch {}
      setNewUploads((prev) => prev.filter((x) => x !== url));
    }

    setScreenshots((prev) => prev.filter((x) => x !== url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || form.price === "") return openPopup("error", "Title and price are required");
    if (uploadingCover || uploadingShots) return openPopup("error", "Please wait until uploads finish.");

    const payload = {
      title: form.title,
      price: Number(form.price),
      developer: form.developer,
      sizeGB: form.sizeGB ? Number(form.sizeGB) : 0,
      platform: form.platform,
      genre: form.genre,
      description: form.description,

      coverMedia,
      screenshots,

      trailerUrl: form.trailerUrl,
      modes: toCommaArray(form.modesText),
      languages: toCommaArray(form.languagesText),
      onlineRequired: Boolean(form.onlineRequired),
      crossplay: Boolean(form.crossplay),
      controllerSupport: Boolean(form.controllerSupport),

      minimumRequirements: {
        os: form.min_os,
        cpu: form.min_cpu,
        ram: form.min_ram,
        gpu: form.min_gpu,
        storage: form.min_storage,
      },
      recommendedRequirements: {
        os: form.rec_os,
        cpu: form.rec_cpu,
        ram: form.rec_ram,
        gpu: form.rec_gpu,
        storage: form.rec_storage,
      },
    };

    try {
      const res = await AuthFetch(`/admin/games/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res) return openPopup("error", "Update failed. Please try again.");

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) return openPopup("error", "Session expired. Please login again.", "/login");
      if (res.status === 403) return openPopup("error", "Admin access required", "/games");
      if (!res.ok) return openPopup("error", data.message || "Update failed");

      // saved -> do NOT cleanup
      setNewUploads([]);
      openPopup("success", "Updated!", "/update");
    } catch {
      openPopup("error", "Something went wrong. Please try again.");
    }
  };

  // CANCEL:
  
  const onCancel = async () => {
    try {
      await Promise.allSettled(newUploads.map((u) => DeleteUpload(u)));
    } catch {}

    
    setCoverMedia(initialCover);
    setScreenshots(initialShots);
    setNewUploads([]);

    navigate("/update");
  };

  return (
    <div className="admin-page">
      {message && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className={`msg-modal ${messageType}`}>
            <h3>{messageType === "success" ? "Success" : "Error"}</h3>
            <p>{message}</p>
            <button type="button" onClick={handleOk}>OK</button>
          </div>
        </div>
      )}

      <div className="admin-wrap">
        <h1 className="admin-title">Update Game</h1>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-grid">
            <div className="admin-field">
              <label className="admin-label">Title *</label>
              <input className="admin-input" name="title" value={form.title} onChange={handleChange} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Price *</label>
              <input className="admin-input" name="price" value={form.price} onChange={handleChange} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Developer</label>
              <input className="admin-input" name="developer" value={form.developer} onChange={handleChange} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Size (GB)</label>
              <input className="admin-input" name="sizeGB" value={form.sizeGB} onChange={handleChange} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Platform</label>
              <input className="admin-input" name="platform" value={form.platform} onChange={handleChange} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Genre</label>
              <input className="admin-input" name="genre" value={form.genre} onChange={handleChange} />
            </div>

            {/* COVER */}
            <div className="admin-field admin-span-2">
              <label className="admin-label">
                Cover Image (Upload) {uploadingCover ? "— Uploading..." : ""}
              </label>
              <input
                className="admin-input"
                type="file"
                accept="image/*"
                onChange={handleCoverFile}
                disabled={uploadingCover}
              />

              {coverMedia ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={MediaUtil.toAbsoluteMediaUrl(coverMedia)}
                    alt="cover"
                    style={{ maxWidth: 220, borderRadius: 8 }}
                  />
                  <div style={{ marginTop: 6 }}>
                    <button type="button" className="admin-btn secondary" onClick={removeCover}>
                      Remove Cover
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Trailer */}
            <div className="admin-field admin-span-2">
              <label className="admin-label">Trailer URL (YouTube)</label>
              <input className="admin-input" name="trailerUrl" value={form.trailerUrl} onChange={handleChange} />
            </div>

            {/* Screenshots */}
            <div className="admin-field admin-span-2">
              <label className="admin-label">
                Screenshots (Upload multiple) {uploadingShots ? "— Uploading..." : ""}
              </label>
              <input
                className="admin-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenshotsFiles}
                disabled={uploadingShots}
              />

              {screenshots.length > 0 ? (
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {screenshots.map((u) => (
                    <div key={u} style={{ width: 140 }}>
                      <img
                        src={MediaUtil.toAbsoluteMediaUrl(u)}
                        alt="screenshot"
                        style={{ width: "100%", borderRadius: 8 }}
                      />
                      <button
                        type="button"
                        className="admin-btn secondary"
                        style={{ marginTop: 6, width: "100%" }}
                        onClick={() => removeScreenshot(u)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="admin-field admin-span-2">
              <label className="admin-label">Description</label>
              <textarea className="admin-textarea" name="description" value={form.description} onChange={handleChange} rows={5} />
            </div>

            <div className="admin-field admin-span-2">
              <label className="admin-label">Modes (comma separated)</label>
              <input className="admin-input" name="modesText" value={form.modesText} onChange={handleChange} />
            </div>

            <div className="admin-field admin-span-2">
              <label className="admin-label">Languages (comma separated)</label>
              <input className="admin-input" name="languagesText" value={form.languagesText} onChange={handleChange} />
            </div>

            <div className="admin-field admin-span-2">
              <label className="admin-label">Options</label>
              <div className="admin-checkrow">
                <label className="admin-check">
                  <input type="checkbox" name="onlineRequired" checked={form.onlineRequired} onChange={handleChange} />
                  Online Required
                </label>

                <label className="admin-check">
                  <input type="checkbox" name="crossplay" checked={form.crossplay} onChange={handleChange} />
                  Crossplay
                </label>

                <label className="admin-check">
                  <input type="checkbox" name="controllerSupport" checked={form.controllerSupport} onChange={handleChange} />
                  Controller Support
                </label>
              </div>
            </div>

            {/* Requirements */}
            <div className="admin-field admin-span-2">
              <label className="admin-label">Minimum Requirements</label>
              <div className="admin-req-grid">
                <input className="admin-input" name="min_os" value={form.min_os} onChange={handleChange} placeholder="OS" />
                <input className="admin-input" name="min_cpu" value={form.min_cpu} onChange={handleChange} placeholder="CPU" />
                <input className="admin-input" name="min_ram" value={form.min_ram} onChange={handleChange} placeholder="RAM" />
                <input className="admin-input" name="min_gpu" value={form.min_gpu} onChange={handleChange} placeholder="GPU" />
                <input className="admin-input" name="min_storage" value={form.min_storage} onChange={handleChange} placeholder="Storage" />
              </div>
            </div>

            <div className="admin-field admin-span-2">
              <label className="admin-label">Recommended Requirements</label>
              <div className="admin-req-grid">
                <input className="admin-input" name="rec_os" value={form.rec_os} onChange={handleChange} placeholder="OS" />
                <input className="admin-input" name="rec_cpu" value={form.rec_cpu} onChange={handleChange} placeholder="CPU" />
                <input className="admin-input" name="rec_ram" value={form.rec_ram} onChange={handleChange} placeholder="RAM" />
                <input className="admin-input" name="rec_gpu" value={form.rec_gpu} onChange={handleChange} placeholder="GPU" />
                <input className="admin-input" name="rec_storage" value={form.rec_storage} onChange={handleChange} placeholder="Storage" />
              </div>
            </div>
          </div>

          <div className="admin-actions">
            <button className="admin-btn primary" type="submit">Save Changes</button>
            <button className="admin-btn secondary" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateGame;

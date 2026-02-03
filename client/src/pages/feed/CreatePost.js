import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthFetch from "../../services/AuthFetch";
import MediaUtil from "../../services/MediaUtil";
import UploadFile from "../../services/UploadFile";
import DeleteUpload from "../../services/DeleteUpload";

import "../../css/NewsFeed.css";

const isYoutubeUrl = (url) => {
  const s = String(url || "").trim();
  if (!s) return true;
  return !!MediaUtil.getYoutubeId(s);
};

const guessKindFromUrl = (u) => {
  const s = String(u || "").toLowerCase().split("?")[0];
  const videoExts = [".mp4", ".webm", ".ogg", ".mov", ".mkv"];
  return videoExts.some((ext) => s.endsWith(ext)) ? "video" : "image";
};

const CreatePost = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Cloudinary media: [{ url: "https://res.cloudinary.com/..", kind: "image"|"video" }]
  const [media, setMedia] = useState([]);

  // Track uploads done in this screen (so we can delete if not posted)
  const [newUploads, setNewUploads] = useState([]); 
  const [posted, setPosted] = useState(false);

  // youtube urls array (inputs)
  const [youtubeUrls, setYoutubeUrls] = useState([""]);

  const fileInputRef = useRef(null);

  // IMPORTANT: refs so cleanup only happens on UNMOUNT
  const newUploadsRef = useRef([]);
  const postedRef = useRef(false);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  
  useEffect(() => {
    newUploadsRef.current = newUploads;
  }, [newUploads]);

  useEffect(() => {
    postedRef.current = posted;
  }, [posted]);

  
  useEffect(() => {
    return () => {
      if (postedRef.current) return;

      const urls = (newUploadsRef.current || []).filter(Boolean);
      if (!urls.length) return;

      Promise.allSettled(urls.map((u) => DeleteUpload(u)));
    };
  }, []);

  const pickFiles = () => fileInputRef.current?.click();

  const removeMediaAt = async (idx) => {
    const target = media[idx];
    const u = String(target?.url || "").trim();
    if (!u) return;

   
    if (newUploads.includes(u)) {
      try {
        await DeleteUpload(u);
      } catch {}
      setNewUploads((prev) => prev.filter((x) => x !== u));
    }

    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAllMedia = async () => {
    
    const urls = newUploads.filter(Boolean);
    try {
      await Promise.allSettled(urls.map((u) => DeleteUpload(u)));
    } catch {}

    setMedia([]);
    setNewUploads([]);
  };

  const addYoutubeField = () => setYoutubeUrls((prev) => [...prev, ""]);
  const removeYoutubeField = (idx) =>
    setYoutubeUrls((prev) => prev.filter((_, i) => i !== idx));
  const updateYoutubeField = (idx, value) =>
    setYoutubeUrls((prev) => prev.map((v, i) => (i === idx ? value : v)));

  const onFilesSelected = async (e) => {
    if (!token) return navigate("/login");

    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setErr("");
    setLoading(true);

    try {
      const uploaded = [];

      for (const f of files) {
        const data = await UploadFile(f); // upload route
        const url = String(data?.url || "").trim();
        if (!url) continue;

        const kind = String(f.type || "").startsWith("video/")
          ? "video"
          : guessKindFromUrl(url);

        uploaded.push({ url, kind });
      }

      if (!uploaded.length) throw new Error("Upload failed (no url returned)");

      // track for cleanup if not posted
      setNewUploads((prev) => [...prev, ...uploaded.map((x) => x.url)]);
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (ex) {
      setErr(ex?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const backToFeed = async () => {
    // delete all temp uploads before leaving
    const urls = newUploads.filter(Boolean);
    try {
      await Promise.allSettled(urls.map((u) => DeleteUpload(u)));
    } catch {}

    setNewUploads([]);
    setMedia([]);
    navigate("/feed", { replace: true });
  };

  const submit = async () => {
    setErr("");

    const t = String(text || "").trim();

    const ytClean = youtubeUrls
      .map((u) => String(u || "").trim())
      .filter(Boolean);

    for (const u of ytClean) {
      if (!isYoutubeUrl(u)) {
        setErr("Only valid YouTube links are allowed in YouTube fields.");
        return;
      }
    }

    if (!t && media.length === 0 && ytClean.length === 0) {
      setErr("Post cannot be empty (text / upload / youtube).");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls = media.map((m) => String(m.url || "").trim()).filter(Boolean);

      const payload = {
        text: t,
        media: mediaUrls, // array of cloudinary URLs
        youtubeUrls: ytClean,
      };

      
      const firstImage = media.find((m) => m.kind === "image")?.url || "";
      const firstVideo = media.find((m) => m.kind === "video")?.url || "";
      payload.imageUrl = firstImage;
      payload.videoUrl = firstVideo;

      const res = await AuthFetch("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res || res.status === 401) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || "Failed to post");
        return;
      }

      
      setPosted(true);
      setNewUploads([]);

      navigate("/feed", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feed-page">
      <div className="feed-wrap">
        <div className="create-page-head">
          <h1 className="feed-title">CREATE POST</h1>

          <button
            className="btn btn--ghost btn--topright"
            type="button"
            onClick={backToFeed}
            disabled={loading}
          >
            Back to feed
          </button>
        </div>

        <div className="create-box">
          <textarea
            className="feed-textarea"
            placeholder="Write something..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              className="btn btn--secondary"
              type="button"
              onClick={pickFiles}
              disabled={loading}
            >
              Upload Media (Images/Videos)
            </button>

            {media.length > 0 && (
              <button
                className="btn btn--ghost btn--danger"
                type="button"
                onClick={clearAllMedia}
                disabled={loading}
              >
                Clear All Media
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={onFilesSelected}
          />

          {media.length > 0 && (
            <div
              className="preview-wrap"
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {media.map((m, idx) => (
                <div key={`${m.url}-${idx}`} style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--danger"
                    style={{ position: "absolute", right: 8, top: 8, zIndex: 2 }}
                    onClick={() => removeMediaAt(idx)}
                    disabled={loading}
                  >
                    Remove
                  </button>

                  {m.kind === "video" ? (
                    <video className="preview-video" controls>
                      <source src={m.url} type="video/mp4" />
                    </video>
                  ) : (
                    <img className="preview-img" src={m.url} alt="preview" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700 }}>YouTube Links (URL ONLY)</div>

              <button
                className="btn btn--outline-primary"
                type="button"
                onClick={addYoutubeField}
                disabled={loading}
              >
                + Add YouTube URL
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {youtubeUrls.map((u, idx) => (
                <div key={idx} style={{ display: "flex", gap: 10 }}>
                  <input
                    className="feed-input"
                    placeholder="Paste YouTube URL only..."
                    value={u}
                    onChange={(e) => updateYoutubeField(idx, e.target.value)}
                    disabled={loading}
                  />
                  {youtubeUrls.length > 1 && (
                    <button
                      className="btn btn--ghost btn--danger"
                      type="button"
                      onClick={() => removeYoutubeField(idx)}
                      disabled={loading}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn--primary btn--lg btn--post"
            type="button"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Posting..." : "POST"}
          </button>

          {err && <div className="feed-error">{err}</div>}
        </div>
      </div>
    </div>
  );
};

export default CreatePost;

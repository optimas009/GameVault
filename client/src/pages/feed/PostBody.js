import { useEffect, useRef, useState } from "react";

import AuthFetch from "../../services/AuthFetch";
import MediaUtil from "../../services/MediaUtil";
import UploadFile from "../../services/UploadFile";
import DeleteUpload from "../../services/DeleteUpload";
import NormalizePostMedia from "../../services/NormalizePostMedia";

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

const PostBody = ({
  post,
  token,
  isOwner,
  editingPost,
  onCancelEdit,
  onSaved,
  onRequireLogin,
}) => {
  const [text, setText] = useState(post?.text || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [media, setMedia] = useState([]); // [{url, kind}]
  const [youtubeUrls, setYoutubeUrls] = useState([""]);

  // track uploads made while editing (URLs)
  const [newUploads, setNewUploads] = useState([]);

  // snapshot to restore on cancel
  const [initialSnap, setInitialSnap] = useState({
    text: "",
    media: [],
    youtubeUrls: [""],
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    setText(post?.text || "");

    const fromArray = Array.isArray(post?.media) ? post.media : [];
    const loadedMedia = fromArray
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      .map((u) => ({ url: u, kind: guessKindFromUrl(u) }));

    setMedia(loadedMedia);

    const ytArr = Array.isArray(post?.youtubeUrls) ? post.youtubeUrls : [];
    const loadedYt = ytArr.length ? ytArr.map((x) => String(x || "")) : [""];
    setYoutubeUrls(loadedYt);

    setNewUploads([]);

    setInitialSnap({
      text: post?.text || "",
      media: loadedMedia,
      youtubeUrls: loadedYt,
    });
  }, [post]);

  const pickFiles = () => fileInputRef.current?.click();

  const addYoutubeField = () => setYoutubeUrls((prev) => [...prev, ""]);
  const removeYoutubeField = (idx) =>
    setYoutubeUrls((prev) => prev.filter((_, i) => i !== idx));
  const updateYoutubeField = (idx, value) =>
    setYoutubeUrls((prev) => prev.map((v, i) => (i === idx ? value : v)));

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
    setNewUploads([]);
    setMedia([]); // UI cleared, DB deletions happen after save
  };

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setErr("");
    setSaving(true);

    try {
      const uploaded = [];

      for (const f of files) {
        const data = await UploadFile(f);
        const url = String(data?.url || "").trim();
        if (!url) continue;

        const kind = String(f.type || "").startsWith("video/")
          ? "video"
          : guessKindFromUrl(url);

        uploaded.push({ url, kind });
      }

      if (!uploaded.length) throw new Error("Upload failed (no url returned)");

      setNewUploads((prev) => [...prev, ...uploaded.map((x) => x.url)]);
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (ex) {
      setErr(ex?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = async () => {
    
    const urls = newUploads.filter(Boolean);
    try {
      await Promise.allSettled(urls.map((u) => DeleteUpload(u)));
    } catch {}

    setNewUploads([]);

   
    setText(initialSnap.text);
    setMedia(initialSnap.media);
    setYoutubeUrls(initialSnap.youtubeUrls);

    onCancelEdit?.();
  };

  const save = async () => {
    if (!token) return onRequireLogin?.();
    if (!isOwner) return;

    setErr("");

    const t = String(text || "").trim();

    const mediaUrls = media.map((m) => String(m?.url || "").trim()).filter(Boolean);
    const ytClean = youtubeUrls.map((u) => String(u || "").trim()).filter(Boolean);

    if (!t && mediaUrls.length === 0 && ytClean.length === 0) {
      return setErr("Post cannot be empty (text / uploads / youtube).");
    }

    // Validate media URLs (cloudinary only)
    for (const u of mediaUrls) {
      if (!MediaUtil.isAllowedMediaUrl(u)) {
        return setErr("Invalid media URL detected.");
      }
    }

    for (const u of ytClean) {
      if (!isYoutubeUrl(u)) {
        return setErr("Only valid YouTube links are allowed in YouTube fields.");
      }
    }

    const firstImage = media.find((m) => m.kind === "image")?.url || "";
    const firstVideo = media.find((m) => m.kind === "video")?.url || "";

    setSaving(true);
    try {
      const res = await AuthFetch(`/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          media: mediaUrls,
          youtubeUrls: ytClean,
          imageUrl: firstImage,
          videoUrl: firstVideo,
        }),
      });

      if (!res || res.status === 401) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(data.message || "Update failed");

      // now new uploads are linked to db
      setNewUploads([]);

      onSaved?.(data.post);
    } finally {
      setSaving(false);
    }
  };

  // ===================== EDIT MODE =====================
  if (editingPost) {
    return (
      <div style={{ marginTop: 10 }}>
        <textarea
          className="feed-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Update text..."
          disabled={saving}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn--secondary" type="button" onClick={pickFiles} disabled={saving}>
            Upload Media (Images/Videos)
          </button>

          {media.length > 0 && (
            <button className="btn btn--ghost btn--danger" type="button" onClick={clearAllMedia} disabled={saving}>
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
                  className="btn btn--ghost btn--danger"
                  type="button"
                  style={{ position: "absolute", right: 8, top: 8, zIndex: 2 }}
                  onClick={() => removeMediaAt(idx)}
                  disabled={saving}
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
            <div style={{ fontWeight: 700 }}>YouTube Links (optional)</div>

            <button className="btn btn--outline-primary" type="button" onClick={addYoutubeField} disabled={saving}>
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
                  disabled={saving}
                />

                {youtubeUrls.length > 1 && (
                  <button
                    className="btn btn--ghost btn--danger"
                    type="button"
                    onClick={() => removeYoutubeField(idx)}
                    disabled={saving}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="action-btn" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button className="action-btn" type="button" onClick={cancelEdit} disabled={saving}>
            Cancel
          </button>
        </div>

        {err && <div className="feed-error">{err}</div>}
      </div>
    );
  }

  // ===================== VIEW MODE =====================
  const normalized = NormalizePostMedia(post);
  const viewMedia = normalized.media;
  const viewYoutubeUrls = normalized.youtubeUrls;

  const isVideoUrl = (u) => {
    const s = String(u || "").toLowerCase().split("?")[0];
    return [".mp4", ".webm", ".ogg", ".mov", ".mkv"].some((ext) => s.endsWith(ext));
  };

  return (
    <>
      {post?.text && <div className="post-text">{post.text}</div>}

      {viewMedia.map((u, idx) => {
        const abs = MediaUtil.toAbsoluteMediaUrl(u); // should just return u for cloudinary
        const isVid = isVideoUrl(u);

        return (
          <div className="post-media" key={`${u}-${idx}`}>
            {isVid ? (
              <video className="post-video" controls>
                <source src={abs} type="video/mp4" />
              </video>
            ) : (
              <img className="post-img" src={abs} alt="post" />
            )}
          </div>
        );
      })}

      {viewYoutubeUrls.map((y, idx) => {
        const embed = MediaUtil.toYoutubeEmbed(y);
        if (!embed) return null;

        return (
          <div className="post-media" key={`yt-${idx}`}>
            <iframe
              className="post-video"
              src={embed}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={`youtube-${idx}`}
            />
          </div>
        );
      })}
    </>
  );
};

export default PostBody;

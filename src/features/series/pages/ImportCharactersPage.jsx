import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader, Trash2, Upload } from "lucide-react";
import api from "../../../services/api";
import seriesService from "../../../services/seriesService";
import { useUIStore } from "../../../app/stores/uiStore";
import { CharacterEditorSection } from "../components/CharacterEditorSection";
import { compressImages } from "../../../shared/utils/imageCompression";

export function ImportCharactersPage() {
  const { seriesId } = useParams();
  const id = Number(seriesId);
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [series, setSeries] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [queuedCharacters, setQueuedCharacters] = useState([]);

  const [name, setName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [sketchFiles, setSketchFiles] = useState([]);
  const [sketchPreviews, setSketchPreviews] = useState([]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [seriesRes, charactersRes] = await Promise.allSettled([
        seriesService.getById(id),
        api.get(`/series/${id}/characters`),
      ]);

      if (seriesRes.status === "fulfilled") setSeries(seriesRes.value);

      if (charactersRes.status === "fulfilled") {
        const data = charactersRes.value;
        setCharacters(Array.isArray(data) ? data : data?.content || []);
      } else {
        setCharacters([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePickSketch = async (files) => {
    if (!files || files.length === 0) return;
    setSketchFiles((prev) => [...prev, ...files]);
    files.forEach((file) => setSketchPreviews((prev) => [...prev, URL.createObjectURL(file)]));
    const compressed = await compressImages(files);
    setSketchFiles((prev) => {
      const updated = [...prev];
      files.forEach((orig, i) => {
        const idx = updated.indexOf(orig);
        if (idx !== -1) updated[idx] = compressed[i];
      });
      return updated;
    });
  };

  const handleRemoveSketch = (index) => {
    setSketchFiles((prev) => prev.filter((_, i) => i !== index));
    setSketchPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName("");
    setMotivation("");
    setSketchFiles([]);
    setSketchPreviews([]);
  };

  const handleAddToQueue = () => {
    if (!name.trim()) return;
    setQueuedCharacters((prev) => [
      ...prev,
      {
        name: name.trim(),
        motivation,
        sketchFiles: [...sketchFiles],
        sketchPreviews: [...sketchPreviews],
      },
    ]);
    resetForm();
  };

  const handleRemoveFromQueue = (index) => {
    setQueuedCharacters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportAll = async () => {
    if (queuedCharacters.length === 0) return;
    setSaving(true);
    setUploadProgress(0);

    try {
      const batchRequest = {
        characters: queuedCharacters.map((c) => ({
          name: c.name,
          motivation: c.motivation || null,
          fileCount: c.sketchFiles.length,
        })),
      };

      const formData = new FormData();
      formData.append(
        "batchRequest",
        new Blob([JSON.stringify(batchRequest)], { type: "application/json" }),
        "batchRequest.json",
      );
      queuedCharacters.forEach((c) =>
        c.sketchFiles.forEach((f) => formData.append("files", f)),
      );

      await seriesService.createCharactersBatch(
        Number(id),
        formData,
        setUploadProgress,
      );

      addToast({
        type: "success",
        title: "Characters imported",
        message: `${queuedCharacters.length} characters were imported successfully.`,
      });
      navigate(`/series/${id}?tab=characters`);
    } catch (err) {
      addToast({
        type: "error",
        title: "Import failed",
        message:
          err?.response?.data?.message ||
          "Failed to import characters.",
      });
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pt-container-padding pb-12 space-y-6">

      {/* ── Nút "Back to Series Detail" — quay lại trang chi tiết series ── */}
      <button
        onClick={() => navigate(`/series/${id}`)}
        className="flex items-center text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Series Detail
      </button>

      {/* ── Header: tiêu đề + mô tả trang ─────────────────────────────── */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6">
        <h1 className="text-headline-md font-semibold text-on-surface">
          Import Characters {series?.title ? `for ${series.title}` : ""}
        </h1>
        <p className="text-sm text-on-surface-variant mt-2">
          Import characters in separate requests to avoid overloading upload in
          create flow.
        </p>
      </div>

      {/* ── CharacterEditorSection — form nhập từng character ────────── */}
      {/* Gồm: input name, motivation, upload sketch, nút "Queue Character" */}
      <CharacterEditorSection
        name={name}
        motivation={motivation}
        sketchFiles={sketchFiles}
        sketchPreviews={sketchPreviews}
        onNameChange={setName}
        onMotivationChange={setMotivation}
        onSketchPick={handlePickSketch}
        onSketchRemove={handleRemoveSketch}
        onSubmit={handleAddToQueue}
        saving={false}
        submitLabel="Queue Character"
        loading={loading}
        characters={characters}
      />

      {/* ── Danh sách characters đã queue — chờ import batch ──────────── */}
      {queuedCharacters.length > 0 && (
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
          {/* Tiêu đề: số lượng character đang chờ */}
          <h2 className="text-lg font-semibold text-on-surface">
            Characters to Import ({queuedCharacters.length})
          </h2>

          {/* Danh sách các character đã queue */}
          <div className="space-y-2">
            {queuedCharacters.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-outline-variant/30 p-3 bg-surface-container-low"
              >
                {/* Ảnh preview + tên + số sketch */}
                <div className="flex items-center gap-3">
                  {c.sketchPreviews.length > 0 && (
                    <img
                      src={c.sketchPreviews[0]}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {c.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {c.sketchFiles.length} sketch file(s)
                    </p>
                  </div>
                </div>
                {/* Nút xóa khỏi queue */}
                <button
                  type="button"
                  onClick={() => handleRemoveFromQueue(i)}
                  className="text-xs text-error hover:text-error/80"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* ── Progress bar — hiển thị khi đang upload ──────────────── */}
          {saving && (
            <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* ── Nút "Import All" — gửi batch lên backend ──────────────── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImportAll}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary disabled:opacity-50"
            >
              {saving ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Import All ({queuedCharacters.length})
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

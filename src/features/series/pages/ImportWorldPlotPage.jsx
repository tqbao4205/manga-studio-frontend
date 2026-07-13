import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../../services/api";
import seriesService from "../../../services/seriesService";
import { useUIStore } from "../../../app/stores/uiStore";
import { WorldPlotEditorSection } from "../components/WorldPlotEditorSection";
import { compressImages } from "../../../shared/utils/imageCompression";

export function ImportWorldPlotPage() {
  const { seriesId } = useParams();
  const id = Number(seriesId);
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [worldLore, setWorldLore] = useState("");
  const [arcTitle, setArcTitle] = useState("");
  const [arcSummary, setArcSummary] = useState("");
  const [storyRoadmap, setStoryRoadmap] = useState([]);
  const [visualReferences, setVisualReferences] = useState([]);
  const [visRefFiles, setVisRefFiles] = useState([]);
  const [visRefPreviews, setVisRefPreviews] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [seriesRes, profileRes] = await Promise.allSettled([
          seriesService.getById(id),
          api.get(`/series/${id}/story-profile`),
        ]);

        if (seriesRes.status === "fulfilled") setSeries(seriesRes.value);

        if (profileRes.status === "fulfilled") {
          const data = profileRes.value || {};
          const lore = data.worldLore || "";

          setWorldLore(lore);
          setStoryRoadmap(
            Array.isArray(data.storyRoadmap) ? data.storyRoadmap : [],
          );
          setVisualReferences(
            Array.isArray(data.visualReferences)
              ? data.visualReferences
              : Array.isArray(data.references)
                ? data.references
                : [],
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const addRoadmapItem = () => {
    if (!arcTitle.trim() && !arcSummary.trim()) return;
    setStoryRoadmap((prev) => [
      ...prev,
      {
        title: arcTitle.trim() || `Arc ${prev.length + 1}`,
        summary: arcSummary.trim(),
      },
    ]);
    setArcTitle("");
    setArcSummary("");
  };

  const removeRoadmap = (index) =>
    setStoryRoadmap((prev) => prev.filter((_, idx) => idx !== index));

  const removeReference = (index) =>
    setVisualReferences((prev) => prev.filter((_, idx) => idx !== index));

  const handlePickVisRef = async (files) => {
    if (!files || files.length === 0) return;
    setVisRefFiles((prev) => [...prev, ...files]);
    files.forEach((file) => setVisRefPreviews((prev) => [...prev, URL.createObjectURL(file)]));
    const compressed = await compressImages(files);
    setVisRefFiles((prev) => {
      const updated = [...prev];
      files.forEach((orig, i) => {
        const idx = updated.indexOf(orig);
        if (idx !== -1) updated[idx] = compressed[i];
      });
      return updated;
    });
  };

  const handleRemoveVisRef = (index) => {
    setVisRefFiles((prev) => prev.filter((_, i) => i !== index));
    setVisRefPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setUploadProgress(0);
    try {
      const body = {
        worldLoreContent: worldLore || null,
        storyRoadmap,
        preservedVisualRefUrls: visualReferences.map((r) => r.url || r),
      };

      const formData = new FormData();
      formData.append(
        "storyProfile",
        new Blob([JSON.stringify(body)], { type: "application/json" }),
        "storyProfile.json",
      );
      visRefFiles.forEach((file) => formData.append("files", file));

      await seriesService.saveStoryProfile(Number(id), formData, setUploadProgress);

      addToast({
        type: "success",
        title: "World & Plot saved",
        message: "World lore and plot roadmap were imported successfully.",
      });
      navigate(`/series/${id}`);
    } catch (err) {
      addToast({
        type: "error",
        title: "Save failed",
        message:
          err?.response?.data?.message ||
          "Failed to save story profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pt-container-padding pb-12 space-y-6">
      <button
        onClick={() => navigate(`/series/${id}`)}
        className="flex items-center text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Series Detail
      </button>

      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6">
        <h1 className="text-headline-md font-semibold text-on-surface">
          Import World & Plot {series?.title ? `for ${series.title}` : ""}
        </h1>
        <p className="text-sm text-on-surface-variant mt-2">
          Import world profile separately from create flow to reduce upload
          payload.
        </p>
      </div>

      <WorldPlotEditorSection
        loading={loading}
        worldLore={worldLore}
        onWorldLoreChange={setWorldLore}
        arcTitle={arcTitle}
        arcSummary={arcSummary}
        onArcTitleChange={setArcTitle}
        onArcSummaryChange={setArcSummary}
        onAddArc={addRoadmapItem}
        storyRoadmap={storyRoadmap}
        onRemoveRoadmap={removeRoadmap}
        visualReferences={visualReferences}
        onRemoveReference={removeReference}
        refFiles={visRefFiles}
        refPreviews={visRefPreviews}
        onRefPick={handlePickVisRef}
        onRefRemove={handleRemoveVisRef}
        onSave={handleSave}
        saving={saving}
        uploadProgress={uploadProgress}
        showProgress={saving}
        saveLabel="Save World & Plot"
        secondaryAction={
          <button
            type="button"
            onClick={() => navigate(`/series/${id}/import/characters`)}
            className="px-5 py-2.5 rounded-lg border border-outline-variant hover:border-primary"
          >
            Back: Import Characters
          </button>
        }
      />
    </div>
  );
}

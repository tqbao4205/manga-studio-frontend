import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../../services/api";
import seriesService from "../../../services/seriesService";
import { useUIStore } from "../../../app/stores/uiStore";
import { WorldPlotEditorSection } from "../components/WorldPlotEditorSection";

export function ImportWorldPlotPage() {
  const { seriesId } = useParams();
  const id = Number(seriesId);
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [worldLore, setWorldLore] = useState("");
  const [arcTitle, setArcTitle] = useState("");
  const [arcSummary, setArcSummary] = useState("");
  const [storyRoadmap, setStoryRoadmap] = useState([]);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [visualReferences, setVisualReferences] = useState([]);

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
          const lore = Array.isArray(data.worldLoreSections)
            ? data.worldLoreSections[0]?.description || ""
            : data.worldLore || "";

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

  const addReference = () => {
    if (!referenceUrl.trim()) return;
    setVisualReferences((prev) => [...prev, { url: referenceUrl.trim() }]);
    setReferenceUrl("");
  };

  const removeRoadmap = (index) =>
    setStoryRoadmap((prev) => prev.filter((_, idx) => idx !== index));

  const removeReference = (index) =>
    setVisualReferences((prev) => prev.filter((_, idx) => idx !== index));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/series/${id}/story-profile`, {
        worldLoreSections: worldLore
          ? [{ title: "World Lore", description: worldLore }]
          : [],
        storyRoadmap,
        visualReferences,
      });

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
          "Story profile API is not available yet on backend.",
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
        referenceUrl={referenceUrl}
        onReferenceUrlChange={setReferenceUrl}
        onAddReference={addReference}
        visualReferences={visualReferences}
        onRemoveReference={removeReference}
        onSave={handleSave}
        saving={saving}
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

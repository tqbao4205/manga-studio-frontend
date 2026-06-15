import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../../services/api";
import seriesService from "../../../services/seriesService";
import { useUIStore } from "../../../app/stores/uiStore";
import { CharacterEditorSection } from "../components/CharacterEditorSection";

export function ImportCharactersPage() {
  const { seriesId } = useParams();
  const id = Number(seriesId);
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [series, setSeries] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [sketchFile, setSketchFile] = useState(null);
  const [sketchPreview, setSketchPreview] = useState("");

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

  const handlePickSketch = (file) => {
    if (!file) return;
    setSketchFile(file);

    const reader = new FileReader();
    reader.onload = () => setSketchPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName("");
    setMotivation("");
    setSketchFile(null);
    setSketchPreview("");
  };

  const handleImport = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      if (sketchFile) {
        const formData = new FormData();
        formData.append(
          "character",
          new Blob(
            [
              JSON.stringify({
                name: name.trim(),
                motivation: motivation || null,
              }),
            ],
            { type: "application/json" },
          ),
          "character.json",
        );
        formData.append("file", sketchFile);

        await api.post(`/series/${id}/characters`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post(`/series/${id}/characters`, {
          name: name.trim(),
          motivation: motivation || null,
        });
      }

      addToast({
        type: "success",
        title: "Character imported",
        message: `${name.trim()} was imported successfully.`,
      });
      resetForm();
      fetchData();
    } catch (err) {
      addToast({
        type: "error",
        title: "Import failed",
        message:
          err?.response?.data?.message ||
          "Character import API is not available yet on backend.",
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
          Import Characters {series?.title ? `for ${series.title}` : ""}
        </h1>
        <p className="text-sm text-on-surface-variant mt-2">
          Import characters in separate requests to avoid overloading upload in
          create flow.
        </p>
      </div>

      <CharacterEditorSection
        name={name}
        motivation={motivation}
        sketchFile={sketchFile}
        sketchPreview={sketchPreview}
        onNameChange={setName}
        onMotivationChange={setMotivation}
        onSketchPick={handlePickSketch}
        onSubmit={handleImport}
        saving={saving}
        submitLabel="Import Character"
        loading={loading}
        characters={characters}
        secondaryAction={
          <button
            type="button"
            onClick={() => navigate(`/series/${id}/import/world-plot`)}
            className="px-5 py-2.5 rounded-lg border border-outline-variant hover:border-primary"
          >
            Next: Import World & Plot
          </button>
        }
      />
    </div>
  );
}

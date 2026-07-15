import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import { useUIStore } from "../../../app/stores/uiStore";
import seriesService from "../../../services/seriesService";
import api from "../../../services/api";
import { Dialog } from "../../../shared/components/ui/dialog";
import { CharacterEditorSection } from "../components/CharacterEditorSection";
import { WorldPlotEditorSection } from "../components/WorldPlotEditorSection";
import { compressImage, compressImages } from "../../../shared/utils/imageCompression";

const GENRES = ["ACTION", "FANTASY", "ROMANCE", "COMEDY", "DRAMA"];
const DEMOGRAPHICS = ["SHONEN", "SHOJO", "SEINEN", "JOSEI"];

const TABS = [
  { value: "basic", label: "1. Basic Information", icon: Info },
  { value: "characters", label: "2. Character Sheets", icon: UserCircle },
  { value: "worldplot", label: "3. World & Plot", icon: Globe },
];

const toLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const HELP_CONTENT = {
  synopsis: {
    title: "Writing a Great Synopsis",
    description:
      "Your synopsis is the first impression reviewers and readers get of your series.",
    body: [
      {
        heading: "Length",
        text: "Aim for 150-300 words. Too short loses detail; too long loses focus.",
      },
      {
        heading: "Key Elements",
        text: "Include the protagonist, inciting incident, central conflict, and a hint of the stakes.",
      },
      {
        heading: "Tip",
        text: "Write in present tense and avoid revealing the ending.",
      },
    ],
  },
  tags: {
    title: "Category & Tags",
    description:
      "Use tags so readers and editorial reviewers can find your series quickly.",
    body: [
      {
        heading: "Genres",
        text: "Pick one or more genres that describe your story.",
      },
      {
        heading: "Target Demographics",
        text: "Pick the intended audience: Shonen, Shojo, Seinen, Josei (can select multiple).",
      },
      {
        heading: "Optional Tags",
        text: "You can add up to 5 tags from metadata maintained by backend.",
      },
    ],
  },
  cover: {
    title: "Cover Artwork Guidelines",
    description: "Cover is the primary visual asset used across the platform.",
    body: [
      {
        heading: "Recommended Size",
        text: "1600 x 2400 px (2:3 ratio).",
      },
      {
        heading: "Formats",
        text: "JPG, PNG, WEBP. Max file size 10MB.",
      },
      {
        heading: "Safety",
        text: "Keep key text and faces away from edges to avoid crop issues.",
      },
    ],
  },
};

export function NewSeriesPage() {
  const navigate = useNavigate();
  const { seriesId } = useParams();
  const location = useLocation();
  const isEdit = location.pathname.endsWith("/edit");
  const addToast = useUIStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "characters" ? "characters" : "basic";
  });
  const [helpModal, setHelpModal] = useState(null);
  const [title, setTitle] = useState("");
  const [titleJp, setTitleJp] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState([]);
  const [demographics, setDemographics] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagGroups, setTagGroups] = useState([
    { label: "Genre", options: GENRES.map(toLabel) },
    { label: "Demographic", options: DEMOGRAPHICS.map(toLabel) },
  ]);

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState("");
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [characters, setCharacters] = useState([]);
  const [charName, setCharName] = useState("");
  const [charMotivation, setCharMotivation] = useState("");
  const [charSketchFiles, setCharSketchFiles] = useState([]);
  const [charSketchPreviews, setCharSketchPreviews] = useState([]);
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [uploadProgressCharacter, setUploadProgressCharacter] = useState(0);
  const [editingCharId, setEditingCharId] = useState(null);
  const [existingSketchUrls, setExistingSketchUrls] = useState([]);

  const [worldLore, setWorldLore] = useState("");
  const [arcTitle, setArcTitle] = useState("");
  const [arcSummary, setArcSummary] = useState("");
  const [storyRoadmap, setStoryRoadmap] = useState([]);
  const [visualReferences, setVisualReferences] = useState([]);
  const [visRefFiles, setVisRefFiles] = useState([]);
  const [visRefPreviews, setVisRefPreviews] = useState([]);
  const [savingWorldPlot, setSavingWorldPlot] = useState(false);
  const [uploadProgressWorldPlot, setUploadProgressWorldPlot] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchTagMetadata = async () => {
      try {
        const metadata = await api.get("/series/metadata");
        if (cancelled) return;

        const genres = Array.isArray(metadata?.genres)
          ? metadata.genres.map((g) => g.label || toLabel(g.code || g))
          : GENRES.map(toLabel);

        const demographics = Array.isArray(metadata?.demographics)
          ? metadata.demographics.map((d) => d.label || toLabel(d.code || d))
          : DEMOGRAPHICS.map(toLabel);

        const tags = Array.isArray(metadata?.tags)
          ? metadata.tags
              .map((t) => t.label || toLabel(t.code || t))
              .filter(Boolean)
          : [];

        const groups = [
          { label: "Genre", options: genres },
          { label: "Demographic", options: demographics },
        ];

        if (tags.length > 0) {
          groups.push({ label: "Tags", options: tags });
        }

        setTagGroups(groups);
      } catch {
        setTagGroups([
          { label: "Genre", options: GENRES.map(toLabel) },
          { label: "Demographic", options: DEMOGRAPHICS.map(toLabel) },
        ]);
      }
    };

    fetchTagMetadata();

    if (isEdit && seriesId) {
      seriesService
        .getById(Number(seriesId))
        .then((series) => {
          setTitle(series.title || "");
          setTitleJp(series.titleJp || "");
          setSynopsis(series.synopsis || "");
          setGenres(series.genres || []);
          setDemographics(series.targetDemographics || []);
          setCoverImageUrl(series.coverImageUrl || "");

          const seedTags = [...(series.genres || []), ...(series.targetDemographics || [])]
            .filter(Boolean)
            .map(toLabel);
          setSelectedTags(seedTags);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isEdit, seriesId]);

  const fetchEditProfileData = async () => {
    if (!isEdit || !seriesId) return;

    setLoadingProfile(true);
    try {
      const [charactersRes, worldRes] = await Promise.allSettled([
        api.get(`/series/${seriesId}/characters`),
        api.get(`/series/${seriesId}/story-profile`),
      ]);

      if (charactersRes.status === "fulfilled") {
        const data = charactersRes.value;
        setCharacters(Array.isArray(data) ? data : data?.content || []);
      } else {
        setCharacters([]);
      }

      if (worldRes.status === "fulfilled") {
        const data = worldRes.value || {};
        const lore = data.worldLore || "";

        setWorldLore(lore);
        setStoryRoadmap(Array.isArray(data.storyRoadmap) ? data.storyRoadmap : []);
        setVisualReferences(
          Array.isArray(data.visualReferences)
            ? data.visualReferences
            : Array.isArray(data.references)
              ? data.references
              : [],
        );
      } else {
        setWorldLore("");
        setStoryRoadmap([]);
        setVisualReferences([]);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isEdit && (activeTab === "characters" || activeTab === "worldplot")) {
      fetchEditProfileData();
    }
  }, [isEdit, activeTab, seriesId]);

  // Auto-fill form khi URL có characterId (bấm Edit từ DetailPage)
  useEffect(() => {
    if (!isEdit || !characters.length || loadingProfile || editingCharId) return;
    const params = new URLSearchParams(location.search);
    const charId = params.get("characterId");
    if (!charId) return;
    const char = characters.find((c) => String(c.id) === charId);
    if (!char) return;
    handleEditCharacter(char);
    // Clean query param d? tránh re-fill khi re-render
    const newParams = new URLSearchParams(location.search);
    newParams.delete("characterId");
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  }, [isEdit, characters, loadingProfile, editingCharId, location.search, location.pathname, navigate]);

  const toggleTag = (tag) => {
    const upper = String(tag).toUpperCase().replace(/\s+/g, "_");

    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      if (exists) {
        if (GENRES.includes(upper))
          setGenres((g) => g.filter((v) => v !== upper));
        if (DEMOGRAPHICS.includes(upper))
          setDemographics((d) => d.filter((v) => v !== upper));
        return prev.filter((t) => t !== tag);
      }

      if (prev.length >= 5) return prev;
      if (GENRES.includes(upper))
        setGenres((g) => (g.includes(upper) ? g : [...g, upper]));
      if (DEMOGRAPHICS.includes(upper))
        setDemographics((d) => (d.includes(upper) ? d : [...d, upper]));
      return [...prev, tag];
    });
  };

  const canSubmit = title.trim() && genres.length > 0 && demographics.length > 0 && !submitting;

  const buildFormData = () => {
    const formData = new FormData();
    formData.append(
      "series",
      new Blob(
        [
          JSON.stringify({
            title: title.trim(),
            titleJp: titleJp || null,
            synopsis: synopsis || null,
            genres,
            targetDemographics: demographics,
            coverImageUrl: coverImageUrl || null,
          }),
        ],
        { type: "application/json" },
      ),
      "series.json",
    );

    if (newCoverFile) formData.append("file", newCoverFile);
    return formData;
  };

  const handleSubmitBasic = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      if (isEdit && seriesId) {
        await seriesService.update(Number(seriesId), buildFormData());
        addToast({
          type: "success",
          title: "Series updated",
          message: "Basic information was saved.",
        });
        navigate(`/series/${seriesId}`);
      } else {
        const created = await seriesService.create(buildFormData());
        addToast({
          type: "success",
          title: "Series created",
          message: "Series created successfully.",
        });
        navigate(`/series/${created.id}`);
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to save series.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCoverFile(file);
    setCoverImageUrl("");
    setNewCoverPreview(URL.createObjectURL(file));
    const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1200 });
    setNewCoverFile(compressed);
  };

  const clearNewCover = () => {
    setNewCoverFile(null);
    setNewCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePickCharSketch = async (files) => {
    if (!files || files.length === 0) return;
    setCharSketchFiles((prev) => [...prev, ...files]);
    files.forEach((file) => setCharSketchPreviews((prev) => [...prev, URL.createObjectURL(file)]));
    const compressed = await compressImages(files);
    setCharSketchFiles((prev) => {
      const updated = [...prev];
      files.forEach((orig, i) => {
        const idx = updated.indexOf(orig);
        if (idx !== -1) updated[idx] = compressed[i];
      });
      return updated;
    });
  };

  const handleRemoveCharSketch = (index) => {
    const preview = charSketchPreviews[index];
    if (preview && (preview.startsWith("http://") || preview.startsWith("https://"))) {
      // Existing Cloudinary URL — remove from preserved list
      setExistingSketchUrls((prev) => prev.filter((url) => url !== preview));
      setCharSketchPreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      // New file preview — remove file
      setCharSketchFiles((prev) => prev.filter((_, i) => i !== index));
      setCharSketchPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const resetCharacterForm = () => {
    setCharName("");
    setCharMotivation("");
    setCharSketchFiles([]);
    setCharSketchPreviews([]);
    setEditingCharId(null);
    setExistingSketchUrls([]);
  };

  const handleEditCharacter = (char) => {
    const urls = char.sketchUrls || [];
    setEditingCharId(char.id);
    setCharName(char.name || "");
    setCharMotivation(char.motivation || "");
    setCharSketchFiles([]);
    setCharSketchPreviews([...urls]);
    setExistingSketchUrls([...urls]);
  };

  const handleDeleteCharacter = async (charId) => {
    if (!isEdit || !seriesId || !charId) return;

    try {
      await seriesService.deleteCharacter(Number(seriesId), charId);
      addToast({
        type: "success",
        title: "Character deleted",
        message: "Character was removed successfully.",
      });
      fetchEditProfileData();
    } catch (err) {
      addToast({
        type: "error",
        title: "Delete failed",
        message: err?.response?.data?.message || "Failed to delete character.",
      });
    }
  };

  const handleSaveCharacter = async () => {
    if (!isEdit || !seriesId || !charName.trim()) return;

    setSavingCharacter(true);
    setUploadProgressCharacter(0);
    try {
      const formData = new FormData();
      const body = {
        name: charName.trim(),
        motivation: charMotivation || null,
      };

      // Khi update: g?i preservedSketchUrls d? BE merge URLs c? + files m?i
      if (editingCharId) {
        body.preservedSketchUrls = existingSketchUrls;
      }

      formData.append(
        "character",
        new Blob(
          [JSON.stringify(body)],
          { type: "application/json" },
        ),
        "character.json",
      );

      // Ch? g?i files m?i (không g?i l?i URLs c?)
      charSketchFiles.forEach((file) => formData.append("files", file));

      const onProgress = setUploadProgressCharacter;
      if (editingCharId) {
        await seriesService.updateCharacter(Number(seriesId), editingCharId, formData, onProgress);
      } else {
        await seriesService.createCharacter(Number(seriesId), formData, onProgress);
      }

      addToast({
        type: "success",
        title: "Character saved",
        message: `${charName.trim()} was saved successfully.`,
      });
      resetCharacterForm();
      navigate(`/series/${seriesId}?tab=characters`);
    } catch (err) {
      addToast({
        type: "error",
        title: "Save failed",
        message:
          err?.response?.data?.message ||
          "Character API is not available yet on backend.",
      });
    } finally {
      setSavingCharacter(false);
    }
  };

  const addRoadmapItem = () => {
    if (!arcTitle.trim() && !arcSummary.trim()) return;
    setStoryRoadmap((prev) => [
      ...prev,
      { title: arcTitle.trim() || `Arc ${prev.length + 1}`, summary: arcSummary.trim() },
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

  const handleSaveWorldPlot = async () => {
    if (!isEdit || !seriesId) return;

    setSavingWorldPlot(true);
    setUploadProgressWorldPlot(0);
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

      await seriesService.saveStoryProfile(Number(seriesId), formData, setUploadProgressWorldPlot);

      setVisRefFiles([]);
      setVisRefPreviews([]);

      addToast({
        type: "success",
        title: "World & Plot saved",
        message: "World lore and story roadmap were saved successfully.",
      });
      navigate(`/series/${seriesId}?tab=worldplot`);
    } catch (err) {
      addToast({
        type: "error",
        title: "Save failed",
        message:
          err?.response?.data?.message ||
          "Failed to save story profile.",
      });
    } finally {
      setSavingWorldPlot(false);
    }
  };

  const showExistingCover = isEdit && coverImageUrl && !newCoverPreview;
  const helpData = helpModal ? HELP_CONTENT[helpModal] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-panel-gap pb-12 pt-container-padding">
      <div className="mb-8">
        <button
          onClick={() =>
            navigate(isEdit && seriesId ? `/series/${seriesId}` : "/series")
          }
          className="flex items-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high/30 px-3 py-1.5 -ml-3 rounded-lg transition-all group mb-4"
        >
          <ArrowLeft
            size={16}
            className="mr-2 group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-xs font-medium uppercase tracking-wider">
            {isEdit ? "Back to Series Detail" : "Back"}
          </span>
        </button>
        <h1 className="text-headline-lg font-semibold text-on-surface mb-2">
          {isEdit ? "Edit Series" : "Create New Series"}
        </h1>
        <p className="text-base text-on-surface-variant">
          {isEdit
            ? "Edit basic info, characters, and world profile in one place."
            : "Create the series basic information first."}
        </p>
      </div>

      {isEdit && (
        <div className="flex space-x-2 border-b border-outline-variant/50 mb-2 overflow-x-auto pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap text-label-md ${
                  isActive
                    ? "bg-surface-container border-primary text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-transparent"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {(activeTab === "basic" || !isEdit) && (
        <>
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Info size={16} className="text-primary" />
              <h2 className="text-headline-md font-semibold text-on-surface">
                Basic Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Series Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neon Horizon: Resonance"
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-3 px-4 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Subtitle / English Title (Optional)
                </label>
                <input
                  value={titleJp}
                  onChange={(e) => setTitleJp(e.target.value)}
                  placeholder="e.g. Resonance of the Neon City"
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-3 px-4 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    Synopsis
                  </label>
                  <button
                    type="button"
                    onClick={() => setHelpModal("synopsis")}
                    className="text-outline hover:text-primary transition-colors"
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Write a compelling logline or summary..."
                  rows={5}
                  className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-3 px-4 transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    Genre, Demographic & Tags
                  </label>
                  <button
                    type="button"
                    onClick={() => setHelpModal("tags")}
                    className="text-outline hover:text-primary transition-colors"
                  >
                    <HelpCircle size={14} />
                  </button>
                  <span className="ml-auto text-xs text-on-surface-variant">
                    {selectedTags.length}/5 selected
                  </span>
                </div>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="hover:text-error transition-colors ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-4 space-y-4">
                  {tagGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60 mb-2">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt) => {
                          const active = selectedTags.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleTag(opt)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                active
                                  ? "bg-primary text-on-primary border-primary"
                                  : "bg-surface-container border-outline-variant/50 text-on-surface-variant hover:border-primary hover:text-primary"
                              } ${!active && selectedTags.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}`}
                              disabled={!active && selectedTags.length >= 5}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  Select up to 5 tags. One Genre and one Demographic are required.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-headline-md font-semibold text-on-surface">
                Cover Artwork
              </h2>
              <button
                type="button"
                onClick={() => setHelpModal("cover")}
                className="text-outline hover:text-primary transition-colors"
              >
                <HelpCircle size={16} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {newCoverPreview ? (
                <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest rounded-lg overflow-hidden relative group border border-outline-variant/30">
                  <img
                    src={newCoverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearNewCover}
                    className="absolute top-2 right-2 w-6 h-6 bg-surface/80 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : showExistingCover ? (
                <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest rounded-lg overflow-hidden relative group border border-outline-variant/30">
                  <img
                    src={coverImageUrl}
                    alt="Current cover"
                    className="w-full h-full object-cover"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload size={24} className="text-white mb-1" />
                    <span className="text-xs text-white font-medium">
                      Replace Cover
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full md:w-48 aspect-[3/4] bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer transition-all group overflow-hidden relative"
                >
                  <Upload
                    size={36}
                    className="mb-2 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-label-sm">Upload Cover</span>
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex-1 space-y-4">
                <div className="bg-surface-container-high/30 p-4 rounded-lg border border-outline-variant/20">
                  <h3 className="font-label-md text-primary mb-1">Requirements</h3>
                  <ul className="text-xs space-y-1 text-on-surface-variant">
                    <li>Recommended size: 1600 x 2400 px</li>
                    <li>Formats: JPG, PNG, WEBP</li>
                    <li>Aspect ratio: 2:3</li>
                    <li>Max file size: 10MB</li>
                  </ul>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {isEdit
                    ? "Save your basic info and continue editing Characters and World & Plot with the tabs above."
                    : "After creating series, you can continue with Character and World & Plot in edit mode."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSubmitBasic}
              disabled={!canSubmit}
              className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Basic Info"
                  : "Create Series"}
            </button>
          </div>
        </>
      )}

      {isEdit && activeTab === "characters" && (
        <CharacterEditorSection
          name={charName}
          motivation={charMotivation}
          sketchFiles={charSketchFiles}
          sketchPreviews={charSketchPreviews}
          onNameChange={setCharName}
          onMotivationChange={setCharMotivation}
          onSketchPick={handlePickCharSketch}
          onSketchRemove={handleRemoveCharSketch}
          onSubmit={handleSaveCharacter}
          saving={savingCharacter}
          uploadProgress={uploadProgressCharacter}
          showProgress={savingCharacter}
          submitLabel={editingCharId ? "Update Character" : "Save Character"}
          loading={loadingProfile}
          characters={characters}
          onEdit={handleEditCharacter}
          onDelete={handleDeleteCharacter}
          secondaryAction={
            <button
              type="button"
              onClick={() => setActiveTab("worldplot")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-outline-variant hover:border-primary"
            >
              Next: World & Plot <ChevronRight size={14} />
            </button>
          }
        />
      )}

      {isEdit && activeTab === "worldplot" && (
        <WorldPlotEditorSection
          loading={loadingProfile}
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
          onSave={handleSaveWorldPlot}
          saving={savingWorldPlot}
          uploadProgress={uploadProgressWorldPlot}
          showProgress={savingWorldPlot}
          saveLabel="Save World & Plot"
          secondaryAction={
            <button
              type="button"
              onClick={() => setActiveTab("characters")}
              className="px-5 py-2.5 rounded-lg border border-outline-variant hover:border-primary"
            >
              Back: Characters
            </button>
          }
        />
      )}

      <Dialog
        open={!!helpModal}
        onClose={() => setHelpModal(null)}
        title={helpData?.title}
        description={helpData?.description}
        size="md"
      >
        {helpData && (
          <div className="space-y-4 py-1">
            {helpData.body.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-0.5">
                    {item.heading}
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

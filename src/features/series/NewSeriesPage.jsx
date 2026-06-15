import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  Info,
  UserCircle,
  Globe,
  HelpCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import seriesService from "../../services/seriesService";
import api from "../../services/api";
import { Dialog } from "../../shared/components/ui/dialog";

const GENRES = ["ACTION", "FANTASY", "ROMANCE", "COMEDY", "DRAMA"];
const DEMOGRAPHICS = ["SHONEN", "SHOJO", "SEINEN", "JOSEI"];

const toLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const TABS = [
  { value: "tab1", label: "1. Basic Information", icon: Info },
  { value: "tab2", label: "2. Character Sheets", icon: UserCircle },
  { value: "tab3", label: "3. World & Plot", icon: Globe },
];

const HELP_CONTENT = {
  synopsis: {
    title: "Writing a Great Synopsis",
    description:
      "Your synopsis is the first impression reviewers and readers get of your series.",
    body: [
      {
        heading: "Length",
        text: "Aim for 150–300 words. Too short loses detail; too long loses focus.",
      },
      {
        heading: "Key Elements",
        text: "Include: the protagonist, the inciting incident, the central conflict, and a hint at the stakes.",
      },
      {
        heading: "Tip",
        text: "Write in present tense. Avoid spoiling the ending — leave reviewers wanting more.",
      },
    ],
  },
  tags: {
    title: "Choosing Category & Tags",
    description:
      "Tags help readers discover your series and help the editorial team categorize it correctly.",
    body: [
      {
        heading: "Genre",
        text: "Pick the primary genre that best fits your story (e.g. Action, Fantasy, Romance).",
      },
      {
        heading: "Sub-tags",
        text: "Add up to 3 descriptive tags separated by commas (e.g. Isekai, School Life, Supernatural).",
      },
      {
        heading: "Demographics",
        text: "Choose the target audience: Shonen (teen boys), Shojo (teen girls), Seinen (adult men), Josei (adult women).",
      },
    ],
  },
  cover: {
    title: "Cover Artwork Guidelines",
    description:
      "Your cover is the most visible asset of your series across the platform.",
    body: [
      {
        heading: "Dimensions",
        text: "Recommended: 1600 × 2400 px (2:3 ratio). Minimum: 800 × 1200 px.",
      },
      {
        heading: "File Formats",
        text: "Accepted: JPG, PNG, WEBP. Maximum file size: 10MB.",
      },
      {
        heading: "Design Tips",
        text: "The main character should be prominently featured. Keep the bottom third clear for title text overlays.",
      },
      {
        heading: "Safety Zone",
        text: "Avoid placing critical content within 5% of any edge — it may be cropped on some displays.",
      },
    ],
  },
  characters: {
    title: "Character Sheet Guide",
    description:
      "Detailed character sheets help the editorial board evaluate the depth of your cast.",
    body: [
      {
        heading: "Required Fields",
        text: "Name, Role, and Core Motivation are mandatory for each character.",
      },
      {
        heading: "Core Motivation",
        text: "The single driving force behind a character's actions. E.g. 'Become the world's greatest swordsman' or 'Protect her siblings at any cost.'",
      },
      {
        heading: "Character Sketches",
        text: "Upload full-body reference art and facial expression sheets. Max 5MB per file (.png, .jpg, .jpeg).",
      },
      {
        heading: "Cast Size",
        text: "You can add up to 10 characters. Focus on the primary cast — supporting characters can be added later.",
      },
    ],
  },
  worldLore: {
    title: "World Lore & Mechanics",
    description: "Define the rules that govern your story's universe.",
    body: [
      {
        heading: "Power Systems",
        text: "Explain how magic, technology, or special abilities work. Define limits and costs.",
      },
      {
        heading: "World History",
        text: "Briefly cover historical events that shaped the current world state.",
      },
      {
        heading: "Factions & Races",
        text: "List major factions, kingdoms, or species and their relationships.",
      },
      {
        heading: "Tip",
        text: "Focus on elements directly relevant to the story — you can expand in production.",
      },
    ],
  },
  motivation: {
    title: "Core Motivation — What to include?",
    description:
      "Provide a rounded profile so the editorial board understands who this character is.",
    body: [
      {
        heading: "Age & Background",
        text: "How old are they? Where are they from? What is their social status, occupation, or education?",
      },
      {
        heading: "Personality",
        text: "Describe their dominant traits (e.g. reckless but loyal, cold and calculating, cheerful but hiding grief).",
      },
      {
        heading: "Core Drive",
        text: "What is the ONE thing they want most? This becomes the engine of their arc.",
      },
      {
        heading: "Fear / Flaw",
        text: "What holds them back? A deep fear, a blind spot, or a moral failing makes them believable.",
      },
      {
        heading: "Character Arc",
        text: "How do they change from the start to end of the story? Do they grow, fall, or stay tragically the same?",
      },
      {
        heading: "Relationship to Story",
        text: "How does their motivation tie into the central conflict? Why are they essential to the plot?",
      },
    ],
  },
  narrativeArc: {
    title: "Narrative Arc Overview",
    description: "Provide a high-level roadmap of your story's progression.",
    body: [
      {
        heading: "Arc 1 Summary",
        text: "Describe the central conflict and resolution of the first major story arc (the pitch arc).",
      },
      {
        heading: "Series Direction",
        text: "Give a 2–3 sentence overview of where the series is headed by the conclusion.",
      },
      {
        heading: "Volume Count",
        text: "Estimate the planned number of volumes or chapters if known.",
      },
      {
        heading: "Note",
        text: "This is a planning tool — the story can evolve. The editorial board is evaluating potential, not a locked outline.",
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

  // ── Tab & modal ────────────────────────────────
  const [activeTab, setActiveTab] = useState("tab1");
  const [helpModal, setHelpModal] = useState(null);

  // ── Basic info ─────────────────────────────────
  const [title, setTitle] = useState("");
  const [titleJp, setTitleJp] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState("");
  const [demographic, setDemographic] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagGroups, setTagGroups] = useState([
    { label: "Genre", options: GENRES.map(toLabel) },
    { label: "Demographic", options: DEMOGRAPHICS.map(toLabel) },
  ]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev,
    );
    // keep genre/demographic in sync for API submission
    const upper = tag.toUpperCase();
    if (GENRES.includes(upper)) setGenre(upper);
    if (DEMOGRAPHICS.includes(upper)) setDemographic(upper);
  };

  // ── Cover ──────────────────────────────────────
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState("");
  const fileInputRef = useRef(null);

  // ── Characters ─────────────────────────────────
  const [characters, setCharacters] = useState([
    { id: 1, name: "", motivation: "", sketchPreview: "", sketchFile: null },
  ]);
  const charSketchRefs = useRef({});

  // ── World & Plot ───────────────────────────────
  const [worldLore, setWorldLore] = useState("");
  const [narrativeArc, setNarrativeArc] = useState("");
  const [refImages, setRefImages] = useState([]);
  const refImgInputRef = useRef(null);

  // ── Submission ─────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [seriesInfo, setSeriesInfo] = useState(null);

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
        if (tags.length > 0) groups.push({ label: "Tags", options: tags });

        setTagGroups(groups);
      } catch {
        // metadata endpoint is not available yet on backend -> keep enum fallback
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
          setTitle(series.title);
          setTitleJp(series.titleJp || "");
          setSynopsis(series.synopsis || "");
          setGenre(series.genre || "");
          setDemographic(series.targetDemographic || "");
          setCoverImageUrl(series.coverImageUrl || "");
          setSeriesInfo(series);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isEdit, seriesId]);

  const canSubmit = title.trim() && genre && demographic && !submitting;

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
            genre,
            targetDemographic: demographic,
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isEdit && seriesId) {
        await seriesService.update(Number(seriesId), buildFormData());
        addToast({
          type: "success",
          title: "Series updated",
          message: `"${title}" has been updated.`,
        });
        navigate(`/series/${seriesId}`);
      } else {
        const created = await seriesService.create(buildFormData());
        addToast({
          type: "success",
          title: "Series created",
          message: `"${title}" has been created.`,
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

  // ── Cover handlers ────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCoverFile(file);
    setCoverImageUrl("");
    const reader = new FileReader();
    reader.onload = () => setNewCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearNewCover = () => {
    setNewCoverFile(null);
    setNewCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Character handlers ─────────────────────────
  const addCharacter = () => {
    if (characters.length >= 10) return;
    setCharacters((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        age: "",
        role: "Supporting",
        motivation: "",
        sketchPreview: "",
        sketchFile: null,
      },
    ]);
  };

  const removeCharacter = (id) =>
    setCharacters((prev) => prev.filter((c) => c.id !== id));

  const updateCharacter = (id, field, value) =>
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const handleCharSketch = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateCharacter(id, "sketchPreview", reader.result);
    reader.readAsDataURL(file);
    updateCharacter(id, "sketchFile", file);
  };

  // ── Reference image handlers ───────────────────
  const handleRefImages = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setRefImages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            preview: reader.result,
            name: file.name,
          },
        ]);
      reader.readAsDataURL(file);
    });
  };

  const removeRefImage = (id) =>
    setRefImages((prev) => prev.filter((img) => img.id !== id));

  const showExistingCover = isEdit && coverImageUrl && !newCoverPreview;

  // ── Help modal data ────────────────────────────
  const helpData = helpModal ? HELP_CONTENT[helpModal] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-panel-gap pb-12 pt-container-padding">
      {/* Header */}
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
            ? "Update your series details."
            : "Pitch your next masterpiece in detail."}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-outline-variant/50 mb-8 overflow-x-auto pb-2">
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

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* ─── Tab 1: Basic Information + Cover Artwork ─── */}
        {activeTab === "tab1" && (
          <div className="space-y-6">
            {/* Basic Information card */}
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
              <h2 className="text-headline-md font-semibold text-on-surface mb-6">
                Basic Information
              </h2>
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
                      Synopsis (150–300 words)
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
                      Genre, Demographic &amp; Tags
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

                  {/* Selected tag pills */}
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

                  {/* Tag groups */}
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
                    Select up to 5 tags. At least one Genre and one Demographic
                    are recommended.
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Artwork card */}
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
                    <h3 className="font-label-md text-primary mb-1">
                      {showExistingCover ? "Current Cover" : "Requirements"}
                    </h3>
                    <ul className="text-xs space-y-1 text-on-surface-variant">
                      {showExistingCover && (
                        <li>• Click the preview to replace with a new image</li>
                      )}
                      <li>• Recommended Size: 1600 x 2400 px</li>
                      <li>• Formats: JPG, PNG, WEBP</li>
                      <li>• Aspect Ratio: 2:3</li>
                      <li>• Max File Size: 10MB</li>
                    </ul>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {isEdit
                      ? "Replacing the cover will immediately update the primary visual across the dashboard and external catalogs."
                      : "This artwork will be the primary visual for the series across the dashboard and external catalogs. High resolution is preferred for marketing materials."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Next: Character Sheets <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Tab 2: Character Sheets ─── */}
        {activeTab === "tab2" && (
          <div className="space-y-6">
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-headline-md font-semibold text-on-surface">
                    Character Roster
                  </h2>
                  <button
                    type="button"
                    onClick={() => setHelpModal("characters")}
                    title="Provide basic info and sketches. Mandatory: Name, Age, Role, and Core Motivation."
                    className="text-outline hover:text-primary transition-colors cursor-help"
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addCharacter}
                  disabled={characters.length >= 10}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 font-label-md transition-colors disabled:opacity-40"
                >
                  <Plus size={17} /> Add Character
                </button>
              </div>

              <div className="space-y-4">
                {characters.map((char, idx) => (
                  <div
                    key={char.id}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-6 mb-4 relative"
                  >
                    {characters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCharacter(char.id)}
                        className="absolute top-4 right-4 text-outline hover:text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {/* Name + Core Motivation row */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                          Name
                        </label>
                        <input
                          value={char.name}
                          onChange={(e) =>
                            updateCharacter(char.id, "name", e.target.value)
                          }
                          placeholder="Character Name"
                          className="w-full bg-surface-container border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-2 px-3 transition-all"
                        />
                      </div>

                      <div className="flex-[2] min-w-0">
                        <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                          Core Motivation
                          <button
                            type="button"
                            onClick={() => setHelpModal("motivation")}
                            className="text-outline hover:text-primary transition-colors"
                          >
                            <HelpCircle size={13} />
                          </button>
                        </label>
                        <input
                          value={char.motivation}
                          onChange={(e) =>
                            updateCharacter(
                              char.id,
                              "motivation",
                              e.target.value,
                            )
                          }
                          placeholder="Age, personality, goals, fears, arc... e.g. '17-year-old runaway seeking revenge for her village'"
                          className="w-full bg-surface-container border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-2 px-3 transition-all"
                        />
                      </div>
                    </div>

                    {/* Sketch upload */}
                    <div className="border-t border-outline-variant/30 pt-4">
                      <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                        Character Sketch
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          onClick={() =>
                            charSketchRefs.current[char.id]?.click()
                          }
                          className="h-24 w-24 bg-surface-container border border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer transition-all overflow-hidden"
                        >
                          {char.sketchPreview ? (
                            <img
                              src={char.sketchPreview}
                              alt="Sketch"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <Upload size={18} className="mb-1" />
                              <span className="text-[10px]">Upload</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => {
                            if (el) charSketchRefs.current[char.id] = el;
                          }}
                          onChange={(e) =>
                            handleCharSketch(char.id, e.target.files?.[0])
                          }
                        />
                        <div className="text-xs text-on-surface-variant">
                          <p>Require: Full-body angles and expressions.</p>
                          <p>Max 5MB/file (.png, .jpg, .jpeg)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("tab1")}
                className="px-6 py-3 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tab3")}
                className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
              >
                Next: World &amp; Plot <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Tab 3: World & Plot ─── */}
        {activeTab === "tab3" && (
          <div className="space-y-6">
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-headline-md font-semibold text-on-surface">
                  World &amp; Plot
                </h2>
                <button
                  type="button"
                  onClick={() => setHelpModal("worldLore")}
                  title="Define the setting and narrative arc."
                  className="text-outline hover:text-primary transition-colors cursor-help"
                >
                  <HelpCircle size={16} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                    World Lore &amp; Mechanics
                    <button
                      type="button"
                      onClick={() => setHelpModal("worldLore")}
                      title="Briefly describe the power system, rules of the world (e.g., magic usage, races)."
                      className="cursor-help"
                    >
                      <HelpCircle
                        size={13}
                        className="text-outline hover:text-primary transition-colors"
                      />
                    </button>
                  </label>
                  <textarea
                    value={worldLore}
                    onChange={(e) => setWorldLore(e.target.value)}
                    placeholder="Describe power systems, laws, or world-building rules..."
                    rows={4}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-3 px-4 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                    Narrative Arc Overview
                    <button
                      type="button"
                      onClick={() => setHelpModal("narrativeArc")}
                      title="Summarize Arc 1 and the planned series conclusion."
                      className="cursor-help"
                    >
                      <HelpCircle
                        size={13}
                        className="text-outline hover:text-primary transition-colors"
                      />
                    </button>
                  </label>
                  <textarea
                    value={narrativeArc}
                    onChange={(e) => setNarrativeArc(e.target.value)}
                    placeholder="Summary of Arc 1 and the planned series conclusion..."
                    rows={4}
                    className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface py-3 px-4 transition-all resize-none"
                  />
                </div>

                <div className="border-t border-outline-variant/30 pt-6">
                  <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant mb-2">
                    Visual Reference Board
                    <button
                      type="button"
                      onClick={() => setHelpModal("worldLore")}
                      title="Architecture, costumes, and scenery references."
                      className="cursor-help"
                    >
                      <HelpCircle
                        size={13}
                        className="text-outline hover:text-primary transition-colors"
                      />
                    </button>
                  </label>
                  <p className="text-xs text-on-surface-variant mb-4">
                    Architecture, costumes, and scenery references.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {refImages.map((img) => (
                      <div
                        key={img.id}
                        className="aspect-square relative group rounded-lg overflow-hidden border border-outline-variant/30"
                      >
                        <img
                          src={img.preview}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeRefImage(img.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-surface/80 rounded-full flex items-center justify-center text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {refImages.length < 8 && (
                      <div
                        onClick={() => refImgInputRef.current?.click()}
                        className="aspect-square bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary cursor-pointer transition-all"
                      >
                        <Upload size={22} className="mb-1" />
                        <span className="text-xs">Add Ref</span>
                      </div>
                    )}
                    <input
                      ref={refImgInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleRefImages}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Edit mode: series metadata panel */}
            {isEdit && seriesInfo && (
              <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Info size={18} className="text-primary" />
                  <h2 className="text-headline-md font-semibold text-on-surface">
                    Series Information
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "Status", value: seriesInfo.status },
                    {
                      label: "Created",
                      value: seriesInfo.createdAt
                        ? new Date(seriesInfo.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )
                        : "—",
                    },
                    {
                      label: "Total Chapters",
                      value: seriesInfo.chapterCount || 0,
                    },
                    {
                      label: "Global Rank",
                      value: seriesInfo.currentRank
                        ? `#${seriesInfo.currentRank}`
                        : "—",
                    },
                    {
                      label: "Mangaka",
                      value: seriesInfo.mangaka?.displayName,
                    },
                    {
                      label: "Tantou Editor",
                      value:
                        seriesInfo.tantouEditor?.displayName || "Unassigned",
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="font-label-md text-on-surface-variant mb-1">
                        {label}
                      </p>
                      <p className="text-body-md text-on-surface">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("tab2")}
                className="px-6 py-3 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-all"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                {isEdit && (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-6 py-2.5 rounded-lg border border-outline-variant hover:border-primary hover:text-primary font-label-md transition-all disabled:opacity-40"
                  >
                    {submitting ? "Saving..." : "Save as Draft"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Submit Pitch"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* ─── Help Modal ─── */}
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

import { Loader, Save } from "lucide-react";

export function WorldPlotEditorSection({
  loading,
  worldLore,
  onWorldLoreChange,
  arcTitle,
  arcSummary,
  onArcTitleChange,
  onArcSummaryChange,
  onAddArc,
  storyRoadmap,
  onRemoveRoadmap,
  referenceUrl,
  onReferenceUrlChange,
  onAddReference,
  visualReferences,
  onRemoveReference,
  onSave,
  saving,
  saveLabel = "Save World & Plot",
  secondaryAction,
}) {
  if (loading) {
    return (
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 flex items-center gap-2 text-on-surface-variant">
        <Loader size={14} className="animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">World Lore</h2>
        <textarea
          value={worldLore}
          onChange={(e) => onWorldLoreChange(e.target.value)}
          rows={6}
          placeholder="Describe world rules, power systems, factions..."
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3 resize-none"
        />
      </div>

      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">Story Roadmap</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={arcTitle}
            onChange={(e) => onArcTitleChange(e.target.value)}
            placeholder="Arc title"
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3"
          />
          <input
            value={arcSummary}
            onChange={(e) => onArcSummaryChange(e.target.value)}
            placeholder="Arc summary"
            className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3"
          />
        </div>
        <button
          type="button"
          onClick={onAddArc}
          className="px-4 py-2 rounded-lg border border-outline-variant hover:border-primary"
        >
          Add Arc
        </button>

        <div className="space-y-2">
          {storyRoadmap.map((arc, idx) => (
            <div
              key={`${arc.title}-${idx}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-outline-variant/30 p-3 bg-surface-container-low"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {arc.title || `Arc ${idx + 1}`}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {arc.summary || "No summary"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveRoadmap(idx)}
                className="text-xs text-error"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">
          Visual References (URL)
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={referenceUrl}
            onChange={(e) => onReferenceUrlChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3"
          />
          <button
            type="button"
            onClick={onAddReference}
            className="px-4 py-2 rounded-lg border border-outline-variant hover:border-primary"
          >
            Add Reference
          </button>
        </div>

        <div className="space-y-2">
          {visualReferences.map((ref, idx) => (
            <div
              key={`${ref.url || ref}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/30 p-3 bg-surface-container-low"
            >
              <p className="text-xs text-on-surface-variant break-all">
                {ref.url || ref}
              </p>
              <button
                type="button"
                onClick={() => onRemoveReference(idx)}
                className="text-xs text-error"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {secondaryAction || <div />}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary disabled:opacity-50"
        >
          {saving ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

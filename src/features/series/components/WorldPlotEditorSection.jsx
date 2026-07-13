import { useRef, useCallback, useState } from "react";
import { Loader, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { RichEditor } from "../../../shared/components/editor/RichEditor";

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
  visualReferences,
  onRemoveReference,
  refFiles = [],
  refPreviews = [],
  onRefPick,
  onRefRemove,
  onSave,
  saving,
  uploadProgress = 0,
  showProgress = false,
  saveLabel = "Save World & Plot",
  secondaryAction,
}) {
  const [failedRefs, setFailedRefs] = useState({});
  const fileRef = useRef(null);

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      onRefPick?.(files);
      if (fileRef.current) fileRef.current.value = "";
    },
    [onRefPick],
  );

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
        <RichEditor
          value={worldLore}
          onChange={onWorldLoreChange}
          placeholder="Describe world rules, power systems, factions..."
          minHeight="160px"
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
          Visual References
        </h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 border border-outline-variant rounded-lg hover:border-primary"
          >
            <Upload size={14} /> Choose Files
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {refFiles.length > 0 && (
            <span className="text-xs text-on-surface-variant">
              {refFiles.length} file(s) selected
            </span>
          )}
        </div>

        {(refPreviews.length > 0 || visualReferences.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {visualReferences.map((ref, idx) => (
              <div
                key={`existing-${idx}`}
                className="relative group h-24 rounded-lg border border-outline-variant/30 overflow-hidden"
              >
                <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                  {failedRefs[idx] ? (
                    <ImageIcon size={20} className="text-on-surface-variant/50" />
                  ) : (
                    <img
                      src={ref.url || ref}
                      alt={`Visual ref ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={() =>
                        setFailedRefs((prev) => ({ ...prev, [idx]: true }))
                      }
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveReference(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-surface/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {refPreviews.map((preview, i) => (
              <div
                key={`new-${i}`}
                className="relative group h-24 rounded-lg border border-outline-variant/30 overflow-hidden"
              >
                <img
                  src={preview}
                  alt={`New ref ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {onRefRemove && (
                  <button
                    type="button"
                    onClick={() => onRefRemove(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-surface/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showProgress && (
        <div className="w-full">
          <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-on-surface-variant mt-1 text-right">{uploadProgress}%</p>
        </div>
      )}
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

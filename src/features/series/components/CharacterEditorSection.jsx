import { useRef, useCallback } from "react";
import { Loader, Upload, UserPlus, X, Pencil, Trash2 } from "lucide-react";
import { RichEditor } from "../../../shared/components/editor/RichEditor";

export function CharacterEditorSection({
  name,
  motivation,
  sketchFiles = [],
  sketchPreviews = [],
  onNameChange,
  onMotivationChange,
  onSketchPick,
  onSketchRemove,
  onSubmit,
  saving,
  uploadProgress = 0,
  showProgress = false,
  submitLabel = "Save Character",
  loading,
  characters,
  emptyText = "No character data yet.",
  secondaryAction,
  onEdit,
  onDelete,
}) {
  const fileRef = useRef(null);

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      onSketchPick(files);
      if (fileRef.current) fileRef.current.value = "";
    },
    [onSketchPick],
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">
          Add / Edit Character
        </h2>

        <div>
          <label className="block text-sm text-on-surface-variant mb-2">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Character name"
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-2">
            Core Motivation
          </label>
          <RichEditor
            value={motivation}
            onChange={onMotivationChange}
            placeholder="Age, personality, goals, fears, arc..."
            minHeight="100px"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-2">
            Sketches (optional)
          </label>
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
            {sketchFiles.length > 0 && (
              <span className="text-xs text-on-surface-variant">
                {sketchFiles.length} file(s) selected
              </span>
            )}
          </div>
          {sketchPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {sketchPreviews.map((preview, i) => (
                <div
                  key={i}
                  className="relative group h-24 w-24 rounded-lg border border-outline-variant/30 overflow-hidden"
                >
                  <img
                    src={preview}
                    alt={`Sketch ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {onSketchRemove && (
                    <button
                      type="button"
                      onClick={() => onSketchRemove(i)}
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
          <div className="mb-3">
            <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-1 text-right">
              {uploadProgress}%
            </p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!name.trim() || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary disabled:opacity-50"
          >
            {saving ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            {submitLabel}
          </button>
          {secondaryAction}
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-3">
          Character List
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Loader size={14} className="animate-spin" /> Loading...
          </div>
        ) : characters.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{emptyText}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.map((char, idx) => (
              <div
                key={char.id || `${char.name}-${idx}`}
                className="rounded-lg border border-outline-variant/30 p-4 bg-surface-container-low"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-on-surface">
                    {char.name || `Character ${idx + 1}`}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(char)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(char.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className="ProseMirror text-xs text-on-surface-variant mt-1"
                  dangerouslySetInnerHTML={{
                    __html: char.motivation || "No motivation",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

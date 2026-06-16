import { useRef } from "react";
import { Loader, Upload, UserPlus } from "lucide-react";

export function CharacterEditorSection({
  name,
  motivation,
  sketchFile,
  sketchPreview,
  onNameChange,
  onMotivationChange,
  onSketchPick,
  onSubmit,
  saving,
  submitLabel = "Save Character",
  loading,
  characters,
  emptyText = "No character data yet.",
  secondaryAction,
}) {
  const fileRef = useRef(null);

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
          <textarea
            value={motivation}
            onChange={(e) => onMotivationChange(e.target.value)}
            rows={3}
            placeholder="Age, personality, goals, fears, arc..."
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-2.5 px-3 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-2">
            Sketch (optional)
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-outline-variant rounded-lg hover:border-primary"
            >
              <Upload size={14} /> Choose File
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onSketchPick(e.target.files?.[0])}
            />
            {sketchFile && (
              <span className="text-xs text-on-surface-variant">
                {sketchFile.name}
              </span>
            )}
          </div>
          {sketchPreview && (
            <img
              src={sketchPreview}
              alt="Sketch preview"
              className="mt-3 h-24 w-24 object-cover rounded-lg border border-outline-variant/30"
            />
          )}
        </div>

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
                <p className="text-sm font-semibold text-on-surface">
                  {char.name || `Character ${idx + 1}`}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {char.motivation || "No motivation"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

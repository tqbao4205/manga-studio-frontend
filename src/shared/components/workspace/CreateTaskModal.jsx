import { useMemo, useState } from "react";
import { X, CalendarDays } from "lucide-react";
import { mockUsers } from "../../constants/mock-data";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export function CreateTaskModal({ open, region, page, onClose, onSubmit }) {
  const assistants = useMemo(
    () => mockUsers.filter((user) => user.role === "ASSISTANT"),
    [],
  );

  const [title, setTitle] = useState(
    region
      ? `${region.regionType || "Task"} - ${region.label || "Region"}`
      : "",
  );
  const [assistantId, setAssistantId] = useState(assistants[0]?.id || "");
  const [priority, setPriority] = useState("MEDIUM");
  const [difficulty, setDifficulty] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  if (!open || !region) return null;

  const handleSubmit = () => {
    if (!title.trim() || !assistantId) return;

    onSubmit({
      title: title.trim(),
      assistantId: Number(assistantId),
      priority,
      difficulty,
      dueDate,
      description: description.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="flex h-[88vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface shadow-2xl">
        <section className="w-full border-r border-outline-variant/30 bg-surface-container-low p-6 lg:w-2/5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-primary">
            Selected Region
          </h3>

          <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-high">
            {page?.originalImageUrl || page?.webImageUrl ? (
              <img
                src={page.originalImageUrl || page.webImageUrl}
                alt="Selected page"
                className="h-72 w-full object-cover"
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-on-surface-variant">
                No preview image
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-outline-variant/25 bg-surface-container p-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Label
              </p>
              <p className="font-medium text-on-surface">
                {region.label || `Region #${region.id}`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Type
              </p>
              <p className="font-medium text-on-surface">
                {region.regionType || "OTHER"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Coordinates
              </p>
              <p className="font-medium text-on-surface">
                x: {Math.round(region.x)}, y: {Math.round(region.y)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">
                Size
              </p>
              <p className="font-medium text-on-surface">
                {Math.round(region.width)} x {Math.round(region.height)}
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col bg-surface-container p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-on-surface">
                Create New Task
              </h2>
              <p className="text-sm text-on-surface-variant">
                Assign work for the selected region.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Task Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Assignee
              </span>
              <select
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {assistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    {assistant.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Priority
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {DIFFICULTIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Due Date
              </span>
              <div className="relative">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Task Description
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Enter detailed task instructions..."
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Production Notes
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/35 bg-surface-container-high px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Internal notes / references"
              />
            </label>
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 pt-6">
            <button
              onClick={onClose}
              className="rounded-lg border border-outline-variant/40 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !assistantId}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create & Assign Task
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

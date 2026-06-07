import { useEffect, useMemo, useState } from "react";
import { Dialog } from "../../../shared/components/ui/dialog";

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskEditModal({
  open,
  task,
  assigneeOptions,
  loading,
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || "");
    setDueDate(task.dueDate ? String(task.dueDate).slice(0, 10) : "");
    setPriority(task.priority || "MEDIUM");
    setAssigneeId(task.assistant?.id ? String(task.assistant.id) : "");
    setNotes(task.notes || "");
    setDescription(task.description || "");
  }, [task]);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && assigneeId;
  }, [title, assigneeId]);

  const handleSubmit = () => {
    if (!task || !canSubmit) return;

    onSubmit(task, {
      title: title.trim(),
      dueDate: dueDate || null,
      priority,
      assistantId: Number(assigneeId),
      notes: notes.trim(),
      description: description.trim(),
      regionType: task.regionType,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit Task"
      description="Update task info, deadline, assignee, and notes."
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Title
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Priority
            </label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-10 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Assignee
          </label>
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
          >
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant/30 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

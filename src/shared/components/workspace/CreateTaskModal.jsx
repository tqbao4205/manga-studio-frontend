import { useState, useEffect } from "react";
import { X, CalendarDays, ChevronDown, Loader2, Eye, Upload } from "lucide-react";
import { useWorkspaceStore } from "../../../app/stores/workspaceStore";
import { cn } from "../../utils";
import assistantService from "../../../services/assistantService";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const DIFFICULTIES = ["LOW", "MEDIUM", "HIGH"];

const PRIORITY_COLORS = {
  LOW: "bg-status-success/15 text-status-success border-status-success/30",
  MEDIUM: "bg-status-warning/15 text-status-warning border-status-warning/30",
  HIGH: "bg-status-danger/15 text-status-danger border-status-danger/30",
  URGENT: "bg-error/20 text-error border-error/40",
};

export function CreateTaskModal({ open, regions, page, seriesId: propSeriesId, onClose, onSubmit }) {
  const storeSeriesId = useWorkspaceStore((s) => s.seriesId);
  const seriesId = propSeriesId || storeSeriesId;

  const [assistants, setAssistants] = useState([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);

  const [title, setTitle] = useState("");
  const [assistantId, setAssistantId] = useState(null);
  const [priority, setPriority] = useState("MEDIUM");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!regions || regions.length === 0) return;
    const first = regions[0];
    setTitle(`${first.regionType || "Task"} - ${first.label || "Region"}${regions.length > 1 ? ` (+${regions.length - 1} more)` : ''}`);
  }, [regions]);

  useEffect(() => {
    if (!open || !seriesId) return;
    setLoadingAssistants(true);
    setAssistantId(null);
    console.log("[CreateTaskModal] fetching assistants for seriesId:", seriesId);
    assistantService
      .getBySeries(seriesId)
      .then((data) => {
        console.log("[CreateTaskModal] API response:", data);
        const accepted = data.filter((a) => a.status === "ACCEPTED");
        console.log("[CreateTaskModal] accepted:", accepted);
        setAssistants(accepted);
        if (accepted.length > 0) {
          console.log("[CreateTaskModal] auto-selecting assistant id:", accepted[0].assistant.id);
          setAssistantId(accepted[0].assistant.id);
        } else {
          console.log("[CreateTaskModal] no accepted assistants, keeping null");
        }
      })
      .catch((err) => {
        console.error("[CreateTaskModal] fetch error:", err);
        setAssistants([]);
      })
      .finally(() => setLoadingAssistants(false));
  }, [open, seriesId]);

  if (!open || !regions || regions.length === 0) return null;

  const handleSubmit = async () => {
    console.log("[CreateTaskModal] submit check — title:", title, "assistantId:", assistantId);
    if (!title.trim() || !assistantId) return;

    const payload = {
      title: title.trim(),
      assistantId,
      priority,
      difficulty,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (dueDate) {
      payload.dueDate = `${dueDate}T00:00:00`;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const pageImg = page?.originalImageUrl || page?.webImageUrl;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-xl border border-outline-variant/30 bg-surface shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[38%] border-r border-outline-variant/20 bg-surface-container-low/50 p-5 flex flex-col gap-4 overflow-y-auto">
            {pageImg && (
              <div className="relative bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 flex-1 min-h-[200px]">
                <img src={pageImg} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-surface-container rounded-lg p-4 border border-outline-variant/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                Selected Regions ({regions.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {regions.map((r, i) => (
                  <div key={r.id} className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    i % 2 === 0 ? 'bg-surface-container-high' : 'bg-transparent',
                  )}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color || '#6b7280' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-medium truncate">{r.label || `Region #${r.id}`}</p>
                      <p className="text-[11px] text-on-surface-variant/60">{r.regionType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Create New Task</h2>
                <p className="text-sm text-on-surface-variant/60 mt-0.5">Assign work for the selected regions</p>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Task Title <span className="text-error">*</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Assign Assistant <span className="text-error">*</span></label>
                <div className="relative">
                  <select
                    value={assistantId ?? ""}
                    onChange={(e) => setAssistantId(Number(e.target.value) || null)}
                    className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                    disabled={loadingAssistants || assistants.length === 0}
                  >
                    {loadingAssistants ? (
                      <option value="" className="bg-surface-container-high text-on-surface">Loading...</option>
                    ) : assistants.length === 0 ? (
                      <option value="" className="bg-surface-container-high text-on-surface">No assistants available</option>
                    ) : (
                      assistants.map((a) => (
                        <option key={a.assistant.id} value={a.assistant.id} className="bg-surface-container-high text-on-surface">
                          {a.assistant.displayName}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full h-10 px-3.5 text-sm border rounded-lg outline-none appearance-none cursor-pointer transition-all ${PRIORITY_COLORS[priority] || "bg-surface-container-high border-outline-variant/20 text-on-surface"}`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-surface-container-high text-on-surface">{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Due Date</label>
                <div className="relative">
                  <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 pl-9 pr-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                placeholder="Detailed task instructions..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Production Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                placeholder="Add metadata tags or internal notes..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Attachments &amp; References</label>
              <div className="border-2 border-dashed border-outline-variant/20 rounded-xl p-5 flex flex-col items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex gap-4 items-center">
                  {attachments.length > 0 ? (
                    <div className="w-16 h-16 rounded border border-outline-variant/20 bg-surface-container overflow-hidden group relative">
                      <img src={URL.createObjectURL(attachments[0])} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye size={18} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-outline-variant/20 bg-surface-container flex items-center justify-center">
                      <Upload size={20} className="text-on-surface-variant/40" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-on-surface">Drag and drop assets</p>
                    <p className="text-[11px] text-on-surface-variant/50">Max 50MB per file (JPG, PNG, TIFF)</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/tiff"
                  className="hidden"
                  id="attachment-input"
                  onChange={(e) => {
                    if (e.target.files) setAttachments(Array.from(e.target.files));
                  }}
                />
              </div>
              <label htmlFor="attachment-input" className="cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
          <button onClick={onClose} className="h-10 px-5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(() => { const d = !title.trim() || !assistantId || submitting; return d; })()}
            className="h-10 px-7 rounded-lg bg-primary-container text-on-primary-container text-sm font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create & Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
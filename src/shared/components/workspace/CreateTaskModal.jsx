import { useState, useEffect } from "react";
import { X, CalendarDays, ChevronDown } from "lucide-react";
import { useWorkspaceStore } from "../../../app/stores/workspaceStore";
import assistantService from "../../../services/assistantService";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const REGION_TYPES = ["BACKGROUND", "CHARACTER", "TEXT", "EFFECT", "TONE", "OTHER"];

const PRIORITY_COLORS = {
  LOW: "bg-status-success/15 text-status-success border-status-success/30",
  MEDIUM: "bg-status-warning/15 text-status-warning border-status-warning/30",
  HIGH: "bg-status-danger/15 text-status-danger border-status-danger/30",
  URGENT: "bg-error/20 text-error border-error/40",
};

export function CreateTaskModal({ open, region, page, seriesId: propSeriesId, onClose, onSubmit }) {
  const storeSeriesId = useWorkspaceStore((s) => s.seriesId);
  const seriesId = propSeriesId || storeSeriesId;

  const [assistants, setAssistants] = useState([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);

  const [title, setTitle] = useState("");
  const [assistantId, setAssistantId] = useState(null);
  const [priority, setPriority] = useState("MEDIUM");
  const [regionType, setRegionType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  useEffect(() => {
    if (!region) return;
    setTitle(`${region.regionType || "Task"} - ${region.label || "Region"}`);
  }, [region]);

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

  if (!open || !region) return null;

  const handleSubmit = () => {
    console.log("[CreateTaskModal] submit check — title:", title, "assistantId:", assistantId);
    if (!title.trim() || !assistantId) return;

    const payload = {
      title: title.trim(),
      assistantId,
      priority,
      ...(regionType && { regionType }),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      referenceImageUrl: referenceImageUrl.trim() || undefined,
    };

    if (dueDate) {
      payload.dueDate = `${dueDate}T00:00:00`;
    }

    onSubmit(payload);
  };

  const pageImg = page?.originalImageUrl || page?.webImageUrl;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-xl border border-outline-variant/30 bg-surface shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[38%] border-r border-outline-variant/20 bg-surface-container-low/50 p-5 flex flex-col gap-5 overflow-y-auto">
            <div className="relative bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 group flex-1 min-h-[260px]">
              {pageImg ? (
                <img src={pageImg} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-on-surface-variant/40 text-sm">No preview</div>
              )}
              <div className="absolute top-2 left-2 bg-primary/90 text-on-primary text-[10px] font-bold px-2 py-0.5 rounded">
                {region.regionType || "REGION"}
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-4 border border-outline-variant/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Region Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Type", region.regionType || "—"],
                  ["Label", region.label || `#${region.id}`],
                  ["Size", `${Math.round(region.width)} x ${Math.round(region.height)} px`],
                  ["Coords", `x:${Math.round(region.x)} y:${Math.round(region.y)}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wide text-on-surface-variant/50">{label}</p>
                    <p className="text-sm font-medium text-on-surface">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Create New Task</h2>
                <p className="text-sm text-on-surface-variant/60 mt-0.5">Assign work for the selected region</p>
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
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Region Type</label>
                <div className="relative">
                  <select
                    value={regionType}
                    onChange={(e) => setRegionType(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                  >
                    <option value="">— Default —</option>
                    {REGION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                </div>
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
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                placeholder="Internal notes / references"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">Reference Image URL</label>
              <input
                value={referenceImageUrl}
                onChange={(e) => setReferenceImageUrl(e.target.value)}
                className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                placeholder="https://example.com/reference.png"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
          <button onClick={onClose} className="h-10 px-5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(() => { const d = !title.trim() || !assistantId; console.log("[CreateTaskModal] button disabled:", d, "title:", JSON.stringify(title), "assistantId:", assistantId, "seriesId:", seriesId); return d; })()}
            className="h-10 px-6 rounded-lg bg-primary text-sm font-semibold text-on-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Create & Assign Task
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from "react";
import { X, Share2, MoreVertical, ArrowUpRight, Download, Eye, Flag, CalendarDays, Upload, Loader2 } from "lucide-react";
import { Avatar } from "../../../shared/components/ui/avatar";
import { cn, formatDate } from "../../../shared/utils";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import taskService from "../../../services/taskService";

function statusBadge(status) {
  if (["DONE", "APPROVED", "COMPLETED"].includes(status)) {
    return { label: "DONE", className: "bg-tertiary/20 text-tertiary" };
  }
  if (
    ["IN_PROGRESS", "SUBMITTED", "IN_REVIEW", "REVISION_REQUIRED"].includes(
      status,
    )
  ) {
    return { label: "REVIEW", className: "bg-primary/20 text-primary" };
  }
  if (status === "REJECTED") {
    return { label: "REJECTED", className: "bg-error/20 text-error" };
  }
  return {
    label: "TODO",
    className: "bg-surface-container-highest text-on-surface-variant",
  };
}

export function TaskDetailsDrawer({
  open,
  task,
  loading,
  onClose,
  onOpenWorkspace,
  onTaskUpdated,
}) {
  if (!open) return null;

  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const status = statusBadge(task?.status);
  const imgRef = useRef(null);
  const [imgMeta, setImgMeta] = useState({ cw: 0, ch: 0, nw: 0, nh: 0 });
  const [submitFile, setSubmitFile] = useState(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!task?.pageImageUrl || !open) return;
    const img = new Image();
    img.onload = () => {
      const rect = imgRef.current?.getBoundingClientRect();
      setImgMeta({
        cw: rect?.width || 0,
        ch: rect?.height || 0,
        nw: img.naturalWidth,
        nh: img.naturalHeight,
      });
    };
    img.src = task.pageImageUrl;
  }, [task?.pageImageUrl, open]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !open) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setImgMeta((prev) => ({ ...prev, cw: rect.width, ch: rect.height }));
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    updateSize();
    return () => ro.disconnect();
  }, [open]);

  const bboxStyle = (() => {
    const { cw, ch, nw, nh } = imgMeta;
    if (!cw || !ch || !nw || !nh) return null;

    // Fallback nếu chưa có toạ độ thật (backend chưa rebuild)
    if (task?.regionX == null || task?.regionY == null || task?.regionWidth == null || task?.regionHeight == null) {
      return { left: '25%', top: '35%', width: '20%', height: '20%' };
    }

    const cAspect = cw / ch;
    const iAspect = nw / nh;
    let dW, dH, oX, oY;
    if (cAspect > iAspect) {
      dH = ch; dW = ch * iAspect;
    } else {
      dW = cw; dH = cw / iAspect;
    }
    oX = (cw - dW) / 2;
    oY = (ch - dH) / 2;
    const baseW = task?.pageWidth || nw;
    const baseH = task?.pageHeight || nh;
    const sX = dW / baseW;
    const sY = dH / baseH;
    return {
      left: oX + task.regionX * sX,
      top: oY + task.regionY * sY,
      width: Math.max(task.regionWidth * sX, 24),
      height: Math.max(task.regionHeight * sY, 12),
    };
  })();

  const handleDownload = (url, name) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const canSubmit = task?.status && ["TODO", "IN_PROGRESS", "REJECTED"].includes(task.status) && !(task.submissions || []).some((s) => s.status === "SUBMITTED");

  const handleSubmitWork = async () => {
    if (!submitFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("resultImage", submitFile);
      if (submitNote.trim()) formData.append("note", submitNote.trim());
      await taskService.submit(task.id, formData);
      addToast({ title: "Submitted", description: "Work submitted for review", variant: "success" });
      setSubmitFile(null);
      setSubmitNote("");
      onTaskUpdated?.();
    } catch {
      addToast({ title: "Submit failed", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[600px] flex-col border-l border-outline-variant bg-surface-container shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant p-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <X size={18} />
            </button>
            <span className="text-sm font-bold uppercase text-primary">
              Task Details
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenWorkspace?.(task)}
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
            >
              Workspace
              <ArrowUpRight size={14} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest"
            >
              <Share2 size={16} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-surface-container-high"
                />
              ))}
            </div>
          )}

          {!loading && task && (
            <div className="space-y-6">
              {/* Status + Priority badges */}
              <section>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded px-2 py-1 text-[10px] font-bold", status.className)}>
                    {status.label}
                  </span>
                  <span className="flex items-center gap-1 rounded bg-surface-container-highest px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                    <Flag size={10} className="text-on-surface-variant/60" />
                    {task.priority || "MEDIUM"}
                  </span>
                </div>
              </section>

              {/* Image preview with bounding box */}
              {task?.pageImageUrl && (
                <section>
                  <div ref={imgRef} className="relative bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 w-full h-[480px]">
                    <img src={task.pageImageUrl} alt="" className="w-full h-full object-contain" />
                    {bboxStyle && (
                      <div className="absolute border-2 border-primary-container bg-primary-container/10 ring-4 ring-primary/20"
                        style={{
                          left: bboxStyle.left,
                          top: bboxStyle.top,
                          width: bboxStyle.width,
                          height: bboxStyle.height,
                        }}
                      >
                        <div className="absolute -top-2.5 -left-2.5 bg-primary-container text-white px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap leading-none">
                          {task.regionLabel || task.regionType || "FOCUS"}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Title + Description + Notes */}
              <section>
                <h2 className="text-xl font-semibold text-on-surface mb-1">
                  {task.title}
                </h2>
                {task.description && (
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    {task.description}
                  </p>
                )}
                {task.notes && (
                  <div className="mt-2 text-xs text-on-surface-variant/60 bg-surface-container-high/50 rounded-lg px-3 py-2 border border-outline-variant/10">
                    <span className="font-semibold uppercase tracking-wider">Notes: </span>
                    {task.notes}
                  </div>
                )}
              </section>

              {/* Linked Data */}
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">Linked Data</h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant">Series</p>
                    <p className="text-sm font-bold text-on-surface">{task.seriesTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant">Target</p>
                    <p className="text-sm font-bold text-on-surface">
                      {task.chapterLabel || "Chapter ?"}{" "}
                      {task.pageLabel ? `, ${task.pageLabel}` : ""}
                    </p>
                  </div>
                </div>
              </section>

              {/* Assigned To / By */}
              <section className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">Assigned To</h3>
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-2">
                    <Avatar
                      src={task.assistant?.avatarUrl}
                      name={task.assistant?.displayName || "Unknown"}
                      size="sm"
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">{task.assistant?.displayName || "Unknown"}</p>
                      <p className="text-[10px] text-on-surface-variant">Assistant</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">Assigned By</h3>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={task.assignedBy?.avatarUrl}
                      name={task.assignedBy?.displayName || "Unknown"}
                      size="sm"
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">{task.assignedBy?.displayName || "Unknown"}</p>
                      <p className="text-[10px] text-on-surface-variant">Creator</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Due date */}
              {task.dueDate && (
                <section className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                  <CalendarDays size={14} />
                  <span>Due {formatDate(task.dueDate)}</span>
                </section>
              )}

              {/* Action buttons */}
              <section className="flex items-center gap-3 flex-wrap">
                {task.pageImageUrl && (
                  <button
                    onClick={() => handleDownload(task.pageImageUrl, `page-${task.id || "unknown"}.png`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Download size={14} /> Download Page
                  </button>
                )}
                {task.referenceImageUrl && (
                  <button
                    onClick={() => handleDownload(task.referenceImageUrl, `ref-${task.id || "file"}.png`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Eye size={14} /> Reference Files
                  </button>
                )}
                {(task.attachments?.length || 0) > 0 && (
                  <button
                    onClick={() => {
                      const att = task.attachments[0];
                      const url = att?.fileUrl || att?.url;
                      if (url) handleDownload(url, att?.fileName || "attachment");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Eye size={14} /> Attachments ({task.attachments.length})
                  </button>
                )}
              </section>

              {/* Submit Work */}
              {user?.role === "ASSISTANT" && task?.assistant?.id === user.id && canSubmit && (
                <section className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <h3 className="text-sm font-bold uppercase text-on-surface-variant">Submit Work</h3>
                  <div
                    className="border-2 border-dashed border-outline-variant/20 rounded-lg p-4 flex flex-col items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => document.getElementById("submit-file-input")?.click()}
                  >
                    {submitFile ? (
                      <div className="relative w-full max-h-28 overflow-hidden rounded border border-outline-variant/20">
                        <img src={URL.createObjectURL(submitFile)} alt="" className="w-full h-auto max-h-28 object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setSubmitFile(null); }}
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white text-[10px] hover:bg-black/70"
                        >X</button>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} className="text-on-surface-variant/40" />
                        <p className="text-xs text-on-surface-variant/60">Click to upload result image</p>
                      </>
                    )}
                    <input id="submit-file-input" type="file" accept="image/jpeg,image/png,image/tiff" className="hidden" onChange={(e) => { if (e.target.files) setSubmitFile(e.target.files[0]); }} />
                  </div>
                  <textarea
                    value={submitNote}
                    onChange={(e) => setSubmitNote(e.target.value)}
                    placeholder="Note for reviewer..."
                    rows={2}
                    className="w-full resize-none px-3 py-2 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                  />
                  <button
                    onClick={handleSubmitWork}
                    disabled={!submitFile || submitting}
                    className="w-full h-10 rounded-lg bg-primary-container text-on-primary-container text-sm font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {submitting ? "Submitting..." : "Submit Work"}
                  </button>
                </section>
              )}

              {/* Submissions */}
              <section>
                <h3 className="mb-4 text-sm font-bold uppercase text-on-surface-variant">Submissions</h3>
                <div className="space-y-3">
                  {(task.submissions || []).length === 0 && (
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                      No submissions yet.
                    </div>
                  )}
                  {(task.submissions || []).map((submission) => (
                    <div key={submission.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-on-surface">Version {submission.version}</p>
                        <span className="text-[10px] font-bold uppercase text-on-surface-variant">{submission.status}</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant">
                        {submission.submittedAt ? formatDate(submission.submittedAt) : "No date"}
                      </p>
                      {submission.resultImageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant/20">
                          <img src={submission.resultImageUrl} alt="" className="w-full h-auto max-h-28 object-contain bg-surface" />
                        </div>
                      )}
                      {submission.note && (
                        <p className="mt-1 text-[10px] text-on-surface-variant/70 italic">{submission.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

import { X, Share2, MoreVertical, ArrowUpRight } from "lucide-react";
import { Avatar } from "../../../shared/components/ui/avatar";
import { cn, formatDate } from "../../../shared/utils";

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
}) {
  if (!open) return null;

  const status = statusBadge(task?.status);

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
          "fixed right-0 top-0 z-50 flex h-full w-[450px] flex-col border-l border-outline-variant bg-surface-container shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
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
            <div className="space-y-8">
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-1 text-[10px] font-bold",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="rounded bg-surface-container-highest px-2 py-1 text-[10px] font-bold text-on-surface-variant">
                    {task.priority || "MEDIUM"} PRIORITY
                  </span>
                </div>
                <h2 className="mb-4 text-2xl font-semibold text-on-surface">
                  {task.title}
                </h2>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  {task.description || "No description available."}
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">
                  Linked Data
                </h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant">
                      Series
                    </p>
                    <p className="text-sm font-bold text-on-surface">
                      {task.seriesTitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-on-surface-variant">
                      Target
                    </p>
                    <p className="text-sm font-bold text-on-surface">
                      {task.chapterLabel || "Chapter ?"}{" "}
                      {task.pageLabel ? `, ${task.pageLabel}` : ""}
                    </p>
                  </div>
                  <div className="col-span-2 mt-2 overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-highest">
                    {task.thumbnailUrl ? (
                      <img
                        src={task.thumbnailUrl}
                        alt={task.title}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-sm text-on-surface-variant">
                        No preview available
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">
                    Assigned To
                  </h3>
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-2">
                    <Avatar
                      src={task.assistant?.avatarUrl}
                      name={task.assistant?.displayName || "Unknown"}
                      size="sm"
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {task.assistant?.displayName || "Unknown"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        Assistant
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase text-on-surface-variant">
                    Assigned By
                  </h3>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={task.assignedBy?.avatarUrl}
                      name={task.assignedBy?.displayName || "Unknown"}
                      size="sm"
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {task.assignedBy?.displayName || "Unknown"}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        Creator
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-sm font-bold uppercase text-on-surface-variant">
                  Submissions
                </h3>
                <div className="space-y-3">
                  {(task.submissions || []).length === 0 && (
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
                      No submissions yet.
                    </div>
                  )}

                  {(task.submissions || []).map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          Version {submission.version}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {submission.submittedAt
                            ? formatDate(submission.submittedAt)
                            : "No date"}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                        {submission.status}
                      </span>
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

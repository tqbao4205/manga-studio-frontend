import { Avatar } from "../../../shared/components/ui/avatar";
import { cn, formatDate } from "../../../shared/utils";
import { TaskRowActionsMenu } from "./TaskRowActionsMenu";

function getStatusPresentation(status) {
  const normalized = [
    "IN_PROGRESS",
    "SUBMITTED",
    "IN_REVIEW",
    "REVISION_REQUIRED",
  ].includes(status)
    ? "REVIEW"
    : ["DONE", "APPROVED", "COMPLETED"].includes(status)
      ? "DONE"
      : status;

  const map = {
    TODO: { label: "TODO", dot: "bg-on-surface", text: "text-on-surface" },
    REVIEW: { label: "REVIEW", dot: "bg-primary", text: "text-primary" },
    DONE: { label: "DONE", dot: "bg-tertiary", text: "text-tertiary" },
    REJECTED: { label: "REJECTED", dot: "bg-error", text: "text-error" },
  };

  return map[normalized] || map.TODO;
}

function getPriorityPresentation(priority) {
  const map = {
    HIGH: { text: "text-error", bg: "bg-error/10" },
    URGENT: { text: "text-error", bg: "bg-error/10" },
    MEDIUM: { text: "text-primary", bg: "bg-primary/10" },
    LOW: { text: "text-tertiary", bg: "bg-tertiary/10" },
  };

  return (
    map[priority] || {
      text: "text-on-surface-variant",
      bg: "bg-surface-container-highest",
    }
  );
}

function formatDueDate(dueDate) {
  if (!dueDate) {
    return { label: "No due date", className: "text-on-surface-variant" };
  }

  const target = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (left, right) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(target, tomorrow)) {
    return { label: "Tomorrow", className: "font-bold text-primary" };
  }

  return { label: formatDate(target), className: "text-on-surface-variant" };
}

export function TasksListTable({
  tasks,
  loading,
  role,
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onChangeStatus,
  onCopyLink,
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-lg bg-surface-container-high"
            />
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-10 text-center text-sm text-on-surface-variant">
        No tasks match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-outline-variant/30 bg-surface-container-highest/50">
          <tr className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Task Title</th>
            <th className="px-4 py-4">Priority</th>
            <th className="px-4 py-4 text-center">Assignee</th>
            <th className="px-4 py-4">Due Date</th>
            <th className="px-4 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {tasks.map((task) => {
            const status = getStatusPresentation(task.status);
            const priority = getPriorityPresentation(task.priority);
            const dueDate = formatDueDate(task.dueDate);
            const isDone = ["DONE", "APPROVED", "COMPLETED"].includes(
              task.status,
            );

            return (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="cursor-pointer transition-colors hover:bg-surface-container-high/50"
              >
                <td className="px-4 py-3">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      status.text,
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    {status.label}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded bg-surface-container-highest border border-outline-variant/20">
                      {task.thumbnailUrl ? (
                        <img
                          src={task.thumbnailUrl}
                          alt={task.title}
                          className={cn(
                            "h-full w-full object-cover",
                            isDone && "grayscale",
                          )}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-on-surface-variant">
                          IMG
                        </div>
                      )}
                    </div>

                    <div>
                      <p
                        className={cn(
                          "text-sm font-bold",
                          isDone
                            ? "text-on-surface-variant line-through"
                            : "text-on-surface",
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {task.seriesTitle}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      priority.bg,
                      priority.text,
                    )}
                  >
                    {task.priority || "LOW"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1",
                      isDone && "opacity-50",
                    )}
                  >
                    <Avatar
                      src={task.assistant?.avatarUrl}
                      name={task.assistant?.displayName || "Unknown"}
                      size="sm"
                      className="rounded-full"
                    />
                    <span className="text-[10px] text-on-surface-variant">
                      {task.assistant?.displayName || "Unknown"}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className={cn("text-sm", dueDate.className)}>
                    {dueDate.label}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <TaskRowActionsMenu
                    task={task}
                    role={role}
                    onViewDetails={onSelectTask}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onChangeStatus={onChangeStatus}
                    onCopyLink={onCopyLink}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

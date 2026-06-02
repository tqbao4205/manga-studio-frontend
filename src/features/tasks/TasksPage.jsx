import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, User2, Flag } from "lucide-react";
import { useTasks } from "../../shared/hooks/useMockData";
import { useAuthStore } from "../../app/stores/authStore";
import { mockUsers } from "../../shared/constants/mock-data";
import { cn, getPriorityColor } from "../../shared/utils";

const KANBAN_COLUMNS = [
  {
    key: "TODO",
    label: "TODO",
    dot: "bg-on-surface-variant",
    tone: "text-on-surface",
  },
  {
    key: "IN_PROGRESS",
    label: "IN PROGRESS",
    dot: "bg-primary",
    tone: "text-primary",
  },
  {
    key: "DONE",
    label: "DONE",
    dot: "bg-status-success",
    tone: "text-status-success",
  },
  {
    key: "REJECTED",
    label: "REJECTED",
    dot: "bg-status-danger",
    tone: "text-status-danger",
  },
];

function TaskCard({ task }) {
  const assignee = mockUsers.find((u) => u.id === task.assistantId);

  return (
    <article className="rounded-xl border border-outline-variant/25 bg-surface-container-low p-4 shadow-sm hover:border-outline-variant/55 transition-colors">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {task.regionType || "TASK"}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            color: getPriorityColor(task.priority || "MEDIUM"),
            background: `${getPriorityColor(task.priority || "MEDIUM")}1A`,
          }}
        >
          <Flag size={10} />
          {task.priority || "MEDIUM"}
        </span>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-on-surface">
        {task.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-xs text-on-surface-variant/80">
        {task.description || "No description"}
      </p>

      <div className="mt-3 flex items-center justify-between text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1 truncate">
          <User2 size={12} />
          {assignee?.displayName || "Unassigned"}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} />
          {task.dueDate || "No due"}
        </span>
      </div>
    </article>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: allTasks } = useTasks();

  const tasks = useMemo(() => {
    if (!allTasks) return [];
    if (user?.role !== "ASSISTANT") return allTasks;
    return allTasks.filter((task) => task.assistantId === user.id);
  }, [allTasks, user]);

  const grouped = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, [tasks]);

  const handleCreateTask = () => {
    navigate("/workspace/1", {
      state: {
        taskCreationFlow: true,
        returnTo: "/tasks",
      },
    });
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-background px-6 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Tasks</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kanban board for production tasks across manga pages.
          </p>
        </div>

        <button
          onClick={handleCreateTask}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          Create Task
        </button>
      </div>

      <div className="grid h-[calc(100%-88px)] grid-cols-1 gap-4 overflow-auto pb-2 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => (
          <section
            key={column.key}
            className="flex min-h-[380px] flex-col rounded-2xl border border-outline-variant/25 bg-surface-container p-3"
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", column.dot)} />
                <h2
                  className={cn(
                    "text-xs font-bold uppercase tracking-[0.12em]",
                    column.tone,
                  )}
                >
                  {column.label}
                </h2>
              </div>
              <span className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant">
                {grouped[column.key]?.length || 0}
              </span>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {grouped[column.key]?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}

              {(!grouped[column.key] || grouped[column.key].length === 0) && (
                <div className="rounded-xl border border-dashed border-outline-variant/35 bg-surface-container-lowest p-4 text-center text-xs text-on-surface-variant/70">
                  No tasks in this column.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

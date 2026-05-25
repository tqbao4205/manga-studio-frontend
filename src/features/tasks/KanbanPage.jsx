import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../../app/stores/taskStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Avatar } from "../../shared/components/ui/avatar";
import { LayoutDashboard } from "lucide-react";
import { mockRegions, mockPages } from "../../shared/constants/mock-data";

// ── Các cột của Kanban ──
// Mỗi cột tương ứng một trạng thái task
const columns = [
  { id: "PENDING", label: "Pending", color: "border-gray-300" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-400" },
  { id: "SUBMITTED", label: "Submitted", color: "border-purple-400" },
  { id: "APPROVED", label: "Approved", color: "border-green-400" },
];

// ── Tra ngược: regionId → chapterId ──
// Duyệt mockRegions → mockPages để tìm chapter chứa region này
function getChapterIdForRegion(regionId) {
  for (const [pageIdStr, regions] of Object.entries(mockRegions)) {
    if (regions.some((r) => r.id === regionId)) {
      const pageId = Number(pageIdStr);
      for (const [chIdStr, pages] of Object.entries(mockPages)) {
        if (pages.some((p) => p.id === pageId)) {
          return Number(chIdStr);
        }
      }
    }
  }
  return null;
}

// ── Component hiển thị một task trong Kanban ──
// Cho phép kéo thả (drag & drop) để chuyển trạng thái
function TaskCard({ task, onDragStart }) {
  const navigate = useNavigate();
  const ch = getChapterIdForRegion(task.regionId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => navigate(ch ? `/workspace/${ch}` : "/series")}
      className="p-2.5 bg-white border border-border-light/40 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors text-sm space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-on-surface">
          Region #{task.regionId}
        </span>
        <StatusBadge status={task.status} size="sm" />
      </div>
      <div className="flex items-center gap-2">
        <Avatar name={task.assistant.displayName} size="sm" />
        <div className="min-w-0">
          <p className="text-xs text-on-surface-variant truncate">
            {task.assistant.displayName}
          </p>
          {task.deadline && (
            <p className="text-[10px] text-on-surface-variant/50">
              Due {task.deadline}
            </p>
          )}
        </div>
      </div>
      {task.latestSubmission && (
        <p className="text-[10px] text-status-success">
          Submitted v{task.latestSubmission.version}
        </p>
      )}
    </div>
  );
}

// ── Trang Kanban Board ──
// Route: /kanban
// Quyền: tất cả user đã đăng nhập
// Hiển thị danh sách task dưới dạng cột, cho phép kéo thả chuyển trạng thái
export function KanbanPage() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);
  const [draggedTask, setDraggedTask] = useState(null);

  // Nhóm task theo status
  const grouped = useMemo(() => {
    const groups = {};
    columns.forEach((c) => {
      groups[c.id] = [];
    });
    tasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
      else groups.PENDING.push(t);
    });
    return groups;
  }, [tasks]);

  // ── Handlers cho drag & drop ──
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      updateTaskStatus(draggedTask.id, columnId);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const totalTasks = tasks.length;

  // Trống → EmptyState
  if (totalTasks === 0) {
    return (
      <EmptyState
        icon={<LayoutDashboard size={40} />}
        title="No tasks"
        description="Tasks will appear here once they are created."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          Production Kanban
        </h1>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          {totalTasks} tasks across {columns.length} stages
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = grouped[col.id] || [];
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragEnd={handleDragEnd}
              className={`border-t-4 ${col.color} bg-black/[0.015] min-h-[300px] flex flex-col`}
            >
              {/* Header cột */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border-light/30">
                <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                  {col.label}
                </h3>
                <span className="text-[10px] text-on-surface-variant/50 tabular-nums">
                  {colTasks.length}
                </span>
              </div>
              {/* Danh sách task trong cột */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {colTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-xs text-on-surface-variant/30">
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

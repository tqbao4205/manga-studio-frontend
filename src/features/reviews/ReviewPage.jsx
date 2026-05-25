/*
  ==========================================================
  PAGE: ReviewPage
  ROUTE: /tasks (hoặc /review)
  MỤC ĐÍCH: Hiển thị danh sách task submissions từ assistant
  để mangaka có thể approve hoặc yêu cầu revision.
  QUYỀN TRUY CẬP: Chỉ MANGAKA
  ==========================================================
*/

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, RotateCcw, MessageSquare } from "lucide-react";
import { useTasks } from "../../shared/hooks/useMockData";
import { useUIStore } from "../../app/stores/uiStore";
import { mockUsers } from "../../shared/constants/mock-data";
import { Card, CardContent } from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { PageLoading } from "../../shared/components/shared/LoadingSpinner";
import { FilterBar } from "../../shared/components/shared/FilterBar";
import { Dialog } from "../../shared/components/ui/dialog";

const filterStatuses = [
  "DONE",
  "IN_PROGRESS",
  "TODO",
  "REJECTED",
];

export function ReviewPage() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const { data: tasks, isLoading } = useTasks();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");

  const tasksList = tasks || [];

  const filteredTasks = useMemo(() => {
    return tasksList.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasksList, statusFilter]);

  const countByStatus = useMemo(() => {
    const counts = {};
    filterStatuses.forEach((s) => {
      counts[s] = tasksList.filter((t) => t.status === s).length;
    });
    return counts;
  }, [tasksList]);

  const filterGroups = [
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      options: [
        { value: "ALL", label: "All Tasks", count: tasksList.length },
        ...filterStatuses.map((s) => ({
          value: s,
          label: s.replace(/_/g, " "),
          count: countByStatus[s] || 0,
        })),
      ],
      onChange: setStatusFilter,
    },
  ];

  const activeFilters = [];
  if (statusFilter !== "ALL") {
    activeFilters.push({
      groupId: "status",
      groupLabel: "Status",
      value: statusFilter,
      label: statusFilter.replace(/_/g, " "),
      onRemove: () => setStatusFilter("ALL"),
    });
  }

  const handleApprove = () => {
    if (!reviewTarget) return;
    addToast({
      type: "success",
      title: "Approved",
      message: `Region #${reviewTarget.task.regionId} by ${mockUsers.find(u => u.id === reviewTarget.task.assistantId)?.displayName || 'Unknown'} approved.`,
    });
    setReviewTarget(null);
  };

  const handleRevise = () => {
    if (!reviewTarget || !revisionNote.trim()) return;
    addToast({
      type: "success",
      title: "Revision requested",
      message: `Region #${reviewTarget.task.regionId}: ${revisionNote}`,
    });
    setReviewTarget(null);
    setRevisionNote("");
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Review</h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Review and approve assistant submissions
          </p>
        </div>
      </div>

      <FilterBar
        groups={filterGroups}
        activeFilters={activeFilters}
        resultCount={filteredTasks.length}
        totalCount={tasksList.length}
        onClearAll={
          statusFilter !== "ALL" ? () => setStatusFilter("ALL") : undefined
        }
      />

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={40} />}
          title="No tasks to review"
          description={
            statusFilter !== "ALL"
              ? "No tasks match the selected filter."
              : "All caught up! No pending submissions."
          }
          action={
            statusFilter !== "ALL" ? (
              <Button variant="ghost" onClick={() => setStatusFilter("ALL")}>
                Show All Tasks
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Danh sách tasks */
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className="card-ink-hover cursor-pointer"
              onClick={() => navigate("/workspace/1")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-xs font-bold text-accent-purple">
                      {(mockUsers.find(u => u.id === task.assistantId)?.displayName || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {(mockUsers.find(u => u.id === task.assistantId)?.displayName || 'Unknown')}'s submission
                      </p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">
                        Region #{task.regionId} · Due{" "}
                        {task.dueDate || "No deadline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} />
                    {task.status === "DONE" && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setReviewTarget({ task, action: "approve" })
                          }
                          className="w-7 h-7 flex items-center justify-center border border-green-700/30 text-green-700 hover:bg-green-50 transition-colors"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setReviewTarget({ task, action: "revise" })
                          }
                          className="w-7 h-7 flex items-center justify-center border border-orange-700/30 text-orange-700 hover:bg-orange-50 transition-colors"
                          title="Request Revision"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog xác nhận Approve */}
      {reviewTarget?.action === "approve" && (
        <Dialog
          open={true}
          onClose={() => setReviewTarget(null)}
          title="Approve Task"
          description={`Approve Region #${reviewTarget.task.regionId} by ${mockUsers.find(u => u.id === reviewTarget.task.assistantId)?.displayName || 'Unknown'}?`}
          size="sm"
        >
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviewTarget(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleApprove}>
              Confirm Approve
            </Button>
          </div>
        </Dialog>
      )}

      {/* Dialog yêu cầu Revision */}
      {reviewTarget?.action === "revise" && (
        <Dialog
          open={true}
          onClose={() => {
            setReviewTarget(null);
            setRevisionNote("");
          }}
          title="Request Revision"
          description={`Notes for ${mockUsers.find(u => u.id === reviewTarget.task.assistantId)?.displayName || 'Unknown'}`}
          size="sm"
        >
          <div className="space-y-3">
            <textarea
              autoFocus
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Describe what needs to be revised..."
              rows={4}
              className="w-full bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none border border-primary/20 p-2 focus:border-on-surface transition-colors"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReviewTarget(null);
                  setRevisionNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRevise}
                disabled={!revisionNote.trim()}
              >
                Request Revision
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

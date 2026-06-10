import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import { TaskEditModal } from "../components/TaskEditModal";
import { TasksFilterBar } from "../components/TasksFilterBar";
import { TasksListTable } from "../components/TasksListTable";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useTasksListData } from "../hooks/useTasksListData";
import { tasksListService } from "../services/tasksListService";

export function TasksPageView() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role || "ASSISTANT");
  const addToast = useUIStore((state) => state.addToast);
  const {
    tasks,
    loading,
    error,
    reloadTasks,
    selectedTaskId,
    selectedTaskDetail,
    detailLoading,
    openTaskDetail,
    closeTaskDetail,
    assigneeOptions,
    seriesOptions,
  } = useTasksListData();

  const filterState = useTaskFilters(tasks);
  const [editingTask, setEditingTask] = useState(null);
  const [isSavingEdit, setSavingEdit] = useState(false);
  const selectedSeriesLabel = seriesOptions.find(
    (option) => option.value === filterState.selectedSeries,
  )?.label;

  const handleCreateTask = () => {
    navigate("/workspace/1", {
      state: {
        taskCreationFlow: true,
        returnTo: "/tasks",
      },
    });
  };

  const handleOpenWorkspace = (task) => {
    const chapterId = task?.chapterId || 1;
    navigate(`/workspace/${chapterId}`, {
      state: {
        focusTaskId: task?.id || null,
        returnTo: "/tasks",
      },
    });
  };

  const handleCopyLink = async (task) => {
    const taskUrl = `${window.location.origin}/tasks?taskId=${task.id}`;

    try {
      await navigator.clipboard.writeText(taskUrl);
      addToast({
        title: "Copied",
        description: "Task link copied to clipboard.",
        variant: "success",
      });
    } catch {
      addToast({
        title: "Copy failed",
        description: "Could not copy task link.",
        variant: "error",
      });
    }
  };

  const handleEditTask = (task) => {
    if (role !== "MANGAKA") return;
    setEditingTask(task);
  };

  const handleSubmitEditTask = async (task, payload) => {
    setSavingEdit(true);
    try {
      await tasksListService.updateTask(task.id, payload);
      addToast({
        title: "Task updated",
        description: `Saved changes for ${payload.title}.`,
        variant: "success",
      });
      setEditingTask(null);
      await reloadTasks();
      if (selectedTaskId === task.id) {
        await openTaskDetail(task);
      }
    } catch (error) {
      addToast({
        title: "Update failed",
        description: error?.message || "Unable to update task.",
        variant: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleChangeStatus = async (task, statusValue, statusLabel) => {
    if (role !== "MANGAKA") return;

    try {
      await tasksListService.updateTaskStatus(task.id, statusValue);
      addToast({
        title: "Status updated",
        description: `Task moved to ${statusLabel}.`,
        variant: "success",
      });
      await reloadTasks();
      if (selectedTaskId === task.id) {
        await openTaskDetail(task);
      }
    } catch (error) {
      addToast({
        title: "Status update failed",
        description: error?.message || "Unable to change status.",
        variant: "error",
      });
    }
  };

  const handleDeleteTask = async (task) => {
    if (role !== "MANGAKA") return;
    const confirmed = window.confirm(`Delete task \"${task.title}\"?`);
    if (!confirmed) return;

    try {
      await tasksListService.deleteTask(task.id);
      addToast({
        title: "Task deleted",
        description: `${task.title} has been removed.`,
        variant: "success",
      });

      if (selectedTaskId === task.id) {
        closeTaskDetail();
      }

      await reloadTasks();
    } catch (error) {
      addToast({
        title: "Delete failed",
        description: error?.message || "Unable to delete task.",
        variant: "error",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background px-container-padding py-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {selectedSeriesLabel && (
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm text-primary">
                <AlertCircle size={14} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Filtered by Series
              </span>
            </div>
          )}
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Tasks
          </h1>
          <p className="text-label-md text-on-surface-variant">
            Manage creative workflow for active series.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateTask}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-all hover:brightness-110"
        >
          <Plus size={16} />
          Create Task
        </button>
      </div>

      <TasksFilterBar
        filterState={filterState}
        assigneeOptions={assigneeOptions}
        seriesOptions={seriesOptions}
      />

      {error ? (
        <div className="mt-6 rounded-xl border border-error/30 bg-error/5 p-5 text-sm text-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={reloadTasks}
            className="mt-3 underline"
          >
            Retry loading tasks
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-y-auto pb-6">
          <TasksListTable
            tasks={filterState.filteredTasks}
            loading={loading}
            role={role}
            onSelectTask={openTaskDetail}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onChangeStatus={handleChangeStatus}
            onCopyLink={handleCopyLink}
          />
        </div>
      )}

      <TaskDetailsDrawer
        open={Boolean(selectedTaskId)}
        task={selectedTaskDetail}
        loading={detailLoading}
        onClose={closeTaskDetail}
        onOpenWorkspace={handleOpenWorkspace}
        onTaskUpdated={reloadTasks}
      />

      <TaskEditModal
        open={Boolean(editingTask)}
        task={editingTask}
        assigneeOptions={assigneeOptions}
        loading={isSavingEdit}
        onClose={() => setEditingTask(null)}
        onSubmit={handleSubmitEditTask}
      />
    </div>
  );
}

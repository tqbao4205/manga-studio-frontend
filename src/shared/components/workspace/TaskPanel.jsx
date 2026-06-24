/**
 * ── TaskPanel.jsx — Quản lý Task (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Hiển thị danh sách tasks của page hiện tại (từ tasksByRegion của taskStore)
 *   - Assign task mới (MANGAKA → ASSISTANT)
 *   - Submit bài (ASSISTANT upload file)
 *   - Review + Approve/Revise (MANGAKA)
 *
 * 📌 Luồng dữ liệu:
 *   1. Region được chọn → loadTasks(regionId) → tasks lưu vào tasksByRegion
 *   2. TaskPanel gom tasks từ tất cả regions của page hiện tại
 *   3. Submit: SubmitDialog → { file, note } → submitTask(taskId, formData)
 *   4. Review: ReviewDialog → { submissionId, status, note } → reviewSubmission(...)
 *   5. Approve + "Add as layer": gọi addLayer(pageId, formData) từ workspaceStore
 *
 * 📌 API calls:
 *   - loadTasks(regionId)       → GET /api/regions/{regionId}/tasks
 *   - createTask(regionId, data) → POST /api/regions/{regionId}/tasks
 *   - submitTask(taskId, fd)     → POST /api/tasks/{taskId}/submissions
 *   - reviewSubmission(id, s, n) → PATCH /api/submissions/{id}/status
 *   - addLayer(pageId, fd)      → POST /api/v1/pages/{pageId}/layers
 */

import { useState, useEffect, useRef } from "react";
import { useWorkspaceStore } from "../../../app/stores/workspaceStore";
import { useAuthStore } from "../../../app/stores/authStore";
import { useTaskStore } from "../../../app/stores/taskStore";
import { useUIStore } from "../../../app/stores/uiStore";
import { Button } from "../ui/button";
import { StatusBadge } from "../shared/StatusBadge";
import { Dialog } from "../ui/dialog";
import { SubmitDialog } from "./SubmitDialog";
import { ReviewDialog } from "./ReviewDialog";
import {
  Plus,
  Upload,
  Check,
  Clock,
  Eye,
  Flag,
  Download,
  Loader2,
  ChevronDown,
  CalendarDays,
  X,
} from "lucide-react";
import assistantService from "../../../services/assistantService";
import { cn, getPriorityColor, forceDownload } from "../../utils";

/** Danh sách mức độ ưu tiên (giữ nguyên) */
const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const DIFFICULTIES = ["LOW", "MEDIUM", "HIGH"];

export function TaskPanel() {
  // ─── Stores ───
  const currentPageId = useWorkspaceStore((s) => s.currentPageId);
  const regions = useWorkspaceStore((s) => s.regions);
  const pages = useWorkspaceStore((s) => s.pages);
  const selectedRegionIds = useWorkspaceStore((s) => s.selectedRegionIds);
  const seriesId = useWorkspaceStore((s) => s.seriesId);
  const addLayer = useWorkspaceStore((s) => s.addLayer);
  const loadPage = useWorkspaceStore((s) => s.loadPage);
  const selectRegion = useWorkspaceStore((s) => s.selectRegion);
  const setSelectedRegions = useWorkspaceStore((s) => s.setSelectedRegions);

  const tasksByRegion = useTaskStore((s) => s.tasksByRegion);
  const isLoading = useTaskStore((s) => s.isLoading);
  const isSubmitting = useTaskStore((s) => s.isSubmitting);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const createTasksForRegions = useTaskStore((s) => s.createTasksForRegions);
  const submitTask = useTaskStore((s) => s.submitTask);
  const reviewSubmission = useTaskStore((s) => s.reviewSubmission);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);
  const selectTask = useTaskStore((s) => s.selectTask);

  const user = useAuthStore((s) => s.user);
  const taskTrigger = useAuthStore((s) => s.taskTrigger);
  const addToast = useUIStore((s) => s.addToast);

  const currentPage = pages.find((p) => p.id === currentPageId);

  // ─── Local state ───
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRegionIds, setAssignRegionIds] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDifficulty, setTaskDifficulty] = useState("MEDIUM");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskAttachments, setTaskAttachments] = useState([]);

  const [realAssistants, setRealAssistants] = useState([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [posting, setPosting] = useState(false);

  const imgContainerRef = useRef(null);
  const [imgMeta, setImgMeta] = useState({ cw: 0, ch: 0, nw: 0, nh: 0 });
  const detailImgRef = useRef(null);
  const [detailMeta, setDetailMeta] = useState({ cw: 0, ch: 0, nw: 0, nh: 0 });

  const [submitTarget, setSubmitTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // ─── Fetch assistants đã ACCEPTED trong series ───
  useEffect(() => {
    if (!seriesId) return;
    setLoadingAssistants(true);
    assistantService
      .getBySeries(seriesId)
      .then((data) =>
        setRealAssistants(data.filter((a) => a.status === "ACCEPTED")),
      )
      .catch(() => setRealAssistants([]))
      .finally(() => setLoadingAssistants(false));
  }, [seriesId]);

  // ─── Auto-select assistant đầu tiên khi dialog Assign mở ───
  useEffect(() => {
    if (assignOpen && realAssistants.length > 0) {
      setSelectedAssistant(String(realAssistants[0].assistant.id));
    }
  }, [assignOpen, realAssistants]);

  // ─── Gom tasks từ tất cả regions ───
  const allPageTasks = regions
    .flatMap((r) => tasksByRegion[r.id] || [])
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // ─── Load tasks cho tất cả regions của page ───
  useEffect(() => {
    if (!regions.length) return;
    regions.forEach((r) => {
      if (!tasksByRegion[r.id]) {
        loadTasks(r.id);
      }
    });
  }, [regions.length]);

  // ─── Realtime: refetch tasks khi WebSocket báo có thay đổi ───
  useEffect(() => {
    if (!regions.length) return;
    regions.forEach((r) => loadTasks(r.id));
  }, [taskTrigger, regions.length]);

  // ─── ResizeObserver: cập nhật kích thước container ảnh ───
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el || !imgMeta.nw) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setImgMeta((prev) => ({ ...prev, cw: rect.width, ch: rect.height }));
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgMeta.nw]);

  // ─── ResizeObserver: cập nhật kích thước detail dialog thumbnail ───
  useEffect(() => {
    const el = detailImgRef.current;
    if (!el || !detailMeta.nw) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setDetailMeta((prev) => ({ ...prev, cw: rect.width, ch: rect.height }));
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [detailMeta.nw]);

  // Kiểm tra chọn trang
  if (!currentPageId) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-on-surface-variant/60">Select a page</p>
      </div>
    );
  }

  const assignedRegionIds = new Set(
    allPageTasks.flatMap((t) => t.regions?.map((r) => r.id) || []),
  );
  const unassignedRegions = regions.filter((r) => !assignedRegionIds.has(r.id));

  const canSubmit = (status) => status === "IN_PROGRESS";

  // ─── Handlers ───

  const resetAssignForm = () => {
    setAssignRegionIds([]);
    setSelectedAssistant("");
    setTaskTitle("");
    setTaskDescription("");
    setTaskNotes("");
    setTaskPriority("MEDIUM");
    setTaskDifficulty("MEDIUM");
    setTaskDeadline("");
    setTaskAttachments([]);
  };

  /**
   * Assign task cho nhiều region bằng endpoint create theo từng region.
   */
  const handleAssign = async () => {
    if (assignRegionIds.length === 0 || !selectedAssistant) return;
    const selectedRegions = assignRegionIds
      .map((id) => regions.find((r) => r.id === Number(id)))
      .filter(Boolean);
    const assistant = realAssistants.find(
      (a) => a.assistant.id === Number(selectedAssistant),
    );
    if (selectedRegions.length === 0 || !assistant) return;

    const defaultDeadline = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10);

    setPosting(true);
    try {
      await createTasksForRegions(
        selectedRegions.map((r) => r.id),
        {
          title:
            taskTitle.trim() ||
            `${selectedRegions[0].regionType || "Work"} — Page ?`,
          description: taskDescription.trim() || "",
          notes: taskNotes.trim() || "",
          priority: taskPriority,
          difficulty: taskDifficulty,
          dueDate: (taskDeadline || defaultDeadline) + "T00:00:00",
          assistantId: assistant.assistant.id,
        },
      );

      addToast({
        title: "Task assigned",
        description: `"${taskTitle}" → ${assistant.assistant.displayName} (${selectedRegions.length} regions)`,
        variant: "success",
      });
      setAssignOpen(false);
      resetAssignForm();
    } catch {
      addToast({ title: "Failed to assign task", variant: "error" });
    } finally {
      setPosting(false);
    }
  };

  /**
   * Accept task: ASSISTANT nhận task → TODO → IN_PROGRESS.
   * Endpoint: PATCH /api/tasks/{id}/status
   */
  const handleAcceptTask = async (taskId, regionIds) => {
    try {
      await updateTaskStatus(taskId, "IN_PROGRESS");
      const ids = regionIds || [];
      await Promise.all(ids.filter(Boolean).map((id) => loadTasks(id)));
      addToast({
        title: "Task accepted",
        description: "You have accepted this task",
        variant: "success",
      });
    } catch {
      addToast({ title: "Failed to accept task", variant: "error" });
    }
  };

  /**
   * Retry: ASSISTANT retries task after revision → REVISE → IN_PROGRESS.
   * Endpoint: PATCH /api/tasks/{id}/status
   */
  const handleRetryTask = async (taskId, regionIds) => {
    try {
      await updateTaskStatus(taskId, "IN_PROGRESS");
      const ids = regionIds || [];
      await Promise.all(ids.filter(Boolean).map((id) => loadTasks(id)));
      addToast({
        title: "Task reopened",
        description: "You can now resubmit your work",
        variant: "success",
      });
    } catch {
      addToast({ title: "Failed to retry task", variant: "error" });
    }
  };

  /**
   * Submit bài: nhận { file, note } từ SubmitDialog → tạo FormData → gọi submitTask.
   * Endpoint: POST /api/tasks/{taskId}/submissions (multipart)
   */
  const handleSubmit = async ({ file, note }) => {
    if (!submitTarget || !file) return;

    const formData = new FormData();
    formData.append("resultImage", file);
    if (note) formData.append("note", note);

    try {
      await submitTask(submitTarget.taskId, formData);
      await Promise.all(
        (submitTarget.regionIds || [submitTarget.regionId])
          .filter(Boolean)
          .map((id) => loadTasks(id)),
      );
      setSelectedRegions([]);
      addToast({
        title: "Submitted",
        description: `${submitTarget.label} submitted for review`,
        variant: "success",
      });
      setSubmitTarget(null);
    } catch {
      addToast({ title: "Submit failed", variant: "error" });
    }
  };

  /**
   * Review submission: gọi reviewSubmission → nếu APPROVED + addAsLayer, tạo layer mới.
   * Endpoint: PATCH /api/submissions/{id}/status
   */
  const handleReview = async (submissionId, status, note, addAsLayer) => {
    try {
      const result = await reviewSubmission(submissionId, status, note);
      if (!result) {
        addToast({
          title: "Review failed",
          variant: "error",
        });
        return;
      }
      // Update local task data ngay lập tức
      const regionIds =
        reviewTarget?.regionIds ||
        (reviewTarget?.regionId ? [reviewTarget.regionId] : []);
      regionIds.forEach((regionId) => {
        useTaskStore.setState((s) => {
          const tasks = (s.tasksByRegion[regionId] || []).map((t) => {
            if (t.id !== reviewTarget?.taskId) return t;
            return {
              ...t,
              status: status === "APPROVED" ? "DONE" : "REVISE",
              submissions:
                t.submissions?.map((sub) =>
                  sub.id === submissionId ? { ...sub, status } : sub,
                ) || [],
            };
          });
          return { tasksByRegion: { ...s.tasksByRegion, [regionId]: tasks } };
        });
      });
      addToast({
        title: status === "APPROVED" ? "Approved" : "Revision requested",
        variant: status === "APPROVED" ? "success" : "info",
      });
      if (status === "APPROVED") {
        await loadPage(currentPageId);
      }
      await Promise.all(regionIds.map((id) => loadTasks(id)));
    } catch {
      addToast({
        title: "Review failed",
        variant: "error",
      });
    }
  };

  // ─── Render ───

  if (allPageTasks.length === 0 && unassignedRegions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-on-surface-variant/60">
          No tasks for this page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Tasks ({allPageTasks.length})
        </span>
        {user?.role === "MANGAKA" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={() => setAssignOpen(true)}
            disabled={unassignedRegions.length === 0}
          >
            <Plus size={12} /> Assign
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-primary" />
        </div>
      )}

      {/* No tasks + unassigned regions */}
      {allPageTasks.length === 0 &&
        unassignedRegions.length > 0 &&
        !isLoading && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-on-surface-variant/60">
              Assign regions to assistants
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {unassignedRegions.slice(0, 5).map((r) => (
                <span
                  key={r.id}
                  className="text-[9px] px-1.5 py-0.5 bg-surface-container-low border border-outline-variant/30 text-on-surface-variant rounded"
                >
                  {r.label || `Region #${r.id}`}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Assigned Regions */}
      {assignedRegionIds.size > 0 && (
        <div className="px-3 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Assigned Regions ({assignedRegionIds.size})
          </span>
          <div className="flex flex-wrap gap-1">
            {regions
              .filter((r) => assignedRegionIds.has(r.id))
              .map((r) => (
                <span
                  key={r.id}
                  className="text-[9px] px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary-container/30 rounded"
                >
                  {r.label || `Region #${r.id}`}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Task list */}
      {allPageTasks.length > 0 && (
        <div className="space-y-1 px-2">
          {allPageTasks.map((t) => {
            const firstRegion = t.regions?.[0];
            const taskRegions = t.regions || [];
            const taskStatus = t.status;
            const latestSubmission = t.submissions?.length
              ? t.submissions.reduce((a, b) =>
                  (a.version || 0) > (b.version || 0) ? a : b,
                )
              : null;
            const pageImg =
              currentPage?.originalImageUrl || currentPage?.webImageUrl;
            const regionIds = taskRegions.map((r) => r.id);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className="px-2.5 py-2 bg-surface-container-low border border-outline-variant/20 rounded-lg flex items-center gap-2.5 cursor-pointer hover:bg-surface-container transition-colors"
              >
                {/* Mini thumbnail */}
                {pageImg && (
                  <div className="w-9 h-11 flex-shrink-0 bg-surface-container-high rounded overflow-hidden border border-outline-variant/20">
                    <img
                      src={pageImg}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-on-surface truncate">
                      {t.title ||
                        firstRegion?.label ||
                        `Region #${firstRegion.id}`}
                    </span>
                    {taskRegions.length > 1 && (
                      <span className="text-[9px] px-1 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-medium flex-shrink-0">
                        {taskRegions.length} regions
                      </span>
                    )}
                    <StatusBadge
                      status={taskStatus}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="truncate max-w-24">
                      {t.assistant?.displayName || "Unknown"}
                    </span>
                    <span className="text-outline-variant/40">·</span>
                    {t.priority && (
                      <span
                        className="flex items-center gap-0.5"
                        style={{ color: getPriorityColor(t.priority) }}
                      >
                        <Flag size={6} /> {t.priority}
                      </span>
                    )}
                    {t.dueDate && (
                      <>
                        <span className="text-outline-variant/40">·</span>
                        <span>{t.dueDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary action */}
                <div onClick={(e) => e.stopPropagation()}>
                  {user?.role === "MANGAKA" &&
                    t.submissions?.some((s) => s.status === "SUBMITTED") && (
                      <button
                        onClick={() =>
                          setReviewTarget({
                            taskId: t.id,
                            regionIds,
                            label: t.title || `Task #${t.id}`,
                            submissionId: latestSubmission?.id || null,
                            resultImageUrl:
                              latestSubmission?.resultImageUrl || "",
                            submissionNote: latestSubmission?.note || "",
                            originalUrl:
                              currentPage?.webImageUrl ||
                              currentPage?.originalImageUrl ||
                              "",
                          })
                        }
                        className="flex items-center gap-0.5 text-[9px] font-medium text-primary hover:text-primary/80 transition-colors px-1.5 py-1 rounded hover:bg-primary/10"
                      >
                        Review
                      </button>
                    )}
                  {user?.role === "ASSISTANT" &&
                    t.assistant?.id === user.id &&
                    (taskStatus === "TODO" ? (
                      <button
                        onClick={() => handleAcceptTask(t.id, regionIds)}
                        className="flex items-center gap-0.5 text-[9px] font-medium text-primary hover:text-primary/80 transition-colors px-1.5 py-1 rounded hover:bg-primary/10"
                      >
                        Accept
                      </button>
                    ) : taskStatus === "IN_PROGRESS" ? (
                      <button
                        onClick={() =>
                          setSubmitTarget({
                            taskId: t.id,
                            regionIds,
                            label: t.title || `Task #${t.id}`,
                          })
                        }
                        className="flex items-center gap-0.5 text-[9px] font-medium text-primary hover:text-primary/80 transition-colors px-1.5 py-1 rounded hover:bg-primary/10"
                      >
                        <Upload size={8} /> Submit
                      </button>
                    ) : taskStatus === "REVISE" ? (
                      <button
                        onClick={() => handleRetryTask(t.id, regionIds)}
                        className="flex items-center gap-0.5 text-[9px] font-medium text-primary hover:text-primary/80 transition-colors px-1.5 py-1 rounded hover:bg-primary/10"
                      >
                        Retry
                      </button>
                    ) : taskStatus === "SUBMITTED" ? (
                      <span className="flex items-center gap-0.5 text-[9px] text-status-warning">
                        <Clock size={8} /> Pending review
                      </span>
                    ) : null)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Task Detail Dialog ─── */}
      {selectedTask &&
        (() => {
          const st = selectedTask;
          const stFirstRegion = st.regions?.[0];
          const stRegions = st.regions || [];
          const stLatestSubmission = st.submissions?.length
            ? st.submissions.reduce((a, b) =>
                (a.version || 0) > (b.version || 0) ? a : b,
              )
            : null;
          const stPageImg =
            currentPage?.originalImageUrl || currentPage?.webImageUrl;

          return (
            <Dialog
              open={!!selectedTask}
              onClose={() => setSelectedTask(null)}
              title={
                st.title ||
                (stFirstRegion
                  ? `Region #${stFirstRegion.id}`
                  : `Task #${st.id}`)
              }
              size="lg"
              className="max-w-5xl"
            >
              <div className="flex gap-0">
                {/* ─── Left Panel: Image ─── */}
                <div className="w-[60%] flex-shrink-0 border-r border-outline-variant/20 bg-surface-container-low/50 p-5 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
                  {/* Thumbnail with bbox */}
                  {stPageImg && stRegions.length > 0 && (
                    <div
                      ref={detailImgRef}
                      className="w-full bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 relative aspect-auto"
                      style={{ minHeight: 200 }}
                    >
                      {(() => {
                        const { cw, ch, nw, nh } = detailMeta;
                        if (!cw || !ch || !nw || !nh) {
                          return (
                            <img
                              src={stPageImg}
                              alt=""
                              className="w-full h-full object-contain"
                              onLoad={(e) => {
                                const rect =
                                  detailImgRef.current?.getBoundingClientRect();
                                if (rect) {
                                  setDetailMeta({
                                    cw: rect.width,
                                    ch: rect.height,
                                    nw: e.target.naturalWidth,
                                    nh: e.target.naturalHeight,
                                  });
                                }
                              }}
                            />
                          );
                        }
                        const containerAspect = cw / ch;
                        const imageAspect = nw / nh;
                        let dispW, dispH, offX, offY;
                        if (containerAspect > imageAspect) {
                          dispH = ch;
                          dispW = ch * imageAspect;
                          offX = (cw - dispW) / 2;
                          offY = 0;
                        } else {
                          dispW = cw;
                          dispH = cw / imageAspect;
                          offX = 0;
                          offY = (ch - dispH) / 2;
                        }
                        const baseW = currentPage?.width || nw;
                        const baseH = currentPage?.height || nh;
                        const scaleX = dispW / baseW;
                        const scaleY = dispH / baseH;
                        return (
                          <>
                            <img
                              src={stPageImg}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                            {stRegions.map((r) => (
                              <div
                                key={r.id}
                                className="absolute border-2 rounded-sm"
                                style={{
                                  left: offX + (r.x || 0) * scaleX,
                                  top: offY + (r.y || 0) * scaleY,
                                  width: Math.max((r.width || 0) * scaleX, 10),
                                  height: Math.max((r.height || 0) * scaleY, 6),
                                  borderColor: r.color || "#6b7280",
                                  backgroundColor:
                                    (r.color || "#6b7280") + "15",
                                }}
                              >
                                <div
                                  className="absolute -top-2.5 -left-2.5 text-white px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
                                  style={{
                                    backgroundColor: r.color || "#6b7280",
                                  }}
                                >
                                  {r.label || r.regionType || "FOCUS"}
                                </div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ─── Right Panel: Details ─── */}
                <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                  {/* Region Info */}
                  {stFirstRegion && (
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant/20">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                        {stRegions.length > 1
                          ? `Regions (${stRegions.length})`
                          : "Region Information"}
                      </h3>
                      {stRegions.length === 1 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ["Type", stFirstRegion.regionType || "_"],
                            [
                              "Label",
                              stFirstRegion.label
                                ? `${stFirstRegion.label} (#${stFirstRegion.id})`
                                : `#${stFirstRegion.id}`,
                            ],
                            [
                              "Size",
                              `${Math.round(stFirstRegion.width)} x ${Math.round(stFirstRegion.height)} px`,
                            ],
                            [
                              "Coords",
                              `x:${Math.round(stFirstRegion.x)} y:${Math.round(stFirstRegion.y)}`,
                            ],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] uppercase tracking-wide text-on-surface-variant/50">
                                {label}
                              </p>
                              <p className="text-sm font-medium text-on-surface">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {stRegions.slice(0, 5).map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: r.color || "#6b7280",
                                }}
                              />
                              <span className="font-medium text-on-surface">
                                {r.label || `Region #${r.id}`}
                              </span>
                              <span className="text-on-surface-variant/50 text-[10px] uppercase">
                                {r.regionType}
                              </span>
                            </div>
                          ))}
                          {stRegions.length > 5 && (
                            <p className="text-[10px] text-on-surface-variant/50">
                              ...and {stRegions.length - 5} more
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Status
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge status={st.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Priority
                      </span>
                      <p
                        className="text-sm font-medium text-on-surface mt-0.5 flex items-center gap-1"
                        style={{ color: getPriorityColor(st.priority) }}
                      >
                        <Flag size={12} /> {st.priority}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Assistant
                      </span>
                      <p className="text-sm font-medium text-on-surface mt-0.5">
                        {st.assistant?.displayName || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Due Date
                      </span>
                      <p className="text-sm font-medium text-on-surface mt-0.5 flex items-center gap-1">
                        <CalendarDays
                          size={12}
                          className="text-on-surface-variant/50"
                        />{" "}
                        {st.dueDate || "No deadline"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {st.description && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Description
                      </span>
                      <p className="text-sm text-on-surface mt-1 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {st.notes && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Production Notes
                      </span>
                      <p className="text-sm text-on-surface-variant mt-1 bg-surface-container-low rounded-lg p-3 border border-outline-variant/10 leading-relaxed">
                        {st.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-outline-variant/20">
                    {stPageImg && (
                      <button
                        onClick={() =>
                          forceDownload(
                            stPageImg,
                            `page-${currentPageId || "reference"}.png`,
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Download size={12} /> Download Page
                      </button>
                    )}
                    {st.referenceImageUrl && (
                      <button
                        onClick={() =>
                          forceDownload(
                            st.referenceImageUrl,
                            `ref-${st.id || "file"}.png`,
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Eye size={12} /> Reference Files
                      </button>
                    )}
                    {user?.role === "ASSISTANT" &&
                      st.assistant?.id === user.id &&
                      canSubmit(st.status) &&
                      !st.submissions?.some(
                        (s) => s.status === "SUBMITTED",
                      ) && (
                        <button
                          onClick={() => {
                            setSubmitTarget({
                              taskId: st.id,
                              regionIds: stRegions.map((r) => r.id),
                              label: st.title || `Task #${st.id}`,
                            });
                            setSelectedTask(null);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-on-primary px-3 py-1.5 rounded-lg hover:brightness-110 transition-all"
                        >
                          <Upload size={12} /> Submit
                        </button>
                      )}
                    {user?.role === "MANGAKA" &&
                      st.submissions?.some((s) => s.status === "SUBMITTED") && (
                        <button
                          onClick={() => {
                            setReviewTarget({
                              taskId: st.id,
                              regionIds: stRegions.map((r) => r.id),
                              label: st.title || `Task #${st.id}`,
                              submissionId: stLatestSubmission?.id || null,
                              resultImageUrl:
                                stLatestSubmission?.resultImageUrl || "",
                              submissionNote: stLatestSubmission?.note || "",
                              originalUrl:
                                currentPage?.webImageUrl ||
                                currentPage?.originalImageUrl ||
                                "",
                            });
                            setSelectedTask(null);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:brightness-110 transition-all"
                        >
                          Review
                        </button>
                      )}
                  </div>

                  {/* Latest submission */}
                  {stLatestSubmission?.resultImageUrl && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Latest Submission
                      </span>
                      <img
                        src={stLatestSubmission.resultImageUrl}
                        alt="Submitted work"
                        className="w-full h-auto max-h-48 object-contain bg-surface rounded-lg border border-outline-variant/20 mt-1"
                      />
                      {stLatestSubmission.note && (
                        <p className="text-xs text-on-surface-variant mt-1 italic">
                          "{stLatestSubmission.note}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* All submissions history */}
                  {st.submissions?.length > 1 && (
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
                        Submission History ({st.submissions.length})
                      </span>
                      <div className="mt-1 space-y-1">
                        {st.submissions
                          .slice()
                          .reverse()
                          .map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low rounded px-2 py-1.5 border border-outline-variant/10"
                            >
                              <span className="font-medium">
                                v{sub.version || "?"}
                              </span>
                              <StatusBadge status={sub.status} size="sm" />
                              {sub.note && (
                                <span className="truncate">— {sub.note}</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Dialog>
          );
        })()}

      {/* ─── Assign Task Modal ─── */}
      {assignOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-xl border border-outline-variant/30 bg-surface shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Image Preview + Region Info */}
              <div className="w-[38%] border-r border-outline-variant/20 bg-surface-container-low/50 p-5 flex flex-col gap-5 overflow-y-auto">
                <div
                  ref={imgContainerRef}
                  className="relative bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/20 group flex-1 min-h-[260px]"
                >
                  {(() => {
                    const pageImg =
                      currentPage?.originalImageUrl || currentPage?.webImageUrl;
                    if (!pageImg)
                      return (
                        <div className="flex items-center justify-center h-full text-on-surface-variant/40 text-sm">
                          No preview
                        </div>
                      );

                    const handleLoad = (e) => {
                      const nw = e.target.naturalWidth;
                      const nh = e.target.naturalHeight;
                      const el = imgContainerRef.current;
                      if (!el) return;
                      const rect = el.getBoundingClientRect();
                      setImgMeta({ cw: rect.width, ch: rect.height, nw, nh });
                    };

                    return (
                      <img
                        src={pageImg}
                        alt=""
                        className="w-full h-full object-contain"
                        onLoad={handleLoad}
                      />
                    );
                  })()}

                  {assignRegionIds.map((rid) => {
                    const selRegion = regions.find((r) => r.id === Number(rid));
                    if (!selRegion) return null;
                    const { cw, ch, nw, nh } = imgMeta;
                    if (!cw || !ch) return null;
                    const baseW = currentPage?.width || nw;
                    const baseH = currentPage?.height || nh;
                    if (!baseW || !baseH) return null;
                    const containerAspect = cw / ch;
                    const imageAspect = baseW / baseH;
                    let displayW, displayH, offsetX, offsetY;
                    if (containerAspect > imageAspect) {
                      displayH = ch;
                      displayW = ch * imageAspect;
                    } else {
                      displayW = cw;
                      displayH = cw / imageAspect;
                    }
                    offsetX = (cw - displayW) / 2;
                    offsetY = (ch - displayH) / 2;
                    const scaleX = displayW / baseW;
                    const scaleY = displayH / baseH;
                    return (
                      <div
                        key={rid}
                        className="absolute border-2 border-primary-container bg-primary-container/10 ring-4 ring-primary/20 flex items-center justify-center"
                        style={{
                          left: offsetX + selRegion.x * scaleX,
                          top: offsetY + selRegion.y * scaleY,
                          width: Math.max(selRegion.width * scaleX, 40),
                          height: Math.max(selRegion.height * scaleY, 20),
                        }}
                      >
                        <div className="absolute -top-2.5 -left-2.5 bg-primary-container text-white px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                          {selRegion.regionType || "FOCUS"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {assignRegionIds.length > 0 && (
                  <div className="bg-surface-container rounded-lg p-4 border border-outline-variant/20">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      Selected Regions ({assignRegionIds.length})
                    </h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {assignRegionIds.map((rid) => {
                        const selRegion = regions.find(
                          (r) => r.id === Number(rid),
                        );
                        if (!selRegion) return null;
                        return (
                          <div
                            key={rid}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor: selRegion.color || "#6b7280",
                              }}
                            />
                            <span className="text-on-surface">
                              {selRegion.label || `#${selRegion.id}`}
                            </span>
                            <span className="text-on-surface-variant/60 text-[11px]">
                              ({selRegion.regionType})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Form */}
              <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-on-surface">
                      Assign Task
                    </h2>
                    <p className="text-sm text-on-surface-variant/60 mt-0.5">
                      Assign a region to an assistant
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAssignOpen(false);
                      resetAssignForm();
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                      Regions <span className="text-error">*</span>
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-outline-variant/20 bg-surface-container-high p-1.5">
                      {unassignedRegions.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/60 px-2 py-3 text-center">
                          No unassigned regions
                        </p>
                      ) : (
                        unassignedRegions.map((r) => {
                          const checked = assignRegionIds.includes(
                            String(r.id),
                          );
                          return (
                            <label
                              key={r.id}
                              onClick={() => {
                                setAssignRegionIds((prev) =>
                                  prev.includes(String(r.id))
                                    ? prev.filter((id) => id !== String(r.id))
                                    : [...prev, String(r.id)],
                                );
                              }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
                                checked
                                  ? "bg-primary/10 text-on-surface"
                                  : "hover:bg-surface-container text-on-surface-variant",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                                  checked
                                    ? "bg-primary border-primary"
                                    : "border-outline-variant/50",
                                )}
                              >
                                {checked && (
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 10 10"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 5L4 7L8 3"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="truncate">
                                {r.label || `Region #${r.id}`} ({r.regionType})
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                      Assistant <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAssistant}
                        onChange={(e) => setSelectedAssistant(e.target.value)}
                        className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                        disabled={
                          loadingAssistants || realAssistants.length === 0
                        }
                      >
                        {loadingAssistants ? (
                          <option
                            value=""
                            className="bg-surface-container-high text-on-surface"
                          >
                            Loading...
                          </option>
                        ) : realAssistants.length === 0 ? (
                          <option
                            value=""
                            className="bg-surface-container-high text-on-surface"
                          >
                            No assistants available
                          </option>
                        ) : (
                          realAssistants.map((a) => (
                            <option
                              key={a.assistant.id}
                              value={a.assistant.id}
                              className="bg-surface-container-high text-on-surface"
                            >
                              {a.assistant.displayName}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    Task Title <span className="text-error">*</span>
                  </label>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Castle Background — Page 3"
                    className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className={`w-full h-10 px-3.5 text-sm border rounded-lg outline-none appearance-none cursor-pointer transition-all ${
                          taskPriority === "LOW"
                            ? "bg-status-success/15 text-status-success border-status-success/30"
                            : taskPriority === "MEDIUM"
                              ? "bg-status-warning/15 text-status-warning border-status-warning/30"
                              : taskPriority === "HIGH"
                                ? "bg-status-danger/15 text-status-danger border-status-danger/30"
                                : "bg-error/20 text-error border-error/40"
                        }`}
                      >
                        {priorityOptions.map((p) => (
                          <option
                            key={p.value}
                            value={p.value}
                            className="bg-surface-container-high text-on-surface"
                          >
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                      Difficulty
                    </label>
                    <div className="relative">
                      <select
                        value={taskDifficulty}
                        onChange={(e) => setTaskDifficulty(e.target.value)}
                        className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface appearance-none cursor-pointer transition-all"
                      >
                        {DIFFICULTIES.map((d) => (
                          <option
                            key={d}
                            value={d}
                            className="bg-surface-container-high text-on-surface"
                          >
                            {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                      Deadline
                    </label>
                    <div className="relative">
                      <CalendarDays
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                      />
                      <input
                        type="date"
                        value={taskDeadline}
                        onChange={(e) => setTaskDeadline(e.target.value)}
                        className="w-full h-10 pl-9 pr-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    Description
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What needs to be done?"
                    rows={3}
                    className="w-full resize-none px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    Production Notes
                  </label>
                  <input
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="Reference sheets, color palettes, style notes..."
                    className="w-full h-10 px-3.5 text-sm bg-surface-container-high border border-outline-variant/20 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-on-surface transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">
                    Attachments &amp; References
                  </label>
                  <div className="border-2 border-dashed border-outline-variant/20 rounded-xl p-5 flex flex-col items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/50 transition-all cursor-pointer">
                    <div className="flex gap-4 items-center">
                      {taskAttachments.length > 0 ? (
                        <div className="w-16 h-16 rounded border border-outline-variant/20 bg-surface-container overflow-hidden group relative">
                          <img
                            src={URL.createObjectURL(taskAttachments[0])}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={18} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-outline-variant/20 bg-surface-container flex items-center justify-center">
                          <Upload
                            size={20}
                            className="text-on-surface-variant/40"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          Drag and drop assets
                        </p>
                        <p className="text-[11px] text-on-surface-variant/50">
                          Max 50MB per file (JPG, PNG, TIFF)
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/tiff"
                      className="hidden"
                      id="assign-attachment-input"
                      onChange={(e) => {
                        if (e.target.files)
                          setTaskAttachments(Array.from(e.target.files));
                      }}
                    />
                  </div>
                  <label
                    htmlFor="assign-attachment-input"
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
              <button
                onClick={() => {
                  setAssignOpen(false);
                  resetAssignForm();
                }}
                className="h-10 px-5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={(() => {
                  const d =
                    assignRegionIds.length === 0 ||
                    !selectedAssistant ||
                    !taskTitle.trim() ||
                    posting;
                  return d;
                })()}
                className="h-10 px-7 rounded-lg bg-primary-container text-on-primary-container text-sm font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] inline-flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
              >
                {posting && <Loader2 size={14} className="animate-spin" />}
                {posting ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SubmitDialog ─── */}
      {submitTarget && (
        <SubmitDialog
          open={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          regionLabel={submitTarget.label}
          isSubmitting={isSubmitting}
          onConfirm={handleSubmit}
        />
      )}

      {/* ─── ReviewDialog ─── */}
      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          submission={
            reviewTarget.submissionId
              ? {
                  id: reviewTarget.submissionId,
                  resultImageUrl: reviewTarget.resultImageUrl,
                  note: reviewTarget.submissionNote,
                }
              : null
          }
          originalUrl={reviewTarget.originalUrl}
          taskLabel={reviewTarget.label}
          onReview={handleReview}
          isReviewing={isSubmitting}
        />
      )}
    </div>
  );
}

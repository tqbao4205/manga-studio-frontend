/*
  ==========================================================
  PAGE: WorkspacePage (dùng chung cho Workspace & Review)
  ROUTE: /workspace/:chapterId (MANGAKA/ASSISTANT)
         /review/:chapterId (TANTOU_EDITOR/EDITORIAL_BOARD)
  MỤC ĐÍCH: Trang làm việc chính cho chapter. Bao gồm canvas
  vẽ/annotation, layer panel, region/task/comment panels.
  Ở review mode, hiển thị công cụ review (pen, highlight, text)
  và các actions phê duyệt (Submit to Board, Approve, Reject...).

  📌 Kết nối API:
    - Chapter detail: GET /api/chapters/{id}
    - Pages + Reorder: GET+PUT /api/v1/chapters/{chapterId}/pages
    - Merge: POST /api/v1/pages/{id}/merge
    - Layers: POST /api/v1/pages/{pageId}/layers (add)
    - Comments/Annotations: giữ mock tạm (backend chưa có API)
  ==========================================================
*/

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Image as ImageIcon,
  MessageSquare,
  ListTodo,
  MousePointer2,
  Square,
  Hand,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  X,
  Send,
  Highlighter,
  Loader2,
  FileImage,
  Download,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorkspaceStore } from "../../app/stores/workspaceStore";
import { useSeriesStore } from "../../app/stores/seriesStore";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import { useTaskStore } from "../../app/stores/taskStore";
import chapterService from "../../services/chapterService";
import { WorkspaceCanvas } from "../../shared/components/workspace/WorkspaceCanvas";
import { RegionPanel } from "../../shared/components/workspace/RegionPanel";
import { LayerPanel } from "../../shared/components/workspace/LayerPanel";
import { TaskPanel } from "../../shared/components/workspace/TaskPanel";
import { CommentPanel } from "../../shared/components/workspace/CommentPanel";
import { NewPageDialog } from "../../shared/components/workspace/NewPageDialog";
import { CreateTaskModal } from "../../shared/components/workspace/CreateTaskModal";
import { PageLoading } from "../../shared/components/shared/LoadingSpinner";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { Dialog } from "../../shared/components/ui/dialog";
import { Button } from "../../shared/components/ui/button";
import { cn } from "../../shared/utils";

/* Tab definitions cho review mode (chỉ Comments) */
const reviewTabDefs = [
  {
    id: "comments",
    label: "Comments",
    icon: MessageSquare,
    Component: CommentPanel,
  },
];

/* Tab definitions cho workspace mode (Regions + Tasks) */
const tabDefs = [
  {
    id: "regions",
    label: "Regions",
    icon: Layers,
    Component: RegionPanel,
    roles: ["MANGAKA"],
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: ListTodo,
    Component: TaskPanel,
    roles: ["MANGAKA", "ASSISTANT"],
  },
  {
    id: "comments",
    label: "Comments",
    icon: MessageSquare,
    Component: CommentPanel,
    roles: ["MANGAKA", "ASSISTANT"],
  },
];

/* Tools cho MANGAKA/ASSISTANT workspace */
const toolDefs = [
  {
    id: "select",
    icon: MousePointer2,
    label: "Select (V)",
    roles: ["MANGAKA"],
  },
  {
    id: "hand",
    icon: Hand,
    label: "Hand (H)",
    roles: ["MANGAKA", "ASSISTANT"],
  },
  { id: "draw", icon: Square, label: "Region (R)", roles: ["MANGAKA"] },
  { id: "comment", icon: MessageSquare, label: "Comment (C)", roles: ["MANGAKA", "ASSISTANT"] },
];

/* Tools cho review mode (TANTOU_EDITOR / EDITORIAL_BOARD) */
const reviewTools = [
  { id: "select", icon: MousePointer2, label: "Select (S)" },
  { id: "hand", icon: Hand, label: "Pan (V)" },
  { id: "highlight", icon: Highlighter, label: "Highlight (H)" },
  { id: "comment", icon: MessageSquare, label: "Comment (C)" },
];

export function WorkspacePage() {
  const { chapterId, pageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = Number(chapterId);
  const targetPageId = pageId ? Number(pageId) : null;
  const isReviewMode = location.pathname.startsWith("/review/");
  const taskCreationFlow = Boolean(location.state?.taskCreationFlow);
  const taskFlowReturnTo = location.state?.returnTo || "/tasks";

  // ─── WorkspaceStore ───
  const currentPageId = useWorkspaceStore((s) => s.currentPageId);
  const pages = useWorkspaceStore((s) => s.pages);
  const regions = useWorkspaceStore((s) => s.regions);
  const zoom = useWorkspaceStore((s) => s.zoom);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const isLoadingPage = useWorkspaceStore((s) => s.isLoadingPage);
  const mergeResult = useWorkspaceStore((s) => s.mergeResult);
  const loadChapter = useWorkspaceStore((s) => s.loadChapter);
  const loadPage = useWorkspaceStore((s) => s.loadPage);
  const mode = useWorkspaceStore((s) => s.mode);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addPage = useWorkspaceStore((s) => s.addPage);
  const addLayer = useWorkspaceStore((s) => s.addLayer);
  const reorderPages = useWorkspaceStore((s) => s.reorderPages);
  const layers = useWorkspaceStore((s) => s.layers);
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId);
  const mergePage = useWorkspaceStore((s) => s.mergePage);
  const clearMergeResult = useWorkspaceStore((s) => s.clearMergeResult);
  const flattenPage = useWorkspaceStore((s) => s.flattenPage);
  const reset = useWorkspaceStore((s) => s.reset);
  const setSeriesId = useWorkspaceStore((s) => s.setSeriesId);

  // ─── Other stores ───
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const createTask = useTaskStore((s) => s.createTask);
  const updateChapterStatus = useSeriesStore((s) => s.updateChapterStatus);
  const chapters = useSeriesStore((s) => s.chapters);

  const [chapter, setChapter] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(!isReviewMode);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState("pages");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeImageUrl, setMergeImageUrl] = useState("");
  const [showFlattenDialog, setShowFlattenDialog] = useState(false);
  const [flattening, setFlattening] = useState(false);
  const layerFileInputRef = useRef(null);

  // ─── Fetch chapter detail từ API thay vì mock hook ───
  // Endpoint: GET /api/chapters/{id}
  useEffect(() => {
    if (!id) return;
    setChapterLoading(true);
    chapterService
      .getById(id)
      .then((data) => {
        setChapter(data);
        if (data?.seriesId) setSeriesId(data.seriesId);
      })
      .catch(() => setChapter(null))
      .finally(() => setChapterLoading(false));
  }, [id, setSeriesId]);

  /*
    Khi component mount, load chapter data vào workspaceStore.
    Cleanup bằng reset() khi unmount để tránh memory leak.
  */
  useEffect(() => {
    if (id) loadChapter(id, targetPageId);
    return () => reset();
  }, [id, targetPageId]);

  /*
    Nếu là review mode, tự động chuyển sang comment tool và comments tab
  */
  useEffect(() => {
    if (isReviewMode) {
      setMode("comment");
      setActiveTab("comments");
    }
  }, [isReviewMode]);

  useEffect(() => {
    if (taskCreationFlow && !isReviewMode) {
      setActiveTab("regions");
    }
  }, [taskCreationFlow, isReviewMode, setActiveTab]);

  /* Navigation giữa các pages (prev/next) */
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const currentIdx = sortedPages.findIndex((p) => p.id === currentPageId);
  const prevPage = currentIdx > 0 ? sortedPages[currentIdx - 1] : null;
  const nextPage =
    currentIdx < sortedPages.length - 1 ? sortedPages[currentIdx + 1] : null;

  /*
    Keyboard shortcuts:
    - ArrowLeft/Right: chuyển page
    - V/H/R/P/T/0: chọn tool / zoom
  */
  useEffect(() => {
    const handleKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case "ArrowLeft":
          prevPage && loadPage(prevPage.id);
          break;
        case "ArrowRight":
          nextPage && loadPage(nextPage.id);
          break;
      }
      switch (e.key.toLowerCase()) {
        case "v":
          setMode("select");
          break;
        case "h":
          if (isReviewMode) setMode("highlight");
          else setMode("hand");
          break;
        case "r":
          if (!isReviewMode && user?.role === "MANGAKA") setMode("draw");
          break;
        case "c":
          setMode("comment");
          break;
        case "0":
          setZoom(1);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setMode, setZoom, isReviewMode, prevPage, nextPage, loadPage, user]);

  const isTantou = user?.role === "TANTOU_EDITOR";
  const isEb = user?.role === "EDITORIAL_BOARD";
  const isEditor = isTantou || isEb;
  const isMangaka = user?.role === "MANGAKA";
  const storeChapters = Object.values(chapters).flat();
  const chapterStatus =
    storeChapters.find((c) => c.id === id)?.status || chapter?.status;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  /**
   * Kéo thả pages: gọi API reorder + optimistic update.
   * Endpoint: PUT /api/v1/chapters/{chapterId}/pages/reorder
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = pages.findIndex((p) => p.id === active.id);
    const newIdx = pages.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...pages];
    reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, pages[oldIdx]);
    reorderPages(reordered.map((p) => p.id));
  };

  /**
   * Merge & Export: gọi POST /api/v1/pages/{id}/merge
   * Hiển thị ảnh kết quả trong dialog preview.
   */
  const handleMerge = async () => {
    if (!currentPageId) return;
    setMerging(true);
    try {
      const url = await mergePage(currentPageId);
      if (url) {
        setMergeImageUrl(url);
        setShowMergeDialog(true);
        addToast({
          title: "Merge complete",
          description: "Layers merged successfully",
          variant: "success",
        });
      } else {
        addToast({
          title: "Merge failed",
          description: "No result returned",
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Merge failed",
        description: "Could not merge layers",
        variant: "error",
      });
    } finally {
      setMerging(false);
    }
  };

  /**
   * Flatten: merge layers vào ảnh nền + replace original + xoá toàn bộ layers.
   * Endpoint: POST /api/v1/pages/{id}/flatten
   */
  const handleFlatten = async () => {
    if (!currentPageId) return;
    setFlattening(true);
    setShowFlattenDialog(false);
    try {
      const ok = await flattenPage(currentPageId);
      if (ok) {
        addToast({
          title: "Flatten complete",
          description: "Layers merged into page successfully",
          variant: "success",
        });
      } else {
        addToast({
          title: "Flatten failed",
          description: "Could not flatten layers",
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Flatten failed",
        description: "An error occurred",
        variant: "error",
      });
    } finally {
      setFlattening(false);
    }
  };

  /**
   * Add Layer (upload file): gọi POST /api/v1/pages/{pageId}/layers
   * LayerPanel xử lý upload chi tiết, nút này là shortcut nhanh.
   */
  const handleAddLayerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentPageId) return;
    const formData = new FormData();
    formData.append("file", file);
    // Backend yêu cầu field 'request' là JSON string chứa metadata
    formData.append("request", JSON.stringify({
      label: `Layer ${layers.length + 1}`,
      opacity: 1,
    }));
    try {
      await addLayer(currentPageId, formData);
      addToast({
        title: "Layer added",
        description: file.name,
        variant: "success",
      });
    } catch {
      addToast({
        title: "Upload failed",
        description: "Could not add layer",
        variant: "error",
      });
    }
    if (layerFileInputRef.current) layerFileInputRef.current.value = "";
  };

  /**
   * Submit assigned task: gọi taskStore.createTask (API).
   * Endpoint: POST /api/regions/{regionId}/tasks
   */
  const handleSubmitAssignedTask = async (formValues) => {
    if (!selectedRegion) return;

    try {
      await createTask(selectedRegion.id, {
        regionType: formValues.regionType || selectedRegion.regionType || "OTHER",
        title: formValues.title,
        description: formValues.description,
        notes: formValues.notes,
        priority: formValues.priority,
        dueDate: formValues.dueDate,
        assistantId: formValues.assistantId,
        referenceImageUrl: formValues.referenceImageUrl || "",
      });

      setCreateTaskOpen(false);
      addToast({
        title: "Task created",
        description: `Assigned to region ${selectedRegion.label || `#${selectedRegion.id}`}`,
        variant: "success",
      });
      navigate(taskFlowReturnTo);
    } catch {
      addToast({
        title: "Failed",
        description: "Could not create task",
        variant: "error",
      });
    }
  };

  if (chapterLoading || isLoading) return <PageLoading />;

  if (!chapter) {
    return (
      <div className="h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-on-surface-variant text-sm">
            Chapter not found
          </p>
          <button
            onClick={() => navigate("/series")}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Go to Series
          </button>
        </div>
      </div>
    );
  }

  const userRole = user?.role || "";
  const currentTabs = isReviewMode
    ? reviewTabDefs
    : tabDefs.filter((t) => !t.roles || t.roles.includes(userRole));
  const currentTools = isReviewMode
    ? reviewTools
    : toolDefs.filter((t) => !t.roles || t.roles.includes(userRole));
  const ActiveComponent = currentTabs.find(
    (t) => t.id === activeTab,
  )?.Component;
  const currentPage = pages.find((p) => p.id === currentPageId);
  const selectedRegion = regions.find((r) => r.id === selectedRegionId);

  const regionCount = regions.length;
  const completedRegions = regions.filter(
    (r) => r.status === "COMPLETED" || r.status === "APPROVED",
  ).length;

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden select-none">
      {/* ── Top Toolbar ── */}
      <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 grid grid-cols-3 items-center px-6 z-50 flex-shrink-0 shadow-sm shadow-black/5">
        {/* Left — back button */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(
                isReviewMode ? "/review" : `/series/${chapter.seriesId}`,
              )
            }
            title="Back"
          >
            <ArrowLeft size={18} />
          </Button>
        </div>

        {/* Center — chapter title */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-medium text-on-surface">
            Ch.{chapter.chapterNumber}
            {chapter.title ? ` — ${chapter.title}` : ""}
          </span>
          <StatusBadge status={chapterStatus} size="sm" />
        </div>

        {/* Right — user avatar */}
        <div className="flex items-center justify-end gap-4">
          <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20">
            {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
          </div>

          {/* Review mode actions */}
          {isReviewMode && chapter && (
            <>
              {isMangaka && (
                <span className="text-xs text-on-surface-variant/60">
                  {chapterStatus === "IN_REVIEW"
                    ? "Awaiting Tantou review"
                    : chapterStatus === "PENDING_BOARD_APPROVAL"
                      ? "Submitted to Board"
                      : ""}
                </span>
              )}
              {isTantou &&
                (chapterStatus === "IN_REVIEW" ||
                  chapterStatus === "SUBMITTED") && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        updateChapterStatus(id, "PENDING_BOARD_APPROVAL");
                        addToast({
                          type: "success",
                          title: "Submitted to Board",
                          message: `Ch.${chapter.chapterNumber} has been submitted for Editorial Board approval.`,
                        });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-status-success border border-status-success/30 hover:bg-status-success/5 rounded-lg transition-all"
                    >
                      <Send size={14} /> Submit to Board
                    </button>
                    <button
                      onClick={() => {
                        updateChapterStatus(id, "REVISION_REQUIRED");
                        addToast({
                          type: "success",
                          title: "Revision requested",
                          message: `Changes requested for Ch.${chapter.chapterNumber}.`,
                        });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-status-warning border border-status-warning/30 hover:bg-status-warning/5 rounded-lg transition-all"
                    >
                      <RotateCcw size={14} /> Revise
                    </button>
                    <button
                      onClick={() => {
                        updateChapterStatus(id, "REJECTED");
                        addToast({
                          type: "success",
                          title: "Chapter rejected",
                          message: `Ch.${chapter.chapterNumber} has been rejected.`,
                        });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-status-danger border border-status-danger/30 hover:bg-status-danger/5 rounded-lg transition-all"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              {isEb && chapterStatus === "PENDING_BOARD_APPROVAL" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      updateChapterStatus(id, "APPROVED");
                      addToast({
                        type: "success",
                        title: "Chapter approved",
                        message: `Ch.${chapter.chapterNumber} has been approved.`,
                      });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-status-success border border-status-success/30 hover:bg-status-success/5 rounded-lg transition-all"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      updateChapterStatus(id, "REJECTED");
                      addToast({
                        type: "success",
                        title: "Chapter rejected",
                        message: `Ch.${chapter.chapterNumber} has been rejected.`,
                      });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-status-danger border border-status-danger/30 hover:bg-status-danger/5 rounded-lg transition-all"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel toggle */}
        {!showLeftPanel && !isReviewMode && (
          <button
            onClick={() => setShowLeftPanel(true)}
            className="flex-shrink-0 w-6 bg-surface border-r border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
            title="Show Pages"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {showLeftPanel && !isReviewMode && (
          <aside className="w-72 flex-shrink-0 bg-surface border-r border-outline-variant/50 flex flex-col overflow-hidden">
            {/* Pages/Layers tabs */}
            <div className="flex border-b border-outline-variant/50 flex-shrink-0 px-1 pt-1">
              <button
                onClick={() => setLeftPanelTab("pages")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-all rounded-t-lg",
                  leftPanelTab === "pages"
                    ? "text-primary bg-surface-container-low border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50",
                )}
              >
                Pages
              </button>
              {isMangaka && (
                <button
                  onClick={() => setLeftPanelTab("layers")}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium transition-all rounded-t-lg",
                    leftPanelTab === "layers"
                      ? "text-primary bg-surface-container-low border-b-2 border-primary"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50",
                  )}
                >
                  Layers
                </button>
              )}
            </div>

            {/* Pages tab */}
            {leftPanelTab === "pages" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  sensors={sensors}
                >
                  <SortableContext
                    items={pages.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {pages.map((p) => (
                      <SortablePageCard
                        key={p.id}
                        page={p}
                        isActive={p.id === currentPageId}
                        onClick={() => loadPage(p.id)}
                        isMangaka={isMangaka}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Add Page button */}
                {isMangaka && (
                  <div
                    onClick={() => setNewPageOpen(true)}
                    className="group relative cursor-pointer hover:bg-surface-container-high rounded-lg overflow-hidden transition-all"
                  >
                    <div className="w-full aspect-[210/297] bg-surface-container-highest/20 flex flex-col items-center justify-center border border-dashed border-outline-variant rounded-lg">
                      <Plus size={24} className="text-outline" />
                      <span className="text-xs text-outline mt-2">
                        Add Page
                      </span>
                    </div>
                  </div>
                )}

                {/* Project Status */}
                <div className="pt-4 border-t border-outline-variant">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Project Status
                    </span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-on-surface-variant">
                        Regions Labeled
                      </span>
                      <span className="text-on-surface">
                        {completedRegions}/{regionCount}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${regionCount > 0 ? (completedRegions / regionCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layers tab */}
            {leftPanelTab === "layers" && isMangaka && (
              <div className="flex-1 overflow-y-auto">
                <LayerPanel
                  flattening={flattening}
                  flattenDisabled={flattening || layers.length < 2}
                  onFlattenClick={() => setShowFlattenDialog(true)}
                />
              </div>
            )}

            {/* Loading indicator khi load page data */}
            {isLoadingPage && (
              <div className="absolute inset-0 bg-surface/60 flex items-center justify-center z-10">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            )}
          </aside>
        )}

        {/* Canvas */}
        <div
          className="flex-1 relative overflow-hidden min-w-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #2a2a2c 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#0e0e10",
          }}
        >
          {currentPageId ? (
            <WorkspaceCanvas />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-on-surface-variant/60">
                Select a page
              </p>
            </div>
          )}

          {/* Floating Toolbar — tools + zoom */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1.5 bg-surface-container-highest/90 backdrop-blur-md rounded-xl border border-outline-variant/50 shadow-2xl">
            {/* Tool buttons */}
            <nav className="flex items-center gap-0.5">
              {currentTools.map((t) => {
                const Icon = t.icon;
                return (
                  <Button
                    key={t.id}
                    variant={mode === t.id ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setMode(t.id)}
                    disabled={currentPageId === null}
                    className={cn(
                      'w-8 h-8',
                      mode === t.id && "bg-primary/10 text-primary border border-primary/20",
                    )}
                    title={t.label}
                  >
                    <Icon size={16} />
                  </Button>
                );
              })}
            </nav>
            <div className="w-px h-5 bg-outline-variant/30 mx-1" />
            {/* Zoom control */}
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
                <ZoomOut size={15} />
              </Button>
              <span className="mx-1 text-xs font-medium min-w-[32px] text-center tabular-nums text-on-surface tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setZoom(Math.min(10, zoom + 0.25))}>
                <ZoomIn size={15} />
              </Button>
            </div>
            <div className="w-px h-5 bg-outline-variant/30 mx-1" />
            <Button variant="ghost" size="sm" className="px-3 text-xs font-bold" onClick={() => setZoom(1)}>
              Fit To Screen
            </Button>
          </div>
        </div>

        {/* Right panel toggle */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            className="flex-shrink-0 w-6 bg-surface border-l border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
            title="Show panel"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Right panel — Regions/Tasks/Comments */}
        {showRightPanel && (
          <aside className="w-96 flex-shrink-0 bg-surface border-l border-outline-variant/50 flex flex-col overflow-hidden">
            <div className="flex border-b border-outline-variant/50 flex-shrink-0 px-1 pt-1">
              {currentTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium transition-all rounded-t-lg",
                      activeTab === tab.id
                        ? "text-primary bg-surface-container-low border-b-2 border-primary"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50",
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto">
              {ActiveComponent && <ActiveComponent />}
            </div>

            {taskCreationFlow && !isReviewMode && (
              <div className="border-t border-outline-variant p-4">
                <button
                  onClick={() => setCreateTaskOpen(true)}
                  disabled={!selectedRegion}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Assign Task
                </button>
                {!selectedRegion && (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Select a region on canvas or in Regions tab to continue.
                  </p>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Dialog thêm page mới (chỉ workspace mode) */}
      {!isReviewMode && (
        <NewPageDialog
          open={newPageOpen}
          onClose={() => setNewPageOpen(false)}
          onConfirm={(img) => {
            addPage(
              img ?? undefined,
              user ? { id: user.id, displayName: user.displayName } : undefined,
            );
            setNewPageOpen(false);
          }}
        />
      )}

      <CreateTaskModal
        open={createTaskOpen}
        region={selectedRegion}
        page={currentPage}
        seriesId={chapter?.seriesId}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={handleSubmitAssignedTask}
      />

      {/* Merge Result Dialog — hiển thị ảnh sau khi merge layers */}
      <Dialog
        open={showMergeDialog}
        onClose={() => {
          setShowMergeDialog(false);
          clearMergeResult();
        }}
        title="Merge & Export"
        description="Final composite image after merging all layers"
        size="lg"
      >
        <div className="space-y-4">
          {mergeImageUrl ? (
            <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-variant/20">
              <img
                src={mergeImageUrl}
                alt="Merged result"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-on-surface-variant/60">
              <FileImage size={32} />
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowMergeDialog(false);
                clearMergeResult();
              }}
            >
              Close
            </Button>
            {mergeImageUrl && (
              <Button
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = mergeImageUrl;
                  a.download = `page-${currentPageId}-merged.png`;
                  a.click();
                }}
              >
                <Download size={14} className="mr-1" /> Download
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Flatten Confirm Dialog */}
      <Dialog
        open={showFlattenDialog}
        onClose={() => setShowFlattenDialog(false)}
        title="Flatten Layers"
        description="Gộp tất cả layers vào ảnh nền và xoá toàn bộ layers. Hành động này không thể hoàn tác."
      >
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFlattenDialog(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleFlatten}
          >
            {flattening ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : (
              <Layers size={14} className="mr-1" />
            )}
            Flatten
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SortablePageCard({ page, isActive, onClick, isMangaka }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isMangaka ? listeners : {})}
      {...(isMangaka ? attributes : {})}
      onClick={onClick}
      className={cn(
        "group relative rounded-lg overflow-hidden transition-all cursor-pointer",
        isActive ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-outline",
        isDragging ? "opacity-40 z-50" : "",
      )}
    >
      {page.originalImageUrl ? (
        <img
          src={page.originalImageUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full aspect-[210/297] object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full aspect-[210/297] bg-surface-container-highest/20 flex flex-col items-center justify-center">
          <ImageIcon size={24} className="text-outline" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <span className="text-xs font-bold text-white">
          {page.label || `Page ${String(page.pageNumber).padStart(2, "0")}`}
        </span>
      </div>
      {isActive && (
        <div className="absolute top-2 right-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          ACTIVE
        </div>
      )}
    </div>
  );
}

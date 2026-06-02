/*
  ==========================================================
  PAGE: WorkspacePage (dùng chung cho Workspace & Review)
  ROUTE: /workspace/:chapterId (MANGAKA/ASSISTANT)
         /review/:chapterId (TANTOU_EDITOR/EDITORIAL_BOARD)
  MỤC ĐÍCH: Trang làm việc chính cho chapter. Bao gồm canvas
  vẽ/annotation, layer panel, region/task/comment panels.
  Ở review mode, hiển thị công cụ review (pen, highlight, text)
  và các actions phê duyệt (Submit to Board, Approve, Reject...).
  QUYỀN TRUY CẬP:
    - MANGAKA: Regions, Tasks, Comments tabs + vùng vẽ
    - ASSISTANT: Tasks, Comments tabs
    - TANTOU_EDITOR: Review mode + Comment + annotation tools
    - EDITORIAL_BOARD: Review mode + Approve/Reject
  ==========================================================
*/

import { useEffect, useRef, useState } from "react";
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
  Maximize,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  Check,
  RotateCcw,
  X,
  Send,
  Pen,
  Highlighter,
  Type,
  Upload,
  Undo2,
  Redo2,
  Cloud,
  MoreVertical,
  BookOpen,
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
import { useChapterDetail } from "../../shared/hooks/useMockData";
import { useWorkspaceStore } from "../../app/stores/workspaceStore";
import { useSeriesStore } from "../../app/stores/seriesStore";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import { useTaskStore } from "../../app/stores/taskStore";
import { WorkspaceCanvas } from "../../shared/components/workspace/WorkspaceCanvas";
import { RegionPanel } from "../../shared/components/workspace/RegionPanel";
import { LayerPanel } from "../../shared/components/workspace/LayerPanel";
import { TaskPanel } from "../../shared/components/workspace/TaskPanel";
import { CommentPanel } from "../../shared/components/workspace/CommentPanel";
import { NewPageDialog } from "../../shared/components/workspace/NewPageDialog";
import { CreateTaskModal } from "../../shared/components/workspace/CreateTaskModal";
import { PageLoading } from "../../shared/components/shared/LoadingSpinner";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
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

/* Tab definitions cho workspace mode (Regions, Tasks, Comments) */
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

/* Tools cho MANGAKA/ASSISTANT workspace — matches workspace.html */
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
  { id: "pen", icon: Pen, label: "Pen (P)", roles: ["MANGAKA"] },
  { id: "text-annotation", icon: Type, label: "Text (T)", roles: ["MANGAKA"] },
];

/* Tools cho review mode (TANTOU_EDITOR / EDITORIAL_BOARD) */
const reviewTools = [
  { id: "select", icon: MousePointer2, label: "Select (S)" },
  { id: "hand", icon: Hand, label: "Pan (V)" },
  { id: "pen", icon: Pen, label: "Pen (P)" },
  { id: "highlight", icon: Highlighter, label: "Highlight (H)" },
  { id: "text-annotation", icon: Type, label: "Text (T)" },
];

export function WorkspacePage() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = Number(chapterId);
  const isReviewMode = location.pathname.startsWith("/review/");
  const taskCreationFlow = Boolean(location.state?.taskCreationFlow);
  const taskFlowReturnTo = location.state?.returnTo || "/tasks";

  const currentPageId = useWorkspaceStore((s) => s.currentPageId);
  const pages = useWorkspaceStore((s) => s.pages);
  const regions = useWorkspaceStore((s) => s.regions);
  const zoom = useWorkspaceStore((s) => s.zoom);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const loadChapter = useWorkspaceStore((s) => s.loadChapter);
  const loadPage = useWorkspaceStore((s) => s.loadPage);
  const mode = useWorkspaceStore((s) => s.mode);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addPage = useWorkspaceStore((s) => s.addPage);
  const reorderPages = useWorkspaceStore((s) => s.reorderPages);
  const layers = useWorkspaceStore((s) => s.layers);
  const selectedRegionId = useWorkspaceStore((s) => s.selectedRegionId);
  const reset = useWorkspaceStore((s) => s.reset);

  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const submitNewTask = useTaskStore((s) => s.submitNewTask);
  const updateChapterStatus = useSeriesStore((s) => s.updateChapterStatus);
  const chapters = useSeriesStore((s) => s.chapters);

  const [newPageOpen, setNewPageOpen] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(!isReviewMode);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [layerExpanded, setLayerExpanded] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState("pages");
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const { data: chapter, isLoading } = useChapterDetail(id);
  const isTantou = user?.role === "TANTOU_EDITOR";
  const isEb = user?.role === "EDITORIAL_BOARD";
  const isEditor = isTantou || isEb;
  const isMangaka = user?.role === "MANGAKA";
  const storeChapters = Object.values(chapters).flat();
  const chapterStatus =
    storeChapters.find((c) => c.id === id)?.status || chapter?.status;

  /*
    Khi component mount, load chapter data vào workspaceStore.
    Cleanup bằng reset() khi unmount để tránh memory leak.
  */
  useEffect(() => {
    if (id) loadChapter(id);
    return () => reset();
  }, [id]);

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
    - S/V/R/C/H/P/T: chọn tool
    - 0: reset zoom
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
          if (!isReviewMode && isMangaka) setMode("draw");
          break;
        case "p":
          setMode("pen");
          break;
        case "t":
          setMode("text-annotation");
          break;
        case "0":
          setZoom(1);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setMode, setZoom, isReviewMode, prevPage, nextPage, loadPage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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

  if (isLoading) return <PageLoading />;

  if (!chapter) {
    return (
      <div className="h-screen bg-workspace-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-workspace-text-secondary text-sm">
            Chapter not found
          </p>
          <button
            onClick={() => navigate("/series")}
            className="mt-3 text-xs text-workspace-accent hover:underline"
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

  const handleSubmitAssignedTask = (formValues) => {
    if (!selectedRegion) return;

    submitNewTask({
      regionId: selectedRegion.id,
      regionType: selectedRegion.regionType || "OTHER",
      title: formValues.title,
      description: formValues.description,
      notes: formValues.notes,
      priority: formValues.priority,
      dueDate: formValues.dueDate,
      difficulty: formValues.difficulty,
      assistantId: formValues.assistantId,
      assignedBy: user?.id || 1,
      pageImageUrl:
        currentPage?.originalImageUrl || currentPage?.webImageUrl || "",
      referenceImageUrl: "",
    });

    setCreateTaskOpen(false);
    addToast({
      title: "Task created",
      description: `Assigned to region ${selectedRegion.label || `#${selectedRegion.id}`}`,
      variant: "success",
    });
    navigate(taskFlowReturnTo);
  };

  const regionCount = regions.length;
  const completedRegions = regions.filter(
    (r) => r.status === "COMPLETED" || r.status === "APPROVED",
  ).length;

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden select-none">
      {/* ── Top Toolbar (workspace.html styling) ── */}
      <header className="h-14 bg-surface border-b border-outline-variant flex items-center justify-between px-4 z-50 flex-shrink-0">
        {/* Left section: Brand + Chapter nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            <span className="text-[24px] font-semibold text-on-surface tracking-tight">
              MangaFlow
            </span>
          </div>
          <div className="w-px h-8 bg-outline-variant" />
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                navigate(
                  isReviewMode ? "/review" : `/series/${chapter.seriesId}`,
                )
              }
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
          <span className="text-sm font-medium text-on-surface">
            Ch.{chapter.chapterNumber}
            {chapter.title ? ` — ${chapter.title}` : ""}
          </span>
          <StatusBadge status={chapterStatus} size="sm" />
          <div className="w-px h-6 bg-outline-variant" />

          {/* Tool buttons */}
          <nav className="flex items-center gap-1">
            {currentTools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setMode(t.id)}
                  disabled={currentPageId === null}
                  className={cn(
                    "p-1.5 rounded-lg transition-all disabled:opacity-30",
                    mode === t.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-on-surface-variant hover:bg-surface-container-high",
                  )}
                  title={t.label}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </nav>
          <div className="w-px h-6 bg-outline-variant" />

          {/* Save status + Undo/Redo */}
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <Cloud size={16} /> Saved
            </span>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors">
                <Undo2 size={16} />
              </button>
              <button className="p-1 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors">
                <Redo2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right section: Zoom + Upload + Avatar */}
        <div className="flex items-center gap-4">
          {/* Zoom control */}
          <div className="flex items-center bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant">
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="mx-3 text-sm font-medium min-w-[40px] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.25))}
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Upload Page button */}
          {!isReviewMode && isMangaka && (
            <button
              onClick={() => setNewPageOpen(true)}
              className="bg-primary text-on-primary px-4 py-1.5 rounded-full text-sm font-medium hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
            >
              <Upload size={18} />
              Upload Page
            </button>
          )}

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20">
              {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
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
                  <>
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-success border border-status-success/30 hover:bg-status-success/5 rounded-lg"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-warning border border-status-warning/30 hover:bg-status-warning/5 rounded-lg"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-danger border border-status-danger/30 hover:bg-status-danger/5 rounded-lg"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </>
                )}
              {isEb && chapterStatus === "PENDING_BOARD_APPROVAL" && (
                <>
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
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-success border border-status-success/30 hover:bg-status-success/5 rounded-lg"
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
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-danger border border-status-danger/30 hover:bg-status-danger/5 rounded-lg"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Pages/Layers (workspace.html styling) */}

        {/* Right panel toggle button — always visible on the left edge */}
        {!showLeftPanel && !isReviewMode && isMangaka && (
          <button
            onClick={() => setShowLeftPanel(true)}
            className="flex-shrink-0 w-6 bg-surface-container-low border-r border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            title="Show Pages"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {showLeftPanel && !isReviewMode && isMangaka && (
          <aside className="w-64 flex-shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col overflow-hidden">
            {/* Pages/Layers tabs */}
            <div className="flex border-b border-outline-variant flex-shrink-0">
              <button
                onClick={() => setLeftPanelTab("pages")}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  leftPanelTab === "pages"
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Pages
              </button>
              <button
                onClick={() => setLeftPanelTab("layers")}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  leftPanelTab === "layers"
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Layers
              </button>
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
            {leftPanelTab === "layers" && (
              <div className="flex-1 overflow-y-auto p-2">
                <LayerPanel />
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

          {/* Floating Zoom Control (workspace.html styling) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-surface-container-highest/90 backdrop-blur-md rounded-xl border border-outline-variant shadow-2xl">
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <button
              onClick={() => setZoom(1)}
              className="px-4 py-1 text-sm font-bold hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
            >
              Fit To Screen
            </button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.25))}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Right panel toggle */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            className="flex-shrink-0 w-6 bg-surface-container-low border-l border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            title="Show panel"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Right panel — Regions/Tasks/Comments */}
        {showRightPanel && (
          <aside className="w-80 flex-shrink-0 bg-surface-container-low border-l border-outline-variant flex flex-col overflow-hidden">
            <div className="flex border-b border-outline-variant flex-shrink-0">
              {currentTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "text-primary border-b-2 border-primary"
                        : "text-on-surface-variant hover:text-on-surface",
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
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={handleSubmitAssignedTask}
      />
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

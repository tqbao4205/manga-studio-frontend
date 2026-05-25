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
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  RotateCcw,
  X,
  Send,
  Pen,
  Highlighter,
  Type,
} from "lucide-react";
import { useChapterDetail } from "../../shared/hooks/useMockData";
import { useWorkspaceStore } from "../../app/stores/workspaceStore";
import { useSeriesStore } from "../../app/stores/seriesStore";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import { WorkspaceCanvas } from "../../shared/components/workspace/WorkspaceCanvas";
import { RegionPanel } from "../../shared/components/workspace/RegionPanel";
import { LayerPanel } from "../../shared/components/workspace/LayerPanel";
import { TaskPanel } from "../../shared/components/workspace/TaskPanel";
import { CommentPanel } from "../../shared/components/workspace/CommentPanel";
import { NewPageDialog } from "../../shared/components/workspace/NewPageDialog";
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

/* Tools cho MANGAKA/ASSISTANT workspace */
const toolDefs = [
  {
    id: "select",
    icon: MousePointer2,
    label: "Select (V)",
    roles: ["MANGAKA"],
  },
  { id: "draw", icon: Square, label: "Draw (R)", roles: ["MANGAKA"] },
  {
    id: "comment",
    icon: MessageSquare,
    label: "Comment (C)",
    roles: ["MANGAKA", "ASSISTANT"],
  },
  { id: "hand", icon: Hand, label: "Pan (H)", roles: ["MANGAKA", "ASSISTANT"] },
];

/* Tools cho review mode (TANTOU_EDITOR / EDITORIAL_BOARD) */
const reviewTools = [
  { id: "select", icon: MousePointer2, label: "Select (S)" },
  { id: "comment", icon: MessageSquare, label: "Comment (C)" },
  { id: "pen", icon: Pen, label: "Pen (P)" },
  { id: "highlight", icon: Highlighter, label: "Highlight (H)" },
  { id: "text-annotation", icon: Type, label: "Text (T)" },
  { id: "hand", icon: Hand, label: "Pan (V)" },
];

export function WorkspacePage() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = Number(chapterId);
  const isReviewMode = location.pathname.startsWith("/review/");

  const currentPageId = useWorkspaceStore((s) => s.currentPageId);
  const pages = useWorkspaceStore((s) => s.pages);
  const zoom = useWorkspaceStore((s) => s.zoom);
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const loadChapter = useWorkspaceStore((s) => s.loadChapter);
  const loadPage = useWorkspaceStore((s) => s.loadPage);
  const mode = useWorkspaceStore((s) => s.mode);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const addPage = useWorkspaceStore((s) => s.addPage);
  const reset = useWorkspaceStore((s) => s.reset);

  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const updateChapterStatus = useSeriesStore((s) => s.updateChapterStatus);
  const chapters = useSeriesStore((s) => s.chapters);

  const [newPageOpen, setNewPageOpen] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(!isReviewMode);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [layerExpanded, setLayerExpanded] = useState(true);

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
        case "s":
          if (isReviewMode) setMode("select");
          else if (isMangaka) setMode("select");
          break;
        case "v":
          if (isReviewMode) setMode("hand");
          else if (isMangaka) setMode("select");
          break;
        case "r":
          if (!isReviewMode && isMangaka) setMode("draw");
          break;
        case "c":
          setMode("comment");
          break;
        case "h":
          if (isReviewMode) setMode("highlight");
          else setMode("hand");
          break;
        case "p":
          if (isReviewMode) setMode("pen");
          break;
        case "t":
          if (isReviewMode) setMode("text-annotation");
          break;
        case "0":
          setZoom(1);
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setMode, setZoom, isReviewMode, prevPage, nextPage, loadPage]);

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

  const leftPanelBtn = (
    <button
      onClick={() => setShowLeftPanel(!showLeftPanel)}
      className={cn(
        "p-1.5 transition-colors",
        showLeftPanel
          ? "text-workspace-accent"
          : "text-workspace-text-secondary hover:text-workspace-text",
      )}
      title={showLeftPanel ? "Hide sidebar" : "Show sidebar"}
    >
      {showLeftPanel ? (
        <PanelLeftClose size={16} />
      ) : (
        <PanelLeftOpen size={16} />
      )}
    </button>
  );

  const rightPanelBtn = (
    <button
      onClick={() => setShowRightPanel(!showRightPanel)}
      className={cn(
        "p-1.5 transition-colors",
        showRightPanel
          ? "text-workspace-accent"
          : "text-workspace-text-secondary hover:text-workspace-text",
      )}
      title={showRightPanel ? "Hide panel" : "Show panel"}
    >
      {showRightPanel ? (
        <PanelRightClose size={16} />
      ) : (
        <PanelRightOpen size={16} />
      )}
    </button>
  );

  return (
    <div className="h-screen bg-workspace-bg flex flex-col overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="relative flex-shrink-0">
        <div className="flex items-center justify-between h-11 px-3 bg-workspace-surface border-b border-workspace-border gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() =>
                navigate(
                  isReviewMode ? "/review" : `/series/${chapter.seriesId}`,
                )
              }
              className="flex items-center gap-1 text-xs text-workspace-text-secondary hover:text-workspace-text transition-colors whitespace-nowrap"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-px h-4 bg-workspace-border" />
            <span className="text-xs font-medium text-workspace-text truncate max-w-[160px]">
              {isReviewMode ? "Review: " : ""}Ch.{chapter.chapterNumber}
              {chapter.title ? ` — ${chapter.title}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={!prevPage}
                onClick={() => prevPage && loadPage(prevPage.id)}
                className="p-1 rounded text-workspace-text-secondary/70 hover:text-workspace-text hover:bg-workspace-bg/50 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setShowPagePicker(!showPagePicker)}
                className={cn(
                  "text-xs tabular-nums whitespace-nowrap transition-colors font-medium",
                  showPagePicker
                    ? "text-workspace-accent"
                    : "text-workspace-text-secondary/80 hover:text-workspace-text",
                )}
              >
                {currentPageId
                  ? `${currentIdx + 1}/${pages.length}p`
                  : `${pages.length}p`}
              </button>
              <button
                disabled={!nextPage}
                onClick={() => nextPage && loadPage(nextPage.id)}
                className="p-1 rounded text-workspace-text-secondary/70 hover:text-workspace-text hover:bg-workspace-bg/50 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <StatusBadge status={chapterStatus} size="sm" />
            {!isReviewMode && isMangaka && (
              <button
                onClick={() => setNewPageOpen(true)}
                className="p-1.5 text-workspace-text-secondary hover:text-workspace-text transition-colors"
                title="Import page"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Toolbar + Zoom + Reviewer actions */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-workspace-bg border border-workspace-border rounded">
              {currentTools.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMode(t.id)}
                    disabled={currentPageId === null}
                    className={cn(
                      "p-2 transition-colors disabled:opacity-30 first:rounded-l last:rounded-r",
                      mode === t.id
                        ? "bg-workspace-accent text-white"
                        : "text-workspace-text-secondary hover:text-workspace-text hover:bg-workspace-surface",
                    )}
                    title={t.label}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
            <div className="w-px h-4 bg-workspace-border" />
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className="p-1.5 text-workspace-text-secondary hover:text-workspace-text"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-workspace-text-secondary tabular-nums w-8 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(4, zoom + 0.25))}
              className="p-1.5 text-workspace-text-secondary hover:text-workspace-text"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 text-workspace-text-secondary hover:text-workspace-text"
              title="Fit to screen"
            >
              <Maximize size={16} />
            </button>
            <div className="w-px h-4 bg-workspace-border" />

            {/* Review mode actions */}
            {isReviewMode && chapter && (
              <>
                {isMangaka && (
                  <span className="text-xs text-workspace-text-secondary/60">
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
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-success border border-status-success/30 hover:bg-status-success/5"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-warning border border-status-warning/30 hover:bg-status-warning/5"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-danger border border-status-danger/30 hover:bg-status-danger/5"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                      <div className="w-px h-4 bg-workspace-border" />
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-success border border-status-success/30 hover:bg-status-success/5"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-status-danger border border-status-danger/30 hover:bg-status-danger/5"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                    <div className="w-px h-4 bg-workspace-border" />
                  </>
                )}
              </>
            )}

            {!isReviewMode && isMangaka && leftPanelBtn}
            {rightPanelBtn}
          </div>
        </div>

        {/* Page picker dropdown (chỉ workspace mode) */}
        {showPagePicker && !isReviewMode && (
          <div className="absolute top-full left-0 right-0 z-50 bg-workspace-surface border-b border-workspace-border shadow-lg">
            <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto">
              {isMangaka && (
                <button
                  onClick={() => {
                    setNewPageOpen(true);
                    setShowPagePicker(false);
                  }}
                  className="flex-shrink-0 w-8 aspect-[3/4] border border-dashed border-workspace-border/40 flex items-center justify-center text-workspace-text-secondary/40 hover:text-workspace-text hover:border-workspace-accent/60 transition-all rounded"
                  title="Add page"
                >
                  <Plus size={10} />
                </button>
              )}
              {pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    loadPage(p.id);
                    setShowPagePicker(false);
                  }}
                  className={cn(
                    "flex-shrink-0 w-8 aspect-[3/4] flex flex-col items-center justify-center border rounded text-[8px] font-medium transition-all",
                    p.id === currentPageId
                      ? "border-workspace-accent bg-workspace-accent/10 text-workspace-accent"
                      : "border-workspace-border/30 text-workspace-text-secondary/60 hover:border-workspace-border/60 hover:text-workspace-text",
                  )}
                >
                  {p.originalImageUrl ? (
                    <img
                      src={p.originalImageUrl}
                      alt=""
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <>
                      <ImageIcon size={8} className="mb-px" />
                      <span>{p.pageNumber}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Layers (MANGAKA only, workspace mode) */}
        {showLeftPanel && !isReviewMode && isMangaka && (
          <div className="w-64 flex-shrink-0 bg-workspace-surface border-r border-workspace-border flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <button
                onClick={() => setLayerExpanded(!layerExpanded)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-workspace-text-secondary hover:text-workspace-text transition-colors flex-shrink-0"
              >
                Layers{" "}
                <span className="text-[9px] font-normal text-workspace-text-secondary/40 ml-auto">
                  {layers.length}
                </span>
              </button>
              {layerExpanded && (
                <div className="flex-1 overflow-y-auto scrollbar-thin px-1 pb-1">
                  <LayerPanel />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-workspace-canvas-bg min-w-0">
          {currentPageId ? (
            <WorkspaceCanvas />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-workspace-text-secondary/60">
                Select a page
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        {showRightPanel && (
          <div className="w-64 flex-shrink-0 bg-workspace-surface border-l border-workspace-border flex flex-col overflow-hidden">
            <div className="flex border-b border-workspace-border flex-shrink-0">
              {currentTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors relative",
                      activeTab === tab.id
                        ? "text-workspace-text"
                        : "text-workspace-text-secondary hover:text-workspace-text",
                    )}
                  >
                    <Icon size={11} />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-workspace-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </div>
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
    </div>
  );
}

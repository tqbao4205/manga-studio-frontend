/*
  ==========================================================
  PAGE: DashboardPage
  ROUTE: /dashboard
  MỤC ĐÍCH: Trang tổng quan chính của ứng dụng. Dựa vào role
  của user (MANGAKA, ASSISTANT, TANTOU_EDITOR, EDITORIAL_BOARD)
  để render các dashboard khác nhau.
  QUYỀN TRUY CẬP: Tất cả user đã đăng nhập.
  ==========================================================
*/

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Plus,
  MessageSquare,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  ListTodo,
  FileText as FileTextIcon,
  ThumbsUp,
  ThumbsDown,
  Siren as SirenIcon,
} from "lucide-react";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import {
  useDashboardStats,
  useActivities,
  useSeriesList,
  useTasks,
  useSchedules,
} from "../../shared/hooks/useMockData";
import { useSeriesStore } from "../../app/stores/seriesStore";
import { useRankingStore } from "../../app/stores/rankingStore";
import { useScheduleStore } from "../../app/stores/scheduleStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Avatar } from "../../shared/components/ui/avatar";
import { Button } from "../../shared/components/ui/button";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { PageLoading } from "../../shared/components/shared/LoadingSpinner";
import { Dialog } from "../../shared/components/ui/dialog";
import { formatRelativeTime, cn, getRankColor } from "../../shared/utils";
import {
  mockRegions,
  mockPages,
  mockChapters,
} from "../../shared/constants/mock-data";

/* ========== Định nghĩa các actions nhanh theo role ========== */
const quickActions = [
  {
    label: "Review Submissions",
    icon: MessageSquare,
    path: "/tasks",
    roles: ["MANGAKA"],
  },
  { label: "New Chapter", icon: Plus, path: "/series", roles: ["MANGAKA"] },
  { label: "My Tasks", icon: ListTodo, path: "/tasks", roles: ["ASSISTANT"] },
  { label: "View Series", icon: BookOpen, path: "/series", roles: ["ALL"] },
  {
    label: "Check Rankings",
    icon: TrendingUp,
    path: "/rankings",
    roles: ["ALL"],
  },
];

/* ========== Component StatCard hiển thị thẻ thống kê ========== */
function StatCard({ label, value, trend, icon: Icon, variant = "default" }) {
  return (
    <Card
      className={cn(
        "group",
        variant === "warning" && "border-b-status-warning",
        variant === "danger" && "border-b-status-danger",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                variant === "warning"
                  ? "text-status-warning"
                  : variant === "danger"
                    ? "text-status-danger"
                    : "text-on-surface",
              )}
            >
              {value}
            </p>
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  trend.up ? "text-status-success" : "text-status-danger",
                )}
              >
                {trend.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "p-3",
              variant === "default"
                ? "bg-primary/5"
                : variant === "warning"
                  ? "bg-status-warning/10"
                  : "bg-status-danger/10",
            )}
          >
            <Icon
              size={22}
              className={cn(
                variant === "default"
                  ? "text-primary"
                  : variant === "warning"
                    ? "text-status-warning"
                    : "text-status-danger",
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========== QuickActions: Menu shortcuts theo role ========== */
function QuickActions() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {quickActions
          .filter((a) => a.roles.includes("ALL") || a.roles.includes(user.role))
          .map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2.5 px-3 py-2 w-full text-sm text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02] transition-all"
            >
              <action.icon size={16} className="flex-shrink-0" />
              <span className="flex-1 text-left">{action.label}</span>
              <ChevronRight size={14} className="text-on-surface-variant/30" />
            </button>
          ))}
      </CardContent>
    </Card>
  );
}

/*
  ==========================================================
  MangakaDashboard: Dashboard dành cho MANGAKA
  - Xem danh sách series của mình
  - Xem các task cần review (submissions từ assistant)
  - Thống kê số series active, chờ review, rank hiện tại
  - Approve/Revise submissions qua Dialog
  ==========================================================
*/
function MangakaDashboard() {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(1);
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const seriesList = useSeriesStore((s) => s.seriesList);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");

  if (statsLoading || activitiesLoading || tasksLoading) return <PageLoading />;

  /* Filter dữ liệu cần thiết */
  const submittedTasks = (tasksData || []).filter(
    (t) => t.status === "SUBMITTED",
  );
  const mySeries = seriesList.filter(
    (s) => s.mangaka.displayName === user?.displayName,
  );
  const pendingTantouSeries = mySeries.filter(
    (s) => s.status === "PENDING_TANTOU_REVIEW",
  );
  const pendingApprovalSeries = mySeries.filter(
    (s) => s.status === "PENDING_APPROVAL",
  );
  const ongoingSeries = mySeries.filter((s) => s.status === "ONGOING");

  const handleApprove = () => {
    if (!reviewTarget) return;
    addToast({
      type: "success",
      title: "Approved",
      message: `Region #${reviewTarget.task.regionId} by ${reviewTarget.task.assistant.displayName} approved.`,
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

  return (
    <div className="space-y-6">
      {/* Hàng thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Series"
          value={ongoingSeries.length}
          icon={BookOpen}
        />
        <StatCard
          label="Awaiting Review"
          value={pendingTantouSeries.length + pendingApprovalSeries.length}
          icon={FileTextIcon}
          variant={
            pendingTantouSeries.length + pendingApprovalSeries.length > 0
              ? "warning"
              : "default"
          }
        />
        <StatCard
          label="Tasks to Review"
          value={submittedTasks.length}
          icon={Clock}
          variant={submittedTasks.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Current Rank"
          value={`#${stats?.currentRank || "-"}`}
          icon={TrendingUp}
          trend={{ value: "From last period", up: stats?.rankTrend === "UP" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Danh sách submissions chờ duyệt */}
          {submittedTasks.length > 0 && (
            <Card className="border-b-status-warning">
              <CardHeader>
                <CardTitle>
                  Pending Submissions ({submittedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submittedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 border border-border-light/30 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-xs font-bold text-accent-purple flex-shrink-0">
                        {task.assistant.displayName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {task.assistant.displayName}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Region #{task.regionId} · Due{" "}
                          {task.deadline || "No deadline"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        className="text-status-success border-status-success/30 bg-transparent hover:bg-status-success/5"
                        onClick={() =>
                          setReviewTarget({ task, action: "approve" })
                        }
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-status-warning border-status-warning/30 hover:bg-status-warning/5"
                        onClick={() =>
                          setReviewTarget({ task, action: "revise" })
                        }
                      >
                        <RotateCcw size={14} /> Revise
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Series và hoạt động gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>My Series ({mySeries.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {mySeries.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">
                    No series yet
                  </p>
                ) : (
                  mySeries.map((s) => (
                    <Link
                      key={s.id}
                      to={`/series/${s.id}`}
                      className="flex items-center gap-3 p-2.5 border border-transparent hover:border-border-light/60 hover:bg-black/[0.02] transition-all group"
                    >
                      <div
                        className="w-10 h-14 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.coverColor }}
                      >
                        {s.title
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={s.status} size="sm" />
                          {s.currentTier && (
                            <span
                              className="text-xs font-bold"
                              style={{ color: getRankColor(s.currentTier) }}
                            >
                              #{s.currentRank} · Tier {s.currentTier}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {activities.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-6">
                      No recent activity
                    </p>
                  ) : (
                    activities.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 py-3 border-b border-border-light/30 last:border-0"
                      >
                        <Avatar name={a.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-on-surface">{a.message}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {formatRelativeTime(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog xác nhận Approve */}
      {reviewTarget?.action === "approve" && (
        <Dialog
          open={true}
          onClose={() => setReviewTarget(null)}
          title="Approve Task"
          description={`Approve Region #${reviewTarget.task.regionId} by ${reviewTarget.task.assistant.displayName}?`}
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
          description={`Notes for ${reviewTarget.task.assistant.displayName}`}
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

/*
  Helper: Tra ngược từ regionId → pageId → chapterId
  Dùng trong AssistantDashboard để biết task thuộc chapter/series nào.
*/
function getTaskChapterId(regionId) {
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

function getTaskSeriesInfo(regionId) {
  const chId = getTaskChapterId(regionId);
  if (!chId) return null;
  const allChs = Object.values(mockChapters).flat();
  const ch = allChs.find((c) => c.id === chId);
  if (!ch) return null;
  return {
    chapterId: chId,
    chapterNumber: ch.chapterNumber,
    chapterTitle: ch.title,
    seriesId: ch.seriesId,
  };
}

/*
  ==========================================================
  AssistantDashboard: Dashboard dành cho ASSISTANT
  - Xem các task được giao và trạng thái
  - Xem series mình đang làm việc (thông qua task regionId)
  - Click vào task để vào Workspace
  ==========================================================
*/
function AssistantDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const seriesList = useSeriesStore((s) => s.seriesList);

  if (tasksLoading) return <PageLoading />;

  const myTasks = (tasksData || []).filter((t) => t.assistant.id === user?.id);

  /* Tìm các series có liên quan đến task của assistant */
  const taskSeriesIds = new Set();
  myTasks.forEach((t) => {
    const info = getTaskSeriesInfo(t.regionId);
    if (info) taskSeriesIds.add(info.seriesId);
  });
  const mySeries = seriesList.filter((s) => taskSeriesIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Tasks" value={myTasks.length} icon={ListTodo} />
        <StatCard
          label="In Progress"
          value={myTasks.filter((t) => t.status === "IN_PROGRESS").length}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Pending"
          value={myTasks.filter((t) => t.status === "PENDING").length}
          icon={AlertCircle}
        />
        <StatCard
          label="Approved"
          value={myTasks.filter((t) => t.status === "APPROVED").length}
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QuickActions />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>My Series ({mySeries.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {mySeries.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">
                  No series
                </p>
              ) : (
                mySeries.map((s) => (
                  <Link
                    key={s.id}
                    to={`/series/${s.id}`}
                    className="flex items-center gap-2.5 p-2 border border-transparent hover:border-border-light/60 hover:bg-black/[0.02] transition-all group"
                  >
                    <div
                      className="w-8 h-11 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ background: s.coverColor }}
                    >
                      {s.title
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                        {s.title}
                      </p>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-6">
                No tasks assigned to you yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => {
                  const info = getTaskSeriesInfo(task.regionId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border-b border-border-light/30 last:border-0 hover:bg-black/[0.02] transition-colors cursor-pointer"
                      onClick={() =>
                        info ? navigate(`/workspace/${info.chapterId}`) : null
                      }
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-xs font-bold text-accent-purple flex-shrink-0">
                          {info ? `Ch.${info.chapterNumber}` : "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-on-surface-variant truncate">
                            {info
                              ? `${info.chapterTitle || `Chapter ${info.chapterNumber}`}`
                              : `Region #${task.regionId}`}
                            {task.deadline ? ` · Due ${task.deadline}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={task.status} size="sm" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/*
  ==========================================================
  EditorDashboard: Dashboard dành cho TANTOU_EDITOR
  - Xem các series được phân công (assignedSeries)
  - Xem danh sách series chờ review manuscript (PENDING_TANTOU_REVIEW)
  - Có thể vào SeriesDetail để review
  ==========================================================
*/
function EditorDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(user?.id);
  const { data: seriesData, isLoading: seriesLoading } = useSeriesList();
  const seriesList = useSeriesStore((s) => s.seriesList);
  if (statsLoading || seriesLoading) return <PageLoading />;

  const assignedSeries =
    seriesData?.content?.filter(
      (s) => s.tantouEditor?.displayName === user?.displayName,
    ) || [];
  const pendingReviewSeries = seriesList.filter(
    (s) => s.status === "PENDING_TANTOU_REVIEW",
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Assigned Series"
          value={assignedSeries.length}
          icon={BookOpen}
        />
        <StatCard
          label="Series Pending Review"
          value={pendingReviewSeries.length}
          icon={FileTextIcon}
          variant={pendingReviewSeries.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pending Comments"
          value={stats?.pendingComments || 0}
          icon={AlertCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        <div className="lg:col-span-3 space-y-4">
          {pendingReviewSeries.length > 0 && (
            <Card className="border-b-status-warning">
              <CardHeader>
                <CardTitle>
                  Series Pending Manuscript Review ({pendingReviewSeries.length}
                  )
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingReviewSeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 border border-border-light/30 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.coverColor }}
                      >
                        {s.title
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {s.title}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {s.mangaka.displayName} · {s.genre}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/series/${s.id}`)}
                    >
                      <FileTextIcon size={14} /> Review Manuscript
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Assigned Series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignedSeries.length === 0 &&
                pendingReviewSeries.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-6">
                    No series assigned to you.
                  </p>
                ) : (
                  [
                    ...assignedSeries,
                    ...pendingReviewSeries.filter(
                      (s) => !assignedSeries.find((a) => a.id === s.id),
                    ),
                  ].map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 border-b border-border-light/30 last:border-0 hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: s.coverColor }}
                        >
                          {s.title
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {s.title}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {s.chapterCount} chapters
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/series/${s.id}`)}
                      >
                        View Series
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/*
  ==========================================================
  EditorialBoardDashboard: Dashboard dành cho EDITORIAL_BOARD
  - Xem tổng quan series, pending reviews, votes, at-risk series
  - Approve/Reject series chờ vote
  - Quản lý at-risk series (mark at risk, restore, cancel)
  - Xem lịch xuất bản sắp tới
  ==========================================================
*/
function EditorialBoardDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateSeries = useSeriesStore((s) => s.updateSeries);
  const addToast = useUIStore((s) => s.addToast);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(user?.id);
  const { data: seriesData } = useSeriesList();
  const { data: schedules } = useSchedules();
  const seriesList = useSeriesStore((s) => s.seriesList);
  const rankings = useRankingStore((s) => s.rankings);
  const schedulesList = useScheduleStore((s) => s.schedules);

  if (statsLoading) return <PageLoading />;

  const pendingTantouSeries = seriesList.filter(
    (s) => s.status === "PENDING_TANTOU_REVIEW",
  );
  const pendingApprovalSeries = seriesList.filter(
    (s) => s.status === "PENDING_APPROVAL",
  );
  const upcomingSchedules =
    (schedules || schedulesList).filter((s) => s.status === "SCHEDULED") || [];
  const series = seriesData?.content || [];
  const atRisk = seriesList.filter((s) => {
    const rank = rankings.find((r) => r.seriesId === s.id);
    return (
      s.status === "AT_RISK" ||
      (rank &&
        (rank.tier === "C" || rank.tier === "D") &&
        s.status === "ONGOING")
    );
  });

  const handleApprove = (id, title) => {
    updateSeries(id, {
      status: "ONGOING",
      tantouEditor: { id: user.id, displayName: user.displayName },
    });
    addToast({
      type: "success",
      title: "Series approved",
      message: `"${title}" has been approved and announced for publication.`,
    });
  };

  const handleReject = (id, title) => {
    updateSeries(id, { status: "REJECTED" });
    addToast({
      type: "success",
      title: "Series rejected",
      message: `"${title}" has been rejected.`,
    });
  };

  const handleCancel = (id, title) => {
    updateSeries(id, { status: "CANCELLED" });
    addToast({
      type: "success",
      title: "Series cancelled",
      message: `"${title}" has been cancelled.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Series"
          value={stats?.totalSeries || seriesList.length}
          icon={BookOpen}
        />
        <StatCard
          label="Pending Tantou Review"
          value={pendingTantouSeries.length}
          icon={FileTextIcon}
          variant={pendingTantouSeries.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pending Board Vote"
          value={pendingApprovalSeries.length}
          icon={ThumbsUp}
          variant={pendingApprovalSeries.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="At-Risk Series"
          value={atRisk.length}
          icon={AlertCircle}
          variant={atRisk.length > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        <div className="lg:col-span-3 space-y-4">
          {pendingTantouSeries.length > 0 && (
            <Card className="border-b-status-warning">
              <CardHeader>
                <CardTitle>
                  Series Awaiting Tantou Review ({pendingTantouSeries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingTantouSeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 border border-border-light/30 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.coverColor }}
                      >
                        {s.title
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {s.title}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {s.mangaka.displayName} · {s.genre}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/series/${s.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingApprovalSeries.length > 0 && (
            <Card className="border-b-status-warning">
              <CardHeader>
                <CardTitle>
                  Pending Board Vote ({pendingApprovalSeries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApprovalSeries.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 border border-border-light/30 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.coverColor }}
                      >
                        {s.title
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {s.title}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {s.mangaka.displayName} · {s.genre} ·{" "}
                          {s.targetDemographic}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        className="text-status-success border-status-success/30 bg-transparent hover:bg-status-success/5"
                        onClick={() => handleApprove(s.id, s.title)}
                      >
                        <ThumbsUp size={14} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-status-danger border-status-danger/30 hover:bg-status-danger/5"
                        onClick={() => handleReject(s.id, s.title)}
                      >
                        <ThumbsDown size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {atRisk.length > 0 && (
            <Card className="border-b-status-danger">
              <CardHeader>
                <CardTitle>At-Risk Series ({atRisk.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atRisk.map((s) => {
                  const rank = rankings.find((r) => r.seriesId === s.id);
                  const wl =
                    useRankingStore.getState().warningLevels?.[s.id] || 0;
                  const dp =
                    useRankingStore.getState().dangerPeriods?.[s.id] || 0;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 border border-border-light/30 hover:bg-black/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: s.coverColor }}
                        >
                          {s.title
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate flex items-center gap-1.5">
                            {s.title}
                            {wl >= 3 && (
                              <SirenIcon
                                size={12}
                                className="text-status-danger"
                              />
                            )}
                            {wl === 2 && (
                              <AlertCircle
                                size={12}
                                className="text-status-warning"
                              />
                            )}
                            {wl === 1 && (
                              <AlertTriangle
                                size={12}
                                className="text-status-warning/60"
                              />
                            )}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {s.mangaka.displayName}
                            {rank && (
                              <>
                                {" "}
                                · #{rank.rank} · Tier {rank.tier} ·{" "}
                                {rank.totalVotes.toLocaleString()} votes
                              </>
                            )}
                            {dp > 0 && (
                              <span className="ml-1 text-status-danger">
                                {" "}
                                · {dp} period{dp > 1 ? "s" : ""} in danger
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {s.status === "AT_RISK" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateSeries(s.id, { status: "ONGOING" });
                                addToast({
                                  type: "success",
                                  title: "Series restored",
                                  message: `"${s.title}" restored to ongoing.`,
                                });
                              }}
                            >
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              className="text-status-danger border-status-danger/30 bg-transparent hover:bg-status-danger/5"
                              onClick={() => handleCancel(s.id, s.title)}
                            >
                              <X size={14} /> Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-status-warning border-status-warning/30 hover:bg-status-warning/5"
                            onClick={() => {
                              updateSeries(s.id, { status: "AT_RISK" });
                              addToast({
                                type: "success",
                                title: "Marked at risk",
                                message: `"${s.title}" marked as at-risk.`,
                              });
                            }}
                          >
                            <AlertTriangle size={14} /> Mark At Risk
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Publications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingSchedules.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-on-surface">
                      {s.seriesTitle} — Ch.{s.chapterNumber}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {s.scheduledDate}
                    </span>
                  </div>
                ))}
                {upcomingSchedules.length === 0 && (
                  <p className="text-sm text-on-surface-variant text-center py-4">
                    No upcoming publications
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/*
  ==========================================================
  DashboardPage (export chính)
  - Dựa vào user.role để render dashboard phù hợp
  ==========================================================
*/
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Welcome, {user.displayName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {user.role === "MANGAKA"
              ? "Manage your manga production workflow"
              : user.role === "ASSISTANT"
                ? "Track and complete your assigned tasks"
                : user.role === "TANTOU_EDITOR"
                  ? "Review manuscripts and provide feedback"
                  : user.role === "EDITORIAL_BOARD"
                    ? "Oversee publications, series approvals, and vote"
                    : "Here is your overview"}
          </p>
        </div>
      </div>

      {user.role === "MANGAKA" ? (
        <MangakaDashboard />
      ) : user.role === "ASSISTANT" ? (
        <AssistantDashboard />
      ) : user.role === "EDITORIAL_BOARD" ? (
        <EditorialBoardDashboard />
      ) : (
        <EditorDashboard />
      )}
    </div>
  );
}

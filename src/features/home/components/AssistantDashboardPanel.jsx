/**
 * AssistantDashboardPanel.jsx
 *
 * Dashboard dành cho ASSISTANT:
 *   - Cột trái: Rework Orders — danh sách task bị Mangaka reject (status = REVISE)
 *     API: GET /api/tasks?status=REVISE  (taskService.getAll — EXISTING)
 *     ⚠️ Field `task.revisionNote` cần backend thêm vào TaskResponse
 *
 *   - Cột phải: Earning Statement — bar chart thu nhập từ task đã APPROVED
 *     API: GET /api/v1/dashboard/earnings  (dashboardService.getEarnings — MISSING)
 *     ⚠️ Hiển thị empty state với hướng dẫn khi API chưa sẵn sàng
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ListTodo,
  RotateCcw,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { StatusBadge } from "../../../shared/components/shared/StatusBadge";
import { PageLoading } from "../../../shared/components/shared/LoadingSpinner";
import { cn, formatDate, formatRelativeTime } from "../../../shared/utils";
import taskService from "../../../services/taskService";
import dashboardService from "../../../services/dashboardService";
import { AssistantBiCharts } from "./charts/AssistantBiCharts";

// ─── Custom Tooltip cho Recharts ────────────────────────────────────────────
function EarningsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="bg-surface-container-high border border-outline-variant/50 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      <p className="text-primary">
        {(item?.amount ?? 0).toLocaleString("vi-VN")} ₫
      </p>
      <p className="text-on-surface-variant">
        {item?.taskCount ?? 0} tasks approved
      </p>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, tone = "default" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums mt-1",
                tone === "warning" ? "text-status-warning" : "text-on-surface",
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              "p-2.5 rounded-lg",
              tone === "warning"
                ? "bg-status-warning/10 text-status-warning"
                : "bg-primary/8 text-primary",
            )}
          >
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ReworkOrderItem ─────────────────────────────────────────────────────────
function ReworkOrderItem({ task, onFixNow }) {
  const revisionNote =
    task.revisionNote || task.latestRevisionNote || task.notes || null;

  const seriesLabel = task.seriesTitle || `Series #${task.seriesId ?? "?"}`;
  const chapterLabel =
    task.chapterLabel ||
    (task.chapterId ? `Ch.${task.chapterNumber ?? task.chapterId}` : null);
  const subLabel = [seriesLabel, chapterLabel].filter(Boolean).join(" · ");

  return (
    <div className="group border border-outline-variant/40 rounded-lg p-4 hover:border-status-warning/60 hover:bg-status-warning/[0.02] transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Wrench size={13} className="text-status-warning flex-shrink-0" />
            <h4 className="text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
              {task.title}
            </h4>
          </div>
          <p className="text-xs text-on-surface-variant truncate">{subLabel}</p>
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>

      {/* Mangaka's revision comment */}
      {revisionNote ? (
        <div className="border-l-2 border-status-warning/60 pl-3 py-1 bg-status-warning/[0.03] rounded-r mb-3">
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            <span className="font-medium text-status-warning">Mangaka: </span>"
            {revisionNote}"
          </p>
        </div>
      ) : (
        <div className="border-l-2 border-outline-variant/40 pl-3 py-1 mb-3">
          <p className="text-[11px] text-on-surface-variant/60 italic">
            {/* ⚠️ revisionNote field missing from backend TaskResponse — request: add task.revisionNote (from latest REVISION_REQUIRED submission note) */}
            No revision comment available
          </p>
        </div>
      )}

      {/* Due date + CTA */}
      <div className="flex items-center justify-between">
        {task.dueDate ? (
          <p className="text-[11px] text-on-surface-variant">
            Due {formatDate(task.dueDate)}
          </p>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-primary-container text-on-primary-container hover:brightness-110"
          onClick={() => onFixNow(task)}
        >
          Fix Now <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// ─── EarningsChart ────────────────────────────────────────────────────────────
function EarningsChart({ data, isLoading, error }) {
  const currentWeekIndex = data ? data.length - 1 : -1;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[200px]">
        <div className="text-xs text-on-surface-variant animate-pulse">
          Loading earnings…
        </div>
      </div>
    );
  }

  // ⚠️ API not yet implemented — show informative empty state
  if (error || !data || data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] gap-2">
        <BarChart3 size={32} className="text-outline-variant" />
        <p className="text-xs text-on-surface-variant text-center">
          Earnings data not available
        </p>
        <p className="text-[10px] text-on-surface-variant/50 text-center max-w-[200px]">
          ⚠️ Waiting for backend:{" "}
          <code className="text-primary/70">
            GET /api/v1/dashboard/earnings
          </code>
        </p>
      </div>
    );
  }

  const totalAmount = data.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const totalTasks = data.reduce((sum, d) => sum + (d.taskCount ?? 0), 0);

  return (
    <>
      {/* Summary row */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-accent-gold tabular-nums">
            {totalAmount.toLocaleString("vi-VN")} ₫
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {totalTasks} tasks approved this month
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-status-success">
          <TrendingUp size={13} />
          <span>This month</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fontSize: 11,
                fill: "var(--color-on-surface-variant, #8b8b9e)",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--color-on-surface-variant, #8b8b9e)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
              width={36}
            />
            <Tooltip
              content={<EarningsTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === currentWeekIndex
                      ? "#7c3aed" // primary-container — highlight current period
                      : "rgba(210,187,255,0.25)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AssistantDashboardPanel() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  // ── Rework Orders: GET /api/tasks?status=REVISE ─────────────────────────
  const {
    data: reworkTasksRaw,
    isLoading: reworkLoading,
    error: reworkError,
  } = useQuery({
    queryKey: ["dashboard", "rework-orders", user?.id],
    queryFn: async () => {
      const res = await taskService.getAll({ status: "REVISE", size: 50 });
      const items = Array.isArray(res)
        ? res
        : Array.isArray(res?.content)
          ? res.content
          : [];
      // Filter to only tasks assigned to current user
      return items.filter(
        (t) => t.assistantId === user?.id || t.assistant?.id === user?.id,
      );
    },
    enabled: !!user,
  });

  // ── Stats summary: GET /api/tasks (all statuses) ────────────────────────
  const { data: allTasksRaw, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "assistant-tasks", user?.id],
    queryFn: async () => {
      const res = await taskService.getAll({ size: 200 });
      const items = Array.isArray(res)
        ? res
        : Array.isArray(res?.content)
          ? res.content
          : [];
      return items.filter(
        (t) => t.assistantId === user?.id || t.assistant?.id === user?.id,
      );
    },
    enabled: !!user,
  });

  // ── Earnings: GET /api/v1/dashboard/earnings ───────────────────────────
  // ⚠️ MISSING API — will show empty state if endpoint not available
  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError,
  } = useQuery({
    queryKey: ["dashboard", "earnings", user?.id],
    queryFn: () => dashboardService.getEarnings({ groupBy: "week" }),
    enabled: !!user,
    retry: false, // don't retry — API might genuinely be missing
  });

  if (reworkLoading || statsLoading) return <PageLoading />;

  const reworkTasks = reworkTasksRaw ?? [];
  const allTasks = allTasksRaw ?? [];

  const statCounts = {
    total: allTasks.length,
    inProgress: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
    todo: allTasks.filter((t) => t.status === "TODO").length,
    done: allTasks.filter((t) => t.status === "DONE").length,
  };

  const handleFixNow = (task) => {
    if (task.chapterId) {
      navigate(`/workspace/${task.chapterId}`);
    } else {
      navigate("/tasks");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Stat Summary Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Tasks" value={statCounts.total} icon={ListTodo} />
        <StatCard
          label="In Progress"
          value={statCounts.inProgress}
          icon={Clock}
          tone={statCounts.inProgress > 0 ? "warning" : "default"}
        />
        <StatCard label="Todo" value={statCounts.todo} icon={AlertCircle} />
        <StatCard label="Done" value={statCounts.done} icon={CheckCircle2} />
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══ LEFT COLUMN: Rework Orders ══ */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw size={16} className="text-status-danger" />
                  <CardTitle>Rework Orders</CardTitle>
                </div>
                {reworkTasks.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-status-danger/30 text-status-danger bg-status-danger/5">
                    {reworkTasks.length} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Tasks returned by Mangaka requiring revision
              </p>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
              {reworkError && (
                <div className="text-xs text-status-danger text-center py-8">
                  Failed to load rework orders. Please try again.
                </div>
              )}

              {!reworkError && reworkTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <CheckCircle2
                    size={32}
                    className="text-status-success opacity-60"
                  />
                  <p className="text-sm text-on-surface-variant">
                    No pending rework orders 🎉
                  </p>
                  <p className="text-xs text-on-surface-variant/60">
                    All tasks are on track
                  </p>
                </div>
              )}

              {reworkTasks.map((task) => (
                <ReworkOrderItem
                  key={task.id}
                  task={task}
                  onFixNow={handleFixNow}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ══ RIGHT COLUMN: Earning Statement ══ */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-accent-gold" />
                  <CardTitle>Earning Statement</CardTitle>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Earnings from approved tasks (current month)
              </p>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <EarningsChart
                data={
                  Array.isArray(earningsData)
                    ? earningsData
                    : (earningsData?.data ?? null)
                }
                isLoading={earningsLoading}
                error={earningsError}
              />

              {/* Payout info — only if earnings available */}
              {earningsData && !earningsError && (
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <p className="text-xs text-on-surface-variant">
                    Next payout:{" "}
                    <span className="text-on-surface font-medium">
                      1st of next month
                    </span>
                  </p>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => navigate("/tasks")}
                  >
                    View all tasks →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── BI Analytics Section ── */}
      <AssistantBiCharts allTasks={allTasks} />
    </div>
  );
}

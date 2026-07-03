/**
 * AssistantBiCharts.jsx — BI Analytics Charts for ASSISTANT dashboard
 *
 * Charts:
 *  1. Task Type Breakdown Donut   — REAL  (derived from task.regionType)
 *  2. Quality Score Bar           — REAL  (derived from task statuses per series)
 *  3. Weekly Throughput Line      — ⚠️ MOCK — needs backend:
 *       GET /api/v1/dashboard/task-history?groupBy=week
 *       Response: [{ week: 'W-3', completed: 8, submitted: 10, period: '2026-W24' }]
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart2, Target, TrendingUp, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../../shared/components/ui/card";
import { cn } from "../../../../shared/utils";

// ── Chart palette ─────────────────────────────────────────────────────────────
const C = {
  primary: "#a078ff",
  gold: "#ffb869",
  success: "#4ade80",
  danger: "#f87171",
  blue: "#60a5fa",
  muted: "#6b7280",
  pink: "#f472b6",
  teal: "#2dd4bf",
  grid: "rgba(255,255,255,0.05)",
  tick: "#6b7280",
};

// Region type → human-readable label
const REGION_TYPE_LABELS = {
  BACKGROUND: "Background",
  CHARACTER: "Character",
  EFFECTS: "Effects",
  TEXT: "Text",
  TONES: "Tones",
  INKING: "Inking",
  OTHER: "Other",
};

const REGION_TYPE_COLORS = [
  C.primary,
  C.gold,
  C.success,
  C.blue,
  C.pink,
  C.teal,
  C.muted,
];

// ⚠️ MOCK DATA — Replace when backend implements:
//   GET /api/v1/dashboard/task-history?groupBy=week
//   Response: [{ week: 'W-3', completed: 8, submitted: 10, period: '2026-W24' }]
//   Backend note: compute from task.updatedAt WHERE status changed to APPROVED within the week bucket.
const MOCK_WEEKLY_THROUGHPUT = [
  { week: "W-3", Completed: 8, Submitted: 10 },
  { week: "W-2", Completed: 12, Submitted: 14 },
  { week: "W-1", Completed: 10, Submitted: 11 },
  { week: "This week", Completed: 5, Submitted: 7 },
];

// Sample data for empty-state visualization:
const MOCK_TASK_TYPE_DATA = [
  { name: "Background", value: 18, color: C.primary },
  { name: "Character", value: 15, color: C.gold },
  { name: "Effects", value: 8, color: C.success },
  { name: "Text", value: 5, color: C.blue },
  { name: "Tones", value: 4, color: C.pink },
];
const MOCK_QUALITY_DATA = [
  { name: "Black Thorn", Approved: 8, Revise: 2, rate: 80 },
  { name: "Neon Legacy", Approved: 6, Revise: 1, rate: 86 },
  { name: "Studio Chron", Approved: 4, Revise: 3, rate: 57 },
];

function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded border border-[#a078ff]/30 bg-[#a078ff]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a078ff]/70">
      Sample
    </span>
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-outline-variant/25" />
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/55 select-none">
        <BarChart2 size={11} className="text-primary" />
        Analytics &amp; Insights
      </p>
      <div className="h-px flex-1 bg-outline-variant/25" />
    </div>
  );
}

function SkeletonBox({ height = "h-[180px]" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-container-high/40",
        height,
      )}
    />
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  iconClass = "text-primary",
  badge,
  children,
  className,
}) {
  return (
    <Card
      className={cn(
        "border-outline-variant/30 bg-surface-container-low/40",
        className,
      )}
    >
      <CardHeader className="border-b border-outline-variant/20 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              <Icon size={13} className={iconClass} />
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-on-surface-variant/55 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-5">{children}</CardContent>
    </Card>
  );
}

function MockBadge() {
  return (
    <span className="shrink-0 rounded border border-[#ffb869]/40 bg-[#ffb869]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ffb869]">
      Mock
    </span>
  );
}

function EmptyChart({ label, height = "h-[160px]" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-on-surface-variant",
        height,
      )}
    >
      {label}
    </div>
  );
}

// ── 1. Task Type Breakdown Donut ──────────────────────────────────────────────
function TaskTypeDonut({ allTasks }) {
  const usingSample = allTasks.length === 0;
  const data = useMemo(() => {
    if (usingSample) return MOCK_TASK_TYPE_DATA;
    const m = {};
    allTasks.forEach((t) => {
      const type = t.regionType || "OTHER";
      m[type] = (m[type] || 0) + 1;
    });
    return Object.entries(m)
      .map(([type, count], i) => ({
        name: REGION_TYPE_LABELS[type] || type,
        value: count,
        color: REGION_TYPE_COLORS[i % REGION_TYPE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [allTasks, usingSample]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      <div className="flex items-center gap-5">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-on-surface">{d.name}</p>
                      <p style={{ color: d.color }}>
                        {d.value} tasks (
                        {total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-xs text-on-surface-variant truncate">
                  {d.name}
                </span>
              </div>
              <span className="text-xs font-semibold text-on-surface tabular-nums">
                {d.value}
              </span>
            </div>
          ))}
          <div className="pt-1.5 border-t border-outline-variant/20 flex justify-between">
            <span className="text-xs text-on-surface-variant">Total</span>
            <span className="text-sm font-bold text-on-surface">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Quality Score — Approval rate per series ───────────────────────────────
function QualityScoreChart({ allTasks }) {
  const data = useMemo(() => {
    const bySeries = {};
    allTasks.forEach((t) => {
      const name =
        t.seriesTitle || (t.seriesId ? `Series #${t.seriesId}` : null);
      if (!name) return;
      if (!bySeries[name])
        bySeries[name] = { approved: 0, revise: 0, other: 0 };
      if (t.status === "APPROVED" || t.status === "DONE")
        bySeries[name].approved++;
      else if (t.status === "REVISION_REQUIRED" || t.status === "REVISE")
        bySeries[name].revise++;
      else bySeries[name].other++;
    });
    return Object.entries(bySeries)
      .map(([name, c]) => {
        const total = c.approved + c.revise + c.other;
        const rate = total > 0 ? Math.round((c.approved / total) * 100) : 0;
        return {
          name: name.length > 14 ? `${name.slice(0, 14)}…` : name,
          Approved: c.approved,
          Revise: c.revise,
          rate,
        };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6);
  }, [allTasks]);

  const usingSample = !data.length;
  const displayData = usingSample ? MOCK_QUALITY_DATA : data;

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ left: 0, right: 4, top: 4, bottom: 4 }}
            barSize={12}
            barGap={1}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface mb-1">
                      {label}
                    </p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color }}>
                        {p.name}: {p.value}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="Approved"
              stackId="a"
              fill={C.success}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Revise"
              stackId="a"
              fill={C.danger}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 3. Weekly Throughput ──────────────────────────────────────────────────────
// ⚠️ MOCK DATA — see note at top of file
function WeeklyThroughputChart() {
  return (
    <div>
      {/* Mock notice */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#ffb869]/30 bg-[#ffb869]/5 px-3 py-2">
        <Wrench size={11} className="text-[#ffb869] shrink-0" />
        <p className="text-[10px] text-[#ffb869]/80 leading-relaxed">
          <span className="font-semibold">Mock data displayed.</span> Backend
          cần implement{" "}
          <code className="text-[#a078ff]/80">
            GET /api/v1/dashboard/task-history?groupBy=week
          </code>{" "}
          để tính từ timestamps thực.
        </p>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={MOCK_WEEKLY_THROUGHPUT}
            margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.06)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface mb-1">
                      {label}
                    </p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color }}>
                        {p.name}: {p.value} tasks
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Line
              type="monotone"
              dataKey="Completed"
              stroke={C.success}
              strokeWidth={2}
              dot={{ r: 4, fill: C.success, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Submitted"
              stroke={C.primary}
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: C.primary, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export function AssistantBiCharts({ allTasks = [] }) {
  return (
    <div className="space-y-6">
      <SectionDivider />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* 1. Task Type Donut */}
        <ChartCard
          title="Task Type Breakdown"
          subtitle="My tasks by artwork region"
          icon={BarChart2}
        >
          <TaskTypeDonut allTasks={allTasks} />
        </ChartCard>

        {/* 2. Quality Score */}
        <ChartCard
          title="Quality Score"
          subtitle="Approved vs revise per series"
          icon={Target}
          iconClass="text-[#4ade80]"
        >
          <QualityScoreChart allTasks={allTasks} />
        </ChartCard>

        {/* 3. Weekly Throughput (mock) */}
        <ChartCard
          title="Weekly Throughput"
          subtitle="Tasks completed per week"
          icon={TrendingUp}
          iconClass="text-[#a078ff]"
          badge={<MockBadge />}
        >
          <WeeklyThroughputChart />
        </ChartCard>
      </div>
    </div>
  );
}

export default AssistantBiCharts;

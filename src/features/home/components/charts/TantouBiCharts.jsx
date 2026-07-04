/**
 * TantouBiCharts.jsx — BI Analytics Charts for TANTOU_EDITOR dashboard
 *
 * Charts:
 *  1. Risk Matrix (Scatter)       — REAL  (chapter progressPercent vs daysLeft)
 *  2. Series Status Summary       — REAL  (series statuses from tantouData)
 *  3. Review Queue Aging          — REAL  (days since submission for chaptersInReview)
 *  4. Progress Distribution       — REAL  (histogram of chapter completion %)
 *
 * Data received as props from TantouDashboardPanel (no extra fetches needed).
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { AlertTriangle, BarChart2, Clock, Target } from "lucide-react";
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
  warning: "#fb923c",
  danger: "#f87171",
  muted: "#6b7280",
  blue: "#60a5fa",
  grid: "rgba(255,255,255,0.05)",
  tick: "#6b7280",
};

const SERIES_STATUS_COLORS = {
  ONGOING: C.primary,
  AT_RISK: C.danger,
  PENDING_TANTOU: C.gold,
  PENDING_BOARD_VOTE: C.warning,
  APPROVED: C.success,
  REJECTED: "#374151",
};

// ── Sample badge ───────────────────────────────────────────────────────────────
function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded border border-[#a078ff]/30 bg-[#a078ff]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a078ff]/70">
      Sample
    </span>
  );
}

// ── Mock data constants ───────────────────────────────────────────────────────
const MOCK_SCATTER_DATA = [
  {
    progress: 80,
    days: 10,
    color: C.success,
    name: "Black Thorn — Ch.12",
    author: "Ichikawa",
  },
  {
    progress: 65,
    days: 6,
    color: C.gold,
    name: "Neon Legacy — Ch.8",
    author: "Fujimoto",
  },
  {
    progress: 40,
    days: 3,
    color: C.warning,
    name: "Studio Z — Ch.5",
    author: "Ito",
  },
  {
    progress: 20,
    days: 1,
    color: C.danger,
    name: "Cosmic Dawn — Ch.3",
    author: "Taniguchi",
  },
  {
    progress: 10,
    days: -1,
    color: C.danger,
    name: "Night Owl — Ch.7",
    author: "Kimura",
  },
  {
    progress: 90,
    days: 14,
    color: C.success,
    name: "Dark Matter — Ch.20",
    author: "Nishida",
  },
  {
    progress: 55,
    days: 5,
    color: C.gold,
    name: "Blade Legacy — Ch.15",
    author: "Sato",
  },
  {
    progress: 30,
    days: 2,
    color: C.warning,
    name: "Ghost Protocol — Ch.2",
    author: "Yamamoto",
  },
];
const MOCK_SERIES_STATUS_BREAKDOWN = {
  ONGOING: 5,
  AT_RISK: 2,
  PENDING_TANTOU: 1,
};
const MOCK_REVIEW_AGING_DATA = [
  { label: "< 1 day", count: 2, fill: C.success },
  { label: "1-3 days", count: 4, fill: C.gold },
  { label: "3-7 days", count: 3, fill: C.warning },
  { label: "> 7 days", count: 1, fill: C.danger },
];

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

function SkeletonBox({ height = "h-[200px]" }) {
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
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          <Icon size={13} className={iconClass} />
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-on-surface-variant/55 mt-0.5">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-4 pb-5">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ label, height = "h-[200px]" }) {
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

// ── 1. Risk Matrix Scatter ────────────────────────────────────────────────────
// X: progressPercent (0-100), Y: daysLeft, color by urgency
function RiskScatterChart({ allChapters = [] }) {
  const usingSample = !allChapters.length;
  const data = usingSample
    ? MOCK_SCATTER_DATA
    : allChapters
        .filter(
          (ch) =>
            ch.progressPercent != null &&
            ch.daysLeft != null &&
            isFinite(ch.daysLeft),
        )
        .map((ch) => {
          const progress = Math.min(100, Math.max(0, ch.progressPercent ?? 0));
          const days = Math.min(30, Math.max(-5, ch.daysLeft ?? 0));
          let color = C.success;
          if (days < 0 || progress < 25) color = C.danger;
          else if (days <= 3 || progress < 50) color = C.warning;
          else if (days <= 7) color = C.gold;
          return {
            progress,
            days,
            color,
            name: `${ch.seriesTitle || "Series"} — Ch.${ch.chapterNumber ?? ch.chapterId}`,
            author: ch.authorName || ch.displayName,
          };
        });

  if (!usingSample && !data.length)
    return <EmptyChart label="No chapter progress data" />;

  const CustomDot = ({ cx, cy, payload }) => (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={payload.color}
      fillOpacity={0.85}
      stroke={payload.color}
      strokeWidth={1}
      strokeOpacity={0.4}
    />
  );

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {[
          { color: C.danger, label: "Critical (overdue or <25%)" },
          { color: C.warning, label: "Warning (≤3d or <50%)" },
          { color: C.gold, label: "Caution (≤7d)" },
          { color: C.success, label: "On track" },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: l.color }}
            />
            <span className="text-[10px] text-on-surface-variant">
              {l.label}
            </span>
          </div>
        ))}
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 8, top: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis
              type="number"
              dataKey="progress"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: "Progress %",
                position: "insideBottom",
                offset: -12,
                style: { fontSize: 10, fill: C.tick },
              }}
            />
            <YAxis
              type="number"
              dataKey="days"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}d`}
              label={{
                value: "Days left",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 10, fill: C.tick },
              }}
            />
            <ZAxis range={[50, 50]} />
            {/* Danger zone reference lines */}
            <ReferenceLine
              x={50}
              stroke={C.warning}
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={3}
              stroke={C.danger}
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg max-w-[200px]">
                    <p className="font-semibold text-on-surface mb-1 truncate">
                      {d.name}
                    </p>
                    {d.author && (
                      <p className="text-on-surface-variant mb-1">{d.author}</p>
                    )}
                    <p style={{ color: d.color }}>Progress: {d.progress}%</p>
                    <p style={{ color: d.color }}>
                      {d.days >= 0
                        ? `${d.days} days left`
                        : `${Math.abs(d.days)} days overdue`}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={data} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 2. Series Status Donut ────────────────────────────────────────────────────
function SeriesStatusDonut({ seriesStatusBreakdown = {} }) {
  const usingSample = !Object.values(seriesStatusBreakdown).some((v) => v > 0);
  const breakdown = usingSample
    ? MOCK_SERIES_STATUS_BREAKDOWN
    : seriesStatusBreakdown;
  const data = useMemo(() => {
    return Object.entries(breakdown)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count,
        color: SERIES_STATUS_COLORS[status] || C.muted,
      }));
  }, [breakdown]);

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
                      <p className="font-semibold text-on-surface capitalize">
                        {d.name.toLowerCase()}
                      </p>
                      <p style={{ color: d.color }}>{d.value} series</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5 min-w-0">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-xs text-on-surface-variant truncate capitalize">
                  {d.name.toLowerCase()}
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

// ── 3. Review Queue Aging Bar ─────────────────────────────────────────────────
function ReviewQueueAgingChart({ chaptersInReview = [] }) {
  const data = useMemo(() => {
    const now = Date.now();
    const buckets = [
      { label: "< 1 day", min: 0, max: 1, count: 0, fill: C.success },
      { label: "1-3 days", min: 1, max: 3, count: 0, fill: C.gold },
      { label: "3-7 days", min: 3, max: 7, count: 0, fill: C.warning },
      { label: "> 7 days", min: 7, max: 9999, count: 0, fill: C.danger },
    ];
    chaptersInReview.forEach((ch) => {
      const submitted = ch.submittedAt || ch.updatedAt || ch.createdAt;
      if (!submitted) {
        buckets[0].count++;
        return;
      }
      const days = Math.max(
        0,
        (now - new Date(submitted).getTime()) / 86_400_000,
      );
      const b = buckets.find((b) => days >= b.min && days < b.max);
      if (b) b.count++;
    });
    return buckets.filter((b) => b.count > 0);
  }, [chaptersInReview]);

  const usingSample = !data.length;
  const displayData = usingSample ? MOCK_REVIEW_AGING_DATA : data;

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
            barSize={32}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              width={22}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface">
                      Waiting {label}
                    </p>
                    <p style={{ color: payload[0].payload.fill }}>
                      {payload[0].value} chapters
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {displayData.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  - allChapters: all mapped chapters (from tantouData.allChapters)
 *  - chaptersInReview: chapters with status IN_REVIEW/SUBMITTED
 *  - seriesStatusBreakdown: { ONGOING: 2, AT_RISK: 1, ... } from tantouData
 */
export function TantouBiCharts({
  allChapters = [],
  chaptersInReview = [],
  seriesStatusBreakdown = {},
}) {
  return (
    <div className="space-y-6">
      <SectionDivider />

      {/* Risk Matrix — full width */}
      <ChartCard
        title="Risk Matrix"
        subtitle="Each dot = chapter · X: progress · Y: days to deadline · reference lines mark danger zones"
        icon={AlertTriangle}
        iconClass="text-[#fb923c]"
      >
        <RiskScatterChart allChapters={allChapters} />
      </ChartCard>

      {/* 2-column: Status + Aging */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Series Status"
          subtitle="My assigned series by status"
          icon={Target}
          iconClass="text-primary"
        >
          <SeriesStatusDonut seriesStatusBreakdown={seriesStatusBreakdown} />
        </ChartCard>

        <ChartCard
          title="Review Queue Aging"
          subtitle="How long chapters have been waiting for review"
          icon={Clock}
          iconClass="text-[#fb923c]"
        >
          <ReviewQueueAgingChart chaptersInReview={chaptersInReview} />
        </ChartCard>
      </div>
    </div>
  );
}

export default TantouBiCharts;

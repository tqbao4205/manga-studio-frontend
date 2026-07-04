/**
 * EditorialBiCharts.jsx — BI Analytics Charts for EDITORIAL_BOARD + CHIEF_EDITOR dashboard
 *
 * Charts shared by both roles:
 *  1. Series Portfolio Donut      — REAL  (all series by status)
 *  2. Voting Track Record         — REAL  (meetings — YES/NO/PENDING counts)
 *  3. Genre Mix Bar               — REAL  (series grouped by genre)
 *  4. At-Risk Trend Line          — ⚠️ MOCK — needs backend:
 *       GET /api/v1/dashboard/at-risk-history?groupBy=week
 *       Response: [{ week: 'W-3', atRisk: 3, ongoing: 12 }]
 *
 * Chief Editor exclusive section:
 *  5. Portfolio Health KPIs       — REAL  (derived from allSeries)
 *  6. Top Genres by Votes         — REAL  (from monthlyRanks + series genres)
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
import {
  Activity,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Crown,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
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
  pink: "#f472b6",
  teal: "#2dd4bf",
  grid: "rgba(255,255,255,0.05)",
  tick: "#6b7280",
};

const SERIES_STATUS_COLORS = {
  ONGOING: C.primary,
  AT_RISK: C.danger,
  PENDING_APPROVAL: C.gold,
  PENDING_TANTOU: C.gold,
  PENDING_BOARD_VOTE: C.warning,
  APPROVED: C.success,
  REJECTED: "#374151",
  HIATUS: C.blue,
};

const GENRE_COLORS = [
  C.primary,
  C.gold,
  C.success,
  C.blue,
  C.pink,
  C.teal,
  C.warning,
  C.danger,
];

// ⚠️ MOCK DATA — Replace when backend implements:
//   GET /api/v1/dashboard/at-risk-history?groupBy=week
//   Response: [{ week: 'W-3', atRisk: 3, ongoing: 12, period: '2026-W23' }]
//   Backend note: log snapshot weekly from series WHERE status = 'AT_RISK' count.
const MOCK_AT_RISK_TREND = [
  { week: "W-4", "At Risk": 2, Ongoing: 14 },
  { week: "W-3", "At Risk": 3, Ongoing: 13 },
  { week: "W-2", "At Risk": 4, Ongoing: 12 },
  { week: "W-1", "At Risk": 3, Ongoing: 13 },
  { week: "Now", "At Risk": 2, Ongoing: 14 },
];

// Sample data for empty-state visualization:
const MOCK_PORTFOLIO_DATA = [
  { name: "ongoing", value: 14, color: C.primary },
  { name: "at risk", value: 3, color: C.danger },
  { name: "pending board vote", value: 4, color: C.warning },
  { name: "approved", value: 8, color: C.success },
  { name: "rejected", value: 2, color: "#374151" },
  { name: "hiatus", value: 1, color: C.blue },
];
const MOCK_VOTING_DATA = [
  { name: "Black Thorn", Yes: 6, No: 1, Pending: 0 },
  { name: "Neon Legacy", Yes: 4, No: 3, Pending: 0 },
  { name: "Studio Chron", Yes: 5, No: 2, Pending: 0 },
  { name: "Cosmic Dawn", Yes: 0, No: 0, Pending: 7 },
];
const MOCK_GENRE_DATA = [
  { name: "Action", count: 12, fill: C.primary },
  { name: "Romance", count: 8, fill: C.pink },
  { name: "Fantasy", count: 7, fill: C.gold },
  { name: "Sci-Fi", count: 5, fill: C.blue },
  { name: "Horror", count: 3, fill: C.danger },
  { name: "Slice of Life", count: 3, fill: C.success },
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

function SampleBadge() {
  return (
    <span className="shrink-0 rounded border border-[#a078ff]/30 bg-[#a078ff]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a078ff]/70">
      Sample
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

// ── 1. Series Portfolio Donut ─────────────────────────────────────────────────
function SeriesPortfolioDonut({ allSeries }) {
  const usingSample = allSeries.length === 0;
  const data = useMemo(() => {
    if (usingSample) return MOCK_PORTFOLIO_DATA;
    const m = {};
    allSeries.forEach((s) => {
      const k = s.status || "UNKNOWN";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m)
      .map(([status, count]) => ({
        name: status.replace(/_/g, " "),
        value: count,
        color: SERIES_STATUS_COLORS[status] || C.muted,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allSeries, usingSample]);

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
                      <p style={{ color: d.color }}>
                        {d.value} series (
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

// ── 2. Voting Track Record ────────────────────────────────────────────────────
function VotingTrackRecord({ meetings }) {
  const data = useMemo(() => {
    const votingMeetings = meetings.filter(
      (m) => m.voteSummary || m.status === "COMPLETED",
    );
    return votingMeetings.slice(0, 6).map((m) => {
      const vs = m.voteSummary || {};
      const yes = vs.yesCount ?? 0;
      const no = vs.noCount ?? 0;
      const total = (vs.totalVotes ?? yes + no) || 1;
      const title = m.seriesTitle || `Meeting #${m.id}`;
      return {
        name: title.length > 14 ? `${title.slice(0, 14)}…` : title,
        Yes: yes,
        No: no,
        Pending: Math.max(0, total - yes - no),
        rate: total > 0 ? Math.round((yes / total) * 100) : 0,
      };
    });
  }, [meetings]);

  const usingSample = !data.length;
  const displayData = usingSample ? MOCK_VOTING_DATA : data;

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
            barSize={18}
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
              dataKey="Yes"
              stackId="a"
              fill={C.success}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Pending"
              stackId="a"
              fill={C.muted}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="No"
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

// ── 3. Genre Mix Bar ──────────────────────────────────────────────────────────
function GenreMixChart({ allSeries }) {
  const usingSample = allSeries.length === 0;
  const data = useMemo(() => {
    if (usingSample) return MOCK_GENRE_DATA;
    const m = {};
    allSeries.forEach((s) => {
      const genre = s.genre || s.genres?.[0] || "Unknown";
      m[genre] = (m[genre] || 0) + 1;
    });
    return Object.entries(m)
      .map(([genre, count], i) => ({
        name: genre.length > 12 ? `${genre.slice(0, 12)}…` : genre,
        count,
        fill: GENRE_COLORS[i % GENRE_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allSeries, usingSample]);

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
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 32, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#c8c6c8" }}
              axisLine={false}
              tickLine={false}
              width={82}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface">{label}</p>
                    <p style={{ color: payload[0].payload.fill }}>
                      {payload[0].value} series
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 4. At-Risk Trend (MOCK) ───────────────────────────────────────────────────
function AtRiskTrendChart() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#ffb869]/30 bg-[#ffb869]/5 px-3 py-2">
        <Wrench size={11} className="text-[#ffb869] shrink-0" />
        <p className="text-[10px] text-[#ffb869]/80 leading-relaxed">
          <span className="font-semibold">Mock data displayed.</span> Backend
          cần implement{" "}
          <code className="text-[#a078ff]/80">
            GET /api/v1/dashboard/at-risk-history?groupBy=week
          </code>{" "}
          — lưu snapshot số series AT_RISK theo tuần.
        </p>
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={MOCK_AT_RISK_TREND}
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
                        {p.name}: {p.value}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Line
              type="monotone"
              dataKey="At Risk"
              stroke={C.danger}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Ongoing"
              stroke={C.primary}
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 5. Chief Editor — Portfolio Health KPIs ───────────────────────────────────
function ChiefEditorHealthKPIs({ allSeries }) {
  const usingSample = allSeries.length === 0;
  const kpis = useMemo(() => {
    if (usingSample) {
      return [
        { label: "Total Series", value: 32, color: C.primary, icon: BookOpen },
        { label: "Active", value: 14, color: C.success, icon: CheckCircle2 },
        { label: "At Risk", value: 3, color: C.danger, icon: XCircle },
        {
          label: "On-Track Rate",
          value: "91%",
          color: C.success,
          icon: TrendingUp,
        },
      ];
    }
    const total = allSeries.length;
    const ongoing = allSeries.filter((s) => s.status === "ONGOING").length;
    const atRisk = allSeries.filter((s) => s.status === "AT_RISK").length;
    const onTimeRate =
      total > 0 ? Math.round(((total - atRisk) / total) * 100) : 100;
    return [
      { label: "Total Series", value: total, color: C.primary, icon: BookOpen },
      { label: "Active", value: ongoing, color: C.success, icon: CheckCircle2 },
      { label: "At Risk", value: atRisk, color: C.danger, icon: XCircle },
      {
        label: "On-Track Rate",
        value: `${onTimeRate}%`,
        color: onTimeRate >= 80 ? C.success : C.warning,
        icon: TrendingUp,
      },
    ];
  }, [allSeries, usingSample]);

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const KpiIcon = kpi.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-outline-variant/30 bg-surface-container/60 p-4 flex items-center gap-3"
            >
              <div
                className="p-2 rounded-lg shrink-0"
                style={{ background: `${kpi.color}18` }}
              >
                <KpiIcon size={18} style={{ color: kpi.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant truncate">
                  {kpi.label}
                </p>
                <p className="text-xl font-bold tabular-nums text-on-surface">
                  {kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  - meetings     : sortedMeetings from EditorialBoardDashboardPanel
 *  - allSeries    : all series array
 *  - monthlyRanks : current month ranking data
 *  - isChiefEditor: boolean flag
 */
export function EditorialBiCharts({
  meetings = [],
  allSeries = [],
  isChiefEditor = false,
}) {
  return (
    <div className="space-y-6">
      <SectionDivider />

      {/* Chief Editor — Portfolio Health KPIs (top row) */}
      {isChiefEditor && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Crown size={14} className="text-[#ffb869]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Portfolio Health — Chief Editor View
            </h3>
          </div>
          <ChiefEditorHealthKPIs allSeries={allSeries} />
        </div>
      )}

      {/* Row 1: Portfolio + Voting */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Series Portfolio"
          subtitle="All series by status"
          icon={Activity}
        >
          <SeriesPortfolioDonut allSeries={allSeries} />
        </ChartCard>

        <ChartCard
          title="Voting Track Record"
          subtitle="YES / NO / Pending per series proposal"
          icon={CheckCircle2}
          iconClass="text-[#4ade80]"
        >
          <VotingTrackRecord meetings={meetings} />
        </ChartCard>
      </div>

      {/* Row 2: Genre Mix + At-Risk Trend */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Genre Mix"
          subtitle="Number of series per genre"
          icon={BookOpen}
          iconClass="text-[#60a5fa]"
        >
          <GenreMixChart allSeries={allSeries} />
        </ChartCard>

        <ChartCard
          title="At-Risk Trend"
          subtitle="Series at risk vs active — weekly snapshot"
          icon={TrendingUp}
          iconClass="text-[#f87171]"
          badge={<MockBadge />}
        >
          <AtRiskTrendChart />
        </ChartCard>
      </div>
    </div>
  );
}

export default EditorialBiCharts;

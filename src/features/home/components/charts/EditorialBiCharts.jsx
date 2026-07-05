/**
 * EditorialBiCharts.jsx — BI Analytics Charts for EDITORIAL_BOARD + CHIEF_EDITOR dashboard
 *
 * Charts shared by both roles:
 *  1. Series Portfolio Donut      — REAL  (all series by status)
 *  2. Voting Track Record         — REAL  (meetings — YES/NO/PENDING counts)
 *  3. Genre Mix Bar               — REAL  (series grouped by genre)
 *  4. Monthly Ranking Trend       — REAL  (GET /api/ranking/monthly ×4 months)
 *  5. Weekly Ranking Trend        — REAL  (GET /api/ranking/weekly ×4 weeks)
 *
 * Chief Editor exclusive section:
 *  6. Portfolio Health KPIs       — REAL  (derived from allSeries)
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../../shared/components/ui/card";
import { cn } from "../../../../shared/utils";
import rankingService from "../../../../services/rankingService";

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
  const data = useMemo(() => {
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
  }, [allSeries]);

  if (!data.length) return <EmptyChart label="No series data" height="h-[160px]" />;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
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

  if (!data.length) return <EmptyChart label="No voting data yet" height="h-[180px]" />;

  return (
    <div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
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
  const data = useMemo(() => {
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
  }, [allSeries]);

  if (!data.length) return <EmptyChart label="No genre data" height="h-[160px]" />;

  return (
    <div>
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

// ── Ranking helpers ───────────────────────────────────────────────────────────
const LINE_COLORS = [C.primary, C.gold, C.success, C.blue, C.danger, '#f472b6', '#34d399', '#fbbf24', '#818cf8', '#e879f9'];

function getLast4Months() {
  return [3, 2, 1, 0].map((n) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    };
  });
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getLast4Weeks() {
  return [3, 2, 1, 0].map((n) => {
    const d = new Date();
    d.setDate(d.getDate() - n * 7);
    const wk = getISOWeek(d);
    return {
      key: `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`,
      label: `W${wk}`,
    };
  });
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

// ── 5. Ranking Trend Line (shared rendering) ──────────────────────────────────
function RankingTrendLineChart({ displayData, keys }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(new Set());

  const toggleKey = (key) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleKeys = keys.filter((k) => !hiddenKeys.has(k));
  if (visibleKeys.length === 0) return <EmptyChart label="No ranking data yet" />;

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ left: 0, right: 8, top: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              reversed
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `#${v}`}
              width={28}
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
                    {payload
                      .filter((p) => p.value != null)
                      .map((p, i) => (
                        <p key={i} style={{ color: p.color }}>
                          {p.name}: #{p.value}
                        </p>
                      ))}
                  </div>
                );
              }}
            />
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center pt-2">
                  {payload.map((entry) => {
                    const isHidden = hiddenKeys.has(entry.dataKey);
                    const isDimmed = hoveredKey && hoveredKey !== entry.dataKey;
                    return (
                      <button
                        key={entry.dataKey}
                        type="button"
                        onClick={() => toggleKey(entry.dataKey)}
                        className="flex items-center gap-1 text-xs transition-opacity"
                        style={{
                          color: isHidden ? "#6b7280" : entry.color,
                          textDecoration: isHidden ? "line-through" : "none",
                          opacity: isDimmed ? 0.4 : 1,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: entry.color }}
                        />
                        {entry.value}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {keys.map((k, i) => {
              const isHidden = hiddenKeys.has(k);
              const isDimmed = hoveredKey && hoveredKey !== k;
              return (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={isHidden ? 0 : isDimmed ? 1.5 : 2.5}
                  strokeOpacity={isHidden ? 0 : isDimmed ? 0.15 : 1}
                  dot={isHidden ? false : { r: isDimmed ? 2 : 4, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                  activeDot={isHidden ? false : { r: 5, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                  connectNulls={false}
                  onMouseEnter={() => setHoveredKey(k)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 5a. Monthly Ranking Trend ─────────────────────────────────────────────────
function MonthlyRankingTrendChart({ allSeries }) {
  const [searchTerm, setSearchTerm] = useState("");
  const months = useMemo(() => getLast4Months(), []);

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["bi", "editorial-ranking-history-4mo"],
    queryFn: async () => {
      const results = await Promise.all(
        months.map(({ key }) => rankingService.getMonthly(key).catch(() => [])),
      );
      return months.map(({ label }, i) => {
        const ranks = toArray(results[i]);
        const row = { month: label };
        allSeries.forEach((s) => {
          const r = ranks.find(
            (r) =>
              (r.seriesId != null && r.seriesId === s.id) ||
              (r.series?.id != null && r.series.id === s.id),
          );
          row[s.title?.slice(0, 14) || `S${s.id}`] = r?.rank ?? null;
        });
        return row;
      });
    },
    staleTime: 120_000,
    enabled: allSeries.length > 0,
  });

  const hasSeries = allSeries.length > 0;
  if (hasSeries && isLoading) return <SkeletonBox height="h-[280px]" />;

  const keys = allSeries.map((s) => s.title?.slice(0, 14) || `S${s.id}`);
  const activeKeys = keys.filter(k => historyData.some(row => row[k] != null));
  const isEmpty = !hasSeries || historyData.length === 0 || activeKeys.length === 0;
  if (isEmpty) return <EmptyChart label="No ranking data yet" height="h-[280px]" />;

  const latestRow = historyData[historyData.length - 1];
  const topDefaultKeys = [...activeKeys]
    .sort((a, b) => (latestRow[a] ?? 999) - (latestRow[b] ?? 999))
    .slice(0, 5);

  const trimmed = searchTerm.trim().toLowerCase();
  const visibleKeys = trimmed
    ? activeKeys.filter((k) => k.toLowerCase().includes(trimmed))
    : topDefaultKeys;

  return (
    <div>
      {activeKeys.length > 5 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter series…"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container/80 py-1.5 pl-7 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}
      <div className="text-[10px] text-on-surface-variant/60 mb-2 text-right">
        Showing {visibleKeys.length} of {activeKeys.length} series
      </div>
      {visibleKeys.length === 0
        ? <EmptyChart label="No series match your search" height="h-[160px]" />
        : <RankingTrendLineChart displayData={historyData} keys={visibleKeys} />}
    </div>
  );
}

// ── 5b. Weekly Ranking Trend ──────────────────────────────────────────────────
function WeeklyRankingTrendChart({ allSeries }) {
  const [searchTerm, setSearchTerm] = useState("");
  const weeks = useMemo(() => getLast4Weeks(), []);

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["bi", "editorial-ranking-history-4wk"],
    queryFn: async () => {
      const results = await Promise.all(
        weeks.map(({ key }) => rankingService.getWeekly(key).catch(() => [])),
      );
      return weeks.map(({ label }, i) => {
        const ranks = toArray(results[i]);
        const row = { month: label };
        allSeries.forEach((s) => {
          const r = ranks.find(
            (r) =>
              (r.seriesId != null && r.seriesId === s.id) ||
              (r.series?.id != null && r.series.id === s.id),
          );
          row[s.title?.slice(0, 14) || `S${s.id}`] = r?.rank ?? null;
        });
        return row;
      });
    },
    staleTime: 120_000,
    enabled: allSeries.length > 0,
  });

  const hasSeries = allSeries.length > 0;
  if (hasSeries && isLoading) return <SkeletonBox height="h-[280px]" />;

  const keys = allSeries.map((s) => s.title?.slice(0, 14) || `S${s.id}`);
  const activeKeys = keys.filter(k => historyData.some(row => row[k] != null));
  const isEmpty = !hasSeries || historyData.length === 0 || activeKeys.length === 0;
  if (isEmpty) return <EmptyChart label="No ranking data yet" height="h-[280px]" />;

  const latestRow = historyData[historyData.length - 1];
  const topDefaultKeys = [...activeKeys]
    .sort((a, b) => (latestRow[a] ?? 999) - (latestRow[b] ?? 999))
    .slice(0, 5);

  const trimmed = searchTerm.trim().toLowerCase();
  const visibleKeys = trimmed
    ? activeKeys.filter((k) => k.toLowerCase().includes(trimmed))
    : topDefaultKeys;

  return (
    <div>
      {activeKeys.length > 5 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter series…"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container/80 py-1.5 pl-7 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}
      <div className="text-[10px] text-on-surface-variant/60 mb-2 text-right">
        Showing {visibleKeys.length} of {activeKeys.length} series
      </div>
      {visibleKeys.length === 0
        ? <EmptyChart label="No series match your search" height="h-[160px]" />
        : <RankingTrendLineChart displayData={historyData} keys={visibleKeys} />}
    </div>
  );
}

// ── 6. Chief Editor — Portfolio Health KPIs ───────────────────────────────────
function ChiefEditorHealthKPIs({ allSeries }) {
  const kpis = useMemo(() => {
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
  }, [allSeries]);

  if (!allSeries.length) return <EmptyChart label="No series data for KPIs" height="h-[100px]" />;

  return (
    <div>
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

      {/* Row 2: Genre Mix */}
      <div className="grid gap-6 md:grid-cols-1">
        <ChartCard
          title="Genre Mix"
          subtitle="Number of series per genre"
          icon={BookOpen}
          iconClass="text-[#60a5fa]"
        >
          <GenreMixChart allSeries={allSeries} />
        </ChartCard>
      </div>

      {/* Row 3: Monthly + Weekly Ranking Trend */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Monthly Trend"
          subtitle="Monthly rank · last 4 months · lower = better"
          icon={TrendingUp}
          iconClass="text-[#4ade80]"
        >
          <MonthlyRankingTrendChart allSeries={allSeries} />
        </ChartCard>

        <ChartCard
          title="Weekly Trend"
          subtitle="Weekly rank · last 4 weeks · lower = better"
          icon={TrendingUp}
          iconClass="text-[#fb923c]"
        >
          <WeeklyRankingTrendChart allSeries={allSeries} />
        </ChartCard>
      </div>
    </div>
  );
}

export default EditorialBiCharts;

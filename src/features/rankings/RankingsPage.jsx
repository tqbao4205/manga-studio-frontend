import { useEffect } from "react";
import { useRankingStore } from "../../app/stores/rankingStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { getRankColor, cn } from "../../shared/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  BarChart3,
  AlertTriangle,
  Siren,
} from "lucide-react";
import { RankingChart } from "../../shared/components/reports/RankingChart";

// Icon cho trend (tăng/giảm/giữ nguyên)
function getTrendIcon(trend) {
  switch (trend) {
    case "UP":
      return TrendingUp;
    case "DOWN":
      return TrendingDown;
    default:
      return Minus;
  }
}

// Màu cho trend
function getTrendColor(trend) {
  switch (trend) {
    case "UP":
      return "text-status-success";
    case "DOWN":
      return "text-status-danger";
    default:
      return "text-on-surface-variant/50";
  }
}

// ── Trang Rankings ──
// Route: /rankings
// Quyền: tất cả user đã đăng nhập
// Hiển thị bảng xếp hạng series theo vote, kèm biểu đồ lịch sử và cảnh báo warning/danger
export function RankingsPage() {
  const rankings = useRankingStore((s) => s.rankings);
  const warningLevels = useRankingStore((s) => s.warningLevels);
  const dangerPeriods = useRankingStore((s) => s.dangerPeriods);
  const checkDangerZonesNow = useRankingStore((s) => s.checkDangerZonesNow);

  // Kiểm tra danger zones khi component mount
  useEffect(() => {
    checkDangerZonesNow();
  }, []);

  // Sắp xếp theo rank tăng dần
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);

  // Trống → EmptyState
  if (rankings.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={40} />}
        title="No rankings available"
        description="Rankings will appear once votes are tallied."
      />
    );
  }

  // Màu chữ cho top 1-3
  const topColor = (rank) => {
    if (rank === 1) return "text-rank-s";
    if (rank === 2) return "text-rank-a";
    if (rank === 3) return "text-rank-b";
    return "text-on-surface-variant/60";
  };

  const history = useRankingStore((s) => s.history);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Rankings</h1>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          Current period: {sorted[0]?.periodLabel || "N/A"}
        </p>
      </div>

      {/* Biểu đồ lịch sử xếp hạng (chỉ hiển thị nếu có ≥ 2 kỳ dữ liệu) */}
      {history.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 size={16} />
              Ranking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankingChart history={history} />
          </CardContent>
        </Card>
      )}

      {/* Bảng xếp hạng chính */}
      <Card>
        <CardContent className="p-0">
          {/* Header bảng */}
          <div className="flex items-center px-4 py-2.5 border-b border-primary">
            <span className="w-12 section-label">Rank</span>
            <span className="flex-1 section-label">Series</span>
            <span className="w-16 text-center section-label">Tier</span>
            <span className="w-28 text-right section-label">Votes</span>
            <span className="w-12 text-right section-label">Trend</span>
          </div>

          {/* Danh sách series xếp hạng */}
          <div className="divide-y divide-border-light/30">
            {sorted.map((r) => {
              const TrendIcon = getTrendIcon(r.trend);
              const wl = warningLevels[r.seriesId] || 0;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center px-4 py-3.5 transition-colors hover:bg-black/[0.015]",
                    wl >= 2 && "bg-status-danger/[0.03]",
                  )}
                >
                  {/* Rank */}
                  <span
                    className={cn(
                      "w-12 text-lg font-bold tabular-nums",
                      topColor(r.rank),
                    )}
                  >
                    #{r.rank}
                  </span>
                  {/* Tên series + icon warning/danger */}
                  <span className="flex-1 text-sm font-medium text-on-surface flex items-center gap-2">
                    {r.seriesTitle}
                    {wl >= 3 && (
                      <Siren
                        size={14}
                        className="text-status-danger"
                        title="Cancellation review"
                      />
                    )}
                    {wl === 2 && (
                      <AlertTriangle
                        size={14}
                        className="text-status-warning"
                        title="Final warning"
                      />
                    )}
                    {wl === 1 && (
                      <AlertTriangle
                        size={14}
                        className="text-status-warning/60"
                        title="Warning issued"
                      />
                    )}
                  </span>
                  {/* Tier */}
                  <span className="w-16 text-center">
                    <span
                      className="inline-block px-2 py-0.5 text-xs font-bold border"
                      style={{
                        borderColor: getRankColor(r.tier),
                        color: getRankColor(r.tier),
                        background: `${getRankColor(r.tier)}08`,
                      }}
                    >
                      {r.tier}
                    </span>
                  </span>
                  {/* Tổng vote */}
                  <span className="w-28 text-right text-sm text-on-surface-variant/70 tabular-nums">
                    {r.totalVotes.toLocaleString()}
                  </span>
                  {/* Trend icon */}
                  <span
                    className={cn("w-12 text-right", getTrendColor(r.trend))}
                  >
                    <TrendIcon size={16} className="inline-block" />
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

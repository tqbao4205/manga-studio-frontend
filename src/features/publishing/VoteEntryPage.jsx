import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vote, Save, TrendingUp } from "lucide-react";
import { useSeriesList } from "../../shared/hooks/useMockData";
import { useRankingStore } from "../../app/stores/rankingStore";
import { useUIStore } from "../../app/stores/uiStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { PageLoading } from "../../shared/components/shared/LoadingSpinner";
import { getPeriodLabel } from "../../shared/utils";

// ── Publishing: Trang Vote Entry ──
// Route: /votes
// Quyền: EDITOR / BOARD (nhập vote)
// Cho phép nhập số vote cho từng series theo kỳ (week) và cập nhật bảng xếp hạng
export function VoteEntryPage() {
  const navigate = useNavigate();
  const { data: seriesData, isLoading } = useSeriesList();
  const enterVotes = useRankingStore((s) => s.enterVotes);
  const addToast = useUIStore((s) => s.addToast);
  const [votes, setVotes] = useState({});
  const [periodDate, setPeriodDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [submitting, setSubmitting] = useState(false);

  // Chỉ lấy series ONGOING hoặc COMPLETED
  const series =
    seriesData?.content?.filter(
      (s) => s.status === "ONGOING" || s.status === "COMPLETED",
    ) || [];

  // Nhãn kỳ (VD: "W22-2026")
  const periodLabel = periodDate ? getPeriodLabel(periodDate) : "";

  // Cập nhật vote cho một series
  const handleVoteChange = (seriesId, value) => {
    setVotes((prev) => ({ ...prev, [seriesId]: value }));
  };

  // Kiểm tra có ít nhất một vote > 0
  const anyVotes = Object.values(votes).some((v) => v && Number(v) > 0);

  // ── Xử lý submit vote ──
  // Lọc các series có vote > 0, gọi enterVotes lên store (tính lại ranking)
  const handleSubmit = () => {
    if (!anyVotes || !periodLabel) return;
    setSubmitting(true);

    const voteEntries = Object.entries(votes)
      .filter(([, v]) => v && Number(v) > 0)
      .map(([seriesId, v]) => ({
        seriesId: Number(seriesId),
        votes: Number(v),
      }));

    enterVotes(voteEntries, periodLabel);
    setVotes({});

    addToast({
      type: "success",
      title: "Votes entered",
      message: `Votes for ${periodLabel} have been recorded and rankings updated.`,
    });

    setTimeout(() => setSubmitting(false), 300);
  };

  // Loading → spinner
  if (isLoading) return <PageLoading />;

  // Không có series → EmptyState
  if (series.length === 0) {
    return (
      <EmptyState
        icon={<Vote size={40} />}
        title="No series available"
        description="There are no active series to enter votes for."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Vote Entry</h1>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          Enter reader vote data for the current period
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel trái: Form nhập vote */}
        <Card>
          <CardHeader>
            <CardTitle>Vote Data Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chọn kỳ (date picker → tự động tính periodLabel) */}
            <div className="space-y-1.5">
              <Label>Period (Week)</Label>
              <Input
                type="date"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                required
              />
              {periodLabel && (
                <p className="text-xs text-on-surface-variant mt-1">
                  Period: {periodLabel}
                </p>
              )}
            </div>

            {/* Danh sách series + input vote */}
            <div className="space-y-3">
              <Label>Votes per Series</Label>
              {series.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface truncate">
                      {s.title}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {s.mangaka.displayName}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={votes[s.id] ?? ""}
                    onChange={(e) => handleVoteChange(s.id, e.target.value)}
                    className="w-24 text-right"
                  />
                </div>
              ))}
            </div>

            {/* Nút submit */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!anyVotes || !periodLabel || submitting}
            >
              <Save size={16} /> Submit Votes & Update Rankings
            </Button>
          </CardContent>
        </Card>

        {/* Panel phải: Preview xếp hạng tạm thời */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {anyVotes && periodLabel ? (
              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant mb-3">
                  Rankings will be calculated for {periodLabel}
                </p>
                {Object.entries(votes)
                  .filter(([, v]) => v && Number(v) > 0)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([seriesId, v], i) => {
                    const s = series.find((s) => s.id === Number(seriesId));
                    if (!s) return null;
                    return (
                      <div
                        key={seriesId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="w-6 text-xs font-bold text-on-surface-variant tabular-nums">
                          #{i + 1}
                        </span>
                        <span className="flex-1 text-on-surface truncate">
                          {s.title}
                        </span>
                        <span className="text-on-surface-variant tabular-nums">
                          {Number(v).toLocaleString()} votes
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/50">
                <TrendingUp size={32} />
                <p className="text-sm mt-2">Enter votes to see a preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

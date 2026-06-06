import { useState } from "react";
import {
  useSeriesList,
  useChaptersBySeries,
} from "../../shared/hooks/useMockData";
import { useScheduleStore } from "../../app/stores/scheduleStore";
import { useUIStore } from "../../app/stores/uiStore";
import { mockUsers } from "../../shared/constants/mock-data";
import { Card, CardContent } from "../../shared/components/ui/card";
import { StatusBadge } from "../../shared/components/shared/StatusBadge";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { Select } from "../../shared/components/ui/select";
import { Dialog } from "../../shared/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { getPeriodLabel } from "../../shared/utils";

// ── Publishing: Form tạo lịch xuất bản mới ──
// Cho phép chọn series → chapter → ngày xuất bản
function NewScheduleForm({ onClose }) {
  const addSchedule = useScheduleStore((s) => s.addSchedule);
  const addToast = useUIStore((s) => s.addToast);
  const { data: seriesData } = useSeriesList();
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const series = seriesData?.content || [];
  const selectedSeries = series.find((s) => s.id === Number(selectedSeriesId));

  // Lấy danh sách chapter chưa PUBLISHED của series đã chọn
  const { data: chaptersData } = useChaptersBySeries(Number(selectedSeriesId));
  const chapters = (chaptersData?.content || []).filter(
    (c) => c.status !== "PUBLISHED",
  );

  const periodLabel = scheduledDate ? getPeriodLabel(scheduledDate) : "";

  const isValid = selectedSeries && chapterNumber && scheduledDate;

  // ── Xử lý submit form ──
  // Tạo schedule mới trong store
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const chapter = chapters.find(
      (c) => c.chapterNumber === Number(chapterNumber),
    );

    addSchedule({
      seriesId: selectedSeries.id,
      seriesTitle: selectedSeries.title,
      chapterId: chapter?.id,
      chapterNumber: Number(chapterNumber),
      scheduledDate,
      periodLabel,
      status: "SCHEDULED",
      createdAt: new Date().toISOString().split("T")[0],
    });

    addToast({
      type: "success",
      title: "Schedule created",
      message: `"${selectedSeries.title}" Ch.${chapterNumber} scheduled for ${scheduledDate} (${periodLabel})`,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Chọn series */}
      <div className="space-y-1.5">
        <Label>Series</Label>
        <Select
          options={series.map((s) => ({ value: s.id, label: s.title }))}
          placeholder="Select a series"
          value={selectedSeriesId}
          onChange={(e) => {
            setSelectedSeriesId(e.target.value);
            setChapterNumber("");
          }}
          required
        />
        {selectedSeries && (
          <p className="text-xs text-on-surface-variant mt-1">
            {(mockUsers.find(u => u.id === selectedSeries.mangakaId)?.displayName || 'Unknown')} · {selectedSeries.chapterCount}{" "}
            chapters · {{DRAFT:'Draft',PENDING_APPROVAL:'Pending Approval',APPROVED:'Approved',ONGOING:'Ongoing',HIATUS:'Hiatus',CANCELLED:'Cancelled',COMPLETED:'Completed',REJECTED:'Rejected',AT_RISK:'At Risk',PENDING_TANTOU:'Pending Lead Editor',PENDING_BOARD_VOTE:'Pending Editorial Review'}[selectedSeries.status] || selectedSeries.status}
          </p>
        )}
      </div>

      {/* Chọn chapter (từ danh sách hoặc nhập tay) */}
      {selectedSeries && (
        <div className="space-y-1.5">
          <Label>Chapter</Label>
          {chapters.length > 0 && (
            <Select
              options={chapters.map((c) => ({
                value: String(c.chapterNumber),
                label: `Ch.${c.chapterNumber} — ${c.title}`,
              }))}
              placeholder="Select a chapter"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
            />
          )}
          <Input
            type="number"
            placeholder={
              chapters.length > 0
                ? "Or enter chapter number manually"
                : "e.g. 19"
            }
            value={chapterNumber}
            onChange={(e) => setChapterNumber(e.target.value)}
            required
            min="1"
          />
        </div>
      )}

      {/* Chọn ngày xuất bản */}
      <div className="space-y-1.5">
        <Label>Scheduled Date</Label>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
        />
        {periodLabel && (
          <p className="text-xs text-on-surface-variant mt-1">
            Period: {periodLabel}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!isValid}>
        Create Schedule
      </Button>
    </form>
  );
}

// ── Trang Publishing (Quản lý lịch xuất bản) ──
// Route: /publishing
// Quyền: EDITOR / BOARD (tạo/xem lịch xuất bản)
// Hiển thị danh sách schedule + nút tạo schedule mới
export function PublishingPage() {
  const schedules = useScheduleStore((s) => s.schedules);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      {/* Dialog tạo schedule mới */}
      {showNew && (
        <Dialog
          open={showNew}
          onClose={() => setShowNew(false)}
          title="New Schedule"
          description="Create a publication schedule for a chapter"
        >
          <NewScheduleForm onClose={() => setShowNew(false)} />
        </Dialog>
      )}

      {/* Header + nút tạo mới */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Publishing</h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Manage publication schedules and releases
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Schedule
        </Button>
      </div>

      {/* Danh sách schedule hoặc EmptyState */}
      {schedules.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="No schedules"
          description="Create your first publication schedule."
        />
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className="card-ink-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-primary/20 bg-primary/[0.02] flex items-center justify-center text-primary">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {s.seriesTitle} — Ch.{s.chapterNumber}
                      </p>
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">
                        {s.periodLabel} · {s.scheduledDate}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

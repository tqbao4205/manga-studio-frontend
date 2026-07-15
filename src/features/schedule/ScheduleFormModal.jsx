import { useState, useMemo, useEffect } from "react";
import {
  Calendar, ChevronRight, Check,
  Film, Repeat,
} from "lucide-react";
import { useUIStore } from "../../app/stores/uiStore";
import { Dialog } from "../../shared/components/ui/dialog";
import { cn } from "../../shared/utils";
import scheduleService from "../../services/scheduleService";

const daysOfWeek = [
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
  { label: "S", value: 7 },
];

export function ScheduleFormModal({ mode, open, onClose, onSuccess, scheduleData, schedules, seriesList }) {
  const addToast = useUIStore((s) => s.addToast);

  const isEdit = mode === "edit";

  const [selectedSeries, setSelectedSeries] = useState("");
  const [scheduleType, setScheduleType] = useState("WEEKLY");
  const [selectedDay, setSelectedDay] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(6);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (isEdit && scheduleData) {
      setScheduleType(scheduleData.scheduleType);
      setSelectedDay(scheduleData.dayOfWeek ?? 1);
      setDayOfMonth(scheduleData.dayOfMonth ?? 6);
      setStartDate(scheduleData.startDate);
    } else {
      setSelectedSeries("");
      setScheduleType("WEEKLY");
      setSelectedDay(1);
      setDayOfMonth(6);
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, isEdit, scheduleData]);

  const seriesOptions = useMemo(() => {
    const existing = new Set(schedules.filter((s) => s.status === "ACTIVE").map((s) => s.seriesId));
    return seriesList
      .filter((s) => s.status === "ONGOING")
      .filter((s) => isEdit || !existing.has(s.id))
      .map((s) => ({ value: String(s.id), label: s.title }));
  }, [seriesList, schedules, isEdit]);

  const handleSubmit = async () => {
    if (!isEdit && !selectedSeries) {
      addToast({ type: "warning", title: "Please select a series" });
      return;
    }

    const body = { scheduleType, startDate };
    if (scheduleType === "WEEKLY") {
      body.dayOfWeek = selectedDay;
    } else {
      body.dayOfMonth = dayOfMonth;
    }

    try {
      if (isEdit) {
        await scheduleService.update(scheduleData.id, body);
        addToast({
          type: "success",
          title: "Schedule updated",
          message: scheduleData.seriesTitle,
        });
      } else {
        await scheduleService.create(Number(selectedSeries), body);
        addToast({
          type: "success",
          title: "Schedule created",
          message: `Schedule created for series #${selectedSeries}`,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      addToast({
        type: "error",
        title: isEdit ? "Failed to update schedule" : "Failed to create schedule",
        message: err.message,
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Schedule" : "Create New Schedule"}
      size="md"
    >
      <div className="space-y-6">
        {isEdit ? (
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant block">Series</label>
            <div className="relative ambient-glow rounded-xl overflow-hidden">
              <Film className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                readOnly
                value={scheduleData.seriesTitle}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface/60 text-sm cursor-not-allowed"
              />
            </div>
            <div className="flex gap-4 text-xs text-on-surface-variant">
              <span>Next: Ch.{scheduleData.nextChapterNumber}</span>
              <span>Miss count: {scheduleData.missCount}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant block">Select Series</label>
            <div className="relative ambient-glow rounded-xl overflow-hidden">
              <Film className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <select
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface focus:border-primary focus:ring-0 transition-all appearance-none cursor-pointer text-sm"
              >
                <option value="">Search existing series...</option>
                {seriesOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" size={18} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-on-surface-variant block">Schedule Type</label>
          <div className="flex bg-surface-container-low border border-outline-variant/30 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setScheduleType("WEEKLY")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                scheduleType === "WEEKLY"
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              )}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setScheduleType("MONTHLY")}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                scheduleType === "MONTHLY"
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        {scheduleType === "WEEKLY" && (
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant block">Release Day</label>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDay(day.value)}
                  className={cn(
                    "h-12 rounded-lg text-sm font-medium flex items-center justify-center transition-all",
                    selectedDay === day.value
                      ? "bg-primary-container/20 text-primary border-2 border-primary font-bold"
                      : "border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {scheduleType === "MONTHLY" && (
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant block">Day of Month</label>
            <div className="relative ambient-glow rounded-xl overflow-hidden">
              <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface focus:border-primary focus:ring-0 transition-all text-sm outline-none"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-on-surface-variant block">Start Date</label>
          <div className="relative ambient-glow rounded-xl overflow-hidden">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface focus:border-primary focus:ring-0 transition-all text-sm outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container-high transition-all border border-outline-variant/30"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] py-3 rounded-xl text-sm font-medium bg-primary text-on-primary hover:brightness-110 active:scale-95 shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {isEdit ? "Save Changes" : "Confirm Schedule"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

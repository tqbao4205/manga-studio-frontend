import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft, ChevronRight, Download, Upload,
  Trophy, AlertTriangle, FileSpreadsheet, RefreshCw,
} from "lucide-react"
import { useRankingStore } from "../../app/stores/rankingStore"
import { useUIStore } from "../../app/stores/uiStore"
import { Dialog } from "../../shared/components/ui/dialog"
import { Button } from "../../shared/components/ui/button"
import { EmptyState } from "../../shared/components/shared/EmptyState"
import { LoadingSpinner } from "../../shared/components/shared/LoadingSpinner"
import { cn } from "../../shared/utils"
import { useAuthStore } from "../../app/stores/authStore"
import rankingService from "../../services/rankingService"

function getWeekLabel(year, week) {
  return `${year}-W${String(week).padStart(2, "0")}`
}

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  return { year: now.getFullYear(), week: Math.min(week, 52) }
}

function prevWeek(year, week) {
  if (week === 1) return { year: year - 1, week: 52 }
  return { year, week: week - 1 }
}

function nextWeek(year, week, current) {
  if (year >= current.year && week >= current.week) return { year, week }
  if (week === 52) return { year: year + 1, week: 1 }
  return { year, week: week + 1 }
}

export function WeeklyRanking() {
  const { weeklyRankings, isLoading, error, fetchWeekly, clearError } = useRankingStore()
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === "EDITORIAL_BOARD" || user?.role === "CHIEF_EDITOR"
  const canExport = canEdit
  const canImport = canEdit

  const current = getCurrentWeek()
  const [year, setYear] = useState(current.year)
  const [week, setWeek] = useState(current.week)

  const weekLabel = getWeekLabel(year, week)

  useEffect(() => {
    fetchWeekly(weekLabel)
  }, [year, week])

  const [importOpen, setImportOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const goPrev = useCallback(() => {
    const p = prevWeek(year, week)
    setYear(p.year)
    setWeek(p.week)
  }, [year, week])

  const goNext = useCallback(() => {
    const n = nextWeek(year, week, current)
    setYear(n.year)
    setWeek(n.week)
  }, [year, week, current])

  const handleExport = async () => {
    try {
      addToast({ type: "info", title: "Exporting...", message: "Preparing weekly scoring form." })
      const res = await rankingService.exportWeekly(weekLabel)
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `weekly-scoring-${weekLabel}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast({ type: "success", title: "Exported", message: "Weekly form downloaded." })
    } catch (err) {
      addToast({ type: "error", title: "Export failed", message: err.message })
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      await rankingService.importWeekly(formData, weekLabel)
      addToast({ type: "success", title: "Import successful", message: "Weekly rankings updated." })
      setImportOpen(false)
      setSelectedFile(null)
      fetchWeekly(weekLabel)
    } catch (err) {
      addToast({ type: "error", title: "Import failed", message: err.message })
    }
  }

  return (
    <div className="space-y-4">
      {/* Period picker + actions */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
        style={{
          background: "rgba(27, 27, 29, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(73, 69, 79, 0.3)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-on-surface min-w-[140px] text-center select-none">
            {weekLabel}
          </span>
          <button
            onClick={goNext}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-xs text-on-surface-variant/60">
          {weeklyRankings.length} series ranked
        </span>
        <div className="ml-auto flex items-center gap-3">
          {canExport && (
            <button
              onClick={handleExport}
              className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm"
            >
              <Download size={16} />
              Export
            </button>
          )}
          {canImport && (
            <button
              onClick={() => setImportOpen(true)}
              className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm"
            >
              <Upload size={16} />
              Import
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title="Failed to load"
            description={error}
            action={
              <Button onClick={() => { clearError(); fetchWeekly(weekLabel) }}>
                <RefreshCw className="mr-2" size={16} />
                Retry
              </Button>
            }
          />
        </div>
      ) : weeklyRankings.length === 0 ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(27, 27, 29, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(73, 69, 79, 0.3)" }}>
          <EmptyState
            icon={<Trophy size={32} />}
            title="No weekly rankings yet"
            description="Import scoring data for this week to see rankings."
            action={canEdit ? (
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="mr-2" size={16} />
                Import Data
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(27, 27, 29, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(73, 69, 79, 0.3)",
          }}
        >
          <div className="divide-y divide-outline-variant/10">
            {weeklyRankings.map((entry) => (
              <div
                key={entry.seriesId}
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors",
                  entry.mangakaName === user?.displayName || entry.tantouEditorName === user?.displayName
                    ? "bg-primary/5 border-l-2 border-primary"
                    : "hover:bg-surface-container"
                )}
              >
                <span className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shrink-0",
                  entry.rank <= 3 ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface-variant",
                )}>
                  #{entry.rank}
                </span>
                {entry.trend && (
                  <span className={cn(
                    "w-5 text-center shrink-0 text-sm font-bold",
                    entry.trend === "UP" && "text-emerald-400",
                    entry.trend === "DOWN" && "text-red-400",
                    entry.trend === "SAME" && "text-gray-500",
                    entry.trend === "NEW" && "text-blue-400",
                  )}>
                    {entry.trend === "UP" && "↑"}
                    {entry.trend === "DOWN" && "↓"}
                    {entry.trend === "SAME" && "→"}
                    {entry.trend === "NEW" && "✦"}
                  </span>
                )}
                {entry.coverImageUrl ? (
                  <img src={entry.coverImageUrl} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-11 rounded shrink-0" style={{ backgroundColor: entry.coverColor || '#6B21A8' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{entry.seriesTitle}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">
                    {entry.mangakaName || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">
                      {(entry.totalVotes ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50">votes</p>
                  </div>
                  <div className="text-right min-w-[48px]">
                    <p className="text-sm font-semibold text-primary">
                      {entry.avgScore?.toFixed(1) ?? "—"}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50">avg</p>
                  </div>
                  <div className="text-right min-w-[64px]">
                    <p className="text-sm font-semibold text-on-surface">
                      {entry.score?.toFixed(0) ?? "—"}
                    </p>
                    <p className="text-[11px] text-on-surface-variant/50">score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog
        open={importOpen}
        onClose={() => { setImportOpen(false); setSelectedFile(null) }}
        title="Import Weekly Scoring"
        description={`Upload an Excel file (.xlsx) with voting data for ${weekLabel}.`}
        size="md"
      >
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low",
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) setSelectedFile(file)
          }}
          onClick={() => document.getElementById("weekly-file-input")?.click()}
        >
          <input
            id="weekly-file-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setSelectedFile(file)
            }}
          />
          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet size={28} />
              </div>
              <p className="text-sm font-medium text-on-surface">{selectedFile.name}</p>
              <p className="text-xs text-on-surface-variant/60">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                className="text-xs text-on-surface-variant hover:text-status-danger transition-colors underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-xl bg-surface-container-high text-on-surface-variant">
                <Upload size={28} />
              </div>
              <p className="text-sm text-on-surface">
                <span className="text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-on-surface-variant/60">
                .xlsx or .xls files only
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-5">
          <button
            onClick={() => { setImportOpen(false); setSelectedFile(null) }}
            className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile}
            className="flex-[2] py-3 rounded-xl bg-primary text-on-primary hover:brightness-110 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Import & Calculate
          </button>
        </div>
      </Dialog>
    </div>
  )
}

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  ChevronLeft, ChevronRight, Download, Upload, History,
  Trophy, AlertTriangle,
  Medal, FileSpreadsheet, BarChart3, RefreshCw,
} from "lucide-react"
import { useRankingStore } from "../../app/stores/rankingStore"
import { useUIStore } from "../../app/stores/uiStore"
import { Dialog } from "../../shared/components/ui/dialog"
import { Button } from "../../shared/components/ui/button"
import { EmptyState } from "../../shared/components/shared/EmptyState"
import { LoadingSpinner } from "../../shared/components/shared/LoadingSpinner"
import { cn } from "../../shared/utils"
import rankingService from "../../services/rankingService"
import { monthStr } from "../../utils/dateUtils"

const TIER_CONFIG = {
  S: {
    label: "S", title: "Top Tier", icon: Trophy, color: "#fbbf24",
    gradient: "from-amber-500/15", border: "border-amber-500/25", bg: "bg-amber-500/[0.04]",
    glow: "shadow-amber-500/10", textColor: "text-amber-400",
  },
  A: {
    label: "A", title: "High Tier", icon: Medal, color: "#9ca3af",
    gradient: "from-zinc-400/15", border: "border-zinc-400/25", bg: "bg-zinc-400/[0.04]",
    glow: "shadow-zinc-400/10", textColor: "text-zinc-300",
  },
  B: {
    label: "B", title: "Mid Tier", icon: BarChart3, color: "#d97706",
    gradient: "from-orange-500/15", border: "border-orange-500/25", bg: "bg-orange-500/[0.04]",
    glow: "shadow-orange-500/10", textColor: "text-orange-400",
  },
  C: {
    label: "C", title: "Low Tier", icon: AlertTriangle, color: "#dc2626",
    gradient: "from-red-500/15", border: "border-red-500/25", bg: "bg-red-500/[0.04]",
    glow: "shadow-red-500/10", textColor: "text-red-400", warn: true,
  },
  D: {
    label: "D", title: "Under Performance", icon: AlertTriangle, color: "#6b7280",
    gradient: "from-gray-500/15", border: "border-gray-500/25", bg: "bg-gray-500/[0.04]",
    glow: "shadow-gray-500/10", textColor: "text-gray-400", danger: true,
  },
}

const TIER_ORDER = ["S", "A", "B", "C", "D"]

function TierCard({ entry, maxVotes, tierCfg }) {
  const pct = maxVotes > 0 ? Math.round((entry.totalVotes / maxVotes) * 100) : 0

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
        "hover:bg-surface-container border border-transparent hover:border-outline-variant/20",
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shrink-0",
          tierCfg.bg, tierCfg.textColor,
        )}>
          #{entry.rank}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">{entry.seriesTitle}</p>
          <p className="text-xs text-on-surface-variant/60 mt-0.5">
            {entry.mangakaName || "—"} {entry.genre ? `· ${entry.genre}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="w-28">
          <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${tierCfg.color}88, ${tierCfg.color})`,
                boxShadow: `0 0 8px ${tierCfg.color}44`,
              }}
            />
          </div>
        </div>
        <div className="text-right min-w-[80px]">
          <p className={cn("text-sm font-semibold", tierCfg.textColor)}>
            {(entry.totalVotes ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-on-surface-variant/50">votes</p>
        </div>
      </div>
    </div>
  )
}

export function RankingPage() {
  const { rankings, history, isLoading, error, fetchAll, fetchHistory, clearError } = useRankingStore()
  const addToast = useUIStore((s) => s.addToast)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  useEffect(() => {
    fetchAll(year, month)
    fetchHistory()
  }, [year, month])

  const [importOpen, setImportOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { year: "numeric", month: "long" })

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }, [month])

  const grouped = useMemo(() => {
    const map = {}
    TIER_ORDER.forEach((t) => { map[t] = [] })

    const sorted = [...rankings].sort((a, b) => a.rank - b.rank)
    sorted.forEach((r) => {
      const tier = r.tier || "D"
      if (map[tier]) map[tier].push(r)
      else map[tier] = [r]
    })
    return map
  }, [rankings])

  const maxVotes = useMemo(() => {
    if (!rankings.length) return 0
    return Math.max(...rankings.map((r) => r.totalVotes))
  }, [rankings])

  const hasRankings = rankings.length > 0

  const handleExport = async () => {
    try {
      addToast({ type: "info", title: "Exporting...", message: "Preparing scoring form." })
      const res = await rankingService.exportForm({ month: monthStr(year, month) })
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `scoring-form-${monthStr(year, month)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast({ type: "success", title: "Exported", message: "Scoring form downloaded." })
    } catch (err) {
      addToast({ type: "error", title: "Export failed", message: err.message })
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleImport = async () => {
    if (!selectedFile) return
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const fileMonth = selectedFile.name.match(/scoring-form-(\d{4}-\d{2})/)?.[1] || monthStr(year, month)
      await rankingService.importExcel(formData, fileMonth)
      addToast({ type: "success", title: "Import successful", message: "Rankings updated." })
      setImportOpen(false)
      setSelectedFile(null)
      fetchAll(year, month)
    } catch (err) {
      addToast({ type: "error", title: "Import failed", message: err.message })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
            <span>Editorial Suite</span>
            <ChevronRight size={14} />
            <span className="text-primary">Rankings</span>
          </nav>
          <h1 className="text-[32px] font-bold text-on-surface tracking-tight leading-tight">
            Rankings
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm"
          >
            <History size={16} />
            History
          </button>
        </div>
      </div>

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
            onClick={prevMonth}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-on-surface min-w-[140px] text-center select-none">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {hasRankings && (
          <span className="text-xs text-on-surface-variant/60">
            {rankings.length} series ranked
          </span>
        )}
      </div>

      {isLoading ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(27, 27, 29, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(73, 69, 79, 0.3)",
          }}
        >
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(27, 27, 29, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(73, 69, 79, 0.3)",
          }}
        >
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title="Failed to load rankings"
            description={error}
            action={
              <Button onClick={() => { clearError(); fetchAll(year, month) }}>
                <RefreshCw className="mr-2" size={16} />
                Retry
              </Button>
            }
          />
        </div>
      ) : !hasRankings ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(27, 27, 29, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(73, 69, 79, 0.3)",
          }}
        >
          <EmptyState
            icon={<Trophy size={32} />}
            title="No rankings yet"
            description="Import scoring data or wait for the next ranking period."
            action={
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="mr-2" size={16} />
                Import Data
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {TIER_ORDER.map((tier) => {
            const entries = grouped[tier]
            if (!entries || entries.length === 0) return null

            const cfg = TIER_CONFIG[tier]
            const Icon = cfg.icon

            return (
              <div
                key={tier}
                className={cn(
                  "rounded-2xl overflow-hidden border transition-all",
                  cfg.border,
                  cfg.danger ? "shadow-[0_0_20px_rgba(255,255,255,0.03)]" : "",
                )}
                style={{
                  background: `linear-gradient(135deg, rgba(27,27,29,0.75) 0%, rgba(32,31,33,0.7) 100%)`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className={cn(
                  "flex items-center justify-between px-5 py-3 border-b bg-surface-container-low/30",
                  cfg.border,
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", cfg.bg)}>
                      <Icon size={16} className={cfg.textColor} />
                    </div>
                    <span className={cn("text-sm font-semibold", cfg.textColor)}>
                      Tier {cfg.label}
                    </span>
                    <span className="text-xs text-on-surface-variant/50">
                      — {cfg.title}
                    </span>
                    {cfg.danger && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-danger/15 text-status-danger text-[11px] font-medium">
                        <AlertTriangle size={11} />
                        At Risk
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-on-surface-variant/40">
                    {entries.length} {entries.length === 1 ? "series" : "series"}
                  </span>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {entries.map((entry) => (
                    <TierCard
                      key={entry.seriesId}
                      entry={entry}
                      maxVotes={maxVotes}
                      tierCfg={cfg}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog
        open={importOpen}
        onClose={() => { setImportOpen(false); setSelectedFile(null) }}
        title="Import Scoring Data"
        description="Upload an Excel file (.xlsx) with voting data to calculate rankings."
        size="md"
      >
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("ranking-file-input")?.click()}
        >
          <input
            id="ranking-file-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
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

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Ranking History"
        description="Past ranking periods and their results."
        size="lg"
      >
        {history.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<History size={28} />}
              title="No history yet"
              description="Ranking history will appear after each scoring period."
            />
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {history.map((period, pi) => (
              <div
                key={pi}
                className="rounded-xl border border-outline-variant/20 overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-surface-container-low/50 border-b border-outline-variant/10">
                  <p className="text-sm font-medium text-on-surface">{period.periodLabel}</p>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {(period.entries ?? [])
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((entry, ei) => (
                      <div key={ei} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={cn(
                            "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0",
                            "bg-surface-container-high text-on-surface-variant",
                          )}>
                            #{entry.rank}
                          </span>
                          <span className="text-sm text-on-surface truncate">{entry.seriesTitle}</span>
                        </div>
                        <span className="text-sm text-on-surface-variant shrink-0 ml-4">
                          {(entry.totalVotes ?? 0).toLocaleString()} votes
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end pt-5">
          <button
            onClick={() => setHistoryOpen(false)}
            className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all text-sm font-medium"
          >
            Close
          </button>
        </div>
      </Dialog>
    </div>
  )
}

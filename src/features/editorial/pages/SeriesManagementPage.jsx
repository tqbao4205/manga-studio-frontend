import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronRight, AlertTriangle } from 'lucide-react'
import { useSeriesStore } from '../../../app/stores/seriesStore'
import { useRankingStore } from '../../../app/stores/rankingStore'
import { useUIStore } from '../../../app/stores/uiStore'
import seriesService from '../../../services/seriesService'
import { cn } from '../../../shared/utils'
import { Dialog } from '../../../shared/components/ui/dialog'
import { LoadingSpinner } from '../../../shared/components/shared/LoadingSpinner'

const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_TANTOU: 'Pending Lead Editor',
  PENDING_BOARD_VOTE: 'Pending Editorial Review',
  ONGOING: 'Ongoing',
  HIATUS: 'Hiatus',
  AT_RISK: 'At Risk',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
}

const STATUS_COLORS = {
  ONGOING: 'bg-green-500/10 text-green-400 border-green-500/20',
  AT_RISK: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIATUS: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DRAFT: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const TRANSITIONS = {
  ONGOING: ['HIATUS', 'AT_RISK', 'CANCELLED', 'COMPLETED'],
  AT_RISK: ['ONGOING', 'CANCELLED'],
  HIATUS: ['ONGOING', 'CANCELLED'],
}

export function SeriesManagementPage() {
  const { seriesList, isLoading, error, fetchAll } = useSeriesStore()
  const { atRiskSeries, fetchAtRisk } = useRankingStore()
  const addToast = useUIStore((s) => s.addToast)

  const [search, setSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    fetchAll({ size: 100 })
    fetchAtRisk()
  }, [])

  const atRiskMap = useMemo(() => {
    const map = {}
    atRiskSeries.forEach((item) => {
      map[item.seriesId] = item
    })
    return map
  }, [atRiskSeries])

  const filtered = useMemo(() => {
    if (!search) return seriesList
    const q = search.toLowerCase()
    return seriesList.filter((s) => s.title?.toLowerCase().includes(q))
  }, [seriesList, search])

  const handleStatusChange = (seriesId, newStatus) => {
    if (newStatus === 'CANCELLED') {
      setPendingAction({ seriesId, status: newStatus })
      setConfirmOpen(true)
    } else {
      doUpdateStatus(seriesId, newStatus)
    }
  }

  const doUpdateStatus = async (seriesId, status) => {
    setUpdatingId(seriesId)
    try {
      await seriesService.updateStatus(seriesId, { status })
      addToast({ type: 'success', title: 'Status updated', message: `Series is now ${STATUS_LABELS[status] || status}` })
      fetchAll({ size: 100 })
      fetchAtRisk()
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: err.message })
    } finally {
      setUpdatingId(null)
      setConfirmOpen(false)
      setPendingAction(null)
    }
  }

  const getAvailableOptions = (status) => {
    if (status === 'CANCELLED' || status === 'COMPLETED') return []
    return TRANSITIONS[status] || []
  }

  return (
    <div className="px-10 py-10 max-w-[1400px] mx-auto" style={{ fontFamily: 'Geist, sans-serif' }}>
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
        <span>Editorial Suite</span>
        <ChevronRight size={14} />
        <span className="text-primary">Series Management</span>
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-white mb-8">Series Management</h1>

      {/* Search */}
      <div className="glass-panel rounded-3xl p-4 mb-8 border border-outline-variant/20">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series title..."
            className="w-full bg-surface-container-lowest border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white placeholder:text-outline transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
          <h3 className="text-xl font-bold text-white mb-2">Failed to load series</h3>
          <p className="text-on-surface-variant">{error}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-outline-variant/20">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Title</div>
            <div className="col-span-2">Schedule</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-outline-variant/10">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-3">search_off</span>
                <p className="text-on-surface-variant">No series match your search.</p>
              </div>
            ) : (
              filtered.map((series, idx) => {
                const atRisk = atRiskMap[series.id]
                const isAtRisk = series.status === 'AT_RISK'
                const options = getAvailableOptions(series.status)

                return (
                  <div key={series.id}
                    className={cn(
                      'grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors',
                      isAtRisk ? 'bg-red-500/5' : 'hover:bg-surface-container-low',
                    )}
                  >
                    <div className="col-span-1 text-sm text-on-surface-variant">
                      {idx + 1}
                    </div>
                    <div className="col-span-7 flex items-center gap-3 min-w-0">
                      {series.coverImageUrl ? (
                        <img src={series.coverImageUrl} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-11 rounded shrink-0" style={{ backgroundColor: series.coverColor || '#6B21A8' }} />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                          {series.title}
                          {isAtRisk && <span className="text-red-400 text-xs">⚠️</span>}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-on-surface-variant">
                      {series.scheduleType || '\u2014'}
                    </div>
                    <div className="col-span-2">
                      {options.length > 0 ? (
                        <select
                          value={series.status}
                          onChange={(e) => handleStatusChange(series.id, e.target.value)}
                          disabled={updatingId === series.id}
                          className={cn(
                            'appearance-none w-full bg-surface-container-high border rounded-xl px-3 py-2 text-sm font-medium cursor-pointer transition-all',
                            'focus:ring-2 focus:ring-primary/50',
                            updatingId === series.id && 'opacity-50 cursor-wait',
                            STATUS_COLORS[series.status] || 'text-on-surface border-outline-variant/30',
                          )}
                        >
                          <option value={series.status} disabled>
                            {STATUS_LABELS[series.status] || series.status}
                          </option>
                          {options.map((opt) => (
                            <option key={opt} value={opt} className="text-on-surface bg-surface-container">
                              {STATUS_LABELS[opt] || opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={cn(
                          'inline-block px-3 py-1.5 rounded-xl text-xs font-bold border',
                          STATUS_COLORS[series.status] || 'bg-surface-container-high text-on-surface-variant border-outline-variant/30',
                        )}>
                          {STATUS_LABELS[series.status] || series.status}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Confirm Cancel Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingAction(null) }}
        title="Cancel Series"
        description="Are you sure you want to cancel this series? This action cannot be undone."
        size="sm"
      >
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => { setConfirmOpen(false); setPendingAction(null) }}
            className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all text-sm font-medium"
          >
            Keep
          </button>
          <button
            onClick={() => {
              if (pendingAction) doUpdateStatus(pendingAction.seriesId, pendingAction.status)
            }}
            className="flex-[2] py-3 rounded-xl bg-red-500 text-white hover:brightness-110 transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16} /> Cancel Series
          </button>
        </div>
      </Dialog>
    </div>
  )
}

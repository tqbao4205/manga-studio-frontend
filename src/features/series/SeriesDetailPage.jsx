/*
  ==========================================================
  PAGE: SeriesDetailPage
  ROUTE: /series/:seriesId
  MỤC ĐÍCH: Xem chi tiết một series, danh sách chapters,
  overview, và rankings.
  QUYỀN TRUY CẬP:
    - MANGAKA (chủ series): Edit, New Chapter, Submit chapter
    - TANTOU_EDITOR: Submit to Board / Revise / Reject chapter
    - EDITORIAL_BOARD: Approve / Reject chapter, quản lý status series
  ==========================================================
*/

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Check, X, AlertTriangle, RotateCcw,
  Send,
} from 'lucide-react'
import { useSeriesDetail, useChaptersBySeries, useCurrentRankings } from '../../shared/hooks/useMockData'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { Button } from '../../shared/components/ui/button'
import { Tabs } from '../../shared/components/ui/tabs'
import { StatusBadge } from '../../shared/components/shared/StatusBadge'
import { EmptyState } from '../../shared/components/shared/EmptyState'
import { PageLoading } from '../../shared/components/shared/LoadingSpinner'
import { DataTable } from '../../shared/components/shared/DataTable'
import { Dialog } from '../../shared/components/ui/dialog'
import { getRankColor, cn } from '../../shared/utils'

/*
  ========== Cấu hình cột cho bảng chapters ==========
  Mỗi role sẽ thấy actions khác nhau dựa vào trạng thái chapter.
  - isMangaka: Submit (PLANNED/IN_PROGRESS), Resubmit (REVISION_REQUIRED)
  - isTantou: Submit to Board / Revise / Reject (IN_REVIEW/SUBMITTED)
  - isEb: Approve / Reject (PENDING_BOARD_APPROVAL)
*/
const chapterColumns = (isEditor, isTantou, isEb, isMangaka, handleStatusUpdate) => [
  { id: 'number', header: 'Ch.', accessorKey: 'chapterNumber', sortable: true, width: '60px' },
  { id: 'title', header: 'Title', cell: (row) => row.title || `Chapter ${row.chapterNumber}`, sortable: true },
  { id: 'pages', header: 'Pages', accessorKey: 'pageCount', width: '80px' },
  {
    id: 'progress', header: 'Progress', width: '140px',
    cell: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-black/[0.06] overflow-hidden">
          <div className={cn('h-full transition-all', row.progressPercent === 100 ? 'bg-status-success' : 'bg-primary')} style={{ width: `${row.progressPercent}%` }} />
        </div>
        <span className="text-xs text-on-surface-variant/60 tabular-nums">{row.progressPercent}%</span>
      </div>
    ),
  },
  { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} size="sm" />, width: '100px' },
  {
    id: 'deadline', header: 'Deadline', accessorKey: 'deadline', width: '110px',
    cell: (row) => row.deadline ? <span className="text-xs text-on-surface-variant/60">{row.deadline}</span> : <span className="text-xs text-on-surface-variant/30">—</span>,
  },
  {
    id: 'actions', header: 'Actions', width: '150px',
    cell: (row) => {
      if (isMangaka && (row.status === 'PLANNED' || row.status === 'IN_PROGRESS')) {
        return (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(row.id, 'IN_REVIEW') }}>
            <Send size={14} /> Submit
          </Button>
        )
      }
      if (isMangaka && row.status === 'IN_REVIEW') {
        return <span className="text-xs text-status-warning font-medium">Awaiting Tantou</span>
      }
      if (isMangaka && row.status === 'PENDING_BOARD_APPROVAL') {
        return <span className="text-xs text-status-warning font-medium">Submitted to Board</span>
      }
      if (isMangaka && row.status === 'REVISION_REQUIRED') {
        return (
          <Button variant="primary" size="sm" onClick={() => handleStatusUpdate(row.id, 'IN_REVIEW')}>
            <Send size={14} /> Resubmit
          </Button>
        )
      }
      if (isTantou && (row.status === 'IN_REVIEW' || row.status === 'SUBMITTED')) {
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-status-success" title="Submit to Editorial Board" onClick={() => handleStatusUpdate(row.id, 'PENDING_BOARD_APPROVAL')}>
              <Send size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="text-status-warning" title="Request changes" onClick={() => handleStatusUpdate(row.id, 'REVISION_REQUIRED')}>
              <RotateCcw size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="text-status-danger" title="Reject chapter" onClick={() => handleStatusUpdate(row.id, 'REJECTED')}>
              <X size={14} />
            </Button>
          </div>
        )
      }
      if (isEb && row.status === 'PENDING_BOARD_APPROVAL') {
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-status-success" title="Approve chapter" onClick={() => handleStatusUpdate(row.id, 'APPROVED')}>
              <Check size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="text-status-danger" title="Reject chapter" onClick={() => handleStatusUpdate(row.id, 'REJECTED')}>
              <X size={14} />
            </Button>
          </div>
        )
      }
      return null
    },
  },
]

export function SeriesDetailPage() {
  const { seriesId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateSeries = useSeriesStore((s) => s.updateSeries)
  const updateChapterStatus = useSeriesStore((s) => s.updateChapterStatus)
  const chapters = useSeriesStore((s) => s.chapters)
  const seriesList = useSeriesStore((s) => s.seriesList)
  const addToast = useUIStore((s) => s.addToast)
  const id = Number(seriesId)
  const { data: seriesFromMock, isLoading: seriesLoading } = useSeriesDetail(id)
  const { data: chaptersData, isLoading: chaptersLoading } = useChaptersBySeries(id)
  const { data: rankingsData, isLoading: rankingsLoading } = useCurrentRankings()
  const [tab, setTab] = useState('chapters')

  /*
    series: ưu tiên dữ liệu từ API mock, fallback về seriesStore
    ranking: thông tin xếp hạng hiện tại
    role checks: xác định quyền của user hiện tại
  */
  const series = seriesFromMock || seriesList.find((s) => s.id === id)
  const ranking = rankingsData?.content?.find(r => r.seriesId === id)
  const isMangaka = user?.role === 'MANGAKA'
  const isTantou = user?.role === 'TANTOU_EDITOR'
  const isEb = user?.role === 'EDITORIAL_BOARD'
  const isOwner = isMangaka && series?.mangaka?.displayName === user?.displayName
  const isEditor = isTantou || isEb
  const seriesChapters = chapters[id] || chaptersData?.content || []

  if (seriesLoading || chaptersLoading || rankingsLoading) return <PageLoading />

  if (!series) {
    return <EmptyState title="Series not found" description="The series you're looking for doesn't exist." />
  }

  /** Cập nhật trạng thái chapter và hiển thị toast thông báo */
  const handleChapterStatusUpdate = (chapterId, newStatus) => {
    updateChapterStatus(chapterId, newStatus)
    const labels = { PENDING_BOARD_APPROVAL: 'submitted to Editorial Board', APPROVED: 'approved', REVISION_REQUIRED: 'requested revision', REJECTED: 'rejected' }
    addToast({ type: 'success', title: 'Chapter updated', message: `Chapter has been ${labels[newStatus] || newStatus}.` })
  }

  /** Hiển thị actions quản lý status series (chỉ EDITORIAL_BOARD) */
  const statusActions = () => {
    if (!isEb) return null
    const actions = []
    if (series.status === 'ONGOING') {
      actions.push(
        { label: 'Mark At Risk', status: 'AT_RISK', variant: 'warning' },
        { label: 'Put on Hiatus', status: 'HIATUS', variant: 'warning' },
        { label: 'Complete Series', status: 'COMPLETED', variant: 'primary' },
      )
    }
    if (series.status === 'AT_RISK') {
      actions.push(
        { label: 'Restore to Ongoing', status: 'ONGOING', variant: 'primary' },
        { label: 'Initiate Cancellation', status: 'CANCELLED', variant: 'danger' },
      )
    }
    if (series.status === 'HIATUS') {
      actions.push(
        { label: 'Resume', status: 'ONGOING', variant: 'primary' },
      )
    }
    return actions.length > 0 ? (
      <div className="flex items-center gap-2">
        {series.status === 'AT_RISK' && (
          <span className="flex items-center gap-1 text-xs text-status-warning border border-status-warning/30 px-2 py-1 bg-status-warning/5">
            <AlertTriangle size={12} /> At Risk
          </span>
        )}
        {actions.map((a) => (
          <Button key={a.status} variant="outline" size="sm" onClick={() => { updateSeries(id, { status: a.status }); addToast({ type: 'success', title: 'Series status updated', message: `"${series.title}" is now ${a.label.toLowerCase()}.` }) }}>
            {a.status === 'CANCELLED' ? <X size={14} /> : null}
            {a.status === 'AT_RISK' ? <AlertTriangle size={14} /> : null}
            {a.label}
          </Button>
        ))}
      </div>
    ) : null
  }

  return (
    <div className="space-y-6">
      {/* Header: nút back + thông tin series + actions */}
      <div className="space-y-4">
        <button onClick={() => navigate('/series')} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors">
          <ArrowLeft size={16} /> Back to Series
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-28 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0" style={{ background: `linear-gradient(135deg, ${series.coverColor} 0%, ${series.coverColor}dd 100%)` }}>
              {series.title.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{series.title}</h1>
              {series.titleJp && <p className="text-sm text-on-surface-variant/70 mt-0.5">{series.titleJp}</p>}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <StatusBadge status={series.status} />
                <span className="text-xs text-on-surface-variant/60">{series.genre}</span>
                <span className="text-xs text-on-surface-variant/30">•</span>
                <span className="text-xs text-on-surface-variant/60">{series.targetDemographic}</span>
                {ranking && (
                  <>
                    <span className="text-xs text-on-surface-variant/30">•</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: getRankColor(ranking.tier) }}>
                      #{ranking.rank} · Tier {ranking.tier}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && series.status === 'DRAFT' && (
              <Button variant="outline" onClick={() => navigate(`/series/${id}/edit`)}>
                <Pencil size={14} /> Edit
              </Button>
            )}
            {isMangaka && (
              <Button onClick={() => navigate(`/series/${id}/chapters/new`)}>
                <Plus size={16} /> New Chapter
              </Button>
            )}
          </div>
        </div>

        {series.status === 'DRAFT' && isOwner && (
          <div className="border border-status-warning/30 bg-status-warning/5 p-4">
            <p className="text-sm text-on-surface-variant font-medium">
              Your series is in draft mode. Work on chapters in the workspace, then submit for Tantou review.
            </p>
          </div>
        )}

        {statusActions()}
      </div>

      {/* Tabs: Chapters / Overview / Rankings */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'chapters', label: 'Chapters', count: chaptersData?.content?.length || 0 },
          { value: 'overview', label: 'Overview' },
          { value: 'rankings', label: 'Rankings' },
        ]}
      />

      {tab === 'chapters' && (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={chapterColumns(isEditor, isTantou, isEb, isMangaka, handleChapterStatusUpdate)}
              data={seriesChapters}
              onRowClick={(row) => navigate(`/series/${id}/chapters/${row.id}`)}
              emptyMessage="No chapters yet. Create your first chapter!"
            />
          </CardContent>
        </Card>
      )}

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Synopsis</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-on-surface-variant/80 leading-relaxed">{series.synopsis}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="section-label">Mangaka</p>
                <p className="text-sm text-on-surface mt-0.5">{series.mangaka.displayName}</p>
              </div>
              {series.tantouEditor && (
                <div>
                  <p className="section-label">Tantou Editor</p>
                  <p className="text-sm text-on-surface mt-0.5">{series.tantouEditor.displayName}</p>
                </div>
              )}
              <div>
                <p className="section-label">Genre</p>
                <p className="text-sm text-on-surface mt-0.5">{series.genre}</p>
              </div>
              <div>
                <p className="section-label">Target Demographic</p>
                <p className="text-sm text-on-surface mt-0.5">{series.targetDemographic}</p>
              </div>
              <div>
                <p className="section-label">Total Chapters</p>
                <p className="text-sm text-on-surface mt-0.5 tabular-nums">{series.chapterCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'rankings' && ranking && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 p-4 bg-[#f5f0ef] border border-[#1c1b1b]/20">
              <div className="w-16 h-16 flex items-center justify-center text-2xl font-bold border-2" style={{ borderColor: getRankColor(ranking.tier), color: getRankColor(ranking.tier), background: `${getRankColor(ranking.tier)}08` }}>
                #{ranking.rank}
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">Current Position</p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5 tabular-nums">
                  Tier {ranking.tier} · {ranking.totalVotes.toLocaleString()} votes ·
                  Period: {ranking.periodLabel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

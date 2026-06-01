/**
 * ─────────────────────────────────────────────
 *  SeriesDetailPage — Trang chi ti?t series
 *  Route: /series/:seriesId
 * ─────────────────────────────────────────────
 *
 * M?c dích:
 *   - Hero section full-width v?i ?nh bìa + overlay
 *   - Statistics row (rank, chapters, progress, tasks)
 *   - Chapter List (table) bên trái
 *   - Series Info + Deadlines + Activity bên ph?i
 *
 * API g?i:
 *   - GET /api/series/{id}
 *   - GET /api/series/{seriesId}/chapters
 *   - PUT /api/chapters/{id} (khi update chapter status)
 *   - PATCH /api/series/{id}/status (khi EB d?i status series)
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Check, X, RotateCcw, Send, Edit,
  Star, Trophy, ArrowUp, Filter, SortAsc,
} from 'lucide-react'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { useUIStore } from '../../app/stores/uiStore'
import seriesService from '../../services/seriesService'
import { EmptyState } from '../../shared/components/shared/EmptyState'
import { PageLoading } from '../../shared/components/shared/LoadingSpinner'
import { cn } from '../../shared/utils'

// ── Status → color mapping cho chapter badges ──
const chapterStatusColor = {
  DRAFT: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
  PLANNED: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  IN_REVIEW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SUBMITTED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  PENDING_BOARD_APPROVAL: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REVISION_REQUIRED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PUBLISHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const chapterStatusLabel = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  SUBMITTED: 'Submitted',
  PENDING_BOARD_APPROVAL: 'Pending Board',
  APPROVED: 'Approved',
  REVISION_REQUIRED: 'Revision',
  REJECTED: 'Rejected',
  PUBLISHED: 'Published',
}

export function SeriesDetailPage() {
  const { seriesId } = useParams()
  const navigate = useNavigate()
  const id = Number(seriesId)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const { currentSeries, seriesLoading, seriesError, fetchById } = useSeriesStore()
  const { chapters, chaptersLoading, fetchChapters } = useSeriesStore()

  useEffect(() => {
    if (id) {
      fetchById(id)
      fetchChapters(id)
    }
  }, [id, fetchById, fetchChapters])

  const series = currentSeries
  const isMangaka = user?.role === 'MANGAKA'
  const isTantou = user?.role === 'TANTOU_EDITOR'
  const isEb = user?.role === 'EDITORIAL_BOARD'
  const isOwner = isMangaka && series?.mangaka?.id === user?.id

  // Tính toán deadlines s?p t?i t? chapters
  const upcomingDeadlines = useMemo(() => {
    if (!chapters || chapters.length === 0) return []
    return chapters
      .filter((ch) => ch.deadline && ch.status !== 'PUBLISHED' && ch.status !== 'APPROVED')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3)
  }, [chapters])

  // Loading state
  if (seriesLoading || chaptersLoading) return <PageLoading />

  // Error state
  if (seriesError) {
    return <EmptyState title="Error" description={seriesError} />
  }

  // Not found
  if (!series) {
    return <EmptyState title="Series not found" description="The series you're looking for doesn't exist." />
  }

  // ── Chapter status update handler ──
  const handleChapterStatusUpdate = async (chapterId, newStatus) => {
    try {
      await seriesService.updateChapter(chapterId, { status: newStatus })
      fetchChapters(id)
      const labelMap = {
        PENDING_BOARD_APPROVAL: 'submitted to Editorial Board',
        APPROVED: 'approved',
        REVISION_REQUIRED: 'requested revision',
        REJECTED: 'rejected',
        PUBLISHED: 'published',
        IN_REVIEW: 'submitted for review',
        SUBMITTED: 'resubmitted',
      }
      addToast({ type: 'success', title: 'Chapter updated', message: `Chapter has been ${labelMap[newStatus] || newStatus}.` })
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update chapter status.' })
    }
  }

  // ── Series status update handler (EB only) ──
  const handleSeriesStatusUpdate = async (newStatus) => {
    try {
      await seriesService.updateStatus(id, { status: newStatus })
      fetchById(id)
      addToast({ type: 'success', title: 'Series status updated', message: `"${series.title}" is now ${newStatus.toLowerCase().replace(/_/g, ' ')}.` })
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update series status.' })
    }
  }

  const mangaka = series.mangaka
  const tantou = series.tantouEditor

  // ── Format date helpers ──
  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}`
  }

  const formatMonthDay = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return { month: months[d.getMonth()], day: d.getDate() }
  }

  // ── Chapter action button theo role ──
  const renderChapterAction = (ch) => {
    if (isOwner && (ch.status === 'PLANNED' || ch.status === 'IN_PROGRESS')) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'IN_REVIEW') }}
          className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-xs font-medium font-bold whitespace-nowrap active:scale-95 transition-all"
        >
          Submit
        </button>
      )
    }
    if (isOwner && ch.status === 'IN_REVIEW') {
      return <span className="text-xs text-yellow-400 font-medium px-2">Awaiting</span>
    }
    if (isOwner && ch.status === 'PENDING_BOARD_APPROVAL') {
      return <span className="text-xs text-purple-400 font-medium px-2">Board</span>
    }
    if (isOwner && ch.status === 'REVISION_REQUIRED') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'SUBMITTED') }}
          className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-xs font-medium font-bold whitespace-nowrap active:scale-95 transition-all"
        >
          Resubmit
        </button>
      )
    }
    if (isTantou && (ch.status === 'IN_REVIEW' || ch.status === 'SUBMITTED')) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'PENDING_BOARD_APPROVAL') }}
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Submit to Board"
          ><Send size={14} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'REVISION_REQUIRED') }}
            className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
            title="Request revision"
          ><RotateCcw size={14} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'REJECTED') }}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            title="Reject"
          ><X size={14} /></button>
        </div>
      )
    }
    if (isEb && ch.status === 'PENDING_BOARD_APPROVAL') {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'APPROVED') }}
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Approve"
          ><Check size={14} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'REJECTED') }}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            title="Reject"
          ><X size={14} /></button>
        </div>
      )
    }
    if (isTantou && ch.status === 'APPROVED') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleChapterStatusUpdate(ch.id, 'PUBLISHED') }}
          className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-xs font-medium font-bold whitespace-nowrap active:scale-95 transition-all"
        >
          Publish
        </button>
      )
    }
    if (ch.status === 'PUBLISHED' || ch.status === 'APPROVED') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/series/${id}/chapters/${ch.id}`) }}
          className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg text-xs font-medium font-bold whitespace-nowrap transition-colors hover:bg-surface-container-high"
        >
          View Files
        </button>
      )
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${ch.id}`) }}
        className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-xs font-medium font-bold whitespace-nowrap active:scale-95 transition-all"
      >
        Open Workspace
      </button>
    )
  }

  // ── Deadline urgency class ──
  const getDeadlineUrgency = (deadline) => {
    if (!deadline) return ''
    const diff = new Date(deadline) - new Date()
    const days = diff / (1000 * 60 * 60 * 24)
    if (days < 0) return 'bg-red-500/10 border-red-500/20'
    if (days <= 3) return 'bg-red-500/5 border-red-500/10'
    return ''
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative w-full h-[400px] overflow-hidden shrink-0">
        {/* Cover image với fallback gradient */}
        {series.coverImageUrl ? (
          <img
            src={`${series.coverImageUrl}?t=${Date.now()}`}
            alt={`${series.title} cover`}
            className="w-full h-full object-cover brightness-[0.4] contrast-[1.1]"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${series.coverColor || '#131315'} 0%, #131315 100%)`,
            }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/series')}
          className="absolute top-6 left-6 z-10 flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft size={16} /> Back to Series
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 w-full p-container-padding flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="flex-1">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md">
                {series.genre}
              </span>
              <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md">
                {series.targetDemographic}
              </span>
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border',
                series.status === 'ONGOING' || series.status === 'PUBLISHED' || series.status === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-primary/20 text-primary border-primary/30',
              )}>
                {series.status === 'ONGOING' ? 'Active'
                  : series.status === 'PUBLISHED' ? 'Published'
                  : series.status === 'COMPLETED' ? 'Completed'
                  : series.status === 'CANCELLED' ? 'Cancelled'
                  : series.status === 'DRAFT' ? 'Draft'
                  : series.status === 'HIATUS' ? 'Hiatus'
                  : series.status === 'PENDING_APPROVAL' ? 'Pending'
                  : series.status}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-on-surface leading-tight">
              {series.title}
              {series.titleJp && (
                <span className="text-sm font-medium ml-4 text-on-surface-variant font-normal">
                  {series.titleJp}
                </span>
              )}
            </h2>

            {/* Tier + Ranking */}
            <div className="flex items-center gap-6 mt-4">
              {series.currentTier && (
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-tertiary fill-tertiary" />
                  <span className="text-sm font-medium text-on-surface">{series.currentTier}</span>
                </div>
              )}
              {series.currentRank && (
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-primary" />
                  <span className="text-sm font-medium text-on-surface">#{series.currentRank} Global Ranking</span>
                </div>
              )}
            </div>
          </div>

          {/* Edit + New Chapter buttons */}
          <div className="flex items-center gap-3">
            {isOwner && series.status === 'DRAFT' && (
              <button
                onClick={() => navigate(`/series/${id}/edit`)}
                className="flex items-center gap-2 bg-surface/60 hover:bg-surface transition-colors backdrop-blur-xl border border-outline-variant px-6 py-3 rounded-xl text-sm font-medium text-on-surface"
              >
                <Edit size={16} /> Edit Series
              </button>
            )}
            {isMangaka && series.status !== 'CANCELLED' && series.status !== 'COMPLETED' && (
              <button
                onClick={() => navigate(`/series/${id}/chapters/new`)}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-medium font-bold hover:brightness-110 active:scale-95 transition-all"
              >
                <Plus size={16} /> New Chapter
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ CONTENT CONTAINER ═══ */}
      <div className="p-container-padding flex flex-col gap-panel-gap">

        {/* ═══ EDITORIAL BOARD: Series status actions ═══ */}
        {isEb && series.status === 'ONGOING' && (
          <div className="flex items-center gap-3 pb-2">
            <button
              onClick={() => handleSeriesStatusUpdate('COMPLETED')}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-medium font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Complete Series
            </button>
            <button
              onClick={() => handleSeriesStatusUpdate('CANCELLED')}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-medium font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <X size={14} className="inline mr-1" /> Cancel Series
            </button>
          </div>
        )}

        {/* ═══ DRAFT / PENDING status toast ═══ */}
        {series.status === 'DRAFT' && isOwner && (
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-4">
            <p className="text-sm text-on-surface-variant font-medium">
              Your series is in draft mode. Work on chapters in the workspace, then submit for review.
            </p>
          </div>
        )}
        {series.status === 'PENDING_APPROVAL' && isOwner && (
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-4">
            <p className="text-sm text-on-surface-variant font-medium">
              Your series is under review. Wait for the editorial feedback.
            </p>
          </div>
        )}

        {/* ═══ STATISTICS ROW ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-panel-gap">
          {/* Current Rank */}
          <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30 hover:border-primary/30 transition-all group">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Current Rank</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-on-surface">
                {series.currentRank ? `#${series.currentRank}` : '—'}
              </h3>
              {series.currentRank && (
                <span className="text-emerald-400 text-xs font-medium flex items-center mb-1">
                  <ArrowUp size={16} />
                </span>
              )}
            </div>
          </div>

          {/* Total Chapters */}
          <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30 hover:border-primary/30 transition-all group">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Total Chapters</p>
            <h3 className="text-3xl font-bold text-on-surface">{series.chapterCount || 0}</h3>
          </div>

          {/* Manuscript Progress */}
          <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30 hover:border-primary/30 transition-all group">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Manuscript Progress</p>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-3xl font-bold text-on-surface">
                {chapters.length > 0
                  ? Math.round(chapters.reduce((sum, ch) => sum + (ch.progressPercent || 0), 0) / chapters.length)
                  : 0}%
              </h3>
              <div className="flex-1 bg-surface-container-highest rounded-full h-2 max-w-[100px]">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${chapters.length > 0
                      ? Math.round(chapters.reduce((sum, ch) => sum + (ch.progressPercent || 0), 0) / chapters.length)
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Active Tasks — placeholder */}
          <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30 hover:border-primary/30 transition-all group">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">Active Tasks</p>
            <h3 className="text-3xl font-bold text-on-surface">
              {chapters.filter((ch) => ch.status === 'IN_PROGRESS' || ch.status === 'IN_REVIEW' || ch.status === 'PLANNED').length}
            </h3>
          </div>
        </div>

        {/* ═══ MAIN CONTENT GRID: 8 + 4 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-panel-gap mb-12">

          {/* ─── LEFT COLUMN (8): Chapter List ─── */}
          <div className="lg:col-span-8 flex flex-col gap-base">
            <div className="bg-surface-container rounded-xl shadow-[0px_4px_20px_rgba(139,92,246,0.05)] overflow-hidden border border-outline-variant/30">
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-high/50">
                <h3 className="text-xl font-semibold text-on-surface">
                  Chapter List
                  <span className="text-on-surface-variant text-body-md ml-2 font-normal">({chapters.length})</span>
                </h3>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary transition-all">
                    <Filter size={18} />
                  </button>
                  <button className="p-2 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary transition-all">
                    <SortAsc size={18} />
                  </button>
                </div>
              </div>

              {/* Table */}
              {chapters.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-on-surface-variant">No chapters yet. Create your first chapter!</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                          <th className="px-6 py-4 font-medium">Chapter</th>
                          <th className="px-6 py-4 font-medium">Title</th>
                          <th className="px-6 py-4 font-medium">Progress</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium">Deadline</th>
                          <th className="px-6 py-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {chapters.map((ch) => (
                          <tr
                            key={ch.id}
                            className="hover:bg-surface-container-highest/20 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/series/${id}/chapters/${ch.id}`)}
                          >
                            <td className="px-6 py-4 text-sm font-medium text-on-surface">Ch. {ch.chapterNumber}</td>
                            <td className="px-6 py-4 text-sm font-medium text-on-surface">
                              {ch.title || `Chapter ${ch.chapterNumber}`}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 bg-surface-container-highest rounded-full h-1.5">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      ch.progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary',
                                    )}
                                    style={{ width: `${ch.progressPercent || 0}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-on-surface-variant tabular-nums">{ch.progressPercent || 0}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium border',
                                chapterStatusColor[ch.status] || 'bg-surface-container-highest text-on-surface-variant',
                              )}>
                                {chapterStatusLabel[ch.status] || ch.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                              {formatDate(ch.deadline) || '—'}
                            </td>
                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              {renderChapterAction(ch)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* View all link */}
                  {chapters.length > 5 && (
                    <div className="p-4 border-t border-outline-variant/20 flex justify-center bg-surface-container-low/30">
                      <button
                        onClick={() => {/* scroll or expand */}}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        View All {chapters.length} Chapters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN (4): Info + Deadlines + Activity ─── */}
          <div className="lg:col-span-4 flex flex-col gap-panel-gap">

            {/* Series Information */}
            <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30">
              <h4 className="text-xl font-semibold text-on-surface mb-6">Series Information</h4>
              <p className="text-base text-on-surface-variant mb-6 leading-relaxed">
                {series.synopsis || 'No synopsis available.'}
              </p>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-sm font-medium text-on-surface-variant">Author</span>
                  <span className="text-sm font-medium text-on-surface">{mangaka?.displayName || 'Unknown'}</span>
                </div>
                {tantou && (
                  <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                    <span className="text-sm font-medium text-on-surface-variant">Editor</span>
                    <span className="text-sm font-medium text-on-surface">{tantou.displayName}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-sm font-medium text-on-surface-variant">Genre</span>
                  <span className="text-sm font-medium text-on-surface">{series.genre}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-sm font-medium text-on-surface-variant">Demographic</span>
                  <span className="text-sm font-medium text-on-surface">{series.targetDemographic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">Start Date</span>
                  <span className="text-sm font-medium text-on-surface">
                    {series.createdAt ? formatDate(series.createdAt) || new Date(series.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30">
              <h4 className="text-xl font-semibold text-on-surface mb-6 flex items-center gap-2">
                Upcoming Deadlines
                {upcomingDeadlines.length > 0 && (
                  <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded-full">
                    {upcomingDeadlines.filter((d) => new Date(d.deadline) - new Date() < 3 * 24 * 60 * 60 * 1000).length} Alert
                  </span>
                )}
              </h4>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60">No upcoming deadlines.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingDeadlines.map((dl) => {
                    const md = formatMonthDay(dl.deadline)
                    const isUrgent = new Date(dl.deadline) - new Date() < 3 * 24 * 60 * 60 * 1000
                    return (
                      <div
                        key={dl.id}
                        className={cn(
                          'flex items-start gap-4 p-3 rounded-lg border transition-colors',
                          isUrgent ? 'bg-red-500/5 border-red-500/20' : 'hover:bg-surface-container-highest border-transparent',
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0',
                          isUrgent ? 'bg-red-500 text-white' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30',
                        )}>
                          <span className="text-[10px] leading-none uppercase">{md?.month}</span>
                          <span className="font-bold leading-none">{md?.day}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {dl.title ? `Ch. ${dl.chapterNumber}: ${dl.title}` : `Chapter ${dl.chapterNumber}`}
                          </p>
                          <p className={cn(
                            'text-xs font-medium',
                            isUrgent ? 'text-red-400' : 'text-on-surface-variant',
                          )}>
                            {isUrgent ? 'Critical' : 'Upcoming'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-surface-container rounded-xl p-6 shadow-[0px_4px_20px_rgba(139,92,246,0.05)] border border-outline-variant/30">
              <h4 className="text-xl font-semibold text-on-surface mb-6">Recent Activity</h4>
              <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/30">
                {chapters.filter((ch) => ch.updatedAt || ch.createdAt).slice(0, 3).map((ch, idx) => {
                  const isLatest = idx === 0
                  return (
                    <div key={ch.id} className="relative pl-8">
                      <div className={cn(
                        'absolute left-0 top-1 w-4 h-4 rounded-full border-4 border-surface',
                        isLatest ? 'bg-primary' : ch.status === 'PUBLISHED' || ch.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-primary-container',
                      )} />
                      <p className="text-sm font-medium text-on-surface">
                        {ch.status === 'PUBLISHED' ? 'Chapter Published'
                          : ch.status === 'APPROVED' ? 'Chapter Approved'
                          : ch.status === 'IN_REVIEW' ? 'Chapter Submitted'
                          : ch.status === 'IN_PROGRESS' ? 'Work Started'
                          : `Chapter ${ch.chapterNumber} Updated`}
                      </p>
                      <p className="text-base text-on-surface-variant text-[13px]">
                        {ch.title || `Chapter ${ch.chapterNumber}`} &mdash; {chapterStatusLabel[ch.status] || ch.status}
                      </p>
                      <p className="text-xs font-medium text-outline mt-1">
                        {ch.updatedAt ? formatDate(ch.updatedAt) : ch.createdAt ? formatDate(ch.createdAt) : ''}
                      </p>
                    </div>
                  )
                })}
                {chapters.length === 0 && (
                  <p className="text-sm text-on-surface-variant/60 pl-8">No recent activity.</p>
                )}
              </div>
              {chapters.length > 0 && (
                <button className="w-full mt-6 py-2 text-primary text-sm font-medium hover:underline">
                  View Full Audit Log
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

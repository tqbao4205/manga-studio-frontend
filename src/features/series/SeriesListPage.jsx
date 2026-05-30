import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { useTasks } from '../../shared/hooks/useMockData'
import { mockUsers, mockRegions, mockPages, mockChapters, mockRankings, seriesPlaceholder } from '../../shared/constants/mock-data'

const genres = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const statuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CANCELLED', 'COMPLETED']

const genreLabels = { ACTION: 'Action', FANTASY: 'Fantasy', ROMANCE: 'Romance', COMEDY: 'Comedy', DRAMA: 'Drama' }
const statusLabels = {
  DRAFT: 'Draft', IN_REVIEW: 'In Review', APPROVED: 'Approved', REJECTED: 'Rejected',
  PUBLISHED: 'Active', CANCELLED: 'Cancelled', COMPLETED: 'Completed',
}

const statusColorMap = {
  PUBLISHED: 'bg-green-500/10 text-green-400 border-green-500/20',
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  DRAFT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const tierColorMap = {
  'Pro Tier': 'bg-tertiary/10 text-tertiary border-tertiary/20',
  'Free Tier': 'bg-secondary/10 text-secondary border-secondary/20',
}

function getRank(seriesId) {
  const entry = mockRankings.find(r => r.seriesId === seriesId)
  return entry ? `#${String(entry.rank).padStart(2, '0')} Rank` : null
}

function getProgress(seriesId, chapters) {
  const seriesChapters = chapters[seriesId]
  if (!seriesChapters || seriesChapters.length === 0) return { label: 'Series Lifecycle', percent: 0 }
  const latest = seriesChapters.reduce((max, c) => c.chapterNumber > max.chapterNumber ? c : max, seriesChapters[0])
  const nextNum = latest.chapterNumber + 1
  return { label: `Chapter ${nextNum} Progress`, percent: latest.progressPercent ?? 0 }
}

export function SeriesListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const seriesList = useSeriesStore((s) => s.seriesList)
  const chapters = useSeriesStore((s) => s.chapters)
  const { data: allTasks } = useTasks()

  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [sortBy, setSortBy] = useState('latest')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(0)
  const [goToPage, setGoToPage] = useState('')
  const pageSize = 6

  const allSeries = useMemo(() => {
    if (user?.role !== 'ASSISTANT') return seriesList
    const taskSeriesIds = new Set()
    ;(allTasks || []).forEach(t => {
      if (t.assistantId !== user.id) return
      const regPage = Object.entries(mockRegions).find(([, regions]) => regions.some(r => r.id === t.regionId))
      if (!regPage) return
      const pageId = Number(regPage[0])
      const chPage = Object.entries(mockPages).find(([, pages]) => pages.some(p => p.id === pageId))
      if (!chPage) return
      const chapterId = Number(chPage[0])
      const chData = Object.values(mockChapters).flat().find(c => c.id === chapterId)
      if (chData) taskSeriesIds.add(chData.seriesId)
    })
    return seriesList.filter(s => taskSeriesIds.has(s.id))
  }, [seriesList, user, allTasks])

  const filtered = useMemo(() => {
    let result = allSeries.filter((s) => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.titleJp?.toLowerCase().includes(search.toLowerCase())) return false
      if (genre !== 'ALL' && s.genre !== genre) return false
      if (status !== 'ALL' && s.status !== status) return false
      if (activeTab === 'favorites' && (s.rating || 0) < 4.7) return false
      if (activeTab === 'archived' && s.status !== 'CANCELLED' && s.status !== 'COMPLETED' && s.status !== 'REJECTED') return false
      return true
    })

    switch (sortBy) {
      case 'popularity':
        result.sort((a, b) => (b.chapterCount || 0) - (a.chapterCount || 0))
        break
      case 'ranking':
        result.sort((a, b) => {
          const ra = mockRankings.find(r => r.seriesId === a.id)?.rank ?? 999
          const rb = mockRankings.find(r => r.seriesId === b.id)?.rank ?? 999
          return ra - rb
        })
        break
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return result
  }, [allSeries, search, genre, status, activeTab, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  useEffect(() => { setPage(0) }, [search, genre, status, activeTab, sortBy])

  const handleGoToPage = (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(goToPage, 10)
      if (!isNaN(p) && p >= 1 && p <= totalPages) setPage(p - 1)
      setGoToPage('')
    }
  }

  return (
    <div className="px-10 py-10 max-w-[1400px] mx-auto" style={{ fontFamily: 'Geist, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">Manga Series</h1>
          <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
            Manage and track your active manga production pipeline from draft to final publication.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
          {['all', 'favorites', 'archived'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
                activeTab === tab
                  ? 'bg-surface-container-highest text-white'
                  : 'text-on-surface-variant hover:text-white font-medium'
              }`}
            >
              {tab === 'all' ? 'All Series' : tab === 'favorites' ? 'Favorites' : 'Archived'}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 mb-10 flex flex-col lg:flex-row gap-4 items-center border border-outline-variant/20">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series title, author, or tag..."
            className="w-full bg-surface-container-lowest border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white placeholder:text-outline transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Genre Filter */}
          <div className="relative group">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer"
            >
              <option value="ALL">Genre</option>
              {genres.map(g => <option key={g} value={g}>{genreLabels[g]}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-xl">expand_more</span>
          </div>
          {/* Status Filter */}
          <div className="relative group">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer"
            >
              <option value="ALL">Status</option>
              {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-xl">expand_more</span>
          </div>
          {/* Sort By */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer"
            >
              <option value="latest">Sort By: Latest</option>
              <option value="popularity">Popularity</option>
              <option value="ranking">Ranking</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-xl">swap_vert</span>
          </div>
        </div>
      </div>

      {/* Series Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">auto_stories</span>
          <h3 className="text-xl font-bold text-white mb-2">No series found</h3>
          <p className="text-on-surface-variant">Try changing your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paginated.map((series) => {
            const rank = getRank(series.id)
            const progress = getProgress(series.id, chapters)
            const coverUrl = series.coverImageUrl || seriesPlaceholder(series.title, series.coverColor)
            const mangaka = mockUsers.find(u => u.id === series.mangakaId)

            return (
              <div
                key={series.id}
                className="bg-surface-container-low rounded-3xl p-5 card-hover group relative overflow-hidden border border-outline-variant/20 cursor-pointer"
                onClick={() => navigate(`/series/${series.id}`)}
              >
                <div className="flex gap-5">
                  {/* Cover Image */}
                  <div className="relative w-32 h-44 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/5">
                    <img
                      className="w-full h-full object-cover"
                      src={coverUrl}
                      alt={`${series.title} cover`}
                    />
                    {rank && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-white">{rank}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors">{series.title}</h3>
                        <button
                          onClick={(e) => { e.stopPropagation() }}
                          className="text-on-surface-variant hover:text-white"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                      {series.titleJp && (
                        <p className="text-on-surface-variant text-xs font-medium mb-3">{series.titleJp}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-primary/20">
                          {series.genre}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${statusColorMap[series.status] || 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {statusLabels[series.status] || series.status}
                        </span>
                        {series.tier && (
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${tierColorMap[series.tier] || 'bg-surface-container-highest text-on-surface-variant'}`}>
                            {series.tier}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">auto_stories</span>
                        <span className="text-xs font-medium">{series.chapterCount || 0} Ch.</span>
                      </div>
                      {series.rating > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{series.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    <span>{progress.label}</span>
                    <span className="text-primary">{progress.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Hover Actions */}
                <div className="mt-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/series/${series.id}`) }}
                    className="flex-1 bg-surface-container-high hover:bg-primary hover:text-on-primary text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-outline-variant/30"
                  >
                    View Details
                  </button>
                  {user?.role === 'MANGAKA' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/series/${series.id}/edit`) }}
                      className="w-12 h-10 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors border border-outline-variant/30"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Create New Series Placeholder */}
          {user?.role === 'MANGAKA' && (
            <div
              onClick={() => navigate('/series/new')}
              className="border-2 border-dashed border-outline-variant/30 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[320px] hover:border-primary/50 transition-all cursor-pointer group bg-surface-container-low/30"
            >
              <div className="size-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:scale-110">
                <span className="material-symbols-outlined text-4xl">add_circle</span>
              </div>
              <span className="text-lg font-bold text-white mb-2">Create New Series</span>
              <p className="text-on-surface-variant text-sm text-center max-w-[200px]">
                Launch a new production pipeline for your next masterpiece.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-outline-variant/30 pt-8">
          <p className="text-on-surface-variant text-sm">
            Showing <span className="text-white font-medium">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)}</span> of <span className="text-white font-medium">{filtered.length}</span> series
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {(() => {
                const pages = []
                const range = 2
                const start = Math.max(0, page - range)
                const end = Math.min(totalPages - 1, page + range)
                if (start > 0) {
                  pages.push(0)
                  if (start > 1) pages.push('...')
                }
                for (let i = start; i <= end; i++) pages.push(i)
                if (end < totalPages - 1) {
                  if (end < totalPages - 2) pages.push('...')
                  pages.push(totalPages - 1)
                }
                return pages.map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} className="text-on-surface-variant px-1">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        p === page
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50'
                      }`}
                    >
                      {p + 1}
                    </button>
                  )
                )
              })()}
            </div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant">Go to page</span>
            <input
              type="text"
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={handleGoToPage}
              className="w-12 h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl text-center text-sm text-white focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-outline-variant/30 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-xs">© 2024 MangaFlow Creative Engine. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="#">API Reference</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="#">Privacy Policy</a>
            <span className="text-outline/30 text-xs px-2 py-1 rounded bg-surface-container-highest">v2.4.0-pro</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
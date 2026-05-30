import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { mockUsers, mockRankings, mockChapters } from '../../shared/constants/mock-data'

function coverPlaceholder(title, color) {
  const initials = title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
    <rect width="200" height="280" fill="${color}"/>
    <rect x="0" y="0" width="200" height="280" fill="url(#g)"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.4)"/></linearGradient></defs>
    <text x="100" y="140" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="36" fill="rgba(255,255,255,0.9)" font-weight="bold">${initials}</text>
  </svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

export function SeriesListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const seriesList = useSeriesStore((s) => s.seriesList)

  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [sort, setSort] = useState('latest')
  const [tab, setTab] = useState('ALL')
  const [page, setPage] = useState(0)
  const [pageInput, setPageInput] = useState('1')
  const pageSize = 6

  const allSeries = useMemo(() => {
    let result = [...seriesList]
    if (tab === 'FAVORITES') {
      result = result.filter(s => s.status === 'PUBLISHED' || s.status === 'ACTIVE')
    } else if (tab === 'ARCHIVED') {
      result = result.filter(s => s.status === 'CANCELLED' || s.status === 'COMPLETED')
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s => s.title.toLowerCase().includes(q) || (s.titleJp || '').toLowerCase().includes(q))
    }
    if (genre !== 'ALL') result = result.filter(s => s.genre === genre)
    if (status !== 'ALL') result = result.filter(s => s.status === status)
    result.sort((a, b) => {
      if (sort === 'popularity') return (b.chapterCount || 0) - (a.chapterCount || 0)
      if (sort === 'ranking') {
        const rA = mockRankings.find(r => r.seriesId === a.id)
        const rB = mockRankings.find(r => r.seriesId === b.id)
        return (rA?.rank || 999) - (rB?.rank || 999)
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    return result
  }, [seriesList, search, genre, status, sort, tab])

  const totalPages = Math.max(1, Math.ceil(allSeries.length / pageSize))
  const paginated = allSeries.slice(page * pageSize, (page + 1) * pageSize)

  useEffect(() => { setPage(0); setPageInput('1') }, [search, genre, status, sort, tab])
  useEffect(() => { setPageInput(String(page + 1)) }, [page])

  const goToPage = (p) => {
    const n = Number(p)
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n - 1)
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i)
    } else {
      let start = Math.max(0, page - 2)
      let end = Math.min(totalPages - 1, start + maxVisible - 1)
      if (end - start < maxVisible - 1) start = end - maxVisible + 1
      for (let i = start; i <= end; i++) pages.push(i)
    }
    return pages
  }

  const clearFilters = () => {
    setSearch(''); setGenre('ALL'); setStatus('ALL'); setSort('latest')
  }

  const hasActiveFilter = genre !== 'ALL' || status !== 'ALL' || !!search || sort !== 'latest'

  const getSeriesRank = (seriesId) => mockRankings.find(r => r.seriesId === seriesId)

  const getLatestChapterProgress = (seriesId) => {
    const chapters = mockChapters[seriesId]
    if (!chapters || chapters.length === 0) return 0
    return chapters[chapters.length - 1].progressPercent || 0
  }

  const getSeriesChapterCount = (seriesId) => {
    const chapters = mockChapters[seriesId]
    return chapters ? chapters.length : 0
  }

  const getSeriesRating = (seriesId) => {
    const rank = mockRankings.find(r => r.seriesId === seriesId)
    if (!rank) return null
    const ratings = { 'S': 4.9, 'A': 4.5, 'B': 4.0, 'C': 3.5, 'D': 3.0 }
    return ratings[rank.tier] || null
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white font-geist">Manga Series</h1>
          <p className="text-on-surface-variant text-lg max-w-xl font-geist leading-relaxed">
            Manage and track your active manga production pipeline from draft to final publication.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
          <button onClick={() => setTab('ALL')}
            className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm font-geist transition-colors ${tab === 'ALL' ? 'bg-surface-container-highest text-white' : 'text-on-surface-variant hover:text-white'}`}>
            All Series
          </button>
          <button onClick={() => setTab('FAVORITES')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors font-geist ${tab === 'FAVORITES' ? 'bg-surface-container-highest text-white' : 'text-on-surface-variant hover:text-white'}`}>
            Favorites
          </button>
          <button onClick={() => setTab('ARCHIVED')}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors font-geist ${tab === 'ARCHIVED' ? 'bg-surface-container-highest text-white' : 'text-on-surface-variant hover:text-white'}`}>
            Archived
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-3xl p-4 mb-10 flex flex-col lg:flex-row gap-4 items-center border border-outline-variant/20">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full bg-surface-container-lowest border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white placeholder:text-outline transition-all font-geist"
            placeholder="Search series title, author, or tag..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative group">
            <select value={genre} onChange={(e) => setGenre(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer font-geist">
              <option value="ALL">Genre</option>
              <option value="ACTION">Action</option>
              <option value="FANTASY">Fantasy</option>
              <option value="ROMANCE">Romance</option>
              <option value="COMEDY">Comedy</option>
              <option value="DRAMA">Drama</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
          </div>
          <div className="relative group">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer font-geist">
              <option value="ALL">Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="APPROVED">Approved</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
          </div>
          <div className="relative group">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer font-geist">
              <option value="latest">Sort By</option>
              <option value="latest">Latest</option>
              <option value="popularity">Popularity</option>
              <option value="ranking">Ranking</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">swap_vert</span>
          </div>
          {hasActiveFilter && (
            <button onClick={clearFilters}
              className="px-4 py-3 text-sm text-on-surface-variant hover:text-white transition-colors font-geist">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Series Grid */}
      {allSeries.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant/30 rounded-3xl p-16 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">search_off</span>
          <span className="text-lg font-bold text-white mb-2 font-geist">No series found</span>
          <p className="text-on-surface-variant text-sm text-center font-geist">Try adjusting your search or filter criteria.</p>
          {hasActiveFilter && (
            <button onClick={clearFilters}
              className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold font-geist">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paginated.map((series) => {
            const rank = getSeriesRank(series.id)
            const progress = getLatestChapterProgress(series.id)
            const chapterCount = getSeriesChapterCount(series.id)
            const rating = getSeriesRating(series.id)

            return (
              <div key={series.id}
                className="bg-surface-container-low rounded-3xl p-5 card-hover group relative overflow-hidden border border-outline-variant/20 cursor-pointer"
                onClick={() => navigate(`/series/${series.id}`)}>

                <div className="flex gap-5">
                  {/* Cover */}
                  <div className="relative w-32 h-44 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/5">
                    <img className="w-full h-full object-cover"
                      alt={`${series.title} cover`}
                      src={coverPlaceholder(series.title, series.coverColor)} />
                    {rank && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-white font-geist">#{rank.rank} Rank</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors font-geist">{series.title}</h3>
                        <button onClick={(e) => e.stopPropagation()}
                          className="text-on-surface-variant hover:text-white">
                          <span className="material-symbols-outlined text-xl">more_vert</span>
                        </button>
                      </div>
                      {series.titleJp && (
                        <p className="text-on-surface-variant text-xs font-medium mb-3 font-geist">{series.titleJp}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-primary/20">
                          {series.genre}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border
                          ${series.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                          ${series.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                          ${series.status === 'DRAFT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                          ${series.status === 'IN_REVIEW' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                          ${series.status === 'APPROVED' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                          ${series.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                          ${series.status === 'COMPLETED' ? 'bg-secondary/10 text-secondary border-secondary/20' : ''}
                          ${!['PUBLISHED', 'ACTIVE', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'CANCELLED', 'COMPLETED'].includes(series.status) ? 'bg-secondary/10 text-secondary border-secondary/20' : ''}`}>
                          {series.status === 'PUBLISHED' ? 'Active' : series.status.charAt(0) + series.status.slice(1).toLowerCase()}
                        </span>
                        <span className="px-2 py-1 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-tertiary/20">
                          {rank?.tier ? `${rank.tier} Tier` : 'Draft'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">auto_stories</span>
                        <span className="text-xs font-medium font-geist">{chapterCount} Ch.</span>
                      </div>
                      {rating && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-yellow-500">star</span>
                          <span className="text-xs font-medium font-geist">{rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                {chapterCount > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-geist">
                      <span>Chapter {chapterCount} Progress</span>
                      <span className="text-primary">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Hover actions */}
                <div className="mt-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/series/${series.id}`); }}
                    className="flex-1 bg-surface-container-high hover:bg-primary hover:text-on-primary text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-outline-variant/30 font-geist">
                    View Details
                  </button>
                  <button onClick={(e) => e.stopPropagation()}
                    className="w-12 h-10 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors border border-outline-variant/30">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Create New */}
          {(user?.role === 'MANGAKA' || !user) && (
            <div onClick={() => navigate('/series/new')}
              className="border-2 border-dashed border-outline-variant/30 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[320px] hover:border-primary/50 transition-all cursor-pointer group bg-surface-container-low/30">
              <div className="size-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:scale-110">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:text-primary">add_circle</span>
              </div>
              <span className="text-lg font-bold text-white mb-2 font-geist">Create New Series</span>
              <p className="text-on-surface-variant text-sm text-center max-w-[200px] font-geist">Launch a new production pipeline for your next masterpiece.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {allSeries.length > 0 && (
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-outline-variant/30 pt-8">
          <p className="text-on-surface-variant text-sm font-geist">
            Showing <span className="text-white font-medium">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, allSeries.length)}</span> of <span className="text-white font-medium">{allSeries.length}</span> series
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              {getPageNumbers().map((pageNum) => (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold font-geist ${page === pageNum ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all'}`}>
                  {pageNum + 1}
                </button>
              ))}
            </div>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-surface-variant font-geist">Go to page</span>
            <input
              className="w-16 h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl text-center text-sm text-white focus:ring-1 focus:ring-primary/50 font-geist"
              type="text" value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToPage(pageInput) }}
              onBlur={() => goToPage(pageInput)} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-outline-variant/30 py-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-xs font-geist">&copy; 2024 MangaFlow Creative Engine. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs font-geist" href="#">API Reference</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs font-geist" href="#">Privacy Policy</a>
            <span className="text-outline/30 text-xs px-2 py-1 rounded bg-surface-container-highest font-geist">v2.4.0-pro</span>
          </div>
        </div>
      </footer>

      {/* Glow */}
      <div style={{
        position: 'fixed',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 10,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        left: '50%',
        top: '50%',
      }} />
    </div>
  )
}

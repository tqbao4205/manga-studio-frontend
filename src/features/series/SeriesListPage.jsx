/*
  ==========================================================
  PAGE: SeriesListPage
  ROUTE: /series
  MỤC ĐÍCH: Hiển thị danh sách tất cả series. Cho phép tìm kiếm
  theo tên, lọc theo genre/status. Hỗ trợ phân trang.
  QUYỀN TRUY CẬP:
    - Tất cả roles: xem danh sách series
    - MANGAKA: thêm nút "New Series"
    - ASSISTANT: chỉ xem series có task liên quan (filter ngầm)
  ==========================================================
*/

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, BookOpen } from 'lucide-react'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { Card, CardContent } from '../../shared/components/ui/card'
import { Input } from '../../shared/components/ui/input'
import { Button } from '../../shared/components/ui/button'
import { StatusBadge } from '../../shared/components/shared/StatusBadge'
import { EmptyState } from '../../shared/components/shared/EmptyState'
import { FilterBar } from '../../shared/components/shared/FilterBar'
import { getRankColor, cn } from '../../shared/utils'
import { useAuthStore } from '../../app/stores/authStore'
import { useTasks } from '../../shared/hooks/useMockData'
import { mockPages, mockRegions, mockChapters } from '../../shared/constants/mock-data'
import { Pagination } from '../../shared/components/shared/Pagination'

/* Các lựa chọn filter cố định */
const genres = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const statuses = ['ONGOING', 'HIATUS', 'DRAFT', 'PENDING_TANTOU_REVIEW', 'PENDING_APPROVAL', 'AT_RISK', 'CANCELLED', 'REJECTED', 'COMPLETED']

export function SeriesListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const seriesList = useSeriesStore((s) => s.seriesList)
  const { data: allTasks } = useTasks()
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(0)
  const pageSize = 6

  /*
    Nếu là ASSISTANT, chỉ hiển thị series có chapter chứa task
    mà assistant đó được giao. Dùng mock data để tra ngược
    regionId → pageId → chapterId → seriesId.
  */
  const allSeries = useMemo(() => {
    if (user?.role !== 'ASSISTANT') return seriesList
    const taskSeriesIds = new Set()
    ;(allTasks || []).forEach(t => {
      if (t.assistant.id !== user.id) return
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

  /* Lọc series dựa trên search + genre + status */
  const filtered = useMemo(() => {
    return allSeries.filter((s) => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
      if (genre !== 'ALL' && s.genre !== genre) return false
      if (status !== 'ALL' && s.status !== status) return false
      return true
    })
  }, [allSeries, search, genre, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  /** Reset về trang đầu khi filter thay đổi */
  useEffect(() => { setPage(0) }, [search, genre, status])

  /* Đếm số lượng theo genre/status để hiển thị trên FilterBar */
  const genreCounts = useMemo(() => {
    const counts = {}
    genres.forEach(g => { counts[g] = allSeries.filter((s) => s.genre === g).length })
    return counts
  }, [allSeries])

  const statusCounts = useMemo(() => {
    const counts = {}
    statuses.forEach(s => { counts[s] = allSeries.filter((ser) => ser.status === s).length })
    return counts
  }, [allSeries])

  const hasActiveFilter = genre !== 'ALL' || status !== 'ALL' || !!search

  const clearFilters = () => {
    setGenre('ALL')
    setStatus('ALL')
    setSearch('')
  }

  /* Cấu hình các nhóm filter cho FilterBar */
  const filterGroups = [
    {
      id: 'genre',
      label: 'Genre',
      value: genre,
      options: [
        { value: 'ALL', label: 'All Genres', count: allSeries.length },
        ...genres.map(g => ({ value: g, label: g.charAt(0) + g.slice(1).toLowerCase(), count: genreCounts[g] || 0 })),
      ],
      onChange: setGenre,
    },
    {
      id: 'status',
      label: 'Status',
      value: status,
      options: [
        { value: 'ALL', label: 'All Status', count: allSeries.length },
        ...statuses.map(s => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase(), count: statusCounts[s] || 0 })),
      ],
      onChange: setStatus,
    },
  ]

  const activeFilters = []
  if (genre !== 'ALL') {
    const label = genre.charAt(0) + genre.slice(1).toLowerCase()
    activeFilters.push({ groupId: 'genre', groupLabel: 'Genre', value: genre, label, onRemove: () => setGenre('ALL') })
  }
  if (status !== 'ALL') {
    const label = status.charAt(0) + status.slice(1).toLowerCase()
    activeFilters.push({ groupId: 'status', groupLabel: 'Status', value: status, label, onRemove: () => setStatus('ALL') })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Series</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your manga series</p>
        </div>
        {user?.role === 'MANGAKA' && (
          <Button onClick={() => navigate('/series/new')}>
            <Plus size={16} className="mr-1.5" /> New Series
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Input tìm kiếm */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
              <X size={14} />
            </button>
          )}
        </div>

        <FilterBar
          groups={filterGroups}
          activeFilters={activeFilters}
          resultCount={filtered.length}
          totalCount={allSeries.length}
          onClearAll={hasActiveFilter ? clearFilters : undefined}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title={hasActiveFilter ? 'No matching series' : 'No series yet'}
          description={hasActiveFilter ? 'Try changing your search or filter criteria.' : 'Create your first series to get started.'}
          action={hasActiveFilter ? <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button> : undefined}
        />
      ) : (
        /* Grid hiển thị series cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((series) => (
            <Card
              key={series.id}
              className="cursor-pointer group hover:border-b-accent-cyan transition-all duration-300"
              onClick={() => navigate(`/series/${series.id}`)}
            >
              <CardContent className="p-0">
                <div className="h-36 flex items-end p-5 relative border-b border-primary/10" style={{ background: `${series.coverColor}15` }}>
                  <div className="absolute top-4 left-4 w-14 h-20 flex items-center justify-center text-white text-lg font-bold border border-primary/10" style={{ background: series.coverColor }}>
                    {series.title.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="relative z-10 ml-20">
                    <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">{series.title}</h3>
                    {series.titleJp && <p className="text-xs text-on-surface-variant">{series.titleJp}</p>}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={series.status} size="sm" />
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span>{series.chapterCount} chapters</span>
                      {series.currentTier && (
                        <span className="font-bold" style={{ color: getRankColor(series.currentTier) }}>
                          Tier {series.currentTier}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{series.synopsis}</p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-[10px] font-medium text-accent-purple">
                        {series.mangaka.displayName[0]}
                      </div>
                      <span className="text-xs text-on-surface-variant">{series.mangaka.displayName}</span>
                    </div>
                    <span className="text-[10px] px-2 py-1 border border-border-light text-on-surface-variant">{series.genre}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

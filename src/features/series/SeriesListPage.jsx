/**
 * ─────────────────────────────────────────────
 *  SeriesListPage — Trang danh sách series
 *  Route: /series
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Hiển thị danh sách series dưới dạng grid card
 *   - Cho phép tìm kiếm, lọc theo genre/status, sắp xếp, phân trang
 *   - Liên kết đến SeriesDetailPage khi click vào card
 *
 * 🔄 Luồng dữ liệu (so với bản cũ dùng mock):
 *   - Bản cũ: lấy seriesList từ store (khởi tạo từ mock-data.js),
 *             filter + sort bằng useMemo client-side
 *   - Bản mới: useEffect gọi fetchAll(params) mỗi khi filter thay đổi,
 *              backend xử lý filter + sort + phân trang,
 *              store cập nhật seriesList với kết quả từ API
 *
 * 📦 State:
 *   - search, genre, status, sortBy → filter params gửi lên backend
 *   - page → phân trang (backend tính totalPages)
 *   - seriesList, isLoading, error, totalElements, totalPages → từ store
 *
 * 🔗 API gọi:
 *   - GET /api/series?status=...&genre=...&search=...&page=...&size=...&sort=...
 *   - Backend SeriesSpecification filter theo role:
 *     - MANGAKA: chỉ thấy series của mình
 *     - TANTOU_EDITOR: chỉ thấy series mình phụ trách
 *     - EDITORIAL_BOARD / ASSISTANT: thấy tất cả
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { seriesPlaceholder } from '../../shared/constants/mock-data'

// ── Danh sách genre / status ──
// Các giá trị này khớp với enum trong backend:
//   Genre.java: ACTION, FANTASY, ROMANCE, COMEDY, DRAMA
//   SeriesStatus.java: DRAFT, PENDING_APPROVAL, APPROVED, ONGOING, HIATUS, ...
const genres = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']
const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ONGOING', 'HIATUS', 'CANCELLED', 'COMPLETED', 'AT_RISK']

// Labels hiển thị cho người dùng (tiếng Anh để đồng bộ UI)
const genreLabels = { ACTION: 'Action', FANTASY: 'Fantasy', ROMANCE: 'Romance', COMEDY: 'Comedy', DRAMA: 'Drama' }
const statusLabels = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  ONGOING: 'Ongoing',
  HIATUS: 'Hiatus',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  AT_RISK: 'At Risk',
}

// Màu sắc cho mỗi status badge (dùng Tailwind classes)
const statusColorMap = {
  ONGOING: 'bg-green-500/10 text-green-400 border-green-500/20',
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  DRAFT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PENDING_APPROVAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  HIATUS: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AT_RISK: 'bg-red-500/10 text-red-400 border-red-500/20',
}

// Options cho sort dropdown
// Giá trị khớp với enum SeriesSortBy.java:
//   UPDATED_AT_DESC (mới nhất), TITLE_ASC (A-Z), CHAPTER_COUNT_DESC (nhiều chapter nhất)
const sortOptions = [
  { value: 'UPDATED_AT_DESC', label: 'Latest' },
  { value: 'TITLE_ASC', label: 'Title A-Z' },
  { value: 'CHAPTER_COUNT_DESC', label: 'Most Chapters' },
]

export function SeriesListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)          // Lấy user hiện tại (để kiểm tra role)
  const { seriesList, isLoading, error, totalElements, totalPages, fetchAll } = useSeriesStore()

  // ── Local state cho filter ──
  // Các state này được dùng để xây dựng params gửi lên backend
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [sortBy, setSortBy] = useState('UPDATED_AT_DESC')
  const [page, setPage] = useState(0)
  const [goToPage, setGoToPage] = useState('')
  const pageSize = 6

  // ── useEffect: Gọi API mỗi khi filter thay đổi ──
  // Mỗi lần user thay đổi search/genre/status/sort/page → gọi fetchAll với params mới
  // Backend tự xử lý filter + sort + phân trang
  useEffect(() => {
    fetchAll({ search, genre, status, page, size: pageSize, sort: sortBy })
  }, [fetchAll, search, genre, status, page, sortBy])

  // Reset về trang 0 khi thay đổi filter (tránh ở trang 2 mà filter lại ra ít kết quả)
  useEffect(() => { setPage(0) }, [search, genre, status, sortBy])

  // Xử lý "Go to page" — nhập số trang rồi Enter
  const handleGoToPage = (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(goToPage, 10)
      if (!isNaN(p) && p >= 1 && p <= totalPages) setPage(p - 1)
      setGoToPage('')
    }
  }

  return (
    <div className="px-10 py-10 max-w-[1400px] mx-auto" style={{ fontFamily: 'Geist, sans-serif' }}>
      {/* ═══ Header ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">Manga Series</h1>
          <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
            Manage and track your active manga production pipeline from draft to final publication.
          </p>
        </div>
        {/* Tab "All Series" — giữ lại cho UI, bỏ tab Favorites/Archived vì backend chưa hỗ trợ */}
        <div className="flex items-center gap-4 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
          <button className="px-6 py-2 rounded-xl text-sm font-bold bg-surface-container-highest text-white">
            All Series
          </button>
        </div>
      </div>

      {/* ═══ Search & Filter Bar ═══ */}
      <div className="glass-panel rounded-3xl p-4 mb-10 flex flex-col lg:flex-row gap-4 items-center border border-outline-variant/20">
        {/* Ô tìm kiếm — gửi search param lên backend LIKE %title% */}
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
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Filter Genre */}
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
          {/* Filter Status — dùng status enum từ backend */}
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
          {/* Sort — gửi sort param, backend dùng Spring Data Sort */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-surface-container-lowest border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/50 min-w-[140px] cursor-pointer"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-xl">swap_vert</span>
          </div>
        </div>
      </div>

      {/* ═══ Loading State ═══ */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* ═══ Error State ═══ */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
          <h3 className="text-xl font-bold text-white mb-2">Failed to load series</h3>
          <p className="text-on-surface-variant">{error}</p>
        </div>
      )}

      {/* ═══ Empty State ═══ */}
      {!isLoading && !error && seriesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">auto_stories</span>
          <h3 className="text-xl font-bold text-white mb-2">No series found</h3>
          <p className="text-on-surface-variant">Try changing your search or filter criteria.</p>
        </div>
      ) : null}

      {/* ═══ Series Grid ═══ */}
      {!isLoading && !error && seriesList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {seriesList.map((series) => {
            // Mỗi series từ API có:
            //   - coverImageUrl: string (ảnh thật từ Cloudinary) hoặc null
            //   - coverColor: string (màu nền fallback)
            //   - mangaka: UserDTO object (có id, displayName, email...)
            //   - chapterCount: number (denormalized từ chapter module)
            //   - genre: string (từ enum Genre.name())
            //   - status: string (từ enum SeriesStatus.name())
            const coverUrl = series.coverImageUrl || seriesPlaceholder(series.title, series.coverColor)
            const mangaka = series.mangaka

            return (
              <div
                key={series.id}
                className="bg-surface-container-low rounded-3xl p-5 card-hover group relative overflow-hidden border border-outline-variant/20 cursor-pointer"
                onClick={() => navigate(`/series/${series.id}`)}
              >
                <div className="flex gap-5">
                  {/* Ảnh bìa — nếu không có URL thì dùng placeholder SVG */}
                  <div className="relative w-32 h-44 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/5">
                    <img
                      className="w-full h-full object-cover"
                      src={coverUrl}
                      alt={`${series.title} cover`}
                    />
                  </div>

                  {/* Thông tin series */}
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
                      {/* Tên tiếng Nhật (nếu có) */}
                      {series.titleJp && (
                        <p className="text-on-surface-variant text-xs font-medium mb-3">{series.titleJp}</p>
                      )}
                      {/* Badge Genre + Status */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-primary/20">
                          {series.genre}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${statusColorMap[series.status] || 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {statusLabels[series.status] || series.status}
                        </span>
                      </div>
                    </div>

                    {/* Chapter count — từ backend denormalized field */}
                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">auto_stories</span>
                        <span className="text-xs font-medium">{series.chapterCount || 0} Ch.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Actions — chỉ hiện khi hover vào card */}
                <div className="mt-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/series/${series.id}`) }}
                    className="flex-1 bg-surface-container-high hover:bg-primary hover:text-on-primary text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-outline-variant/30"
                  >
                    View Details
                  </button>
                  {/* Chỉ MANGAKA mới thấy nút Edit */}
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

          {/* ═══ Card "Tạo series mới" (chỉ MANGAKA) ═══ */}
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

      {/* ═══ Pagination ═══ */}
      {/* totalPages > 1 mới hiện pagination */}
      {totalPages > 1 && (
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-outline-variant/30 pt-8">
          {/* Hiển thị "Showing 1-6 of 24 series" */}
          <p className="text-on-surface-variant text-sm">
            Showing <span className="text-white font-medium">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)}</span> of <span className="text-white font-medium">{totalElements}</span> series
          </p>
          <div className="flex items-center gap-2">
            {/* Nút Previous */}
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {/* Các nút số trang */}
            <div className="flex items-center gap-2">
              {(() => {
                // Logic hiển thị số trang: ... 1 2 [3] 4 5 ...
                const pages = []
                const range = 2
                const start = Math.max(0, page - range)
                const end = Math.min(totalPages - 1, page + range)
                if (start > 0) {
                  pages.push(0)                               // Trang đầu
                  if (start > 1) pages.push('...')            // Dấu ...
                }
                for (let i = start; i <= end; i++) pages.push(i)
                if (end < totalPages - 1) {
                  if (end < totalPages - 2) pages.push('...')  // Dấu ...
                  pages.push(totalPages - 1)                   // Trang cuối
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
            {/* Nút Next */}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {/* Ô nhập số trang */}
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

      {/* ═══ Footer ═══ */}
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

/**
 * ──────────────────────────────────────────────────────────────────
 *  SeriesListPage — Trang danh sách Series (Route: /series)
 * ──────────────────────────────────────────────────────────────────
 *
 *  📌 Trang này có 2 tab (chế độ xem):
 *     1. "Browse" 📖  — dành cho tất cả user: xem danh sách dạng grid card
 *     2. "Management" ⚙️ — chỉ EDITORIAL_BOARD / CHIEF_EDITOR: quản lý trạng thái series
 *
 *  🧩 Các thành phần chính trên trang:
 *     ┌─ Header: tiêu đề + tab Browse/Management
 *     ├─ Search & Filter Bar: input search + dropdown Genre/Status/Sort
 *     ├─ Series Grid: danh sách series dạng card (cover + thông tin + actions)
 *     ├─ Pagination: phân trang (previous, số trang, next, go-to-page)
 *     └─ Management Table: bảng danh sách cho EB/CE quản lý status
 *
 *  🔗 API gọi:
 *     - GET /api/series?status=...&genre=...&search=...&page=...&size=...&sort=...
 *       → Backend dùng SeriesSpecification động, filter theo role user:
 *         • MANGAKA → chỉ series của mình
 *         • TANTOU_EDITOR → chỉ series mình phụ trách
 *         • EDITORIAL_BOARD / ASSISTANT → tất cả
 *     - GET /api/ranking/at-risk (cho tab Management)
 *     - PATCH /api/series/{id}/status (chuyển trạng thái series)
 *
 *  🔄 Luồng dữ liệu:
 *     useEffect gọi fetchAll(params) mỗi khi filter thay đổi
 *     → Backend xử lý filter + sort + phân trang
 *     → Store (seriesStore) cập nhật seriesList, totalElements, totalPages
 *     → Component re-render hiển thị grid mới
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MoreVertical, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { useSeriesStore } from '../../app/stores/seriesStore'
import { useAuthStore } from '../../app/stores/authStore'
import { useRankingStore } from '../../app/stores/rankingStore'
import { useUIStore } from '../../app/stores/uiStore'
import seriesService from '../../services/seriesService'
import { cn } from '../../shared/utils'
import { Dialog } from '../../shared/components/ui/dialog'
import { LoadingSpinner } from '../../shared/components/shared/LoadingSpinner'
import { seriesPlaceholder } from '../../shared/constants/mock-data'

// ═══════════════════════════════════════════════════════════════════
//  CÁC HẰNG SỐ FILTER & HIỂN THỊ
// ═══════════════════════════════════════════════════════════════════

// ── Genre list ────────────────────────────────────────────────────
// Khớp với enum Genre.java backend: ACTION, FANTASY, ROMANCE, COMEDY, DRAMA
// Các giá trị này được dùng trong dropdown filter "Genre" ở Browse tab
const genres = ['ACTION', 'FANTASY', 'ROMANCE', 'COMEDY', 'DRAMA']

// ── Status list ───────────────────────────────────────────────────
// Khớp với enum SeriesStatus.java backend (DRAFT, PENDING_TANTOU, ONGOING, ...)
// Dùng trong dropdown filter "Status" ở Browse tab + Management tab
const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ONGOING', 'HIATUS', 'CANCELLED', 'COMPLETED', 'AT_RISK', 'PENDING_TANTOU', 'PENDING_BOARD_VOTE']

// ── Labels hiển thị trên UI ───────────────────────────────────────
// Map từ enum value → text hiển thị cho người dùng
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
  PENDING_TANTOU: 'Pending Lead Editor',
  PENDING_BOARD_VOTE: 'Pending Editorial Review',
}

// ── Màu sắc cho Status Badge (Browse tab - grid card) ────────────
// Mỗi status có màu riêng để dễ nhận biết trực quan
// Dùng Tailwind classes: bg/text/border với độ trong suốt
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
  PENDING_TANTOU: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  PENDING_BOARD_VOTE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

// ── Sort Options ──────────────────────────────────────────────────
// Dropdown sắp xếp — value khớp với enum SeriesSortBy.java:
//   UPDATED_AT_DESC (mới nhất), TITLE_ASC (A-Z), CHAPTER_COUNT_DESC (nhiều chapter nhất)
const sortOptions = [
  { value: 'UPDATED_AT_DESC', label: 'Latest' },
  { value: 'TITLE_ASC', label: 'Title A-Z' },
  { value: 'CHAPTER_COUNT_DESC', label: 'Most Chapters' },
]

// ═══════════════════════════════════════════════════════════════════
//  HẰNG SỐ CHO TAB MANAGEMENT (chỉ EDITORIAL_BOARD / CHIEF_EDITOR)
// ═══════════════════════════════════════════════════════════════════

// ── Màu sắc Status cho Management Table ──────────────────────────
// Khác với Browse tab (statusColorMap) vì giao diện bảng khác card grid
const mgmtStatusColors = {
  ONGOING: 'bg-green-500/10 text-green-400 border-green-500/20',
  AT_RISK: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIATUS: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DRAFT: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

// ── State Machine chuyển trạng thái series ───────────────────────
// Định nghĩa status nào có thể chuyển sang status nào
// VD: ONGOING → HIATUS / AT_RISK / CANCELLED / COMPLETED
//     AT_RISK → ONGOING / CANCELLED
//     HIATUS  → ONGOING / CANCELLED
// Các status không có trong map (CANCELLED, COMPLETED, DRAFT) → không thể chuyển
const mgmtTransitions = {
  ONGOING: ['HIATUS', 'AT_RISK', 'CANCELLED', 'COMPLETED'],
  AT_RISK: ['ONGOING', 'CANCELLED'],
  HIATUS: ['ONGOING', 'CANCELLED'],
}

export function SeriesListPage() {
  // ═════════════════════════════════════════════════════════════════
  //  HOOKS & STORES
  // ═════════════════════════════════════════════════════════════════

  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)              // User hiện tại (lấy từ auth store)
  const isEbCe = user?.role === 'EDITORIAL_BOARD' || user?.role === 'CHIEF_EDITOR'  // Check role EB/CE
  const [activeTab, setActiveTab] = useState(isEbCe ? 'management' : 'browse')  // Tab mặc định

  // ── Series Store ────────────────────────────────────────────────
  // seriesList: danh sách series từ API (Page<SeriesResponse>)
  // isLoading: trạng thái loading
  // error: lỗi từ API
  // totalElements / totalPages: thông tin phân trang (backend trả về)
  // fetchAll(params): gọi GET /api/series với params filter
  const { seriesList, isLoading, error, totalElements, totalPages, fetchAll } = useSeriesStore()
  const { atRiskSeries, fetchAtRisk } = useRankingStore()  // Danh sách series "có nguy cơ"
  const addToast = useUIStore((s) => s.addToast)           // Hiển thị toast thông báo

  // ── State cho Management tab ────────────────────────────────────
  const [mgmtSearch, setMgmtSearch] = useState('')    // Input tìm kiếm trong Management
  const [confirmOpen, setConfirmOpen] = useState(false) // Dialog xác nhận "Cancel Series"
  const [pendingAction, setPendingAction] = useState(null) // Action đang chờ xác nhận
  const [updatingId, setUpdatingId] = useState(null)    // Series ID đang cập nhật status

  // ═════════════════════════════════════════════════════════════════
  //  FILTER STATE (Browse tab)
  // ═════════════════════════════════════════════════════════════════
  // Các state này tạo thành params object gửi lên backend:
  //   { search: string, genre: 'ALL'|enum, status: 'ALL'|enum, page: int, size: int, sort: enum }
  // Backend dùng SeriesSpecification để build WHERE động + OrderBy + Pageable
  const [search, setSearch] = useState('')    // Từ khóa tìm kiếm (LIKE %title%)
  const [genre, setGenre] = useState('ALL')   // Lọc theo genre ('ALL' = không lọc)
  const [status, setStatus] = useState('ALL') // Lọc theo status ('ALL' = không lọc)
  const [sortBy, setSortBy] = useState('UPDATED_AT_DESC')  // Sắp xếp
  const [page, setPage] = useState(0)         // Trang hiện tại (0-indexed)
  const [goToPage, setGoToPage] = useState('') // Input "Go to page"
  const pageSize = 6                          // Số item mỗi trang (hardcode 6)
  const isFiltered = search !== '' || genre !== 'ALL' || status !== 'ALL' // Đã filter chưa?

  // ═════════════════════════════════════════════════════════════════
  //  EFFECTS
  // ═════════════════════════════════════════════════════════════════

  // ── Effect 1: Browse — gọi API mỗi khi filter thay đổi ─────────
  // Khi user thay đổi search/genre/status/sortBy/page → fetchAll với params mới
  // Backend xử lý filter + sort + phân trang, trả về Page<SeriesResponse>
  useEffect(() => {
    if (activeTab === 'browse') {
      fetchAll({ search, genre, status, page, size: pageSize, sort: sortBy })
    }
  }, [activeTab, fetchAll, search, genre, status, page, sortBy])

  // ── Effect 2: Management — tải tất cả series + at-risk ─────────
  // Khi chuyển sang tab Management, gọi API lấy 100 series + danh sách at-risk
  useEffect(() => {
    if (activeTab === 'management') {
      fetchAll({ size: 100 })
      fetchAtRisk()
    }
  }, [activeTab, fetchAll, fetchAtRisk])

  // ── Effect 3: Reset về trang 0 khi filter thay đổi ─────────────
  // Tránh trường hợp đang ở trang 5 rồi filter → page 5 không còn tồn tại
  useEffect(() => {
    if (activeTab === 'browse') setPage(0)
  }, [activeTab, search, genre, status, sortBy])

  // ═════════════════════════════════════════════════════════════════
  //  HANDLER FUNCTIONS
  // ═════════════════════════════════════════════════════════════════

  // ── Go-to-page: nhập số trang → Enter → chuyển trang ──────────
  // page trong state là 0-indexed, UI hiển thị 1-indexed
  const handleGoToPage = (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(goToPage, 10)       // parse input → số
      if (!isNaN(p) && p >= 1 && p <= totalPages) setPage(p - 1)  // chuyển về 0-indexed
      setGoToPage('')                           // reset input
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  MANAGEMENT LOGIC (chỉ dùng trong tab Management)
  // ═════════════════════════════════════════════════════════════════

  // ── atRiskMap: Map<seriesId, atRiskItem> ───────────────────────
  // Biến atRiskSeries từ rankingStore chứa danh sách series "có nguy cơ" (ranking thấp)
  // atRiskMap giúp O(1) lookup để đánh dấu series nào đang at-risk trong bảng
  const atRiskMap = (() => {
    const map = {}
    atRiskSeries.forEach((item) => { map[item.seriesId] = item })
    return map
  })()

  // ── mgmtFiltered: lọc danh sách quản lý theo từ khóa ──────────
  // Management tab dùng client-side filter (không gọi API riêng)
  // Vì đã fetchAll({size: 100}) — lọc trên 100 kết quả có sẵn
  const mgmtFiltered = (() => {
    if (!mgmtSearch) return seriesList
    const q = mgmtSearch.toLowerCase()
    return seriesList.filter((s) => s.title?.toLowerCase().includes(q))
  })()

  // ── handleStatusChange: xử lý chọn status mới từ dropdown ─────
  // Nếu chọn CANCELLED → mở dialog xác nhận trước khi thực hiện
  // Các status khác → gọi API update ngay
  const handleStatusChange = (seriesId, newStatus) => {
    if (newStatus === 'CANCELLED') {
      setPendingAction({ seriesId, status: newStatus })
      setConfirmOpen(true)
    } else {
      doUpdateStatus(seriesId, newStatus)
    }
  }

  // ── doUpdateStatus: gọi API PATCH /api/series/{id}/status ─────
  // Gọi seriesService.updateStatus() → backend SeriesWorkflowService.updateStatus()
  // Sau khi thành công: toast báo + reload danh sách + reload at-risk
  const doUpdateStatus = async (seriesId, status) => {
    setUpdatingId(seriesId)                    // Đánh dấu row đang loading
    try {
      await seriesService.updateStatus(seriesId, { status })
      addToast({ type: 'success', title: 'Status updated', message: `Series is now ${statusLabels[status] || status}` })
      fetchAll({ size: 100 })                // Refresh danh sách
      fetchAtRisk()                          // Refresh at-risk
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', message: err.message })
    } finally {
      setUpdatingId(null)                    // Bỏ loading
      setConfirmOpen(false)                  // Đóng dialog
      setPendingAction(null)                 // Clear pending
    }
  }

  // ── getAvailableOptions: lấy danh sách status có thể chuyển ────
  // Dựa vào mgmtTransitions map (state machine)
  // CANCELLED / COMPLETED là terminal status → không thể chuyển tiếp
  // Status không có trong mgmtTransitions → trả về [] (không có dropdown)
  const getAvailableOptions = (status) => {
    if (status === 'CANCELLED' || status === 'COMPLETED') return []
    return mgmtTransitions[status] || []
  }

  return (
    <div className="px-10 py-10 max-w-[1400px] mx-auto" style={{ fontFamily: 'Geist, sans-serif' }}>
      {/* ── Header: Tiêu đề trang "Manga Series" + mô tả ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">Manga Series</h1>
          <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
            Manage and track your manga series from draft to final publication.
          </p>
        </div>

        {/* ── Tab bar: Browse (cho tất cả) / Management (chỉ EB/CE) ───── */}
        <div className="flex items-center gap-4 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
          {/* Nút tab "Browse" — chuyển sang chế độ xem grid card */}
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-surface-container-highest text-white'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            Browse
          </button>
          {/* Nút tab "Management" — ẩn nếu user không phải EB/CE */}
          {isEbCe && (
            <button
              onClick={() => setActiveTab('management')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'management'
                  ? 'bg-surface-container-highest text-white'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Management
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BROWSE TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'browse' && (
      <>

      {/* ── Search & Filter Bar ────────────────────────────────────────── */}
      <div className="glass-panel rounded-3xl p-4 mb-10 flex flex-col lg:flex-row gap-4 items-center border border-outline-variant/20">
        {/* Input tìm kiếm — gõ text → setSearch() → fetch lại danh sách */}
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
          {/* Dropdown Genre — lọc theo genre enum */}
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
          {/* Dropdown Status — lọc theo status enum */}
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
          {/* Dropdown Sort — sắp xếp kết quả */}
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

      {/* ── Loading spinner — hiển thị khi đang gọi API ────────────── */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* ── Error state — hiển thị khi API lỗi ──────────────────────── */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
          <h3 className="text-xl font-bold text-white mb-2">Failed to load series</h3>
          <p className="text-on-surface-variant">{error}</p>
        </div>
      )}

      {/* ── Empty state — hiển thị khi không có series nào ──────────── */}
      {!isLoading && !error && seriesList.length === 0 ? (
        isFiltered ? (
          /* Trường hợp đang filter → gợi ý bỏ filter */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">auto_stories</span>
            <h3 className="text-xl font-bold text-white mb-2">No series found</h3>
            <p className="text-on-surface-variant">Try changing your search or filter criteria.</p>
          </div>
        ) : (
          /* Trường hợp chưa tạo series nào → nút Create New Series */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-outline mb-4">auto_stories</span>
            <h3 className="text-xl font-bold text-white mb-2">No series yet</h3>
            <p className="text-on-surface-variant mb-8">Get started by creating your first manga series.</p>
            {user?.role === 'MANGAKA' && (
              /* Nút "Create New Series" — chỉ MANGAKA, navigate đến /series/new */
              <button
                onClick={() => navigate('/series/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Create New Series
              </button>
            )}
          </div>
        )
      ) : null}

      {/* ── Series Grid — danh sách series dạng card ──────────────────── */}
      {!isLoading && !error && seriesList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {seriesList.map((series) => {
            // Dữ liệu mỗi series lấy từ API response (SeriesResponse):
            //   coverImageUrl: URL ảnh từ Cloudinary (hoặc null)
            //   coverColor: màu nền fallback (hex)
            //   mangaka: { id, displayName, email, username, role, avatarUrl }
            //   chapterCount: số chapter (denormalized, backend tính)
            //   genres: ["ACTION", "FANTASY"] — từ collection table series_genres
            //   status: "DRAFT" | "ONGOING" | ... — từ enum SeriesStatus
            const coverUrl = series.coverImageUrl || seriesPlaceholder(series.title, series.coverColor)
            const mangaka = series.mangaka

            return (
              /* Card series — click vào → navigate đến /series/{id} */
              <div
                key={series.id}
                className="bg-surface-container-low rounded-3xl p-5 card-hover group relative overflow-hidden border border-outline-variant/20 cursor-pointer"
                onClick={() => navigate(`/series/${series.id}`)}
              >
                <div className="flex gap-5">
                  {/* Ảnh bìa — từ Cloudinary hoặc placeholder SVG */}
                  <div className="relative w-32 h-44 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/5">
                    <img
                      className="w-full h-full object-cover"
                      src={coverUrl}
                      alt={`${series.title} cover`}
                    />
                  </div>

                  {/* Thông tin series bên phải ảnh bìa */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        {/* Tên series */}
                        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-primary transition-colors">{series.title}</h3>
                        {/* Nút menu 3 chấm (chưa implement action) */}
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
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {series.genres?.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider border border-primary/20"
                          >
                            {g}
                          </span>
                        ))}
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider border ${statusColorMap[series.status] || 'bg-surface-container-highest text-on-surface-variant'}`}>
                          {statusLabels[series.status] || series.status}
                        </span>
                      </div>
                    </div>

                    {/* Số chapter */}
                    <div className="flex items-center gap-4 text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">auto_stories</span>
                        <span className="text-xs font-medium">{series.chapterCount || 0} Ch.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Hover actions — chỉ hiện khi hover vào card ────── */}
                <div className="mt-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  {/* Nút "View Details" — xem chi tiết series */}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/series/${series.id}`) }}
                    className="flex-1 bg-surface-container-high hover:bg-primary hover:text-on-primary text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-outline-variant/30"
                  >
                    View Details
                  </button>
                  {/* Nút Edit (icon bút) — chỉ MANGAKA, navigate đến /series/{id}/edit */}
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

          {/* ── Card "Create New Series" — chỉ MANGAKA, dashed border ───── */}
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
                Start creating your next masterpiece.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Pagination — phân trang, chỉ hiện khi totalPages > 1 ─────────── */}
      {totalPages > 1 && (
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-outline-variant/30 pt-8">
          {/* Text hiển thị "Showing X-Y of Z series" */}
          <p className="text-on-surface-variant text-sm">
            Showing <span className="text-white font-medium">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)}</span> of <span className="text-white font-medium">{totalElements}</span> series
          </p>
          <div className="flex items-center gap-2">
            {/* Nút Previous trang */}
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {/* Các nút số trang + dấu ... */}
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
            {/* Nút Next trang */}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:text-white hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {/* Input "Go to page" — nhập số trang → Enter để chuyển */}
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

      </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MANAGEMENT TAB — Bảng quản lý (chỉ EB/CE)
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'management' && (
      <div>

        {/* ── Management Search Bar — lọc client-side trên 100 kết quả ──── */}
        <div className="glass-panel rounded-3xl p-4 mb-8 border border-outline-variant/20">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={mgmtSearch}
              onChange={(e) => setMgmtSearch(e.target.value)}
              placeholder="Search series title..."
              className="w-full bg-surface-container-lowest border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white placeholder:text-outline transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          /* Loading spinner */
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h3 className="text-xl font-bold text-white mb-2">Failed to load series</h3>
            <p className="text-on-surface-variant">{error}</p>
          </div>
        ) : (
          /* ── Management Table ────────────────────────────────────────── */
          <div className="rounded-2xl overflow-hidden border border-outline-variant/20">
            {/* Header bảng: # | Title | Schedule | Status */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Title</div>
              <div className="col-span-2">Schedule</div>
              <div className="col-span-2">Status</div>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {mgmtFiltered.length === 0 ? (
                /* Empty trong management */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline mb-3">search_off</span>
                  <p className="text-on-surface-variant">No series match your search.</p>
                </div>
              ) : (
                mgmtFiltered.map((series, idx) => {
                  const atRisk = atRiskMap[series.id]
                  const isAtRisk = series.status === 'AT_RISK'
                  const options = getAvailableOptions(series.status)
                  return (
                    /* Mỗi dòng trong bảng */
                    <div key={series.id}
                      className={cn(
                        'grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors',
                        isAtRisk ? 'bg-red-500/5' : 'hover:bg-surface-container-low',
                      )}
                    >
                      {/* STT */}
                      <div className="col-span-1 text-sm text-on-surface-variant">{idx + 1}</div>
                      {/* Title + cover thumbnail */}
                      <div className="col-span-7 flex items-center gap-3 min-w-0">
                        {/* Cover thumbnail nhỏ */}
                        {series.coverImageUrl ? (
                          <img src={series.coverImageUrl} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-11 rounded shrink-0" style={{ backgroundColor: series.coverColor || '#6B21A8' }} />
                        )}
                        {/* Tên series + icon at-risk */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                            {series.title}
                            {isAtRisk && <span className="text-red-400 text-xs">⚠️</span>}
                          </p>
                        </div>
                      </div>
                      {/* Schedule type — lịch xuất bản (WEEKLY/MONTHLY) */}
                      <div className="col-span-2 text-sm text-on-surface-variant">
                        {series.scheduleType || '\u2014'}
                      </div>
                      {/* Status dropdown — chuyển trạng thái series */}
                      <div className="col-span-2">
                        {options.length > 0 ? (
                          /* Dropdown chuyển status (ONGOING, AT_RISK, HIATUS có thể chuyển) */
                          <select
                            value={series.status}
                            onChange={(e) => handleStatusChange(series.id, e.target.value)}
                            disabled={updatingId === series.id}
                            className={cn(
                              'appearance-none w-full bg-surface-container-high border rounded-xl px-3 py-2 text-sm font-medium cursor-pointer transition-all',
                              'focus:ring-2 focus:ring-primary/50',
                              updatingId === series.id && 'opacity-50 cursor-wait',
                              mgmtStatusColors[series.status] || 'text-on-surface border-outline-variant/30',
                            )}
                          >
                            {/* Option hiện tại (disabled, không thể chọn lại) */}
                            <option value={series.status} disabled>
                              {statusLabels[series.status] || series.status}
                            </option>
                            {/* Các status có thể chuyển đến */}
                            {options.map((opt) => (
                              <option key={opt} value={opt} className="text-on-surface bg-surface-container">
                                {statusLabels[opt] || opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          /* Text tĩnh — khi series ở terminal status (CANCELLED/COMPLETED) */
                          <span className={cn(
                            'inline-block px-3 py-1.5 rounded-xl text-xs font-bold border',
                            mgmtStatusColors[series.status] || 'bg-surface-container-high text-on-surface-variant border-outline-variant/30',
                          )}>
                            {statusLabels[series.status] || series.status}
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
      </div>
      )}

      {/* ── Footer: Copyright + links + version ──────────────────────────── */}
      <footer className="mt-20 border-t border-outline-variant/30 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-xs">© 2024 MangaFlow Creative Engine. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {/* Link API Reference */}
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="#">API Reference</a>
            {/* Link Privacy Policy */}
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs" href="#">Privacy Policy</a>
            {/* Version badge */}
            <span className="text-outline/30 text-xs px-2 py-1 rounded bg-surface-container-highest">v2.4.0-pro</span>
          </div>
        </div>
      </footer>

      {/* ── Dialog xác nhận "Cancel Series" — khi EB/CE chọn CANCELLED ──── */}
      <Dialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingAction(null) }}
        title="Cancel Series"
        description="Are you sure you want to cancel this series? This action cannot be undone."
        size="sm"
      >
        <div className="flex items-center gap-4 pt-4">
          {/* Nút "Keep" — đóng dialog, không thay đổi */}
          <button
            onClick={() => { setConfirmOpen(false); setPendingAction(null) }}
            className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all text-sm font-medium"
          >
            Keep
          </button>
          {/* Nút "Cancel Series" — xác nhận hủy, gọi API update status */}
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

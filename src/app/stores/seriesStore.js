/**
 * ─────────────────────────────────────────────
 *  seriesStore.js — State management cho Series
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Quản lý state toàn cục cho module Series (danh sách, chi tiết, chapters)
 *   - Cung cấp các async action để gọi API backend qua seriesService
 *   - Các component (SeriesListPage, SeriesDetailPage) subscribe vào store này
 *
 * 🔄 So với bản cũ (dùng mock data):
 *   - Bản cũ: state được khởi tạo từ mock-data.js và mutate trực tiếp
 *   - Bản mới: state rỗng ban đầu, gọi API để lấy dữ liệu thật
 *   - Bản cũ: addSeries, updateSeries mutate mock array
 *   - Bản mới: fetchAll, fetchById, fetchChurches — chỉ đọc, ko mutate
 *
 * 📦 State structure:
 *   ┌─────────────────┬──────────┬──────────────────────────────────┐
 *   │ State           │ Kiểu     │ Mục đích                         │
 *   ├─────────────────┼──────────┼──────────────────────────────────┤
 *   │ seriesList      │ Array    │ Danh sách series (cho list page) │
 *   │ isLoading       │ boolean  │ Đang tải danh sách?              │
 *   │ error           │ string   │ Lỗi khi tải danh sách            │
 *   │ totalElements   │ number   │ Tổng số series (cho pagination)  │
 *   │ totalPages      │ number   │ Tổng số trang (cho pagination)   │
 *   │ currentSeries   │ Object   │ Series đang xem chi tiết         │
 *   │ seriesLoading   │ boolean  │ Đang tải chi tiết?               │
 *   │ seriesError     │ string   │ Lỗi khi tải chi tiết             │
 *   │ chapters        │ Array    │ Chapters của series hiện tại     │
 *   │ chaptersLoading │ boolean  │ Đang tải chapters?               │
 *   │ chaptersError   │ string   │ Lỗi khi tải chapters             │
 *   └─────────────────┴──────────┴──────────────────────────────────┘
 */

import { create } from 'zustand'
import seriesService from '../../services/seriesService'
import chapterService from '../../services/chapterService'

/**
 * useSeriesStore: Zustand store quản lý state Series
 *
 * create((set) => ({...})) — Zustand pattern:
 *   - set() là function để cập nhật state (giống React this.setState)
 *   - Không cần reducer, dispatch — gọi set trực tiếp
 *   - Mỗi action là một async function gọi API rồi set state
 *
 * Zustand async actions pattern:
 *   1. set({ isLoading: true }) — bắt đầu loading
 *   2. await seriesService.xxx() — gọi API
 *   3. set({ data, isLoading: false }) — thành công
 *   4. catch → set({ error, isLoading: false }) — thất bại
 */
export const useSeriesStore = create((set) => ({

  // ────────────────────────────────────────────
  //  STATE — Dữ liệu
  // ────────────────────────────────────────────

  seriesList: [],        // Mảng các SeriesResponse (cho SeriesListPage)
  isLoading: false,      // true khi đang gọi API getAll
  error: null,           // message lỗi nếu API getAll thất bại
  totalElements: 0,      // Tổng số series (hiển thị "Showing X-Y of Z")
  totalPages: 0,         // Tổng số trang (cho pagination component)

  currentSeries: null,   // SeriesResponse của series đang xem (cho SeriesDetailPage)
  seriesLoading: false,  // true khi đang gọi API getById
  seriesError: null,     // message lỗi nếu API getById thất bại

  chapters: [],          // Mảng ChapterResponse của series hiện tại
  chaptersLoading: false,// true khi đang gọi API getChaptersBySeries
  chaptersError: null,   // message lỗi nếu API chapters thất bại

  // ────────────────────────────────────────────
  //  ACTIONS — Hàm gọi API + cập nhật state
  // ────────────────────────────────────────────

  /**
   * fetchAll: Lấy danh sách series từ backend
   *
   * Được gọi bởi: SeriesListPage (trong useEffect)
   * Khi gọi: Gửi các params filter lên backend
   * Thành công: Lưu content vào seriesList, pagination vào totalPages
   * Thất bại: Lưu message lỗi vào error
   *
   * @param {Object} params - { status, genre, search, page, size, sort }
   *   Các params này được seriesService.getAll() chuyển thành query string
   */
  fetchAll: async (params = {}) => {
    // Bước 1: Bật loading, xoá error cũ
    set({ isLoading: true, error: null })

    try {
      // Bước 2: Gọi API — seriesService.getAll trả về Page object
      //   { content: [...], totalElements: 100, totalPages: 5, ... }
      const data = await seriesService.getAll(params)

      // Bước 3: Cập nhật state với dữ liệu từ backend
      //   data.content là mảng các SeriesResponse
      //   data.totalPages dùng cho pagination ở SeriesListPage
      set({
        seriesList: data.content || [],       // content là mảng series
        totalElements: data.totalElements || 0, // tổng số bản ghi
        totalPages: data.totalPages || 0,       // tổng số trang
        isLoading: false,                       // tắt loading
      })
    } catch (err) {
      // Bước 4: Lỗi — lưu message để component hiển thị
      set({ error: err.message, isLoading: false })
    }
  },

  /**
   * fetchById: Lấy chi tiết 1 series theo ID
   *
   * Được gọi bởi: SeriesDetailPage (trong useEffect)
   * Khi người dùng click vào 1 series trong danh sách
   *
   * @param {number} id - ID của series cần xem
   */
  fetchById: async (id) => {
    // Bước 1: Bật loading, xoá dữ liệu cũ + error cũ
    set({ seriesLoading: true, seriesError: null, currentSeries: null })

    try {
      // Bước 2: Gọi API — nhận SeriesResponse
      //   { id, title, genre, status, mangaka: {...}, tantouEditor: {...}, ... }
      const data = await seriesService.getById(id)

      // Bước 3: Lưu vào currentSeries để component render
      set({ currentSeries: data, seriesLoading: false })
    } catch (err) {
      // Bước 4: Lỗi — component sẽ hiển thị EmptyState
      set({ seriesError: err.message, seriesLoading: false })
    }
  },

  /**
   * fetchChapters: Lấy danh sách chapters của 1 series
   *
   * Được gọi bởi: SeriesDetailPage (cùng lúc với fetchById)
   * Backend trả về List<ChapterResponse> (plain array, không pagination)
   *
   * @param {number} seriesId - ID của series
   */
  fetchChapters: async (seriesId) => {
    // Bước 1: Bật loading, xoá chapters cũ
    set({ chaptersLoading: true, chaptersError: null, chapters: [] })

    try {
      // Bước 2: Gọi API chapters
      const data = await chapterService.getBySeries(seriesId)

      // Bước 3: Xử lý response
      //   Backend trả về List<ChapterResponse> (Array)
      //   Nhưng để an toàn, kiểm tra cả trường hợp data.content (nếu có pagination sau này)
      set({
        chapters: Array.isArray(data) ? data : data.content || [],
        chaptersLoading: false,
      })
    } catch (err) {
      set({ chaptersError: err.message, chaptersLoading: false })
    }
  },
}))

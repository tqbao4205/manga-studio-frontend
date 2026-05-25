import { create } from 'zustand'
import { mockSeries, mockChapters } from '../../shared/constants/mock-data'

/** Biến đếm ID tự tăng cho series mới */
let nextSeriesId = mockSeries.reduce((max, s) => Math.max(max, s.id), 0) + 1

/** Biến đếm ID tự tăng cho chapter mới (dùng flatMap trên tất cả chapters) */
let nextChapterId = Object.values(mockChapters).flat().reduce((max, c) => Math.max(max, c.id), 0) + 1

/**
 * 📦 seriesStore — Quản lý danh sách series và chapters.
 *
 * Cung cấp các thao tác:
 *   - CRUD series (thêm, sửa)
 *   - CRUD chapter (thêm, sửa, cập nhật trạng thái)
 *   - Tự động chuyển series DRAFT → ONGOING khi chapter 1 được APPROVED
 *   - Đồng bộ dữ liệu với mock data (mockSeries, mockChapters) để các
 *     component khác trong chế độ mock có thể đọc dữ liệu mới nhất
 */
export const useSeriesStore = create((set) => ({
  /** Danh sách tất cả series */
  seriesList: mockSeries,

  /** Chapters được nhóm theo seriesId: { [seriesId]: chapter[] } */
  chapters: mockChapters,

  /** Thêm series mới, đồng thời push vào mockSeries để đồng bộ */
  addSeries: (series) =>
    set((state) => {
      const s = { ...series, id: nextSeriesId++ }
      mockSeries.push(s)
      return { seriesList: [...state.seriesList, s] }
    }),

  /** Cập nhật thông tin series theo ID, đồng thời cập nhật mockSeries */
  updateSeries: (id, updates) =>
    set((state) => {
      const idx = mockSeries.findIndex(s => s.id === id)
      if (idx !== -1) Object.assign(mockSeries[idx], updates)
      return {
        seriesList: state.seriesList.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }
    }),

  /** Lấy ID tiếp theo cho chapter (dùng khi tạo chapter mới bên ngoài store) */
  getNextChapterId: () => nextChapterId,

  /** Thêm chapter mới vào series, đồng thời cập nhật mockChapters */
  addChapter: (seriesId, chapter) =>
    set((state) => {
      const c = { ...chapter, id: nextChapterId++ }
      const seriesChapters = state.chapters[seriesId] || []
      const next = { ...state.chapters, [seriesId]: [...seriesChapters, c] }
      Object.assign(mockChapters, next)
      return { chapters: next }
    }),

  /** Cập nhật thông tin chapter theo ID, đồng thời cập nhật mockChapters */
  updateChapter: (chapterId, updates) =>
    set((state) => {
      const next = {}
      for (const sid in state.chapters) {
        next[sid] = state.chapters[sid].map((c) =>
          c.id === chapterId ? { ...c, ...updates } : c
        )
      }
      Object.assign(mockChapters, next)
      return { chapters: next }
    }),

  /**
   * Cập nhật trạng thái chapter và tự động chuyển series từ DRAFT → ONGOING
   * nếu chapter 1 được APPROVED.
   *
   * Logic:
   *   1. Duyệt qua tất cả chapters để tìm chapter cần cập nhật
   *   2. Nếu status = 'APPROVED', kiểm tra series nào có chapter 1 vừa được approve
   *   3. Nếu series đó đang ở trạng thái DRAFT → chuyển sang ONGOING
   *   4. Đồng bộ với mockChapters và mockSeries
   */
  updateChapterStatus: (chapterId, status) =>
    set((state) => {
      const next = {}
      for (const sid in state.chapters) {
        next[sid] = state.chapters[sid].map((c) =>
          c.id === chapterId ? { ...c, status } : c
        )
      }
      Object.assign(mockChapters, next)

      // Auto-transition: DRAFT → ONGOING khi chapter 1 được APPROVED
      if (status === 'APPROVED') {
        const updatedSeries = state.seriesList.map(s => {
          const sc = next[s.id] || []
          const hasApprovedCh1 = sc.some(c => c.chapterNumber === 1 && c.status === 'APPROVED')
          if (hasApprovedCh1 && s.status === 'DRAFT') {
            const ms = mockSeries.find(m => m.id === s.id)
            if (ms) ms.status = 'ONGOING'
            return { ...s, status: 'ONGOING' }
          }
          return s
        })
        return { chapters: next, seriesList: updatedSeries }
      }

      return { chapters: next }
    }),
}))

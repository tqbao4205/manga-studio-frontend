import { create } from 'zustand'
import { mockSeries, mockChapters } from '../../shared/constants/mock-data'

let nextSeriesId = mockSeries.reduce((max, s) => Math.max(max, s.id), 0) + 1
let nextChapterId = Object.values(mockChapters).flat().reduce((max, c) => Math.max(max, c.id), 0) + 1

export const useSeriesStore = create((set) => ({
  seriesList: mockSeries,
  chapters: mockChapters,

  addSeries: (series) =>
    set((state) => {
      const s = { ...series, id: nextSeriesId++ }
      mockSeries.push(s)
      return { seriesList: [...state.seriesList, s] }
    }),

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

  getNextChapterId: () => nextChapterId,

  addChapter: (seriesId, chapter) =>
    set((state) => {
      const c = { ...chapter, id: nextChapterId++ }
      const seriesChapters = state.chapters[seriesId] || []
      const next = { ...state.chapters, [seriesId]: [...seriesChapters, c] }
      Object.assign(mockChapters, next)
      return { chapters: next }
    }),

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

  updateChapterStatus: (chapterId, status) =>
    set((state) => {
      const next = {}
      for (const sid in state.chapters) {
        next[sid] = state.chapters[sid].map((c) =>
          c.id === chapterId ? { ...c, status } : c
        )
      }
      Object.assign(mockChapters, next)
      return { chapters: next }
    }),
}))

import { create } from 'zustand'
import rankingService from '../../services/rankingService'
import { monthStr } from '../../utils/dateUtils'

export const useRankingStore = create((set, get) => ({
  rankings: [],
  history: [],
  isLoading: false,
  error: null,

  fetchAll: async (year, month) => {
    set({ isLoading: true, error: null })
    try {
      const data = await rankingService.getAll({ month: monthStr(year, month) })
      const list = Array.isArray(data) ? data : (data.content || [])
      set({ rankings: list, isLoading: false })
    } catch (err) {
      set({ error: err.message || 'Failed to load rankings', isLoading: false })
    }
  },

  fetchHistory: async () => {
    try {
      const data = await rankingService.getHistory()
      const list = Array.isArray(data) ? data : (data.content || [])
      const byMonth = {}
      for (const entry of list) {
        const m = entry.month
        if (!byMonth[m]) byMonth[m] = []
        byMonth[m].push(entry)
      }
      const grouped = Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, entries]) => ({
          periodLabel: month,
          entries: entries
            .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
            .map((entry, i) => ({ ...entry, rank: i + 1 })),
        }))
      set({ history: grouped })
    } catch (err) {
      // silently fail — history is optional
    }
  },

  clearError: () => set({ error: null }),
}))

import { create } from 'zustand'
import rankingService from '../../services/rankingService'

export const useRankingStore = create((set) => ({
  weeklyRankings: [],
  monthlyRankings: [],
  isLoading: false,
  error: null,

  atRiskSeries: [],
  isAtRiskLoading: false,
  atRiskError: null,

  fetchWeekly: async (week) => {
    set({ isLoading: true, error: null })
    try {
      const data = await rankingService.getWeekly(week)
      set({ weeklyRankings: Array.isArray(data) ? data : (data.content || []), isLoading: false })
    } catch (err) {
      set({ error: err.message || 'Failed to load weekly rankings', isLoading: false })
    }
  },

  fetchMonthly: async (month) => {
    set({ isLoading: true, error: null })
    try {
      const data = await rankingService.getMonthly(month)
      set({ monthlyRankings: Array.isArray(data) ? data : (data.content || []), isLoading: false })
    } catch (err) {
      set({ error: err.message || 'Failed to load monthly rankings', isLoading: false })
    }
  },

  fetchAtRisk: async () => {
    set({ isAtRiskLoading: true, atRiskError: null })
    try {
      const data = await rankingService.getAtRisk()
      set({ atRiskSeries: Array.isArray(data) ? data : [], isAtRiskLoading: false })
    } catch (err) {
      set({ atRiskError: err.message || 'Failed to load at-risk series', isAtRiskLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))

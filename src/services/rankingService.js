import api from './api'

const rankingService = {
  // ── Weekly ──
  getWeekly: async (week) => {
    return api.get('/ranking/weekly', { params: { week } })
  },

  exportWeekly: async (week) => {
    return api.get('/ranking/weekly/export', { params: { week }, responseType: 'blob' })
  },

  importWeekly: async (formData, week) => {
    return api.post('/ranking/weekly/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { week },
    })
  },

  // ── Monthly ──
  getMonthly: async (month) => {
    return api.get('/ranking/monthly', { params: { month } })
  },

  exportMonthly: async (month) => {
    return api.get('/ranking/monthly/export', { params: { month }, responseType: 'blob' })
  },

  importMonthly: async (formData, month) => {
    return api.post('/ranking/monthly/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { month },
    })
  },
}

export default rankingService

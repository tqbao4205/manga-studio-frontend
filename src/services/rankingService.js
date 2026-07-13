import api, { UPLOAD_TIMEOUT } from './api'
import { logApiCall } from '../shared/utils/telemetry'

const rankingService = {
  // ── Weekly ──
  getWeekly: async (week) => {
    logApiCall('ranking', 'getWeekly', { week })
    return api.get('/ranking/weekly', { params: { week } })
  },

  exportWeekly: async (week) => {
    logApiCall('ranking', 'exportWeekly', { week })
    return api.get('/ranking/weekly/export', { params: { week }, responseType: 'blob' })
  },

  importWeekly: async (formData, week) => {
    logApiCall('ranking', 'importWeekly', { week })
    return api.post('/ranking/weekly/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { week },
      timeout: UPLOAD_TIMEOUT,
    })
  },

  // ── Monthly ──
  getMonthly: async (month) => {
    logApiCall('ranking', 'getMonthly', { month })
    return api.get('/ranking/monthly', { params: { month } })
  },

  exportMonthly: async (month) => {
    logApiCall('ranking', 'exportMonthly', { month })
    return api.get('/ranking/monthly/export', { params: { month }, responseType: 'blob' })
  },

  importMonthly: async (formData, month) => {
    logApiCall('ranking', 'importMonthly', { month })
    return api.post('/ranking/monthly/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { month },
      timeout: UPLOAD_TIMEOUT,
    })
  },

  // ── At-Risk ──
  getAtRisk: async () => {
    return api.get('/ranking/at-risk')
  },
}

export default rankingService

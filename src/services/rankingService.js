import api from './api'

const rankingService = {
  getAll: async (params = {}) => {
    return api.get('/ranking', { params })
  },

  getHistory: async () => {
    return api.get('/ranking/metrics/history')
  },

  exportForm: async (params = {}) => {
    return api.get('/ranking/export', { params, responseType: 'blob' })
  },

  importExcel: async (formData, month) => {
    return api.post('/ranking/import-chapters', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { month },
    })
  },


}

export default rankingService

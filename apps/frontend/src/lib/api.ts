import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  getMe: () => api.get('/auth/me'),
}

// Persona API
export const personaApi = {
  getAll: () => api.get('/personas'),

  getById: (id: string) => api.get(`/personas/${id}`),

  create: (data: any) => api.post('/personas', data),

  update: (id: string, data: any) => api.patch(`/personas/${id}`, data),

  delete: (id: string) => api.delete(`/personas/${id}`),

  getStats: (id: string) => api.get(`/personas/${id}/stats`),

  // Documents
  uploadDocument: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/personas/${id}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadText: (id: string, text: string, source?: string) =>
    api.post(`/personas/${id}/documents/text`, { text, source }),

  getDocuments: (id: string) => api.get(`/personas/${id}/documents`),

  deleteDocument: (personaId: string, documentId: string) =>
    api.delete(`/personas/${personaId}/documents/${documentId}`),
}

// Chat API
export const chatApi = {
  sendMessage: (data: {
    personaId: string
    message: string
    conversationId?: string
    externalUserId?: string
  }) => api.post('/chat', data),

  getConversations: (personaId: string, limit?: number) =>
    api.get(`/chat/conversations/${personaId}`, { params: { limit } }),

  getConversation: (id: string) => api.get(`/chat/conversation/${id}`),

  endConversation: (id: string) => api.post(`/chat/conversation/${id}/end`),

  addFeedback: (messageId: string, rating: number, feedback?: string) =>
    api.post(`/chat/message/${messageId}/feedback`, { rating, feedback }),

  getStats: (personaId: string) => api.get(`/chat/stats/${personaId}`),
}

// Deployment API
export const deploymentApi = {
  create: (data: { personaId: string; channel: string; config: any }) =>
    api.post('/deployments', data),

  getByPersona: (personaId: string) =>
    api.get(`/deployments/persona/${personaId}`),

  getById: (id: string) => api.get(`/deployments/${id}`),

  toggleActive: (id: string) => api.patch(`/deployments/${id}/toggle`),

  delete: (id: string) => api.delete(`/deployments/${id}`),
}

// Analytics API
export const analyticsApi = {
  track: (data: {
    personaId: string
    eventType: string
    eventData: any
    channel?: string
  }) => api.post('/analytics/track', data),

  getPersonaAnalytics: (
    personaId: string,
    startDate?: string,
    endDate?: string
  ) =>
    api.get(`/analytics/persona/${personaId}`, {
      params: { startDate, endDate },
    }),

  getTimeSeries: (
    personaId: string,
    eventType?: string,
    interval?: 'hour' | 'day' | 'week'
  ) =>
    api.get(`/analytics/persona/${personaId}/timeseries`, {
      params: { eventType, interval },
    }),
}

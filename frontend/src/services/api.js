import axios from 'axios'
import useStore from '../store/useStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 300000, // 5 minutes timeout for large uploads
  maxContentLength: 5 * 1024 * 1024 * 1024, // 5GB max
  maxBodyLength: 5 * 1024 * 1024 * 1024 // 5GB max
})

// Request interceptor for auth
api.interceptors.request.use(
  config => {
    const token = useStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor for token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = useStore.getState().refreshToken
        if (refreshToken) {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken
          })
          
          const { access_token, refresh_token, user } = response.data
          useStore.getState().setAuth(user, access_token, refresh_token)
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        useStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authAPI = {
  login: (email, password, challengeId = null, challengeSolution = null, fingerprint = null) => {
    const data = { email, password }
    if (challengeId) data.challenge_id = challengeId
    if (challengeSolution) data.challenge_solution = challengeSolution
    if (fingerprint) data.fingerprint = fingerprint
    return api.post('/auth/login', data)
  },
  register: (email, username, password) => api.post('/auth/register', { email, username, password }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  verify2FALogin: (data) => api.post('/auth/login/2fa', data),
  // 2FA methods
  enable2FA: () => api.post('/auth/2fa/enable'),
  verify2FA: (data) => api.post('/auth/2fa/verify', data),
  disable2FA: (data) => api.post('/auth/2fa/disable', data),
  getBackupCodes: () => api.get('/auth/2fa/backup-codes'),
  regenerateBackupCodes: () => api.post('/auth/2fa/regenerate-backup-codes'),
  changePassword: (data) => api.post('/auth/change-password', data),
  // Password reset
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, code, newPassword) => api.post('/auth/reset-password', { 
    email, 
    code, 
    new_password: newPassword 
  })
}

// Upload endpoints
export const uploadAPI = {
  uploadAnonymous: (file, password, expiryMinutes) => {
    const formData = new FormData()
    formData.append('file', file)
    if (password && password.trim()) formData.append('password', password)
    formData.append('expiry_minutes', expiryMinutes)
    
    return api.post('/upload/anonymous', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  uploadAuthenticated: (file, password, expiryMinutes, maxDownloads, maxPasswordAttempts, redactionSettings = null, config = {}, watermarkEnabled = false) => {
    const formData = new FormData()
    formData.append('file', file)
    if (password && password.trim()) formData.append('password', password)
    formData.append('expiry_minutes', expiryMinutes)
    if (maxDownloads) formData.append('max_downloads', maxDownloads)
    if (maxPasswordAttempts !== undefined) formData.append('max_password_attempts', maxPasswordAttempts)
    
    // Add redaction settings
    if (redactionSettings && redactionSettings.enabled) {
      formData.append('enable_preview_redaction', 'true')
      
      // Convert line ranges to the backend format
      // For now, if there are multiple ranges, we'll send them as patterns
      if (redactionSettings.lineRanges && redactionSettings.lineRanges.length > 0) {
        // Use the first range for line_start/line_end (for backward compatibility)
        const firstRange = redactionSettings.lineRanges[0]
        formData.append('preview_line_start', firstRange.start)
        formData.append('preview_line_end', firstRange.end)
        
        // Store all ranges in patterns field as a special format
        const allRanges = {
          lineRanges: redactionSettings.lineRanges,
          patterns: redactionSettings.patterns || []
        }
        formData.append('preview_redaction_patterns', JSON.stringify(allRanges))
      } else if (redactionSettings.patterns && redactionSettings.patterns.length > 0) {
        formData.append('preview_redaction_patterns', JSON.stringify({ patterns: redactionSettings.patterns }))
      }
      
      if (redactionSettings.blurImages) formData.append('preview_blur_images', 'true')
    }
    
    // Add watermark settings
    if (watermarkEnabled) {
      formData.append('watermark_enabled', 'true')
      // Always use ZnapFile as watermark text
      formData.append('watermark_text', 'ZnapFile')
    }
    
    return api.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: config.onUploadProgress,
      ...config
    })
  },
  
  uploadBatch: (formData) => {
    return api.post('/batch/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  uploadFolder: (zipFile, parentFolderId, password, expiryMinutes, preserveStructure) => {
    const formData = new FormData()
    formData.append('file', zipFile)
    if (parentFolderId) formData.append('parent_folder_id', parentFolderId)
    if (password) formData.append('password', password)
    formData.append('expiry_minutes', expiryMinutes)
    formData.append('preserve_structure', preserveStructure)
    
    return api.post('/batch/folder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Download endpoints
export const downloadAPI = {
  getFileInfo: (code) => api.get(`/download/${code}/info`),
  downloadFile: (code, password) => {
    const params = password ? { password } : {}
    return api.get(`/download/${code}`, { params })
  },
  initiateDownload: (code) => {
    return api.post(`/secure-download/${code}/initiate-download`)
  },
  verifyPassword: (code, data) => {
    return api.post(`/secure-download/${code}/verify-password`, data)
  }
}

// Files endpoints
export const filesAPI = {
  listFiles: () => api.get('/files'),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  updateFile: (fileId, data) => api.patch(`/files/${fileId}`, data),
  deleteExpiredFiles: () => api.delete('/files/expired/cleanup')
}

// Account endpoints
export const accountAPI = {
  getAccount: () => api.get('/account'),
  updateAccount: (data) => api.patch('/account', data)
}

// User endpoints
export const userAPI = {
  changePassword: (currentPassword, newPassword) => api.post('/users/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  }),
  deleteAccount: () => api.delete('/users/me')
}

// Collections endpoints
export const collectionsAPI = {
  create: (data) => api.post('/collections', data),
  list: (skip = 0, limit = 20) => api.get('/collections', { params: { skip, limit } }),
  get: (slug, password) => api.get(`/collections/${slug}`, { params: { password } }),
  update: (id, data) => api.patch(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
  addFiles: (id, data) => api.post(`/collections/${id}/files`, data),
  removeFile: (collectionId, fileId, password) => api.delete(`/collections/${collectionId}/files/${fileId}`, {
    params: password ? { password } : {}
  }),
  createFolder: (id, data) => api.post(`/collections/${id}/folders`, data)
}

// Plans endpoints
export const plansAPI = {
  getPlans: () => api.get('/plans/'),
  selectPlan: (planId) => api.post('/plans/select', { plan_id: planId }),
  getCurrentPlan: () => api.get('/plans/current'),
  cancelSubscription: () => api.post('/plans/cancel')
}

// Payments endpoints
export const paymentsAPI = {
  createCheckoutSession: (plan) => api.post('/payments/create-checkout-session', { plan }),
  cancelSubscription: () => api.post('/payments/cancel-subscription'),
  getSubscriptionStatus: () => api.get('/payments/subscription-status')
}

// Multipart Upload API
export const multipartAPI = {
  initiate: (data) => api.post('/multipart/initiate', data),
  getUploadUrl: (data) => api.post('/multipart/get-upload-url', data),
  completeChunk: (sessionId, chunkNumber, etag) => 
    api.post('/multipart/complete-chunk', null, {
      params: { session_id: sessionId, chunk_number: chunkNumber, etag }
    }),
  complete: (data) => api.post('/multipart/complete', data),
  getSessions: () => api.get('/multipart/sessions'),
  cancelSession: (sessionId) => api.delete(`/multipart/sessions/${sessionId}`)
}

// Share API
export const shareAPI = {
  sendEmail: (endpoint, data) => api.post(endpoint, data)
}

// Admin API
export const adminAPI = {
  // Analytics
  getOverview: () => api.get('/admin/analytics/overview'),
  getUserGrowth: (period = '30d') => api.get(`/admin/analytics/users/growth?period=${period}`),
  getSystemHealth: () => api.get('/admin/analytics/system/health'),
  getRevenueBreakdown: () => api.get('/admin/analytics/revenue/breakdown'),
  getFeatureUsage: () => api.get('/admin/analytics/features/usage'),
  
  // User management
  searchUsers: (query) => api.get(`/admin/users/search?q=${query}`),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  updateUserTier: (userId, tier) => api.patch(`/admin/users/${userId}/tier`, tier),
  
  // Key rotation
  rotateKey: (keyType) => api.post('/admin/rotate-key', { key_type: keyType }),
  getKeyHistory: (keyType) => api.get(`/admin/key-rotation-history/${keyType}`),
  
  // Notifications
  sendGlobalNotification: (data) => api.post('/admin/notifications/global', data),
  getRecentNotifications: () => api.get('/admin/notifications/recent'),
}

// Notifications API
export const notificationsAPI = {
  getAll: (unreadOnly = false) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
}

export default api
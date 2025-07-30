import { multipartAPI } from '../services/api'

const CHUNK_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_CONCURRENT_UPLOADS = 3
const MAX_RETRY_ATTEMPTS = 3
const STORAGE_KEY = 'fileshare_upload_sessions'

class ChunkedUploadManager {
  constructor() {
    this.activeUploads = new Map()
    this.loadSessions()
  }

  // Load saved sessions from localStorage
  loadSessions() {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY)
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions)
        // Only load sessions that aren't expired
        const now = new Date()
        Object.entries(sessions).forEach(([fileId, session]) => {
          const expiresAt = new Date(session.expiresAt)
          if (expiresAt > now) {
            this.activeUploads.set(fileId, session)
          }
        })
        this.saveSessions()
      }
    } catch (error) {
      console.error('Failed to load upload sessions:', error)
    }
  }

  // Save sessions to localStorage
  saveSessions() {
    try {
      const sessions = {}
      this.activeUploads.forEach((session, fileId) => {
        sessions[fileId] = {
          ...session,
          file: undefined // Don't store the actual file object
        }
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save upload sessions:', error)
    }
  }

  // Generate unique file ID
  generateFileId(file) {
    return `${file.name}_${file.size}_${file.lastModified}`
  }

  // Calculate file chunks
  calculateChunks(fileSize) {
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
    const chunks = []
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, fileSize)
      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        uploaded: false,
        retries: 0
      })
    }
    
    return chunks
  }

  // Check if file has incomplete upload
  async checkIncompleteUpload(file) {
    const fileId = this.generateFileId(file)
    const session = this.activeUploads.get(fileId)
    
    if (session && session.sessionId) {
      // Verify session is still valid on server
      try {
        const response = await multipartAPI.getSessions()
        const serverSessions = response.data
        const validSession = serverSessions.find(s => s.session_id === session.sessionId)
        
        if (validSession) {
          return {
            exists: true,
            session,
            completedChunks: validSession.completed_chunks,
            totalChunks: validSession.total_chunks
          }
        }
      } catch (error) {
        console.error('Failed to verify session:', error)
      }
    }
    
    return { exists: false }
  }

  // Initiate new upload
  async initiateUpload(file, metadata = {}) {
    const fileId = this.generateFileId(file)
    
    try {
      const response = await multipartAPI.initiate({
        filename: file.name,
        file_size: file.size,
        content_type: file.type || 'application/octet-stream',
        metadata
      })
      
      const chunks = this.calculateChunks(file.size)
      
      const session = {
        fileId,
        sessionId: response.data.session_id,
        uploadId: response.data.upload_id,
        file,
        fileName: file.name,
        fileSize: file.size,
        totalChunks: response.data.total_chunks,
        chunkSize: response.data.chunk_size,
        chunks,
        completedChunks: [],
        progress: 0,
        status: 'active',
        startedAt: new Date().toISOString(),
        expiresAt: response.data.expires_at,
        metadata
      }
      
      this.activeUploads.set(fileId, session)
      this.saveSessions()
      
      return session
    } catch (error) {
      throw new Error(`Failed to initiate upload: ${error.message}`)
    }
  }

  // Resume existing upload
  async resumeUpload(fileId, file) {
    const session = this.activeUploads.get(fileId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    // Restore file reference
    session.file = file
    session.status = 'active'
    
    // Mark completed chunks
    session.completedChunks.forEach(chunkIndex => {
      if (session.chunks[chunkIndex]) {
        session.chunks[chunkIndex].uploaded = true
      }
    })
    
    // Calculate progress
    session.progress = (session.completedChunks.length / session.totalChunks) * 100
    
    this.saveSessions()
    return session
  }

  // Upload single chunk with retry
  async uploadChunk(session, chunkIndex, onProgress) {
    const chunk = session.chunks[chunkIndex]
    if (!chunk || chunk.uploaded) return true
    
    const maxRetries = MAX_RETRY_ATTEMPTS
    let lastError
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get presigned URL
        const urlResponse = await multipartAPI.getUploadUrl({
          session_id: session.sessionId,
          chunk_number: chunkIndex
        })
        
        if (urlResponse.data.already_uploaded) {
          chunk.uploaded = true
          return true
        }
        
        // Read chunk data
        const blob = session.file.slice(chunk.start, chunk.end)
        
        // Upload directly to presigned URL
        const uploadResponse = await fetch(urlResponse.data.upload_url, {
          method: 'PUT',
          body: blob,
          headers: {
            'Content-Type': session.file.type || 'application/octet-stream'
          }
        })
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`)
        }
        
        // Get ETag from response
        const etag = uploadResponse.headers.get('ETag') || `"chunk-${chunkIndex}"`
        
        // Mark chunk as complete
        await multipartAPI.completeChunk(
          session.sessionId,
          chunkIndex,
          etag.replace(/"/g, '')
        )
        
        chunk.uploaded = true
        session.completedChunks.push(chunkIndex)
        session.progress = (session.completedChunks.length / session.totalChunks) * 100
        
        if (onProgress) {
          onProgress({
            progress: session.progress,
            completedChunks: session.completedChunks.length,
            totalChunks: session.totalChunks,
            uploadedBytes: session.completedChunks.length * session.chunkSize,
            totalBytes: session.fileSize
          })
        }
        
        this.saveSessions()
        return true
        
      } catch (error) {
        lastError = error
        chunk.retries = attempt + 1
        
        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  // Upload file with chunking
  async uploadFile(session, options = {}) {
    const { onProgress, onComplete, onError } = options
    
    try {
      session.status = 'uploading'
      const uploadQueue = []
      let activeUploads = 0
      let uploadError = null
      
      // Create upload promise for each chunk
      for (let i = 0; i < session.chunks.length; i++) {
        if (session.chunks[i].uploaded) continue
        
        const uploadPromise = (async (chunkIndex) => {
          while (activeUploads >= MAX_CONCURRENT_UPLOADS) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          activeUploads++
          try {
            await this.uploadChunk(session, chunkIndex, onProgress)
          } catch (error) {
            uploadError = error
            throw error
          } finally {
            activeUploads--
          }
        })(i)
        
        uploadQueue.push(uploadPromise)
      }
      
      // Wait for all chunks to complete
      await Promise.all(uploadQueue)
      
      if (uploadError) {
        throw uploadError
      }
      
      // Complete the upload
      const completeResponse = await multipartAPI.complete({
        session_id: session.sessionId,
        expiration_hours: options.expirationHours || 24,
        max_downloads: options.maxDownloads,
        description: options.description,
        is_public: options.isPublic || false
      })
      
      session.status = 'completed'
      session.fileId = completeResponse.data.file_id
      session.shortCode = completeResponse.data.short_code
      session.downloadUrl = completeResponse.data.download_url
      
      // Remove from active uploads
      this.activeUploads.delete(session.fileId)
      this.saveSessions()
      
      if (onComplete) {
        onComplete({
          fileId: session.fileId,
          shortCode: session.shortCode,
          downloadUrl: session.downloadUrl
        })
      }
      
      return completeResponse.data
      
    } catch (error) {
      session.status = 'error'
      session.error = error.message
      this.saveSessions()
      
      if (onError) {
        onError(error)
      }
      
      throw error
    }
  }

  // Cancel upload
  async cancelUpload(fileId) {
    const session = this.activeUploads.get(fileId)
    if (!session) return
    
    try {
      if (session.sessionId) {
        await multipartAPI.cancelSession(session.sessionId)
      }
    } catch (error) {
      console.error('Failed to cancel upload:', error)
    }
    
    this.activeUploads.delete(fileId)
    this.saveSessions()
  }

  // Get all sessions
  getAllSessions() {
    return Array.from(this.activeUploads.values())
  }

  // Clear completed sessions
  clearCompletedSessions() {
    const completed = []
    this.activeUploads.forEach((session, fileId) => {
      if (session.status === 'completed') {
        completed.push(fileId)
      }
    })
    
    completed.forEach(fileId => this.activeUploads.delete(fileId))
    this.saveSessions()
  }
}

// Export singleton instance
export default new ChunkedUploadManager()
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, X, AlertCircle, CheckCircle, RefreshCw, 
  Pause, Play, FileUp, HardDrive, Zap, Wifi, WifiOff 
} from 'lucide-react'
import chunkedUploadManager from '../utils/chunkedUpload'
import { formatBytes } from '../utils/format'
import AnimatedButton from './AnimatedButton'
import { useToastContext } from '../contexts/ToastContext'

const ChunkedFileUploader = ({ onUploadComplete, maxFileSize = 1024 * 1024 * 1024 * 1024 }) => { // 1TB default
  const toast = useToastContext()
  const [file, setFile] = useState(null)
  const [uploadSession, setUploadSession] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [status, setStatus] = useState('idle') // idle, checking, uploading, paused, completed, error
  const [error, setError] = useState(null)
  const [resumePrompt, setResumePrompt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  const fileInputRef = useRef(null)
  const uploadStartTime = useRef(null)
  const lastProgressUpdate = useRef({ time: 0, bytes: 0 })
  const speedInterval = useRef(null)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast('Connection restored! Upload will resume automatically.')
      if (status === 'paused' && uploadSession) {
        resumeUpload()
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast('Connection lost. Upload paused.')
      if (status === 'uploading') {
        pauseUpload()
      }
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [status, uploadSession])

  // Check for incomplete uploads on mount
  useEffect(() => {
    checkIncompleteUploads()
  }, [])

  const checkIncompleteUploads = async () => {
    const sessions = chunkedUploadManager.getAllSessions()
    const incompleteSessions = sessions.filter(s => s.status === 'active' || s.status === 'error')
    
    if (incompleteSessions.length > 0) {
      // For now, show the most recent one
      const session = incompleteSessions[0]
      const bytesUploaded = session.completedChunks.length * session.chunkSize
      
      setResumePrompt({
        session,
        fileName: session.fileName,
        fileSize: session.fileSize,
        bytesUploaded,
        progress: (bytesUploaded / session.fileSize) * 100
      })
    }
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    if (selectedFile.size > maxFileSize) {
      setError(`File size exceeds maximum of ${formatBytes(maxFileSize)}`)
      return
    }
    
    setFile(selectedFile)
    setError(null)
    setStatus('checking')
    
    // Check if this file has an incomplete upload
    const incompleteUpload = await chunkedUploadManager.checkIncompleteUpload(selectedFile)
    
    if (incompleteUpload.exists) {
      const bytesUploaded = incompleteUpload.completedChunks * incompleteUpload.session.chunkSize
      setResumePrompt({
        session: incompleteUpload.session,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        bytesUploaded,
        progress: (bytesUploaded / selectedFile.size) * 100
      })
      setStatus('idle')
    } else {
      // Start new upload
      startNewUpload(selectedFile)
    }
  }

  const startNewUpload = async (fileToUpload) => {
    try {
      setStatus('uploading')
      uploadStartTime.current = Date.now()
      
      const session = await chunkedUploadManager.initiateUpload(fileToUpload, {
        uploadedBy: 'web-interface'
      })
      
      setUploadSession(session)
      startSpeedCalculation()
      
      await chunkedUploadManager.uploadFile(session, {
        onProgress: updateProgress,
        onComplete: handleUploadComplete,
        onError: handleUploadError,
        expirationHours: 24,
        maxDownloads: null,
        description: null,
        isPublic: false
      })
    } catch (error) {
      handleUploadError(error)
    }
  }

  const resumeUpload = async () => {
    if (!resumePrompt) return
    
    try {
      setStatus('uploading')
      setError(null)
      uploadStartTime.current = Date.now()
      
      const session = await chunkedUploadManager.resumeUpload(
        resumePrompt.session.fileId,
        file || resumePrompt.session.file
      )
      
      setUploadSession(session)
      setUploadProgress(session.progress)
      setResumePrompt(null)
      startSpeedCalculation()
      
      await chunkedUploadManager.uploadFile(session, {
        onProgress: updateProgress,
        onComplete: handleUploadComplete,
        onError: handleUploadError
      })
    } catch (error) {
      handleUploadError(error)
    }
  }

  const pauseUpload = () => {
    setStatus('paused')
    stopSpeedCalculation()
  }

  const cancelUpload = async () => {
    if (uploadSession) {
      await chunkedUploadManager.cancelUpload(uploadSession.fileId)
    }
    resetUpload()
  }

  const resetUpload = () => {
    setFile(null)
    setUploadSession(null)
    setUploadProgress(0)
    setUploadSpeed(0)
    setTimeRemaining(null)
    setStatus('idle')
    setError(null)
    setResumePrompt(null)
    stopSpeedCalculation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateProgress = (progressData) => {
    setUploadProgress(progressData.progress)
    
    // Calculate speed and time remaining
    const now = Date.now()
    const bytesUploaded = progressData.uploadedBytes
    
    if (lastProgressUpdate.current.time > 0) {
      const timeDiff = (now - lastProgressUpdate.current.time) / 1000 // seconds
      const bytesDiff = bytesUploaded - lastProgressUpdate.current.bytes
      
      if (timeDiff > 0) {
        const currentSpeed = bytesDiff / timeDiff // bytes per second
        setUploadSpeed(currentSpeed)
        
        const remainingBytes = progressData.totalBytes - bytesUploaded
        const remainingSeconds = remainingBytes / currentSpeed
        setTimeRemaining(remainingSeconds)
      }
    }
    
    lastProgressUpdate.current = { time: now, bytes: bytesUploaded }
  }

  const startSpeedCalculation = () => {
    speedInterval.current = setInterval(() => {
      // Update speed display every second
    }, 1000)
  }

  const stopSpeedCalculation = () => {
    if (speedInterval.current) {
      clearInterval(speedInterval.current)
      speedInterval.current = null
    }
  }

  const handleUploadComplete = (result) => {
    setStatus('completed')
    stopSpeedCalculation()
    toast('Upload completed successfully!')
    
    if (onUploadComplete) {
      onUploadComplete(result)
    }
    
    setTimeout(resetUpload, 3000)
  }

  const handleUploadError = (error) => {
    setStatus('error')
    setError(error.message || 'Upload failed')
    stopSpeedCalculation()
    
    // Don't reset - allow retry
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return '—'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  return (
    <div className="space-y-6">
      {/* Resume Prompt */}
      <AnimatePresence>
        {resumePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 rounded-xl border border-primary/50"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Resume Upload?</h3>
                <p className="text-sm text-text-muted mb-3">
                  Continue uploading "{resumePrompt.fileName}"? 
                  ({formatBytes(resumePrompt.bytesUploaded)} of {formatBytes(resumePrompt.fileSize)} completed)
                </p>
                
                <div className="w-full bg-dark-bg rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${resumePrompt.progress}%` }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <AnimatedButton
                    onClick={resumeUpload}
                    variant="primary"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Upload
                  </AnimatedButton>
                  
                  <AnimatedButton
                    onClick={() => {
                      chunkedUploadManager.cancelUpload(resumePrompt.session.fileId)
                      setResumePrompt(null)
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Upload Area */}
      <div className="glass-card p-8 rounded-xl">
        {status === 'idle' || status === 'checking' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <h3 className="text-lg font-medium mb-2">Drop your file here</h3>
            <p className="text-text-muted mb-4">or click to browse</p>
            <p className="text-sm text-text-muted">
              Supports files up to {formatBytes(maxFileSize)} • Resumable uploads
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{file?.name || uploadSession?.fileName}</h3>
                <p className="text-sm text-text-muted">
                  {formatBytes(file?.size || uploadSession?.fileSize)}
                </p>
              </div>
              
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{uploadProgress.toFixed(1)}% complete</span>
                <span>{formatTime(timeRemaining)} remaining</span>
              </div>
              <div className="w-full bg-dark-bg rounded-full h-3 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-primary to-accent h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatBytes(uploadSpeed)}/s</div>
                <div className="text-xs text-text-muted">Upload Speed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {uploadSession?.completedChunks?.length || 0}/{uploadSession?.totalChunks || 0}
                </div>
                <div className="text-xs text-text-muted">Chunks Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatBytes((uploadSession?.completedChunks?.length || 0) * (uploadSession?.chunkSize || 0))}
                </div>
                <div className="text-xs text-text-muted">Uploaded</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {status === 'uploading' && (
                <AnimatedButton
                  onClick={pauseUpload}
                  variant="secondary"
                  size="sm"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </AnimatedButton>
              )}
              
              {status === 'paused' && (
                <AnimatedButton
                  onClick={resumeUpload}
                  variant="primary"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </AnimatedButton>
              )}
              
              {(status === 'error' || status === 'paused') && (
                <AnimatedButton
                  onClick={cancelUpload}
                  variant="secondary"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </AnimatedButton>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 bg-error/10 border border-error/50 rounded-lg text-error text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {/* Success Message */}
            {status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Upload completed successfully!
              </motion.div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-lg text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <h4 className="font-medium text-sm mb-1">Lightning Fast</h4>
          <p className="text-xs text-text-muted">Parallel chunk uploads</p>
        </div>
        
        <div className="glass-card p-4 rounded-lg text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <h4 className="font-medium text-sm mb-1">Resumable</h4>
          <p className="text-xs text-text-muted">Never lose progress</p>
        </div>
        
        <div className="glass-card p-4 rounded-lg text-center">
          <HardDrive className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <h4 className="font-medium text-sm mb-1">1TB Support</h4>
          <p className="text-xs text-text-muted">Handle massive files</p>
        </div>
      </div>
    </div>
  )
}

export default ChunkedFileUploader
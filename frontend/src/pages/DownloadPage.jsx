import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Lock, Clock, FileText, AlertCircle, Image, FileVideo, FileAudio, FileCode, Eye } from 'lucide-react'
import { downloadAPI } from '../services/api'
import { formatBytes, formatTimeRemaining } from '../utils/format'
import FilePreviewModal from '../components/FilePreviewModal'

const DownloadPage = () => {
  const { code } = useParams()
  const [fileInfo, setFileInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Get icon based on mime type
  const getFileIcon = (mimeType, filename) => {
    if (!mimeType && filename) {
      const ext = filename.split('.').pop()?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image
      if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) return FileVideo
      if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return FileAudio
      if (['js', 'py', 'html', 'css', 'json', 'xml'].includes(ext)) return FileCode
    }
    
    if (mimeType?.startsWith('image/')) return Image
    if (mimeType?.startsWith('video/')) return FileVideo
    if (mimeType?.startsWith('audio/')) return FileAudio
    if (mimeType?.includes('javascript') || mimeType?.includes('json') || mimeType?.includes('xml')) return FileCode
    return FileText
  }

  useEffect(() => {
    fetchFileInfo()
  }, [code])

  const fetchFileInfo = async () => {
    try {
      const response = await downloadAPI.getFileInfo(code)
      setFileInfo(response.data)
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'File not found')
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (fileInfo.has_password && !password) {
      setError('Please enter the password')
      return
    }

    setDownloading(true)
    setError(null)

    try {
      // Get the backend URL from environment or default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const baseUrl = `${apiUrl}/download/${code}`
      const params = password ? `?password=${encodeURIComponent(password)}` : ''
      
      // Direct browser navigation to download endpoint
      window.location.href = baseUrl + params
    } catch (err) {
      setError(err.response?.data?.detail || 'Download failed')
    } finally {
      // Reset downloading state after a delay
      setTimeout(() => setDownloading(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    )
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-error" />
          <h1 className="text-2xl font-bold mb-2">Oops!</h1>
          <p className="text-text-muted">{error}</p>
          <a href="/" className="mt-6 inline-block px-6 py-3 bg-primary rounded-lg hover:bg-primary/80 transition">
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card-bg rounded-2xl p-8">
          {/* File Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
            {(() => {
              const Icon = getFileIcon(fileInfo.mime_type, fileInfo.original_filename)
              return <Icon className="w-10 h-10 text-primary" />
            })()}
          </div>

          {/* File Info */}
          <h1 className="text-xl font-bold text-center mb-2">
            {fileInfo.original_filename}
          </h1>
          <div className="text-center text-text-muted mb-6">
            <p className="mb-1">{formatBytes(fileInfo.file_size)}</p>
            {fileInfo.mime_type && (
              <p className="text-xs opacity-60">{fileInfo.mime_type}</p>
            )}
          </div>

          {/* Expiry Info */}
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-6">
            <Clock className="w-4 h-4" />
            <span>Expires in {formatTimeRemaining(fileInfo.expires_at)}</span>
          </div>

          {/* Password Input */}
          {fileInfo.has_password && (
            <div className="mb-6">
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">This file is password protected</span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Enter the password provided by the sender to download this file
                </p>
              </div>
              <div className="flex items-center gap-2 p-4 bg-dark-bg rounded-lg">
                <Lock className="w-5 h-5 text-text-muted" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleDownload()}
                  className="flex-1 bg-transparent outline-none text-text placeholder:text-text-muted"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Preview Button - only show for previewable files */}
            {fileInfo && (fileInfo.mime_type?.startsWith('text/') || 
                          fileInfo.mime_type?.startsWith('image/') || 
                          fileInfo.mime_type?.includes('pdf') ||
                          fileInfo.mime_type?.includes('json') ||
                          fileInfo.mime_type?.includes('javascript') ||
                          fileInfo.mime_type?.includes('xml') ||
                          fileInfo.original_filename?.match(/\.(txt|md|js|json|html|css|py|java|cpp|c|h|xml|yaml|yml|ini|cfg|log|sh|bash)$/i)) && (
              <button
                onClick={() => setShowPreview(true)}
                className="w-full p-4 bg-dark-bg border border-border rounded-lg hover:bg-dark-bg/80 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Preview
              </button>
            )}
            
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full p-4 bg-primary rounded-lg hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {downloading ? 'Preparing download...' : 'Download'}
            </button>
          </div>

          {/* Download Count */}
          {fileInfo.max_downloads && (
            <p className="text-center text-sm text-text-muted mt-4">
              {fileInfo.download_count} / {fileInfo.max_downloads} downloads
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-muted mt-6">
          Want to share files? <a href="/" className="text-primary hover:underline">Try znapfile</a>
        </p>
      </motion.div>

      {/* Preview Modal */}
      <FilePreviewModal
        file={{
          ...fileInfo,
          short_code: code,
          password: password || undefined
        }}
        isOpen={showPreview && !!fileInfo}
        onClose={() => setShowPreview(false)}
        onDownload={handleDownload}
      />
    </div>
  )
}

export default DownloadPage
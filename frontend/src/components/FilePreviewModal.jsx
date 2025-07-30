import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Download, Share2, Lock, FileText, Image, Film, 
  Music, Code, FileSpreadsheet, Archive, ChevronLeft, 
  ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2,
  Loader2, AlertCircle, Eye, EyeOff, File, Sparkles
} from 'lucide-react'
import { formatBytes, formatTimeRemaining } from '../utils/format'
import AnimatedButton from './AnimatedButton'
import useStore from '../store/useStore'

const FilePreviewModal = ({ 
  file, 
  isOpen, 
  onClose, 
  onDownload, 
  onShare,
  password: initialPassword = null,
  allFiles = [],
  currentIndex = 0 
}) => {
  const user = useStore(state => state.user)
  console.log('FilePreviewModal initialPassword:', initialPassword)
  // All hooks at the top level - no conditional logic before them
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState(initialPassword || '')
  const [passwordError, setPasswordError] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(currentIndex)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [shouldBlur, setShouldBlur] = useState(false)

  // Calculate current file
  const currentFile = allFiles[currentFileIndex] || file

  // Helper functions that don't use hooks
  const getFileType = (mimeType, filename) => {
    if (!mimeType && filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const extMap = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'],
        pdf: ['pdf'],
        text: ['txt', 'md', 'log', 'csv'],
        code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sql', 'sh', 'bash', 'yml', 'yaml'],
        spreadsheet: ['xls', 'xlsx', 'ods'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
      }
      
      for (const [type, extensions] of Object.entries(extMap)) {
        if (extensions.includes(ext)) return type
      }
    }

    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType?.startsWith('video/')) return 'video'
    if (mimeType?.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType?.startsWith('text/') || mimeType?.includes('json') || mimeType?.includes('xml')) return 'text'
    if (mimeType?.includes('spreadsheet') || mimeType === 'text/csv') return 'spreadsheet'
    if (mimeType?.includes('zip') || mimeType?.includes('compressed')) return 'archive'
    
    return 'file'
  }

  const fileType = currentFile ? getFileType(currentFile.mime_type, currentFile.original_filename) : 'file'
  const canPreview = ['image', 'video', 'audio', 'pdf', 'text', 'code'].includes(fileType)

  const fileIcons = {
    image: Image,
    video: Film,
    audio: Music,
    pdf: FileText,
    text: FileText,
    code: Code,
    spreadsheet: FileSpreadsheet,
    archive: Archive,
    file: File
  }

  const FileIcon = fileIcons[fileType]

  // Effects
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setLoading(true)
      setError(null)
      
      // Clean up object URL if exists
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      
      setPreviewUrl(null)
      setFileInfo(null)
      setPasswordError(null)
      setImageLoaded(false)
      setZoom(1)
      setRotation(0)
      setShouldBlur(false)
      return
    }

    if (!currentFile || !canPreview) {
      setLoading(false)
      return
    }

    const loadPreview = async () => {
      setLoading(true)
      setError(null)
      setPreviewUrl(null)
      setImageLoaded(false)
      
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
        const params = new URLSearchParams()
        if (password) params.append('password', password)
        
        // Use simple preview endpoint that works
        const previewEndpoint = `${apiUrl}/simple/preview/${currentFile.short_code}${params.toString() ? '?' + params.toString() : ''}`
        
        console.log('Preview password:', password)
        console.log('Preview URL params:', params.toString())
        
        // For media files, we can display directly
        if (['image', 'pdf', 'video', 'audio'].includes(fileType)) {
          // For images, fetch as blob to avoid routing issues
          if (fileType === 'image') {
            try {
              console.log('Fetching image from:', previewEndpoint)
              const response = await fetch(previewEndpoint)
              
              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
              }
              
              const hasBlur = response.headers.get('X-Preview-Blur') === 'true'
              setShouldBlur(hasBlur)
              
              // Convert to blob and create object URL
              const blob = await response.blob()
              const objectUrl = URL.createObjectURL(blob)
              console.log('Created object URL:', objectUrl)
              
              // Clean up old object URL if exists
              if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
              }
              
              setPreviewUrl(objectUrl)
              setLoading(false)
            } catch (err) {
              console.error('Failed to fetch image:', err)
              // Fallback to direct URL
              setPreviewUrl(previewEndpoint)
              setLoading(false)
            }
          } else if (fileType === 'pdf') {
            // For PDFs, also fetch as blob to avoid X-Frame-Options issues
            try {
              console.log('Fetching PDF from:', previewEndpoint)
              const response = await fetch(previewEndpoint)
              
              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
              }
              
              // Convert to blob and create object URL
              const blob = await response.blob()
              const objectUrl = URL.createObjectURL(blob)
              console.log('Created PDF object URL:', objectUrl)
              
              // Clean up old object URL if exists
              if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
              }
              
              setPreviewUrl(objectUrl)
              setLoading(false)
            } catch (err) {
              console.error('Failed to fetch PDF:', err)
              // Fallback to direct URL
              setPreviewUrl(previewEndpoint)
              setLoading(false)
            }
          } else {
            // For other media types, use direct URL
            console.log('Setting preview URL:', previewEndpoint)
            setPreviewUrl(previewEndpoint)
            setLoading(false)
          }
        } else {
          // For text/code files, fetch the content
          const response = await fetch(previewEndpoint)
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Failed to load preview')
          }
          
          const text = await response.text()
          const isTruncated = response.headers.get('X-Preview-Truncated') === 'true'
          const totalLines = parseInt(response.headers.get('X-Total-Lines') || '0')
          const totalSize = parseInt(response.headers.get('X-Total-Size') || '0')
          const redactionApplied = response.headers.get('X-Redaction-Applied') === 'true'
          
          console.log('FilePreviewModal - Response headers:', {
            isTruncated,
            totalLines,
            totalSize,
            redactionApplied
          })
          console.log('FilePreviewModal - Content preview:', text.substring(0, 200))
          
          setFileInfo({ 
            content: text,
            isTruncated,
            totalLines,
            totalSize,
            redactionApplied
          })
          setLoading(false)
        }
      } catch (err) {
        setError(err.message)
        setLoading(false)
        
        if (err.message.toLowerCase().includes('password') || err.message.includes('401')) {
          setPasswordError(err.message)
        }
      }
    }
    
    loadPreview()
  }, [isOpen, currentFile, password, fileType, canPreview])

  // Update current file index when currentIndex prop changes
  useEffect(() => {
    setCurrentFileIndex(currentIndex)
  }, [currentIndex])
  
  // Update password when initialPassword prop changes
  useEffect(() => {
    console.log('Updating password from prop:', initialPassword)
    setPassword(initialPassword || '')
  }, [initialPassword])

  // Event handlers
  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError(null)
    // Password change will trigger useEffect to reload preview
  }

  const navigateFile = (direction) => {
    const newIndex = currentFileIndex + direction
    if (newIndex >= 0 && newIndex < allFiles.length) {
      setCurrentFileIndex(newIndex)
      setZoom(1)
      setRotation(0)
      setImageLoaded(false)
    }
  }

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  // Don't render if modal is closed or no file
  if (!isOpen || !currentFile) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full h-full max-w-7xl mx-auto flex flex-col"
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Modern Header with Glassmorphism */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 via-black/30 to-transparent">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                  >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <FileIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        {currentFile.original_filename}
                        {currentFile.has_password && (
                          <Lock className="w-4 h-4 text-yellow-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 flex items-center gap-3">
                        <span>{formatBytes(currentFile.file_size)}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                        <span>{formatTimeRemaining(currentFile.expires_at)}</span>
                        {currentFile.download_count > 0 && (
                          <>
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span>{currentFile.download_count} downloads</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom controls for images */}
                  {fileType === 'image' && !loading && !error && imageLoaded && !shouldBlur && (
                    <>
                      <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                        <button
                          onClick={() => handleZoom(-0.25)}
                          className="p-1.5 hover:bg-white/10 rounded transition"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs px-2 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                        <button
                          onClick={() => handleZoom(0.25)}
                          className="p-1.5 hover:bg-white/10 rounded transition"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleRotate}
                          className="p-1.5 hover:bg-white/10 rounded transition ml-1"
                          title="Rotate"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-px h-8 bg-gray-700" />
                    </>
                  )}

                  {onShare && (
                    <button
                      onClick={() => onShare(currentFile)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all backdrop-blur-sm"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  <AnimatedButton
                    onClick={() => onDownload(currentFile)}
                    variant="primary"
                    size="sm"
                    className="backdrop-blur-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation arrows with better design */}
          {allFiles.length > 1 && (
            <>
              <button
                onClick={() => navigateFile(-1)}
                disabled={currentFileIndex === 0}
                className={`absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition-all z-10 group ${
                  currentFileIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
                }`}
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigateFile(1)}
                disabled={currentFileIndex === allFiles.length - 1}
                className={`absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition-all z-10 group ${
                  currentFileIndex === allFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                }`}
              >
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}

          {/* Main content area */}
          <div className="flex-1 flex items-center justify-center p-6 mt-20 mb-16">
            {loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
                  <Sparkles className="w-6 h-6 absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                </div>
                <motion.p 
                  className="text-gray-400"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {fileType === 'code' || fileType === 'text' 
                    ? 'Decrypting and preparing preview...' 
                    : 'Loading magical preview...'}
                </motion.p>
                {fileType === 'code' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Applying preview limits for security</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {error && !passwordError && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
              >
                <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <h3 className="text-xl font-semibold mb-2">Preview Unavailable</h3>
                  <p className="text-gray-400 mb-6">{error}</p>
                  <AnimatedButton onClick={() => onDownload(currentFile)} variant="primary">
                    <Download className="w-4 h-4 mr-2" />
                    Download File Instead
                  </AnimatedButton>
                </div>
              </motion.div>
            )}

            {passwordError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card-bg/80 backdrop-blur-xl p-8 rounded-2xl max-w-md w-full border border-gray-800"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <Lock className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Password Required</h3>
                    <p className="text-sm text-gray-400">This file is protected</p>
                  </div>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Enter password to preview
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 pr-12 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Enter password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-lg transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                  
                  <AnimatedButton type="submit" variant="primary" className="w-full">
                    Unlock Preview
                  </AnimatedButton>
                </form>
              </motion.div>
            )}

            {!loading && !error && canPreview && (
              <div className="relative w-full h-full flex items-center justify-center">
                {fileType === 'image' && previewUrl && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: imageLoaded ? 1 : 0 }}
                    className="relative max-w-full max-h-full"
                  >
                    {shouldBlur && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 text-center">
                          <EyeOff className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                          <p className="text-lg font-medium mb-2">Preview Protected</p>
                          <p className="text-sm text-gray-400 mb-4">
                            This image preview is blurred to prevent screenshots
                          </p>
                          <AnimatedButton
                            onClick={() => onDownload(currentFile)}
                            variant="primary"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Original
                          </AnimatedButton>
                        </div>
                      </motion.div>
                    )}
                    <img
                      src={previewUrl}
                      alt={currentFile.original_filename}
                      className={`max-w-full max-h-full object-contain rounded-lg select-none ${
                        shouldBlur ? 'blur-3xl' : ''
                      }`}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s',
                        imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
                        filter: shouldBlur ? 'blur(30px)' : 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={() => setImageLoaded(true)}
                      onError={(e) => {
                        console.error('Image load error:', e)
                        console.error('Failed URL:', previewUrl)
                        setError('Failed to load image preview. The image may be corrupted or in an unsupported format.')
                        setImageLoaded(false)
                      }}
                    />
                  </motion.div>
                )}

                {fileType === 'pdf' && previewUrl && (
                  <div 
                    className="w-full h-full relative"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full rounded-lg select-none"
                      title={currentFile.original_filename}
                      style={{ 
                        minHeight: '600px',
                        pointerEvents: 'auto'
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    {/* Watermark overlay for PDFs */}
                    {currentFile.watermark_enabled && (
                      <div 
                        className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
                        style={{
                          background: `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 200px,
                            rgba(255, 255, 255, 0.05) 200px,
                            rgba(255, 255, 255, 0.05) 400px
                          )`
                        }}
                      >
                        {/* Create a repeating watermark pattern */}
                        <div className="absolute inset-0" style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, 300px)',
                          gridTemplateRows: 'repeat(auto-fill, 150px)',
                          transform: 'rotate(-45deg) scale(1.5)',
                          transformOrigin: 'center'
                        }}>
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div 
                              key={i}
                              className="flex items-center justify-center text-white/30 text-2xl font-bold select-none"
                              style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                            >
                              {currentFile.watermark_text || 'ZnapFile'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Invisible overlay to prevent right-click on iframe content */}
                    <div 
                      className="absolute inset-0 z-30"
                      style={{ pointerEvents: 'none' }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {/* Allow scrolling but prevent right-click */}
                      <div 
                        className="absolute inset-0"
                        style={{ 
                          pointerEvents: 'auto',
                          background: 'transparent'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={(e) => {
                          if (e.button === 2) e.preventDefault()
                        }}
                      />
                    </div>
                  </div>
                )}

                {fileType === 'video' && previewUrl && (
                  <div className="w-full max-w-4xl">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full rounded-lg shadow-2xl"
                      controlsList="nodownload"
                    />
                  </div>
                )}

                {fileType === 'audio' && previewUrl && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card-bg/80 backdrop-blur-xl p-8 rounded-2xl border border-gray-800"
                  >
                    <div className="flex flex-col items-center">
                      <div className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full mb-6">
                        <Music className="w-20 h-20 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{currentFile.original_filename}</h3>
                      <p className="text-gray-400 mb-6">{formatBytes(currentFile.file_size)}</p>
                      <audio
                        src={previewUrl}
                        controls
                        className="w-full max-w-md"
                        controlsList="nodownload"
                      />
                    </div>
                  </motion.div>
                )}

                {(fileType === 'text' || fileType === 'code') && fileInfo && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full max-w-5xl"
                  >
                    <div className="h-full bg-dark-bg rounded-lg overflow-hidden border border-gray-800 relative">
                      {/* Enhanced header with preview info */}
                      <div className="bg-card-bg px-4 py-3 border-b border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Code className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{currentFile.original_filename}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            {fileInfo.isTruncated && (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Preview Mode</span>
                              </motion.div>
                            )}
                            {fileInfo.redactionApplied && (
                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>Redacted</span>
                              </motion.div>
                            )}
                            <span className="text-gray-500">
                              {fileInfo.totalLines ? `${fileInfo.totalLines.toLocaleString()} lines` : `${fileInfo.content.split('\n').length} lines`}
                            </span>
                            {fileInfo.totalSize > 0 && (
                              <span className="text-gray-500">
                                {formatBytes(fileInfo.totalSize)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Code content with gradient fade effect for truncated files */}
                      <div className="relative h-full">
                        <div className="overflow-auto h-full p-6">
                          <pre className="text-sm font-mono whitespace-pre-wrap text-gray-300">
                            <code>{fileInfo.content}</code>
                          </pre>
                        </div>
                        
                        {/* Magical gradient fade and download prompt for truncated files */}
                        {fileInfo.isTruncated && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute bottom-0 left-0 right-0 pointer-events-none"
                          >
                            {/* Gradient fade effect */}
                            <div className="h-32 bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent" />
                            
                            {/* Download prompt overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-dark-bg pointer-events-auto">
                              <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-4 border border-primary/20"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-lg animate-pulse">
                                      <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">Preview Limited</p>
                                      <p className="text-xs text-gray-400">
                                        Showing first 50 lines of {fileInfo.totalLines.toLocaleString()} total
                                      </p>
                                    </div>
                                  </div>
                                  <AnimatedButton
                                    onClick={() => onDownload(currentFile)}
                                    variant="primary"
                                    size="sm"
                                    className="pointer-events-auto"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    View Full File
                                  </AnimatedButton>
                                </div>
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {!canPreview && !loading && !error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8">
                  <FileIcon className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold mb-2">Preview not available</h3>
                  <p className="text-gray-400 mb-6">
                    This file type cannot be previewed in the browser
                  </p>
                  <AnimatedButton onClick={() => onDownload(currentFile)} variant="primary">
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </AnimatedButton>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modern footer with file navigation */}
          {allFiles.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
              <div className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {allFiles.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFileIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentFileIndex 
                          ? 'bg-primary w-8' 
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {currentFileIndex + 1} of {allFiles.length} files
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default FilePreviewModal
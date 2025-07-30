import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { 
  Download, Lock, Clock, FileText, AlertCircle, Image, FileVideo, 
  FileAudio, FileCode, Eye, Sparkles, Shield, Zap, Star
} from 'lucide-react'
import { downloadAPI } from '../services/api'
import { formatBytes, formatTimeRemaining } from '../utils/format'
import FilePreviewModal from '../components/FilePreviewModal'
import CaptchaModal from '../components/CaptchaModal'
import MagicalParticles from '../components/MagicalParticles'

const MagicalDownloadPage = () => {
  const { code } = useParams()
  const [fileInfo, setFileInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaData, setCaptchaData] = useState(null)
  
  // Mouse tracking for parallax
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Smooth spring animations
  const springConfig = { damping: 25, stiffness: 150 }
  const cardX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig)
  const cardY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-10, 10]), springConfig)
  
  // Glow effect
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-50, 50]), springConfig)
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-50, 50]), springConfig)

  // Get icon and color based on file type
  const getFileTypeInfo = (mimeType, filename) => {
    const getIcon = () => {
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

    const getColor = () => {
      if (mimeType?.startsWith('image/')) return '#10B981' // green
      if (mimeType?.startsWith('video/')) return '#EF4444' // red
      if (mimeType?.startsWith('audio/')) return '#F59E0B' // amber
      if (mimeType?.includes('javascript') || mimeType?.includes('json')) return '#3B82F6' // blue
      return '#8B5CF6' // purple default
    }

    return { Icon: getIcon(), color: getColor() }
  }

  useEffect(() => {
    fetchFileInfo()
    
    // Mouse tracking
    const handleMouseMove = (e) => {
      const { clientX, clientY, currentTarget } = e
      const { width, height, left, top } = currentTarget.getBoundingClientRect()
      const x = (clientX - left) / width - 0.5
      const y = (clientY - top) / height - 0.5
      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
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

  const handleDownload = async (captchaAnswer = null) => {
    if (fileInfo.has_password && !password) {
      setError('Please enter the password')
      return
    }

    setDownloading(true)
    setError(null)
    setShowCaptcha(false)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      
      if (fileInfo.has_password) {
        // Password-protected file: verify password and get token
        try {
          const data = {
            password,
            ...(captchaData && {
              captcha_id: captchaData.captcha_id,
              captcha_answer: captchaAnswer || captchaData.answer
            })
          }
          
          const response = await downloadAPI.verifyPassword(code, data)
          const { download_token } = response.data
          
          // Use token to download
          window.location.href = `${apiUrl}/secure-download/${code}/download-with-token?token=${download_token}`
          
          // Success animation
          setTimeout(() => {
            setDownloadSuccess(true)
            setTimeout(() => setDownloadSuccess(false), 3000)
          }, 1000)
        } catch (err) {
          if (err.response?.status === 428) {
            // CAPTCHA required
            const captchaInfo = err.response.data.detail || err.response.data
            setCaptchaData({
              captcha_id: captchaInfo.captcha_id,
              captcha_question: captchaInfo.captcha_question,
              attempts_remaining: captchaInfo.attempts_remaining,
              error: captchaInfo.error
            })
            setShowCaptcha(true)
            setDownloading(false)
            return
          }
          throw err
        }
      } else {
        // Non-password file: get token and download
        const response = await downloadAPI.initiateDownload(code)
        const { download_token } = response.data
        
        window.location.href = `${apiUrl}/secure-download/${code}/download-with-token?token=${download_token}`
        
        setTimeout(() => {
          setDownloadSuccess(true)
          setTimeout(() => setDownloadSuccess(false), 3000)
        }, 1000)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Download failed')
    } finally {
      setTimeout(() => setDownloading(false), 2000)
    }
  }

  const fileTypeInfo = fileInfo ? getFileTypeInfo(fileInfo.mime_type, fileInfo.original_filename) : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-dark-bg via-dark-bg to-purple-900/20">
        <MagicalParticles />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-text-muted text-xl font-light"
        >
          <Sparkles className="w-8 h-8 mx-auto mb-4" />
          Loading magic...
        </motion.div>
      </div>
    )
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-dark-bg via-dark-bg to-red-900/20">
        <MagicalParticles color="#EF4444" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <AlertCircle className="w-20 h-20 mx-auto mb-6 text-error" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-error to-pink-500 bg-clip-text text-transparent">
            Oops! File not found
          </h1>
          <p className="text-text-muted mb-8">{error}</p>
          <motion.a
            href="/"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-2xl font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            Return to Homepage
          </motion.a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-dark-bg via-dark-bg to-dark-bg">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] via-transparent to-transparent" />
      </div>
      
      {/* Particles - subtle white */}
      <MagicalParticles color="#ffffff" />
      

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ x: cardX, y: cardY }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main glassmorphic card */}
        <motion.div
          className="relative backdrop-blur-md bg-white/[0.01] rounded-3xl p-8 border border-white/[0.03] shadow-2xl overflow-hidden"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          
          {/* Card content */}
          <div className="relative z-10">
            {/* File Icon with breathing effect */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 mx-auto mb-6 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-3xl blur-xl" />
              <div className="relative w-full h-full bg-black/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/[0.03]">
                {fileTypeInfo && (
                  <fileTypeInfo.Icon 
                    className="w-12 h-12 text-blue-400/70" 
                  />
                )}
              </div>
              {/* Sparkle decorations */}
              <motion.div
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5,
                }}
                className="absolute -top-2 -right-2"
              >
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </motion.div>
            </motion.div>

            {/* File name - subtle and elegant */}
            <h1 className="text-2xl font-bold text-center mb-3 text-white/90">
              {fileInfo?.original_filename}
            </h1>
            
            {/* File details */}
            <div className="text-center mb-6 space-y-2">
              <motion.p 
                className="text-lg text-white/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {fileInfo && formatBytes(fileInfo.file_size)}
              </motion.p>
              {fileInfo?.mime_type && (
                <motion.p 
                  className="text-sm text-white/30 font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {fileInfo.mime_type}
                </motion.p>
              )}
            </div>

            {/* Expiry timer - subtle */}
            <motion.div 
              className="flex items-center justify-center gap-3 text-sm mb-8 text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Clock className="w-4 h-4" />
              <span>Expires in {fileInfo && formatTimeRemaining(fileInfo.expires_at)}</span>
            </motion.div>

            {/* Password input with glow effect */}
            {fileInfo?.has_password && (
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="mb-4 p-4 bg-black/30 border border-white/[0.05] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-white/60 mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Password Protected</span>
                  </div>
                  <p className="text-xs text-white/30">
                    This file requires a password to access
                  </p>
                </div>
                
                <motion.div 
                  className="relative group"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="relative flex items-center gap-3 p-4 bg-black/20 backdrop-blur-md rounded-2xl border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <Lock className="w-5 h-5 text-white/30" />
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleDownload()}
                      className="flex-1 bg-transparent outline-none text-white/80 placeholder:text-white/20"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Error message with shake animation */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -10, 10, 0] }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center backdrop-blur-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons with liquid effect */}
            <div className="space-y-3">
              {/* Preview button */}
              {fileInfo && (fileInfo.mime_type?.startsWith('text/') || 
                            fileInfo.mime_type?.startsWith('image/') || 
                            fileInfo.mime_type?.includes('pdf')) && (
                <motion.button
                  onClick={() => setShowPreview(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full p-4 group overflow-hidden rounded-2xl bg-blue-500/[0.05] backdrop-blur-sm border border-blue-500/[0.1] hover:bg-blue-500/[0.08] hover:border-blue-500/[0.15] transition-all"
                >
                  <div className="relative flex items-center justify-center gap-3 text-white/50 group-hover:text-white/70 transition-colors">
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">Preview</span>
                  </div>
                </motion.button>
              )}
              
              {/* Download button - primary action */}
              <motion.button
                onClick={handleDownload}
                disabled={downloading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full p-4 group overflow-hidden rounded-2xl bg-blue-600/[0.08] backdrop-blur-sm border border-blue-600/[0.15] hover:bg-blue-600/[0.12] hover:border-blue-600/[0.2] transition-all"
              >
                
                {/* Button content */}
                <div className="relative flex items-center justify-center gap-3 text-white/80 group-hover:text-white/90 font-medium transition-colors">
                  {downloading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      <span>Preparing download...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download File</span>
                    </>
                  )}
                </div>
              </motion.button>
            </div>

            {/* Download count with progress bar */}
            {fileInfo?.max_downloads && (
              <motion.div 
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex justify-between text-xs text-white/30 mb-2">
                  <span>Downloads</span>
                  <span>{fileInfo.download_count} / {fileInfo.max_downloads}</span>
                </div>
                <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-white/20 to-white/10"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(fileInfo.download_count / fileInfo.max_downloads) * 100}%` 
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Footer - subtle */}
        <motion.p 
          className="text-center text-sm text-white/20 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Secure file sharing by{' '}
          <motion.a 
            href="/"
            className="text-white/30 hover:text-white/50 transition-colors relative inline-block"
            whileHover={{ scale: 1.02 }}
          >
            ZnapFile
          </motion.a>
        </motion.p>
      </motion.div>

      {/* Success animation overlay */}
      <AnimatePresence>
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <Star className="w-32 h-32 text-yellow-400 fill-yellow-400" />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Download className="w-16 h-16 text-dark-bg" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <FilePreviewModal
        file={fileInfo ? {
          ...fileInfo,
          short_code: code
        } : null}
        password={password}
        isOpen={showPreview && !!fileInfo}
        onClose={() => setShowPreview(false)}
        onDownload={handleDownload}
      />

      {/* CAPTCHA Modal */}
      <CaptchaModal
        isOpen={showCaptcha}
        onClose={() => setShowCaptcha(false)}
        captchaData={captchaData}
        onSubmit={(answer) => {
          setCaptchaData(prev => ({ ...prev, answer }))
          handleDownload(answer)
        }}
      />
    </div>
  )
}

export default MagicalDownloadPage
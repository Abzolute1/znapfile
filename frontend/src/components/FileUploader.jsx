import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, File, Check, AlertCircle, Clock, Lock,
  Eye, EyeOff, Loader2, Zap, Shield, FolderPlus, Droplets
} from 'lucide-react'
import { uploadAPI, collectionsAPI } from '../services/api'
import AnimatedButton from './AnimatedButton'
import { formatBytes } from '../utils/format'
import useStore from '../store/useStore'
import { useToastContext } from '../contexts/ToastContext'
import RedactionSettings from './RedactionSettings'
import RedactionSettingsFixed from './RedactionSettingsFixed'
import RedactionSettingsUltra from './RedactionSettingsUltra'
import RedactionSimple from './RedactionSimple'
import RedactionFinal from './RedactionFinal'

const FileUploader = ({ onUploadComplete, onSuccess, collection = null, currentPath = '' }) => {
  // Get user first, before using it
  const user = useStore(state => state.user)
  const toast = useToastContext()
  
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [maxPasswordAttempts, setMaxPasswordAttempts] = useState(10)
  
  // Set default expiry based on user tier
  const getDefaultExpiry = () => {
    if (user?.tier === 'MAX') return 10080  // 7 days for MAX users
    if (user?.tier === 'PRO') return 1440   // 1 day for PRO users
    return 180  // 3 hours for FREE users
  }
  
  const [expiryMinutes, setExpiryMinutes] = useState(getDefaultExpiry())
  const [addToCollection, setAddToCollection] = useState(collection ? true : false)
  const [selectedCollection, setSelectedCollection] = useState(collection)
  const [collections, setCollections] = useState([])
  const [uploadResults, setUploadResults] = useState([])
  const [redactionSettings, setRedactionSettings] = useState({
    enabled: false,
    lineRanges: [],
    patterns: []
  }) // DISABLED - redaction feature removed
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [fileContent, setFileContent] = useState(null)

  // Load collections on mount
  useEffect(() => {
    if (user) {
      collectionsAPI.list().then(res => setCollections(res.data)).catch(err => {
        console.error('Failed to load collections:', err)
      })
    }
  }, [user])

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
      error: null,
      result: null
    }))
    setFiles(prev => [...prev, ...newFiles])
    
    // Read first text file for redaction preview
    if (acceptedFiles.length > 0) {
      const firstFile = acceptedFiles[0]
      // More comprehensive text file detection
      const fileExtension = firstFile.name.split('.').pop()?.toLowerCase() || ''
      const textExtensions = ['txt', 'text', 'md', 'json', 'xml', 'log', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'css', 'html', 'yaml', 'yml', 'sh', 'bash', 'ini', 'conf', 'cfg', 'csv', 'sql', 'rb', 'php', 'go', 'rs', 'kt', 'swift', 'r', 'm', 'dart', 'lua', 'pl', 'vim', 'env']
      
      const isTextFile = firstFile.type.includes('text') || 
                        firstFile.type === '' || // Many text files have no MIME type
                        firstFile.type.includes('application/json') ||
                        firstFile.type.includes('application/xml') ||
                        textExtensions.includes(fileExtension)
      
      console.log('File type detection:', {
        fileName: firstFile.name,
        mimeType: firstFile.type,
        extension: fileExtension,
        isTextFile
      })
      
      if (isTextFile) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target.result
          console.log('File content read:', content.substring(0, 100) + '...')
          // Limit to first 5000 characters for preview
          setFileContent(content.substring(0, 5000))
        }
        reader.readAsText(firstFile)
      } else {
        setFileContent(null)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: uploading
  })

  const removeFile = (fileId) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId)
      // Clear file content if no files remain
      if (newFiles.length === 0) {
        setFileContent(null)
      }
      return newFiles
    })
  }

  const uploadFiles = async () => {
    setUploading(true)
    setUploadResults([])

    // Process files sequentially to avoid overwhelming the server
    for (const fileItem of files) {
      if (fileItem.status === 'success') continue

      try {
        // Update status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ))

        // Create form data
        const formData = new FormData()
        formData.append('file', fileItem.file)
        formData.append('expiry_minutes', expiryMinutes.toString())
        if (password) formData.append('password', password)

        // Upload with progress tracking (no password for collection files)
        const response = await uploadAPI.uploadAuthenticated(
          fileItem.file,
          collection ? null : (password.trim() || null),
          expiryMinutes,
          null,
          password ? maxPasswordAttempts : undefined,
          null, // redactionSettings DISABLED
          {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                setFiles(prev => prev.map(f => 
                  f.id === fileItem.id ? { ...f, progress } : f
                ))
              }
            }
          },
          watermarkEnabled
        )

        // Update success status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'success', result: response.data, progress: 100 } 
            : f
        ))

        setUploadResults(prev => [...prev, response.data])
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(response.data)
        }

        // Add to collection if selected
        if (addToCollection && selectedCollection && response.data.id) {
          try {
            await collectionsAPI.addFiles(selectedCollection.id, [response.data.id], [fileItem.file.name])
            toast.success(`${fileItem.file.name} uploaded and added to ${selectedCollection.name}`)
          } catch (err) {
            toast.error(`Failed to add ${fileItem.file.name} to collection`)
          }
        } else {
          toast.success(`${fileItem.file.name} uploaded successfully`)
        }

      } catch (error) {
        console.error('Upload error:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        })
        
        let errorMessage = 'Upload failed'
        
        if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error - please check your connection'
        } else if (error.response?.data?.detail) {
          // Handle validation errors (422 returns array of errors)
          if (Array.isArray(error.response.data.detail)) {
            errorMessage = error.response.data.detail[0]?.msg || 'Validation error'
          } else {
            errorMessage = error.response.data.detail
          }
        } else if (error.message) {
          errorMessage = error.message
        }
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', error: errorMessage, progress: 0 } 
            : f
        ))
        toast.error(`Failed to upload ${fileItem.file.name}: ${errorMessage}`)
      }
    }

    setUploading(false)
    
    // Notify parent if all successful
    const successCount = files.filter(f => f.status === 'success').length
    const failedCount = files.filter(f => f.status === 'error').length
    
    if (successCount > 0 && failedCount === 0) {
      toast.success(`All ${successCount} files uploaded successfully!`)
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`${successCount} files uploaded, ${failedCount} failed`)
    } else if (failedCount > 0 && successCount === 0) {
      toast.error(`All uploads failed`)
    }
    
    if (successCount > 0 && onUploadComplete) {
      onUploadComplete(uploadResults)
    }
  }

  const reset = () => {
    setFiles([])
    setUploadResults([])
    setPassword('')
    setShowPassword(false)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-text-muted" />
      case 'uploading': return <Loader2 className="w-4 h-4 text-primary animate-spin" />
      case 'success': return <Check className="w-4 h-4 text-accent" />
      case 'error': return <AlertCircle className="w-4 h-4 text-error" />
      default: return null
    }
  }

  const allUploaded = files.length > 0 && files.every(f => f.status === 'success')

  return (
    <div className="space-y-6">
      {/* Upload Settings */}
      <div className="glass-card p-6 rounded-xl border border-gray-800">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Upload Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiry Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Expiry Time</label>
            <select
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(Number(e.target.value))}
              className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={180}>3 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours (1 day)</option>
              {/* PRO tier - up to 14 days */}
              {(user?.tier === 'PRO' || user?.tier === 'MAX') && (
                <>
                  <option value={2880}>2 days</option>
                  <option value={4320}>3 days</option>
                  <option value={7200}>5 days</option>
                  <option value={10080}>7 days</option>
                  <option value={20160}>14 days</option>
                </>
              )}
              {/* MAX tier - up to 30 days */}
              {user?.tier === 'MAX' && (
                <>
                  <option value={30240}>21 days</option>
                  <option value={43200}>30 days</option>
                </>
              )}
            </select>
          </div>

          {/* Password - Only show for individual files, not collections */}
          {!collection && (
            <div>
              <label className="block text-sm font-medium mb-2">Password Protection</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional"
                  autoComplete="new-password"
                  className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-2 pr-10 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Max Password Attempts - Only show when password is set */}
          {!collection && password && (
            <div>
              <label className="block text-sm font-medium mb-2">Max Password Attempts</label>
              <select
                value={maxPasswordAttempts}
                onChange={(e) => setMaxPasswordAttempts(Number(e.target.value))}
                className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value={3}>3 attempts</option>
                <option value={5}>5 attempts</option>
                <option value={10}>10 attempts (default)</option>
                <option value={20}>20 attempts</option>
                <option value={50}>50 attempts</option>
                <option value={0}>Unlimited</option>
              </select>
              <p className="text-xs text-text-muted mt-1">File will be locked after this many failed attempts</p>
            </div>
          )}
        </div>

        {/* Watermark Settings */}
        <div className="mt-4 p-4 bg-card-bg/50 rounded-lg border border-gray-700/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
              className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              Protect previews with watermark
            </span>
          </label>
          
          {watermarkEnabled && (
            <div className="mt-3 ml-6 space-y-1">
              <p className="text-xs text-text-muted">• "ZnapFile" watermark appears on all previews</p>
              <p className="text-xs text-text-muted">• Downloads will not have watermarks</p>
              <p className="text-xs text-accent">• Encourages proper file sharing through downloads</p>
            </div>
          )}
        </div>

        {/* Collection Selection */}
        {collections.length > 0 && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={addToCollection}
                onChange={(e) => setAddToCollection(e.target.checked)}
                className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Add to collection</span>
              <FolderPlus className="w-4 h-4 text-text-muted" />
            </label>
            
            {addToCollection && (
              <select
                value={selectedCollection?.id || ''}
                onChange={(e) => {
                  const col = collections.find(c => c.id === e.target.value)
                  setSelectedCollection(col)
                }}
                className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Select a collection</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Redaction Settings - REMOVED */}

      {/* Drop Zone */}
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`
          relative glass-card p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-700 hover:border-primary/50'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className="w-16 h-16 mx-auto mb-4 relative"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Upload className="w-full h-full text-primary relative z-10" />
          </motion.div>
          
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-text-muted mb-4">or click to browse</p>
          
          <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Fast uploads
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Secure transfer
            </span>
          </div>
        </div>
      </motion.div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {files.map((fileItem) => (
              <motion.div
                key={fileItem.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card p-4 rounded-lg flex items-center gap-4"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(fileItem.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-sm text-text-muted">
                    {formatBytes(fileItem.file.size)}
                    {fileItem.error && (
                      <span className="text-error ml-2">{fileItem.error}</span>
                    )}
                  </p>
                  
                  {fileItem.status === 'uploading' && (
                    <div className="mt-2 w-full bg-card-bg rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fileItem.progress}%` }}
                        className="h-full bg-gradient-to-r from-primary to-secondary"
                      />
                    </div>
                  )}
                  
                  {fileItem.result && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <a
                        href={`${window.location.origin}/d/${fileItem.result.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {window.location.origin}/d/{fileItem.result.short_code}
                      </a>
                    </div>
                  )}
                </div>
                
                {fileItem.status === 'pending' && (
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-error" />
                  </button>
                )}
              </motion.div>
            ))}
            
            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              {allUploaded ? (
                <>
                  <AnimatedButton onClick={reset} variant="secondary">
                    Upload More
                  </AnimatedButton>
                  <AnimatedButton onClick={() => onUploadComplete?.(uploadResults)} variant="primary">
                    Done
                  </AnimatedButton>
                </>
              ) : (
                <>
                  <AnimatedButton onClick={reset} variant="secondary" disabled={uploading}>
                    Clear All
                  </AnimatedButton>
                  <AnimatedButton 
                    onClick={uploadFiles} 
                    variant="primary" 
                    disabled={uploading || files.length === 0}
                  >
                    {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
                  </AnimatedButton>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUploader
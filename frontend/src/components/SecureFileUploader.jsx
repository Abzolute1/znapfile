import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, Lock, Shield, AlertCircle, CheckCircle, 
  Eye, EyeOff, Key, Zap, Info
} from 'lucide-react'
import { encryptFile, generateSecurePassword, calculatePasswordStrength, checkCryptoSupport } from '../utils/encryption'
import { filesAPI } from '../services/api'
import { formatBytes } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'

const SecureFileUploader = ({ onUploadComplete, onClose }) => {
  const toast = useToastContext()
  const [files, setFiles] = useState([])
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [useGeneratedPassword, setUseGeneratedPassword] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState(generateSecurePassword())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [encryptionProgress, setEncryptionProgress] = useState({})
  
  // Check crypto support on mount
  const cryptoSupport = checkCryptoSupport()
  
  const effectivePassword = useGeneratedPassword ? generatedPassword : password
  const passwordStrength = calculatePasswordStrength(effectivePassword)
  
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])
  
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...selectedFiles])
  }
  
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const generateNewPassword = () => {
    const newPassword = generateSecurePassword()
    setGeneratedPassword(newPassword)
  }
  
  const handleUpload = async () => {
    if (!cryptoSupport.supported) {
      toast.error(cryptoSupport.error)
      return
    }
    
    if (files.length === 0) {
      toast.error('Please select files to upload')
      return
    }
    
    if (!effectivePassword) {
      toast.error('Password is required for encryption')
      return
    }
    
    if (passwordStrength < 30) {
      toast.error('Password is too weak. Please use a stronger password.')
      return
    }
    
    setUploading(true)
    const uploadedFiles = []
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = `file-${i}`
        
        // Update progress
        setEncryptionProgress(prev => ({ ...prev, [fileId]: 0 }))
        
        // Encrypt file
        toast.info(`Encrypting ${file.name}...`)
        const encryptedBlob = await encryptFile(
          file,
          effectivePassword,
          (progress) => {
            setEncryptionProgress(prev => ({ ...prev, [fileId]: progress }))
          }
        )
        
        // Create form data with encrypted file
        const formData = new FormData()
        formData.append('file', encryptedBlob, `encrypted_${Date.now()}.znapenc`)
        formData.append('client_encrypted', 'true')
        formData.append('encryption_algorithm', 'AES-256-GCM')
        formData.append('original_size', file.size)
        
        // Upload encrypted file
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
        
        const response = await filesAPI.uploadFile(formData, {
          onUploadProgress: (progressEvent) => {
            const progress = (progressEvent.loaded / progressEvent.total) * 100
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
          }
        })
        
        uploadedFiles.push({
          ...response.data,
          original_filename: file.name,
          encryption_password: effectivePassword
        })
        
        toast.success(`${file.name} uploaded securely`)
      }
      
      // Show summary
      const summary = (
        <div className="space-y-2">
          <p className="font-semibold">Files uploaded with zero-knowledge encryption!</p>
          <p className="text-sm text-text-muted">Password: {effectivePassword}</p>
          <p className="text-xs text-warning">Save this password! We cannot recover your files without it.</p>
        </div>
      )
      
      toast.success(summary, { duration: 10000 })
      
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles)
      }
      
      // Reset
      setFiles([])
      setPassword('')
      generateNewPassword()
      
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(error.message || 'Failed to upload files')
    } finally {
      setUploading(false)
      setUploadProgress({})
      setEncryptionProgress({})
    }
  }
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'text-error'
    if (passwordStrength < 60) return 'text-warning'
    return 'text-success'
  }
  
  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return 'Weak'
    if (passwordStrength < 60) return 'Fair'
    if (passwordStrength < 80) return 'Good'
    return 'Excellent'
  }
  
  return (
    <div className="space-y-6">
      {/* Zero-Knowledge Encryption Notice */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/20"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Zero-Knowledge Encryption
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">Military Grade</span>
            </h3>
            <p className="text-sm text-text-muted mt-1">
              Your files are encrypted in your browser before upload. Not even we can decrypt them.
              This is the same encryption that protects state secrets.
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Crypto Support Check */}
      {!cryptoSupport.supported && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-5 h-5" />
            <span>{cryptoSupport.error}</span>
          </div>
        </div>
      )}
      
      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center transition-colors"
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-text-muted" />
        <p className="text-lg font-medium mb-2">Drop files here or click to select</p>
        <p className="text-sm text-text-muted mb-4">Files will be encrypted before leaving your device</p>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition cursor-pointer inline-block"
        >
          Choose Files
        </label>
      </div>
      
      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Files to encrypt and upload:</h4>
          {files.map((file, index) => {
            const fileId = `file-${index}`
            const encProgress = encryptionProgress[fileId] || 0
            const upProgress = uploadProgress[fileId] || 0
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-3 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-text-muted">({formatBytes(file.size)})</span>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-text-muted hover:text-error transition"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {uploading && (
                  <div className="space-y-1">
                    {encProgress > 0 && encProgress < 1 && (
                      <div>
                        <div className="flex justify-between text-xs text-text-muted mb-1">
                          <span>Encrypting...</span>
                          <span>{Math.round(encProgress * 100)}%</span>
                        </div>
                        <div className="h-1 bg-dark-bg rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                            initial={{ width: 0 }}
                            animate={{ width: `${encProgress * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {upProgress > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-text-muted mb-1">
                          <span>Uploading encrypted file...</span>
                          <span>{Math.round(upProgress)}%</span>
                        </div>
                        <div className="h-1 bg-dark-bg rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-secondary to-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${upProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
      
      {/* Password Section */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h4 className="font-medium">Encryption Password</h4>
          </div>
          
          {/* Password Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setUseGeneratedPassword(true)}
              className={`px-4 py-2 rounded-lg transition ${
                useGeneratedPassword 
                  ? 'bg-primary text-white' 
                  : 'glass-card hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Generated (Recommended)
            </button>
            <button
              onClick={() => setUseGeneratedPassword(false)}
              className={`px-4 py-2 rounded-lg transition ${
                !useGeneratedPassword 
                  ? 'bg-primary text-white' 
                  : 'glass-card hover:bg-white/5'
              }`}
            >
              Custom Password
            </button>
          </div>
          
          {useGeneratedPassword ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg font-mono">
                <span className="flex-1">{generatedPassword}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedPassword)}
                  className="p-2 hover:bg-white/5 rounded transition"
                  title="Copy password"
                >
                  📋
                </button>
                <button
                  onClick={generateNewPassword}
                  className="p-2 hover:bg-white/5 rounded transition"
                  title="Generate new password"
                >
                  🔄
                </button>
              </div>
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Maximum strength password (entropy: 256 bits)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your encryption password"
                  className="w-full p-3 bg-dark-bg rounded-lg pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Password strength:</span>
                  <span className={getPasswordStrengthColor()}>{getPasswordStrengthText()}</span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      passwordStrength < 30 ? 'bg-error' :
                      passwordStrength < 60 ? 'bg-warning' :
                      'bg-success'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
            <Info className="w-4 h-4 text-warning mt-0.5" />
            <div className="text-xs text-warning">
              <p className="font-semibold">Critical: Save this password!</p>
              <p>We use zero-knowledge encryption. If you lose this password, your files are gone forever. Not even quantum computers can recover them.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 glass-card rounded-lg hover:bg-white/5 transition"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !cryptoSupport.supported || (passwordStrength < 30 && !useGeneratedPassword)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Encrypting & Uploading...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Encrypt & Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default SecureFileUploader
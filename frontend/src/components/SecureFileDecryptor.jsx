import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Download, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react'
import { decryptFile, checkCryptoSupport } from '../utils/encryption'
import { formatBytes } from '../utils/format'

const SecureFileDecryptor = ({ encryptedBlob, onDecrypted, onCancel }) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [decrypting, setDecrypting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  
  const cryptoSupport = checkCryptoSupport()
  
  const handleDecrypt = async () => {
    if (!password) {
      setError('Password is required')
      return
    }
    
    if (!cryptoSupport.supported) {
      setError(cryptoSupport.error)
      return
    }
    
    setDecrypting(true)
    setError('')
    setProgress(0)
    
    try {
      const result = await decryptFile(
        encryptedBlob,
        password,
        (progress) => setProgress(progress)
      )
      
      // Success! Pass decrypted data to parent
      onDecrypted(result)
      
    } catch (error) {
      console.error('Decryption failed:', error)
      setError(error.message || 'Failed to decrypt file')
      setProgress(0)
    } finally {
      setDecrypting(false)
    }
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && password && !decrypting) {
      handleDecrypt()
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card-bg rounded-2xl p-6 border border-border max-w-md w-full"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">This file is encrypted</h2>
        <p className="text-text-muted text-sm">
          Enter the encryption password to decrypt and download
        </p>
      </div>
      
      {/* Security Notice */}
      <div className="mb-6 p-3 bg-primary/5 rounded-lg border border-primary/10">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-primary">Zero-Knowledge Encryption</p>
            <p className="text-text-muted mt-1">
              This file was encrypted in the uploader's browser. The server never had access to the decrypted content.
            </p>
          </div>
        </div>
      </div>
      
      {/* Password Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Encryption Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter password"
              className="w-full p-3 bg-dark-bg rounded-lg pr-10 focus:ring-2 focus:ring-primary outline-none"
              autoFocus
              disabled={decrypting}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </motion.div>
        )}
        
        {/* Progress Bar */}
        {decrypting && (
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Decrypting...</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 glass-card rounded-lg hover:bg-white/5 transition"
            disabled={decrypting}
          >
            Cancel
          </button>
          <button
            onClick={handleDecrypt}
            disabled={!password || decrypting || !cryptoSupport.supported}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {decrypting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Decrypting...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Decrypt & Download
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Forgot Password */}
      <p className="text-center text-xs text-text-muted mt-4">
        Forgot the password? Unfortunately, we cannot help. 
        Zero-knowledge encryption means the file is permanently inaccessible without the password.
      </p>
    </motion.div>
  )
}

export default SecureFileDecryptor
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { authAPI } from '../services/api'
import { useToastContext } from '../contexts/ToastContext'

const EmailVerificationBanner = ({ email, isVerified, onClose }) => {
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const toast = useToastContext()

  if (isVerified) return null

  const handleResend = async () => {
    setIsResending(true)
    try {
      await authAPI.resendVerification(email)
      setResendSuccess(true)
      toast.success('Verification email sent! Check your inbox.')
      
      // Reset success state after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AnimatePresence>
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative overflow-hidden"
        >
          {/* Magical gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          <div className="relative px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Animated icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-50 animate-pulse" />
                  <div className="relative p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                {/* Message */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    ✨ Verify your email to unlock all features
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    We sent a verification link to {email}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                {resendSuccess ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 text-green-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Email sent!</span>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Resend Email</span>
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EmailVerificationBanner
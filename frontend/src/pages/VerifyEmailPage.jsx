import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight, Sparkles } from 'lucide-react'
import { authAPI } from '../services/api'
import AnimatedButton from '../components/AnimatedButton'

const VerifyEmailPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('No verification token provided')
      return
    }

    verifyEmail()
  }, [token])

  const verifyEmail = async () => {
    try {
      await authAPI.verifyEmail(token)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.response?.data?.detail || 'Failed to verify email')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card-bg rounded-2xl p-8 border border-gray-800 relative overflow-hidden">
          {/* Magical background effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-3xl" />
          </div>
          
          <div className="relative z-10">
            {status === 'verifying' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl animate-pulse" />
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-6">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
                <p className="text-text-muted">Please wait while we confirm your email address</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="text-center"
              >
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-6">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  
                  {/* Sparkles animation */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0"
                  >
                    <Sparkles className="absolute top-0 right-0 w-4 h-4 text-yellow-400" />
                    <Sparkles className="absolute bottom-0 left-0 w-4 h-4 text-purple-400" />
                  </motion.div>
                </div>
                
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Email Verified!
                </h1>
                <p className="text-text-muted mb-8">
                  Your email has been successfully verified. You can now access all features.
                </p>
                
                <AnimatedButton
                  onClick={() => navigate('/login')}
                  variant="primary"
                  className="w-full"
                >
                  Continue to Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </AnimatedButton>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-r from-red-500 to-pink-500 rounded-full p-6">
                    <XCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                
                <h1 className="text-2xl font-bold mb-2 text-error">Verification Failed</h1>
                <p className="text-text-muted mb-8">{errorMessage}</p>
                
                <div className="space-y-3">
                  <AnimatedButton
                    onClick={() => navigate('/login')}
                    variant="secondary"
                    className="w-full"
                  >
                    Back to Login
                  </AnimatedButton>
                  
                  {errorMessage.includes('expired') && (
                    <p className="text-sm text-text-muted">
                      Need a new verification link?{' '}
                      <a href="/resend-verification" className="text-primary hover:underline">
                        Resend verification email
                      </a>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyEmailPage
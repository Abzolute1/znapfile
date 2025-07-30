import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, AlertCircle, Check, Lock, ArrowRight } from 'lucide-react'
import { authAPI } from '../services/api'
import Link from '../components/Link'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // email, code, password
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authAPI.forgotPassword(email)
      setStep('code')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(email, code, newPassword)
      setStep('success')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { test: newPassword.length >= 8, text: 'At least 8 characters' },
    { test: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
    { test: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
    { test: /\d/.test(newPassword), text: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), text: 'One special character' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-text-muted hover:text-text mb-6 transition">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
          <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
          <p className="text-text-muted">
            {step === 'email' && "Enter your email and we'll send you a reset code"}
            {step === 'code' && "Enter the 6-digit code and create a new password"}
            {step === 'success' && "Password reset successfully!"}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="bg-card-bg rounded-2xl p-8 border border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                  <Mail className="w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-text"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleResetSubmit} className="bg-card-bg rounded-2xl p-8 border border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full p-3 bg-dark-bg rounded-lg text-2xl text-center tracking-wider outline-none focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                  maxLength="6"
                  required
                  autoFocus
                />
                <p className="text-xs text-text-muted mt-2 text-center">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                  <Lock className="w-5 h-5 text-text-muted" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-text"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                  <Lock className="w-5 h-5 text-text-muted" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-text"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {req.test ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-text-muted" />
                    )}
                    <span className={req.test ? 'text-text' : 'text-text-muted'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordRequirements.every(req => req.test)}
              className="w-full mt-6 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Resetting...' : (
                <>
                  Reset password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 'success' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg rounded-2xl p-8 border border-gray-800 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Password reset successfully!</h2>
            <p className="text-text-muted">Redirecting to login...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default ForgotPasswordPage
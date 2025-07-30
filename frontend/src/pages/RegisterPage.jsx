import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, AlertCircle, Check, X, UserPlus, ArrowRight, User } from 'lucide-react'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'
import Link from '../components/Link'

const RegisterPage = () => {
  const navigate = useNavigate()
  const setAuth = useStore(state => state.setAuth)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordRequirements = [
    { test: password.length >= 8, text: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { test: /[a-z]/.test(password), text: 'One lowercase letter' },
    { test: /\d/.test(password), text: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!passwordRequirements.every(req => req.test)) {
      setError('Please meet all password requirements')
      return
    }
    
    setLoading(true)

    try {
      const response = await authAPI.register(email, username, password)
      const { access_token, refresh_token, user } = response.data
      setAuth(user, access_token, refresh_token)
      navigate('/user/home')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg">
      {/* Header */}
      <header className="border-b border-gray-800 backdrop-blur-sm bg-dark-bg/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <h1 className="text-xl font-bold">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                znapfile
              </span>
            </h1>
          </Link>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Create your account</h1>
            <p className="text-text-muted">Join znapfile for secure file transfers</p>
          </div>

        <form onSubmit={handleSubmit} className="bg-card-bg rounded-2xl p-8 border border-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                <User className="w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="flex-1 bg-transparent outline-none text-text"
                  placeholder="johndoe"
                  pattern="[a-z0-9_-]{3,50}"
                  title="Username must be 3-50 characters and can only contain lowercase letters, numbers, underscores, and hyphens"
                  required
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Choose a nickname - avoid using your real name for privacy</p>
            </div>

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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                <Lock className="w-5 h-5 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    <X className="w-4 h-4 text-text-muted" />
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
            className="w-full mt-6 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {loading ? 'Creating account...' : (
              <>
                Create account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-center text-sm text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-text-muted">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </div>
        </form>
      </motion.div>
      </div>
    </div>
  )
}

export default RegisterPage
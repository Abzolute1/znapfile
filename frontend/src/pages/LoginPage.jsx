import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { 
  Mail, Lock, AlertCircle, Shield, ArrowRight, Smartphone,
  FileText, Key, Server, Eye, EyeOff, Zap, Lock as LockIcon,
  ShieldCheck, Database, Cloud, CheckCircle, Activity
} from 'lucide-react'
import { authAPI } from '../services/api'
import useStore from '../store/useStore'
import PricingModal from '../components/PricingModal'
import Link from '../components/Link'

const LoginPage = () => {
  const navigate = useNavigate()
  const setAuth = useStore(state => state.setAuth)
  const hasSeenPricing = useStore(state => state.hasSeenPricing)
  const setSelectedPlan = useStore(state => state.setSelectedPlan)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [pendingAuth, setPendingAuth] = useState(null)
  const [show2FA, setShow2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // ASR Challenge states
  const [showChallenge, setShowChallenge] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [challengeSolution, setChallengeSolution] = useState('')
  const [challengeProgress, setChallengeProgress] = useState('')
  const [fingerprint, setFingerprint] = useState('')

  const { scrollY } = useScroll()
  const loginFormRef = useRef(null)

  // Parallax effects
  const heroY = useTransform(scrollY, [0, 300], [0, -50])
  const featuresY = useTransform(scrollY, [200, 600], [50, -50])

  // Generate browser fingerprint on mount
  useEffect(() => {
    const generateFingerprint = async () => {
      const fp = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.width + 'x' + screen.height,
        navigator.hardwareConcurrency || 0
      ].join('|')
      
      const encoder = new TextEncoder()
      const data = encoder.encode(fp)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      setFingerprint(hash.substring(0, 16))
    }
    generateFingerprint()
  }, [])

  const solveProofOfWork = async (challenge) => {
    const requiredPrefix = "0".repeat(challenge.difficulty)
    let nonce = 0
    const startTime = Date.now()
    
    setChallengeProgress('Solving security challenge...')
    
    while (true) {
      const input = challenge.challenge + nonce
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      if (hash.startsWith(requiredPrefix)) {
        const timeSpent = (Date.now() - startTime) / 1000
        console.log(`Challenge solved in ${timeSpent}s with nonce: ${nonce}`)
        return nonce.toString()
      }
      
      nonce++
      
      // Update progress every 1000 iterations
      if (nonce % 1000 === 0) {
        setChallengeProgress(`Solving challenge... (${(nonce/1000).toFixed(0)}k attempts)`)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(
        email, 
        password,
        challenge?.challenge_id || null,
        challengeSolution || null,
        fingerprint
      )
      
      // Check if challenge required
      if (response.data.requires_challenge) {
        setChallenge(response.data.challenge)
        setShowChallenge(true)
        setLoading(false)
        
        // Handle different challenge types
        const challengeType = response.data.challenge.type
        
        if (challengeType === 'proof_of_work') {
          setChallengeProgress('Starting proof of work...')
          const solution = await solveProofOfWork(response.data.challenge)
          setChallengeSolution(solution)
          // Auto-submit with solution
          setTimeout(() => {
            document.getElementById('login-form')?.requestSubmit()
          }, 100)
        }
        
        return
      }
      
      // Check if 2FA required
      if (response.data.requires_2fa) {
        setTempToken(response.data.temp_token)
        setShow2FA(true)
        setLoading(false)
        return
      }
      
      // Success - clear challenge state
      setShowChallenge(false)
      setChallenge(null)
      setChallengeSolution('')
      
      const { access_token, refresh_token, user } = response.data
      
      if (!hasSeenPricing && !user.is_superuser) {
        setPendingAuth({ user, access_token, refresh_token })
        setShowPricingModal(true)
      } else {
        setAuth(user, access_token, refresh_token)
        navigate('/user/home')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
      setChallengeSolution('') // Clear solution on error
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan)
    
    if (pendingAuth) {
      setAuth(pendingAuth.user, pendingAuth.access_token, pendingAuth.refresh_token)
    }
    
    setShowPricingModal(false)
    navigate('/user/home')
  }

  const handle2FASubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.verify2FALogin({
        temp_token: tempToken,
        code: twoFactorCode
      })
      
      const { access_token, refresh_token, user } = response.data
      
      if (!hasSeenPricing && !user.is_superuser) {
        setPendingAuth({ user, access_token, refresh_token })
        setShowPricingModal(true)
      } else {
        setAuth(user, access_token, refresh_token)
        navigate('/user/home')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const securityFeatures = [
    {
      icon: Key,
      title: "End-to-End Encryption",
      description: "Your files are encrypted before they leave your device. We can't see them, period."
    },
    {
      icon: Server,
      title: "Zero-Knowledge Architecture",
      description: "We store encrypted blobs. Your password never touches our servers."
    },
    {
      icon: ShieldCheck,
      title: "No Data Mining",
      description: "We don't scan, analyze, or monetize your files. Your data stays yours."
    },
    {
      icon: Database,
      title: "Automatic Deletion",
      description: "Files self-destruct after expiry. No traces left behind."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg via-dark-bg to-card-bg">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 backdrop-blur-md bg-dark-bg/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  znapfile
                </span>
              </h1>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#security" className="text-text-muted hover:text-text transition">Security</a>
              <a href="#features" className="text-text-muted hover:text-text transition">Features</a>
              <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition">
                Sign up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Login Form */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div 
          style={{ y: heroY }}
          className="absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-[128px]" />
        </motion.div>

        <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Welcome message */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Welcome back to{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                secure sharing
              </span>
            </h1>
            <p className="text-xl text-text-muted mb-8">
              The file sharing service that actually respects your privacy. No tracking, no scanning, no BS.
            </p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <span className="text-text-muted">Lightning fast uploads up to 1TB</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <LockIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-text-muted">Military-grade encryption on every file</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <span className="text-text-muted">Zero-knowledge = we can't see your files</span>
              </div>
            </div>
          </motion.div>

          {/* Right side - Login form */}
          <motion.div
            ref={loginFormRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <form id="login-form" onSubmit={show2FA ? handle2FASubmit : handleSubmit} className="bg-card-bg/80 backdrop-blur rounded-2xl p-8 border border-gray-800">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Sign in to your account</h2>
              </div>

              <div className="space-y-4">
                {!show2FA ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg border border-gray-800 focus-within:border-primary transition">
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
                      <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg border border-gray-800 focus-within:border-primary transition">
                        <Lock className="w-5 h-5 text-text-muted" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-text"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-text-muted hover:text-text transition"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Challenge UI */}
                    {showChallenge && challenge && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {challenge.type === 'math' && (
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Security Question
                            </label>
                            <p className="text-sm text-text-muted mb-2">{challenge.question}</p>
                            <input
                              type="text"
                              value={challengeSolution}
                              onChange={(e) => setChallengeSolution(e.target.value)}
                              className="w-full p-3 bg-dark-bg rounded-lg border border-gray-800 focus:border-primary transition outline-none"
                              placeholder="Your answer"
                              autoFocus
                            />
                          </div>
                        )}
                        
                        {challenge.type === 'proof_of_work' && (
                          <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Activity className="w-8 h-8 text-primary" />
                              </motion.div>
                            </div>
                            <p className="text-sm text-text-muted">{challengeProgress || 'Preparing security verification...'}</p>
                            <p className="text-xs text-text-muted mt-2">This helps protect against automated attacks</p>
                          </div>
                        )}
                        
                        {challenge.type === 'temp_block' && (
                          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                            <p className="text-sm text-warning">{challenge.message}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Verification Code</label>
                    <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg border border-gray-800 focus-within:border-primary transition">
                      <Smartphone className="w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="flex-1 bg-transparent outline-none text-text text-center text-2xl tracking-wider"
                        placeholder="000000"
                        maxLength="6"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-2 text-center">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                )}
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
                className="w-full mt-6 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  show2FA ? 'Verifying...' : 
                  showChallenge && challenge?.type === 'proof_of_work' ? 'Solving challenge...' :
                  'Signing in...'
                ) : (
                  <>
                    {show2FA ? 'Verify' : 
                     showChallenge && challenge?.type === 'math' ? 'Submit Answer' :
                     'Sign in'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              {show2FA && (
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false)
                    setTwoFactorCode('')
                    setError('')
                  }}
                  className="w-full mt-3 p-3 bg-dark-bg text-text-muted rounded-lg hover:bg-gray-800 transition text-sm"
                >
                  Back to login
                </button>
              )}

              <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
                <p className="text-center text-sm text-text-muted">
                  <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                    Forgot your password?
                  </Link>
                </p>
                <p className="text-center text-sm text-text-muted">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Security Features Section */}
      <section id="security" className="py-20 px-6">
        <motion.div 
          style={{ y: featuresY }}
          className="max-w-6xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Built different.{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Built secure.
              </span>
            </h2>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              We're not another cloud storage pretending to care about privacy. 
              Every line of code is written with one goal: protecting your data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-card-bg/50 backdrop-blur rounded-xl p-6 border border-gray-800 hover:border-primary/50 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-text-muted">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-card-bg/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold mb-8">
            Why developers trust znapfile
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-card-bg/50 backdrop-blur rounded-xl p-6 border border-gray-800">
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <p className="text-text-muted">Open about our encryption</p>
            </div>
            <div className="bg-card-bg/50 backdrop-blur rounded-xl p-6 border border-gray-800">
              <div className="text-3xl font-bold text-primary mb-2">0</div>
              <p className="text-text-muted">Files we can decrypt</p>
            </div>
            <div className="bg-card-bg/50 backdrop-blur rounded-xl p-6 border border-gray-800">
              <div className="text-3xl font-bold text-primary mb-2">∞</div>
              <p className="text-text-muted">Your peace of mind</p>
            </div>
          </div>

          <p className="text-lg text-text-muted mb-8">
            We're the file sharing service that sleeps well at night, 
            because we literally can't access your data even if we wanted to.
          </p>

          <Link 
            to="/register" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            Start sharing securely
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Pricing Modal */}
      <PricingModal 
        isOpen={showPricingModal}
        onClose={() => {
          handlePlanSelection('free')
        }}
        onSelectPlan={handlePlanSelection}
      />
    </div>
  )
}

export default LoginPage
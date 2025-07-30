import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles, ArrowRight, Crown, Zap } from 'lucide-react'
import AnimatedButton from '../components/AnimatedButton'
import useStore from '../store/useStore'
// import Confetti from 'react-confetti' // Install with: npm install react-confetti
import { plansAPI } from '../services/api'

const PaymentSuccessPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const user = useStore(state => state.user)

  useEffect(() => {
    // Refresh user data to get updated plan
    if (user) {
      refreshUserPlan()
    }
  }, [user])

  const refreshUserPlan = async () => {
    try {
      // Get updated plan info
      const response = await plansAPI.getCurrentPlan()
      // You might want to update the user object in your store here
    } catch (err) {
      console.error('Failed to refresh plan info:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Confetti effect - uncomment after installing react-confetti */}
      {/* <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
        colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']}
      /> */}

      {/* Background gradient animation */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card-bg rounded-2xl p-8 border border-gray-800 text-center">
          {/* Success icon with animation */}
          <div className="relative mx-auto w-32 h-32 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            >
              <Sparkles className="absolute top-0 right-0 w-6 h-6 text-yellow-400" />
              <Sparkles className="absolute bottom-0 left-0 w-6 h-6 text-purple-400" />
              <Sparkles className="absolute top-1/2 left-0 w-5 h-5 text-blue-400" />
              <Sparkles className="absolute top-0 left-1/2 w-5 h-5 text-pink-400" />
            </motion.div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-50 animate-pulse" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
              className="relative bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-8"
            >
              <CheckCircle className="w-16 h-16 text-white" />
            </motion.div>
          </div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
          >
            Welcome to Pro! 🎉
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-text-muted mb-8"
          >
            Your subscription is now active. Get ready to enjoy all the amazing features!
          </motion.p>

          {/* Features unlocked */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-dark-bg rounded-xl p-6 mb-8 text-left"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              Features Unlocked:
            </h3>
            <ul className="space-y-2 text-sm text-text-muted">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                300GB monthly transfers
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Files up to 300GB
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Extended file expiration (1-14 days)
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Download tracking & analytics
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Unlimited daily transfers
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <AnimatedButton
              onClick={() => navigate('/dashboard')}
              variant="primary"
              className="w-full"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </AnimatedButton>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default PaymentSuccessPage
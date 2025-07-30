import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import PricingModal from '../components/PricingModal'
import AnimatedButton from '../components/AnimatedButton'
import useStore from '../store/useStore'
import { paymentsAPI } from '../services/api'
import { useToastContext } from '../contexts/ToastContext'

const PricingPage = () => {
  const navigate = useNavigate()
  const user = useStore(state => state.user)
  const toast = useToastContext()
  const [isLoading, setIsLoading] = useState(false)

  const handlePlanSelection = async (plan) => {
    if (plan === 'free') {
      // Free plan - just redirect
      if (user) {
        navigate('/dashboard')
      } else {
        navigate('/register')
      }
      return
    }

    // Pro or Max plan - create Stripe checkout session
    if (!user) {
      toast.error('Please sign in to upgrade your plan')
      navigate('/login')
      return
    }

    setIsLoading(true)
    try {
      const response = await paymentsAPI.createCheckoutSession(plan)
      const { checkout_url } = response.data
      
      // Redirect to Stripe checkout
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to create checkout session:', err)
      toast.error(err.response?.data?.detail || 'Failed to start checkout process')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg">
      {/* Header */}
      <header className="border-b border-gray-800 bg-dark-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Choose Your Plan</h1>
          </div>
        </div>
      </header>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg rounded-xl p-6 flex items-center gap-4"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-lg">Redirecting to checkout...</span>
          </motion.div>
        </div>
      )}

      {/* Pricing modal always visible on this page */}
      <div className="relative">
        <PricingModal
          isOpen={true}
          onClose={() => navigate(-1)}
          onSelectPlan={handlePlanSelection}
        />
      </div>
    </div>
  )
}

export default PricingPage
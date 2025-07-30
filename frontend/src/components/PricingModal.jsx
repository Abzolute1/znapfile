import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, Zap, Crown, X } from 'lucide-react'

const PricingModal = ({ isOpen, onClose, onSelectPlan }) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '',
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/25',
      features: [
        '2GB monthly transfers',
        '1GB max file size',
        '24-hour file expiration',
        'Password protection',
        '5 transfers per day',
      ],
      limitations: [
        'Email verification required',
        'Limited to 5 transfers/day',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$6.99',
      period: '/month',
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/25',
      popular: true,
      features: [
        '300GB monthly transfers',
        '300GB max file size',
        '1-14 day file expiration',
        'Password protection',
        'Download tracking',
        'Unlimited daily transfers',
      ],
    },
    {
      id: 'max',
      name: 'Max',
      price: '$21.99',
      period: '/month',
      icon: Crown,
      color: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-500/25',
      features: [
        '1TB monthly transfers',
        '1TB max file size',
        '1-30 day file expiration',
        'Password protection',
        'Download tracking',
        'Unlimited daily transfers',
      ],
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 backdrop-blur-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-12">
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
              >
                Choose Your Plan
              </motion.h2>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-400 text-lg"
              >
                Simple pricing. No hidden fees. Cancel anytime.
              </motion.p>
            </div>

            {/* Pricing cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, index) => {
                const Icon = plan.icon
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="relative"
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <span className="px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full shadow-lg">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div
                      className={`relative bg-gray-900/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${plan.shadow} shadow-lg`}
                    >
                      {/* Plan icon and name */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${plan.color}`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold">{plan.name}</h3>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-gray-400">{plan.period}</span>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{feature}</span>
                          </li>
                        ))}
                        {plan.limitations?.map((limitation, i) => (
                          <li key={i} className="flex items-start gap-3 opacity-60">
                            <span className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0 text-center">•</span>
                            <span className="text-gray-400 text-sm">{limitation}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Action button */}
                      <button
                        onClick={() => onSelectPlan(plan.id)}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                          plan.popular
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg'
                            : 'bg-gray-800 hover:bg-gray-700 text-white'
                        }`}
                      >
                        {plan.id === 'free' ? 'Continue with Free' : `Subscribe for ${plan.price}/mo`}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Bottom info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-center"
            >
              <p className="text-gray-400 text-sm">
                All plans include secure file transfers, password protection, and basic support.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                You can upgrade, downgrade, or cancel your subscription at any time.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PricingModal
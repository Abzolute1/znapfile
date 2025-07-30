import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Shield, Zap, Share2, Lock, Clock, Sparkles } from 'lucide-react'

const TipsCarousel = () => {
  const [currentTip, setCurrentTip] = useState(0)

  const tips = [
    {
      icon: Zap,
      title: "Quick Upload",
      text: "Drag and drop files anywhere on the page for instant upload",
      color: "text-yellow-400"
    },
    {
      icon: Shield,
      title: "Password Protection",
      text: "Add passwords to your files for an extra layer of security",
      color: "text-green-400"
    },
    {
      icon: Clock,
      title: "Custom Expiry",
      text: "Set custom expiration times from 30 minutes to 30 days",
      color: "text-blue-400"
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      text: "Share files with a simple link - no sign-up required for recipients",
      color: "text-purple-400"
    },
    {
      icon: Lock,
      title: "End-to-End Encryption",
      text: "Your files are encrypted during transfer and storage",
      color: "text-pink-400"
    },
    {
      icon: Sparkles,
      title: "Pro Features",
      text: "Upgrade to Pro for larger files and longer retention",
      color: "text-orange-400"
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [tips.length])

  const tip = tips[currentTip]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.05]"
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Lightbulb className="w-6 h-6 text-yellow-400/70" />
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white/60 mb-2">Did you know?</h3>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <tip.icon className={`w-5 h-5 ${tip.color}`} />
                <h4 className="font-semibold text-white/90">{tip.title}</h4>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                {tip.text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mt-4 justify-center">
        {tips.map((_, index) => (
          <motion.div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === currentTip 
                ? 'bg-white/60 w-6' 
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default TipsCarousel
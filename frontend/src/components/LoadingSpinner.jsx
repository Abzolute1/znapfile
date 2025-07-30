import { motion } from 'framer-motion'

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`relative ${sizes[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-card-bg" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent" />
        <motion.div
          className="absolute inset-2 rounded-full bg-primary/20"
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-muted text-sm"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export const LoadingDots = () => (
  <div className="loading-dots flex gap-1 justify-center">
    <span className="w-2 h-2 bg-primary rounded-full"></span>
    <span className="w-2 h-2 bg-primary rounded-full"></span>
    <span className="w-2 h-2 bg-primary rounded-full"></span>
  </div>
)

export default LoadingSpinner
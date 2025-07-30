import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

const Toast = ({ type = 'info', message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: 'text-green-500 bg-green-500/10 border-green-500/20',
    error: 'text-red-500 bg-red-500/10 border-red-500/20',
    warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    info: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  }

  const Icon = icons[type]
  const colorClass = colors[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-lg border backdrop-blur-xl shadow-2xl ${colorClass}`}
      style={{ minWidth: '300px', maxWidth: '500px' }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </AnimatePresence>
  )
}

export default Toast
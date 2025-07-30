import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, AlertCircle } from 'lucide-react'

const CaptchaModal = ({ isOpen, onClose, captchaData, onSubmit }) => {
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!answer.trim()) return

    setIsSubmitting(true)
    await onSubmit(answer)
    setIsSubmitting(false)
    setAnswer('')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card p-6 rounded-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Security Verification</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {captchaData?.error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{captchaData.error}</span>
            </div>
          )}

          <div className="mb-4">
            <p className="text-text-muted text-sm mb-2">
              Too many failed attempts. Please solve this to continue:
            </p>
            {captchaData?.attempts_remaining && captchaData.attempts_remaining < 5 && (
              <p className="text-warning text-sm">
                {captchaData.attempts_remaining} attempts remaining
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-lg font-medium mb-3 text-center">
                {captchaData?.captcha_question}
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full p-3 bg-dark-bg rounded-lg outline-none focus:ring-2 focus:ring-primary text-center text-xl font-mono"
                placeholder="Your answer"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 p-3 glass-card rounded-lg hover:bg-white/5 transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                disabled={!answer.trim() || isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CaptchaModal
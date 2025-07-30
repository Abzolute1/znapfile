import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, Send, Check, AlertCircle, Copy, Link } from 'lucide-react'
import AnimatedButton from './AnimatedButton'
import { shareAPI } from '../services/api'
import { useToastContext } from '../contexts/ToastContext'

const ShareModal = ({ isOpen, onClose, file, collection }) => {
  const toast = useToastContext()
  const [email, setEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  
  const isCollection = !!collection
  const item = collection || file
  const shareUrl = isCollection 
    ? `${window.location.origin}/c/${collection.slug}`
    : `${window.location.origin}/d/${file.short_code}`

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    
    setSending(true)
    setError(null)
    
    try {
      const endpoint = isCollection 
        ? `/share/collection/${collection.id}/email`
        : `/share/file/${file.id}/email`
      
      const response = await shareAPI.sendEmail(endpoint, {
        recipient_email: email,
        recipient_name: recipientName || null,
        sender_name: senderName || 'A friend',
        message: message || null
      })
      
      if (response.data.success) {
        setSent(true)
        toast('Email sent successfully!')
        setTimeout(() => {
          onClose()
          // Reset form
          setEmail('')
          setRecipientName('')
          setSenderName('')
          setMessage('')
          setSent(false)
        }, 2000)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast('Link copied to clipboard!')
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="glass-card p-6 rounded-2xl w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold gradient-text">
              Share {isCollection ? 'Collection' : 'File'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-card-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* File/Collection Info */}
          <div className="bg-dark-bg p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-1">
              {isCollection ? collection.name : file.original_filename}
            </h3>
            {isCollection ? (
              <p className="text-sm text-text-muted">
                {collection.file_count} files • {collection.has_password && '🔒 Password protected'}
              </p>
            ) : (
              <p className="text-sm text-text-muted">
                {file.file_size && `${(file.file_size / 1024 / 1024).toFixed(1)} MB`} • 
                {file.has_password && ' 🔒 Password protected'}
              </p>
            )}
          </div>

          {/* Share Options Tabs */}
          <div className="flex gap-2 mb-6">
            <button className="flex-1 py-2 px-4 bg-primary/20 text-primary rounded-lg flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button 
              onClick={copyLink}
              className="flex-1 py-2 px-4 hover:bg-dark-bg rounded-lg transition flex items-center justify-center gap-2"
            >
              <Link className="w-4 h-4" />
              Copy Link
            </button>
          </div>

          {/* Email Form */}
          {!sent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">To *</label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Recipient Name</label>
                <input
                  type="text"
                  placeholder="John Doe (optional)"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  placeholder="Add a personal message (optional)"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 bg-error/10 border border-error/50 rounded-lg text-error text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <AnimatedButton
                onClick={handleSendEmail}
                variant="primary"
                className="w-full"
                disabled={sending || !email}
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </AnimatedButton>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Email Sent!</h3>
              <p className="text-text-muted">
                The download link has been sent to {email}
              </p>
            </motion.div>
          )}

          {/* Direct Link Section */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-text-muted mb-2">Direct link:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-dark-bg rounded-lg px-3 py-2 text-sm text-text-muted"
              />
              <button
                onClick={copyLink}
                className="p-2 hover:bg-dark-bg rounded-lg transition"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
  )
}

export default ShareModal
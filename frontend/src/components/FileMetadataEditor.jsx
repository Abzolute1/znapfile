import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X, Save, Globe, Lock, MessageSquare, Tag, Clock,
  Download, Eye, EyeOff, FileText, Info
} from 'lucide-react'
import { filesAPI } from '../services/api'
import AnimatedButton from './AnimatedButton'
import { formatBytes, formatTimeRemaining } from '../utils/format'
import useStore from '../store/useStore'

const FileMetadataEditor = ({ file, onClose, onSave }) => {
  const user = useStore(state => state.user)
  const [formData, setFormData] = useState({
    description: file.description || '',
    notes: file.notes || '',
    is_public: file.is_public || false,
    allow_comments: file.allow_comments || true,
    max_downloads: file.max_downloads || '',
    expiry_minutes: 30,
    password: '',
    folder_id: file.folder_id || null
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const updateData = {
        description: formData.description || null,
        notes: formData.notes || null,
        is_public: formData.is_public,
        allow_comments: formData.allow_comments,
        max_downloads: formData.max_downloads ? parseInt(formData.max_downloads) : null,
        folder_id: formData.folder_id
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      if (formData.expiry_minutes) {
        updateData.expiry_minutes = formData.expiry_minutes
      }

      await filesAPI.updateFile(file.id, updateData)
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update file')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

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
        className="glass-card p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold gradient-text">Edit File Details</h2>
            <p className="text-sm text-text-muted mt-1">{file.original_filename}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <FileText className="w-3 h-3" />
              Size
            </div>
            <p className="font-medium">{formatBytes(file.file_size)}</p>
          </div>
          
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <Download className="w-3 h-3" />
              Downloads
            </div>
            <p className="font-medium">{file.download_count || 0}</p>
          </div>
          
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <Clock className="w-3 h-3" />
              Expires
            </div>
            <p className="font-medium">{formatTimeRemaining(file.expires_at)}</p>
          </div>
          
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <Info className="w-3 h-3" />
              Version
            </div>
            <p className="font-medium">v{file.version || 1}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Public Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              placeholder="Describe this file for others (visible when shared)"
              rows={3}
            />
            <p className="text-xs text-text-muted mt-1">
              This description will be visible to anyone who has the link
            </p>
          </div>

          {/* Private Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Private Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              placeholder="Personal notes about this file (only visible to you)"
              rows={3}
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-3">Visibility</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
                  />
                  <span className="flex-1">Make file publicly accessible</span>
                  <Globe className="w-4 h-4 text-accent" />
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_comments}
                    onChange={e => setFormData({ ...formData, allow_comments: e.target.checked })}
                    className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
                  />
                  <span className="flex-1">Allow comments</span>
                  <MessageSquare className="w-4 h-4 text-secondary" />
                </label>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Downloads (Optional)
                </label>
                <input
                  type="number"
                  value={formData.max_downloads}
                  onChange={e => setFormData({ ...formData, max_downloads: e.target.value })}
                  className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Unlimited"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Extend Expiry
                </label>
                <select
                  value={formData.expiry_minutes}
                  onChange={e => setFormData({ ...formData, expiry_minutes: parseInt(e.target.value) })}
                  className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value={0}>Don't change</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={180}>3 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours (1 day)</option>
                  {/* PRO tier - up to 14 days */}
                  {(user?.tier === 'PRO' || user?.tier === 'MAX') && (
                    <>
                      <option value={2880}>2 days</option>
                      <option value={4320}>3 days</option>
                      <option value={7200}>5 days</option>
                      <option value={10080}>7 days</option>
                      <option value={20160}>14 days</option>
                    </>
                  )}
                  {/* MAX tier - up to 30 days */}
                  {user?.tier === 'MAX' && (
                    <>
                      <option value={30240}>21 days</option>
                      <option value={43200}>30 days</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Password Protection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Update Password Protection
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 pr-10 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder={file.has_password ? "Enter new password or leave blank" : "Add password protection"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {file.has_password && (
              <p className="text-xs text-text-muted mt-1">
                This file is already password protected. Enter a new password to change it.
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-error/10 border border-error/50 rounded-lg text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <AnimatedButton
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={saving}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </AnimatedButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default FileMetadataEditor
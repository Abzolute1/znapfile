import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Upload, FolderPlus, Link2, Clock, HardDrive, 
  Activity, FileText, Image, Film, Music, Archive,
  Share2, Bell, ChevronRight, Zap
} from 'lucide-react'
import useStore from '../store/useStore'
import { filesAPI, plansAPI, notificationsAPI } from '../services/api'
import FileUploader from '../components/FileUploader'
import { formatBytes, formatTimeAgo } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'
// import LiveActivityFeed from '../components/LiveActivityFeed'
// import FloatingOrbs from '../components/FloatingOrbs'
import AnimatedCounter from '../components/AnimatedCounter'
// import TipsCarousel from '../components/TipsCarousel'

const UserHomePage = () => {
  const navigate = useNavigate()
  const toast = useToastContext()
  const user = useStore(state => state.user)
  const [showUploader, setShowUploader] = useState(false)
  const [recentFiles, setRecentFiles] = useState([])
  const [stats, setStats] = useState({
    storageUsed: 0,
    activeLinks: 0,
    monthlyTransfer: 0,
    plan: 'free',
    limits: {
      monthly_transfer_bytes: 2 * 1024 * 1024 * 1024, // 2GB for free
      active_storage_bytes: 1024 * 1024 * 1024 // 1GB for free
    }
  })
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)


  useEffect(() => {
    loadDashboardData()
    loadNotificationCount()
  }, [])

  useEffect(() => {
    // Handle click outside to close notifications
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [filesRes, planRes] = await Promise.all([
        filesAPI.listFiles(),
        plansAPI.getCurrentPlan()
      ])

      // Get recent files (last 5) - filesRes.data contains { files: [...], total_storage_used, storage_limit }
      const allFiles = filesRes.data.files || []
      const sortedFiles = allFiles
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
      
      setRecentFiles(sortedFiles)
      
      // Calculate active links count
      const activeLinksCount = allFiles.filter(f => new Date(f.expires_at) > new Date()).length
      
      setStats({
        storageUsed: filesRes.data.total_storage_used || 0,
        activeLinks: activeLinksCount,
        monthlyTransfer: planRes.data.usage?.monthly_transfer_used || 0,
        plan: planRes.data.plan?.id || 'free',
        limits: planRes.data.limits || {
          monthly_transfer_bytes: 2 * 1024 * 1024 * 1024,
          active_storage_bytes: 1024 * 1024 * 1024
        }
      })
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      
      // Set default values to prevent crashes
      setRecentFiles([])
      setStats({
        storageUsed: 0,
        activeLinks: 0,
        monthlyTransfer: 0,
        plan: 'free',
        limits: {
          monthly_transfer_bytes: 2 * 1024 * 1024 * 1024,
          active_storage_bytes: 1024 * 1024 * 1024
        }
      })
      
      // Only show error toast if it's not an auth error (which redirects)
      if (err.response?.status !== 401) {
        toast.error('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setShowUploader(true)
  }

  const loadNotificationCount = async () => {
    try {
      const res = await notificationsAPI.getUnreadCount()
      setUnreadNotifications(res.data.unread_count)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll()
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ))
      setUnreadNotifications(Math.max(0, unreadNotifications - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      setUnreadNotifications(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const getFileIcon = (filename) => {
    if (!filename) return FileText
    const ext = filename.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return Image
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return Film
    if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return Music
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return Archive
    return FileText
  }

  const getPlanColor = () => {
    switch(stats.plan) {
      case 'max': return 'from-orange-500 to-red-500'
      case 'pro': return 'from-purple-500 to-pink-500'
      default: return 'from-blue-500 to-cyan-500'
    }
  }

  // Removed motion variants for debugging

  return (
    <div className="min-h-screen bg-dark-bg relative">
      {/* Background effects */}
      {/* <FloatingOrbs /> */}
      
      {/* Live activity feed */}
      {/* <LiveActivityFeed /> */}
      
      {/* Header */}
      <header className="border-b border-border bg-card-bg/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                znapfile
              </h1>
              <nav className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => navigate('/user/home')}
                  className="text-text hover:text-primary transition"
                >
                  Home
                </button>
                <button 
                  onClick={() => navigate('/dashboard?tab=files')}
                  className="text-text-muted hover:text-text transition"
                >
                  Files
                </button>
                <button 
                  onClick={() => navigate('/dashboard?tab=collections')}
                  className="text-text-muted hover:text-text transition"
                >
                  Collections
                </button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    if (!showNotifications) {
                      loadNotifications()
                    }
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg transition relative"
                >
                  <Bell className="w-5 h-5 text-text-muted" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card-bg rounded-xl shadow-xl border border-border z-50">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-primary hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-text-muted">No notifications</p>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => !notification.is_read && markNotificationRead(notification.id)}
                            className={`p-4 border-b border-border hover:bg-white/5 cursor-pointer ${
                              !notification.is_read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                <p className="text-xs text-text-muted mt-1">{notification.message}</p>
                                <p className="text-xs text-text-muted mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                <span className="text-sm">{user?.username || user?.email}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div 
        className="max-w-7xl mx-auto px-6 py-8"
      >
        {/* Upload Zone */}
        <div 
          className={`relative mb-8 ${dragActive ? 'scale-[1.02]' : ''} transition-transform`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div 
            className={`
              glass-card p-12 rounded-2xl border-2 border-dashed transition-all
              ${dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
            `}
            style={{ 
              backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(10, 10, 10, 0.7)',
              backdropFilter: 'blur(10px)',
              padding: '3rem',
              borderRadius: '1rem'
            }}>
            <div className="text-center">
              <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-text-muted'}`} />
              <h3 className="text-lg font-medium mb-2">
                {dragActive ? 'Drop files here' : 'Drop files here or click to upload'}
              </h3>
              <p className="text-text-muted text-sm">
                Support for any file type • Encrypted • Auto-expiring links
              </p>
              <div className="flex items-center justify-center gap-4 mt-6">
                <button 
                  onClick={() => setShowUploader(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition"
                >
                  Choose Files
                </button>
                <button 
                  onClick={() => navigate('/dashboard?tab=collections')}
                  className="px-6 py-2.5 glass-card border border-border rounded-lg font-medium hover:border-primary transition"
                >
                  New Collection
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="glass-card p-8 rounded-xl text-center text-text-muted">
                  Loading...
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="glass-card p-8 rounded-xl text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                  <p className="text-text-muted">No files uploaded yet</p>
                  <p className="text-sm text-text-muted mt-1">Start by uploading your first file</p>
                </div>
              ) : (
                recentFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file.original_filename)
                  const isExpired = new Date(file.expires_at) < new Date()
                  
                  return (
                    <motion.div
                      key={`${file.id}-${index}`}
                      whileHover={{ scale: 1.01 }}
                      className="glass-card p-4 rounded-xl hover:border-primary/50 transition cursor-pointer"
                      onClick={() => navigate('/dashboard')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{file.original_filename}</h4>
                          <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                            <span>{formatBytes(file.file_size)}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(file.created_at)}</span>
                            {isExpired && (
                              <>
                                <span>•</span>
                                <span className="text-error">Expired</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.download_count > 0 && (
                            <span className="text-xs text-text-muted">
                              {file.download_count} downloads
                            </span>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              const shareUrl = `${window.location.origin}/d/${file.short_code}`
                              navigator.clipboard.writeText(shareUrl)
                              toast.success('Link copied!')
                            }}
                            className="p-2 hover:bg-white/5 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4 text-text-muted" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-secondary" />
                Quick Stats
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getPlanColor()} text-white`}>
                {stats.plan.toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Storage */}
              <div className="glass-card p-4 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '0.75rem' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Active Storage
                  </span>
                  <span className="text-sm font-medium">
                    <AnimatedCounter 
                      value={stats.storageUsed / (1024 * 1024)} 
                      suffix=" MB" 
                      decimals={1} 
                    />
                  </span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.storageUsed / stats.limits.active_storage_bytes) * 100, 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                    style={{ display: stats.storageUsed === 0 ? 'none' : 'block' }}
                  />
                </div>
              </div>

              {/* Active Links */}
              <div className="glass-card p-4 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '0.75rem' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Active Links
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    <AnimatedCounter value={stats.activeLinks} />
                  </span>
                </div>
              </div>

              {/* Monthly Transfer */}
              <div className="glass-card p-4 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: '0.75rem' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Monthly Transfer
                  </span>
                  <span className="text-sm font-medium">
                    <AnimatedCounter 
                      value={stats.monthlyTransfer / (1024 * 1024 * 1024)} 
                      suffix=" GB" 
                      decimals={2} 
                    />
                  </span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.monthlyTransfer / stats.limits.monthly_transfer_bytes) * 100, 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-gradient-to-r from-secondary to-accent h-2 rounded-full"
                    style={{ display: stats.monthlyTransfer === 0 ? 'none' : 'block' }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 space-y-2">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full p-3 glass-card rounded-lg text-sm font-medium hover:border-primary transition flex items-center justify-between"
                >
                  <span>Manage Files</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                {user?.is_superuser && (
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full p-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center justify-between"
                  >
                    <span>Admin Dashboard</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Tips Carousel */}
            {/* <div className="mt-6">
              <TipsCarousel />
            </div> */}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploader(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-card p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Upload Files</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            
            <FileUploader
              onUploadComplete={() => {
                setShowUploader(false)
                loadDashboardData()
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default UserHomePage
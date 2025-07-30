import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Users, DollarSign, HardDrive, Activity, Search, 
  TrendingUp, Shield, RefreshCw, Loader2, ArrowLeft,
  FileText, Download, Lock, Share2, User, Calendar,
  Bell, Send, MessageSquare
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminAPI } from '../services/api'
import { useToastContext } from '../contexts/ToastContext'
import { formatBytes } from '../utils/format'
import useStore from '../store/useStore'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const toast = useToastContext()
  const user = useStore(state => state.user)
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('30d')
  
  // Analytics data
  const [overview, setOverview] = useState(null)
  const [userGrowth, setUserGrowth] = useState(null)
  const [systemHealth, setSystemHealth] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [featureUsage, setFeatureUsage] = useState(null)
  
  // User search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Notifications
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState('info')
  const [sendingNotification, setSendingNotification] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState([])

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/')
      return
    }
    loadAnalytics()
    loadRecentNotifications()
  }, [])

  const loadRecentNotifications = async () => {
    try {
      const res = await adminAPI.getRecentNotifications()
      setRecentNotifications(res.data.notifications || [])
    } catch (err) {
      console.error('Failed to load recent notifications:', err)
    }
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [overviewRes, healthRes, revenueRes, featureRes] = await Promise.all([
        adminAPI.getOverview(),
        adminAPI.getSystemHealth(),
        adminAPI.getRevenueBreakdown(),
        adminAPI.getFeatureUsage()
      ])
      
      console.log('Analytics data:', {
        overview: overviewRes.data,
        health: healthRes.data,
        revenue: revenueRes.data,
        features: featureRes.data
      })
      
      setOverview(overviewRes.data)
      setSystemHealth(healthRes.data)
      setRevenue(revenueRes.data)
      setFeatureUsage(featureRes.data)
      
      // Load user growth for default period
      const growthRes = await adminAPI.getUserGrowth(period)
      setUserGrowth(growthRes.data)
    } catch (err) {
      toast.error('Failed to load analytics')
      console.error('Analytics error:', err)
      console.error('Error details:', {
        overview: err.response?.data,
        status: err.response?.status,
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const loadUserGrowth = async (newPeriod) => {
    setPeriod(newPeriod)
    try {
      const res = await adminAPI.getUserGrowth(newPeriod)
      setUserGrowth(res.data)
    } catch (err) {
      toast.error('Failed to load user growth data')
    }
  }

  const searchUsers = async () => {
    if (searchQuery.length < 2) return
    
    setSearchLoading(true)
    try {
      const res = await adminAPI.searchUsers(searchQuery)
      setSearchResults(res.data.users)
    } catch (err) {
      toast.error('Search failed')
    } finally {
      setSearchLoading(false)
    }
  }

  const loadUserDetails = async (userId) => {
    try {
      const res = await adminAPI.getUserDetails(userId)
      setSelectedUser(res.data)
    } catch (err) {
      toast.error('Failed to load user details')
    }
  }

  const updateUserTier = async (userId, newTier) => {
    try {
      await adminAPI.updateUserTier(userId, newTier)
      toast.success('User tier updated')
      // Reload user details
      loadUserDetails(userId)
    } catch (err) {
      toast.error('Failed to update user tier')
    }
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
    const colors = {
      blue: 'from-blue-500 to-cyan-500',
      green: 'from-green-500 to-emerald-500',
      purple: 'from-purple-500 to-pink-500',
      orange: 'from-orange-500 to-red-500'
    }
    
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card-bg rounded-xl p-6 border border-border"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-muted">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-text-muted mt-2">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[color]} bg-opacity-10`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-border bg-card-bg/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/user/home')}
                className="p-2 hover:bg-white/5 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
            
            <button
              onClick={loadAnalytics}
              className="p-2 hover:bg-white/5 rounded-lg transition"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {['overview', 'users', 'revenue', 'system', 'features', 'notifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-card-bg hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={overview?.total_users || 0}
                subtitle={`+${overview?.new_users_30d || 0} last 30 days`}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Active Users"
                value={overview?.active_users_30d || 0}
                subtitle="Last 30 days"
                icon={Activity}
                color="green"
              />
              <StatCard
                title="Monthly Revenue"
                value={`$${overview?.mrr || 0}`}
                subtitle={`$${overview?.arr || 0} ARR`}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="Storage Used"
                value={formatBytes(systemHealth?.storage?.used_bytes || 0)}
                subtitle={`${systemHealth?.files?.active || 0} active files`}
                icon={HardDrive}
                color="orange"
              />
            </div>

            {/* User Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Users by Plan</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Free</span>
                    <span className="font-medium">{overview?.users_by_tier?.free || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Pro ($9.99/mo)</span>
                    <span className="font-medium">{overview?.users_by_tier?.pro || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Max ($24.99/mo)</span>
                    <span className="font-medium">{overview?.users_by_tier?.max || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Files Today</span>
                    <span className="font-medium">{systemHealth?.files?.uploaded_today || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Downloads Today</span>
                    <span className="font-medium">{systemHealth?.bandwidth?.downloads_today || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Bandwidth Today</span>
                    <span className="font-medium">{systemHealth?.bandwidth?.today_gb || 0} GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Growth Chart */}
            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">User Growth</h3>
                <div className="flex gap-2">
                  {['7d', '30d', '90d', '1y'].map((p) => (
                    <button
                      key={p}
                      onClick={() => loadUserGrowth(p)}
                      className={`px-3 py-1 rounded text-sm ${
                        period === p
                          ? 'bg-primary text-white'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              {userGrowth && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowth.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#999' }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis tick={{ fill: '#999' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="signups" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* User Search */}
            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">User Management</h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search by email or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  className="flex-1 px-4 py-2 bg-dark-bg rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={searchUsers}
                  disabled={searchLoading}
                  className="px-4 py-2 bg-primary rounded-lg hover:bg-primary/80 transition flex items-center gap-2"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => loadUserDetails(user.id)}
                      className="p-3 bg-dark-bg rounded-lg hover:bg-white/5 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.username && (
                            <p className="text-sm text-text-muted">@{user.username}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.tier === 'free' ? 'bg-gray-500/20 text-gray-400' :
                            user.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {user.tier.toUpperCase()}
                          </span>
                          {user.email_verified && (
                            <span className="text-green-500 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User Details */}
              {selectedUser && (
                <div className="mt-6 p-4 bg-dark-bg rounded-lg">
                  <h4 className="font-semibold mb-3">User Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Email</span>
                      <span>{selectedUser.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Joined</span>
                      <span>{new Date(selectedUser.user.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Total Files</span>
                      <span>{selectedUser.stats.total_files}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Storage Used</span>
                      <span>{selectedUser.stats.total_size_gb} GB</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <select
                      value={selectedUser.user.tier}
                      onChange={(e) => updateUserTier(selectedUser.user.id, e.target.value)}
                      className="px-3 py-2 bg-card-bg rounded-lg"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="MRR"
                value={`$${revenue?.totals?.mrr || 0}`}
                subtitle="Monthly Recurring Revenue"
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="ARR"
                value={`$${revenue?.totals?.arr || 0}`}
                subtitle="Annual Recurring Revenue"
                icon={TrendingUp}
                color="purple"
              />
              <StatCard
                title="Active Subscriptions"
                value={revenue?.totals?.active_subscriptions || 0}
                subtitle="Paying customers"
                icon={Users}
                color="blue"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Pro Plan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Active Subscriptions</span>
                    <span className="font-medium">{revenue?.subscriptions?.pro?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Monthly Revenue</span>
                    <span className="font-medium">${revenue?.subscriptions?.pro?.monthly_revenue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">New (30d)</span>
                    <span className="font-medium">{revenue?.subscriptions?.pro?.new_last_30d || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Max Plan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Active Subscriptions</span>
                    <span className="font-medium">{revenue?.subscriptions?.max?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Monthly Revenue</span>
                    <span className="font-medium">${revenue?.subscriptions?.max?.monthly_revenue || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">New (30d)</span>
                    <span className="font-medium">{revenue?.subscriptions?.max?.new_last_30d || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Files"
                value={systemHealth?.files?.total || 0}
                subtitle={`${systemHealth?.files?.active || 0} active`}
                icon={FileText}
                color="blue"
              />
              <StatCard
                title="Storage Used"
                value={`${systemHealth?.storage?.used_gb || 0} GB`}
                subtitle={formatBytes(systemHealth?.storage?.used_bytes || 0)}
                icon={HardDrive}
                color="green"
              />
              <StatCard
                title="Today's Bandwidth"
                value={`${systemHealth?.bandwidth?.today_gb || 0} GB`}
                subtitle={`${systemHealth?.bandwidth?.downloads_today || 0} downloads`}
                icon={Download}
                color="purple"
              />
            </div>

            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">File Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{systemHealth?.files?.uploaded_today || 0}</p>
                  <p className="text-sm text-text-muted">Uploads Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatBytes(systemHealth?.files?.average_size || 0)}</p>
                  <p className="text-sm text-text-muted">Avg File Size</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{systemHealth?.bandwidth?.downloads_today || 0}</p>
                  <p className="text-sm text-text-muted">Downloads Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{systemHealth?.files?.active || 0}</p>
                  <p className="text-sm text-text-muted">Active Files</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Password Protection</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted">Usage Rate</span>
                  <span className="font-medium">{featureUsage?.password_protection?.percentage || 0}%</span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    style={{ width: `${featureUsage?.password_protection?.percentage || 0}%` }}
                  />
                </div>
                <p className="text-sm text-text-muted mt-2">
                  {featureUsage?.password_protection?.enabled || 0} files protected
                </p>
              </div>

              <div className="bg-card-bg rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Share Links</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" />
                    <span className="text-text-muted">Total Created</span>
                  </div>
                  <span className="text-2xl font-bold">{featureUsage?.share_links?.total || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">Top File Types</h3>
              <div className="space-y-2">
                {(featureUsage?.top_file_types || []).map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-text-muted">{type.extension}</span>
                    <span className="font-medium">{type.count} files</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Send Global Message */}
            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Send Global Message
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Update Notice"
                    className="w-full p-3 bg-dark-bg rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="We've updated our service..."
                    rows={4}
                    className="w-full p-3 bg-dark-bg rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full p-3 bg-dark-bg rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                
                <button
                  onClick={async () => {
                    if (!notificationTitle || !notificationMessage) {
                      toast.error('Please fill in all fields')
                      return
                    }
                    
                    setSendingNotification(true)
                    try {
                      await adminAPI.sendGlobalNotification({
                        title: notificationTitle,
                        message: notificationMessage,
                        type: notificationType
                      })
                      toast.success('Notification sent to all users')
                      setNotificationTitle('')
                      setNotificationMessage('')
                      setNotificationType('info')
                      // Reload recent notifications
                      const res = await adminAPI.getRecentNotifications()
                      setRecentNotifications(res.data.notifications)
                    } catch (err) {
                      toast.error('Failed to send notification')
                    } finally {
                      setSendingNotification(false)
                    }
                  }}
                  disabled={sendingNotification || !notificationTitle || !notificationMessage}
                  className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to All Users
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Recent Notifications */}
            <div className="bg-card-bg rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Notifications
              </h3>
              
              {recentNotifications.length === 0 ? (
                <p className="text-text-muted text-center py-8">No notifications sent yet</p>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((notification, index) => (
                    <div key={index} className="p-4 bg-dark-bg rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              notification.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                              notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                              notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {notification.type}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted">{notification.message}</p>
                          <p className="text-xs text-text-muted mt-2">
                            Sent to {notification.recipient_count} users • {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
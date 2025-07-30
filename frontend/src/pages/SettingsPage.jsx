import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  User, CreditCard, Shield, Key, AlertTriangle,
  ChevronRight, Check, X, Loader2, LogOut, Trash2,
  Mail, Calendar, Package, ArrowLeft, Smartphone, Copy, RefreshCw, Info
} from 'lucide-react'
import useStore from '../store/useStore'
import { authAPI, plansAPI, userAPI, paymentsAPI } from '../services/api'
import { useToastContext } from '../contexts/ToastContext'
import { formatBytes } from '../utils/format'

const SettingsPage = () => {
  const navigate = useNavigate()
  const toast = useToastContext()
  const user = useStore(state => state.user)
  const clearAuth = useStore(state => state.clearAuth)
  
  const [activeTab, setActiveTab] = useState('account')
  const [loading, setLoading] = useState(false)
  const [planInfo, setPlanInfo] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelConfirmText, setCancelConfirmText] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showEnableTwoFactor, setShowEnableTwoFactor] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  useEffect(() => {
    loadPlanInfo()
    // Check if 2FA is enabled
    setTwoFactorEnabled(user?.two_factor_enabled || false)
  }, [])

  const loadPlanInfo = async () => {
    try {
      const response = await plansAPI.getCurrentPlan()
      setPlanInfo(response.data)
    } catch (err) {
      console.error('Failed to load plan info:', err)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }
    
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setChangingPassword(true)
    try {
      await userAPI.changePassword(passwords.current, passwords.new)
      toast.success('Password changed successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (cancelConfirmText !== 'CANCEL') {
      toast.error('Please type CANCEL to confirm')
      return
    }

    setLoading(true)
    try {
      await plansAPI.cancelSubscription()
      toast.success('Subscription cancelled. You will retain access until the end of your billing period.')
      setShowCancelModal(false)
      loadPlanInfo()
    } catch (err) {
      toast.error('Failed to cancel subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const handlePlanChange = async (planId) => {
    if (planId === 'free') {
      // Downgrading to free means cancelling subscription
      setShowCancelModal(true)
    } else {
      // For upgrades, redirect to payment page or show Stripe checkout
      try {
        const response = await paymentsAPI.createCheckoutSession(planId)
        if (response.data.checkout_url) {
          window.location.href = response.data.checkout_url
        } else {
          toast.error('Payment integration not yet configured')
        }
      } catch (err) {
        toast.error('Unable to process plan change. Please try again later.')
      }
    }
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  const getPlanBadgeColor = () => {
    switch(planInfo?.plan?.id?.toLowerCase()) {
      case 'max': return 'from-orange-500 to-red-500'
      case 'pro': return 'from-purple-500 to-pink-500'
      default: return 'from-blue-500 to-cyan-500'
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#050505', color: '#F8FAFC' }}>
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
              <h1 className="text-xl font-bold">Account Settings</h1>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-error hover:bg-error/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-white/5 text-text-muted hover:text-text'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <ChevronRight className={`w-4 h-4 ml-auto transition ${
                      activeTab === tab.id ? 'text-primary' : 'opacity-50'
                    }`} />
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                  
                  <div className="space-y-4">
                    {user?.username && (
                      <div>
                        <label className="text-sm text-text-muted">Username</label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-text-muted" />
                          <span className="font-medium">@{user.username}</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm text-text-muted">Email Address</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-text-muted" />
                        <span className="font-medium">{user?.email}</span>
                        {user?.email_verified && (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <Check className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-text-muted">Member Since</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        <span>{new Date(user?.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-text-muted">Account Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Package className="w-4 h-4 text-text-muted" />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getPlanBadgeColor()} text-white`}>
                          {planInfo?.plan?.name || 'Free'} Plan
                        </span>
                        {user?.is_superuser && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-text-muted">Monthly Transfer</label>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-text-muted hover:text-primary cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap max-w-xs">
                              <p className="font-semibold mb-1">Monthly Transfer</p>
                              <p>Amount of data uploaded this month. Downloads don't count against this limit.</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="text-2xl font-bold">{formatBytes(planInfo?.usage?.monthly_transfer_used || 0)}</div>
                        <div className="text-xs text-text-muted">
                          of {formatBytes(planInfo?.usage?.monthly_transfer_limit || 0)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-text-muted">Active Storage</label>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-text-muted hover:text-primary cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap max-w-xs">
                              <p className="font-semibold mb-1">Active Storage</p>
                              <p>Total size of files that haven't expired yet. Files are automatically removed after expiration.</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="text-2xl font-bold">{formatBytes(planInfo?.usage?.active_storage_used || 0)}</div>
                        <div className="text-xs text-text-muted">
                          {planInfo?.usage?.active_storage_limit ? 
                            `of ${formatBytes(planInfo.usage.active_storage_limit)}` : 
                            'No storage limit'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-xl border border-error/20" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4 text-error">Danger Zone</h2>
                  
                  <button
                    className="flex items-center gap-2 px-4 py-2 border border-error text-error hover:bg-error/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                  <p className="text-xs text-text-muted mt-2">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
                  
                  <div className="grid lg:grid-cols-3 gap-4">
                    {/* Free Plan */}
                    <div className={`p-6 rounded-xl border ${planInfo?.plan?.id?.toLowerCase() === 'free' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold">Free</h3>
                        <p className="text-text-muted text-sm">For personal use</p>
                      </div>
                      <div className="text-3xl font-bold mb-4">
                        $0<span className="text-sm font-normal text-text-muted">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>2GB monthly transfer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>1GB max file size</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>24-hour file expiry</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>5 transfers per day</span>
                        </li>
                      </ul>
                      {planInfo?.plan?.id?.toLowerCase() === 'free' ? (
                        <button disabled className="w-full px-4 py-2 bg-white/10 text-text-muted rounded-lg font-medium">
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePlanChange('free')}
                          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                        >
                          Downgrade
                        </button>
                      )}
                    </div>

                    {/* Pro Plan */}
                    <div className={`p-6 rounded-xl border ${planInfo?.plan?.id?.toLowerCase() === 'pro' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold">Pro</h3>
                        <p className="text-text-muted text-sm">For professionals</p>
                      </div>
                      <div className="text-3xl font-bold mb-4">
                        $9.99<span className="text-sm font-normal text-text-muted">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>300GB monthly transfer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>300GB max file size</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>1-7 day expiry options</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Unlimited transfers</span>
                        </li>
                      </ul>
                      {planInfo?.plan?.id?.toLowerCase() === 'pro' ? (
                        <button disabled className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium">
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePlanChange('pro')}
                          className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition"
                        >
                          {planInfo?.plan?.id?.toLowerCase() === 'max' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      )}
                    </div>

                    {/* Max Plan */}
                    <div className={`p-6 rounded-xl border ${planInfo?.plan?.id?.toLowerCase() === 'max' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold">Max</h3>
                        <p className="text-text-muted text-sm">For power users</p>
                      </div>
                      <div className="text-3xl font-bold mb-4">
                        $24.99<span className="text-sm font-normal text-text-muted">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>1TB monthly transfer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>1TB max file size</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>1-20 day expiry options</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>Unlimited transfers</span>
                        </li>
                      </ul>
                      {planInfo?.plan?.id?.toLowerCase() === 'max' ? (
                        <button disabled className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium">
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePlanChange('max')}
                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90 transition"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>

                  {planInfo?.plan?.id?.toLowerCase() !== 'free' && (
                    <div className="mt-6 p-4 bg-warning/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Subscription Details</p>
                          <p className="text-xs text-text-muted mt-1">
                            Next billing date: {new Date(planInfo?.next_billing_date).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="text-sm text-error hover:underline"
                        >
                          Cancel subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Q&A Section */}
                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-1">What is password protection?</h3>
                      <p className="text-sm text-text-muted">
                        You can set a password on any file transfer. Recipients will need to enter this password before they can download the files.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">Why is account verification required?</h3>
                      <p className="text-sm text-text-muted">
                        Account verification helps prevent automated abuse and ensures service availability for legitimate users. Free accounts are also limited to 5 transfers per day.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">What is monthly upload limit?</h3>
                      <p className="text-sm text-text-muted">
                        How much you can upload per month. Use it or lose it - resets on billing date.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">What is active storage?</h3>
                      <p className="text-sm text-text-muted">
                        How much can be stored at once. If you hit this limit, you can't upload more.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">Simple example:</h3>
                      <p className="text-sm text-text-muted">
                        Max plan = 1TB uploads per month.<br/>
                        Upload 1TB on day 1? Can't upload more until next month.<br/>
                        Delete 500GB? Still can't upload more. You already used your 1TB for the month.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">Can I upload a file larger than my remaining allowance?</h3>
                      <p className="text-sm text-text-muted">
                        No. If you have 100GB left this month, you can't upload a 200GB file.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">Why is the maximum file size limited by storage capacity?</h3>
                      <p className="text-sm text-text-muted">
                        Since files must be stored while they're available for download, the maximum file size cannot exceed your plan's active storage limit.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-1">How many times can users download my files that are uploaded?</h3>
                      <p className="text-sm text-text-muted">
                        As many times as they want as long as the file is active.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Change Password</h2>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Password</label>
                      <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                        <Key className="w-5 h-5 text-text-muted" />
                        <input
                          type="password"
                          value={passwords.current}
                          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                          className="flex-1 bg-transparent outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                        <Key className="w-5 h-5 text-text-muted" />
                        <input
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                          className="flex-1 bg-transparent outline-none"
                          placeholder="At least 8 characters"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                      <div className="flex items-center gap-2 p-3 bg-dark-bg rounded-lg">
                        <Key className="w-5 h-5 text-text-muted" />
                        <input
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className="flex-1 bg-transparent outline-none"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </form>
                </div>

                <div className="glass-card p-6 rounded-xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(10px)' }}>
                  <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
                  
                  {!twoFactorEnabled ? (
                    <>
                      <p className="text-text-muted mb-4">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <button 
                        onClick={async () => {
                          try {
                            const response = await authAPI.enable2FA()
                            setTwoFactorSetup(response.data)
                            setShowEnableTwoFactor(true)
                          } catch (err) {
                            toast.error('Failed to initialize 2FA setup')
                          }
                        }}
                        className="px-4 py-2 border border-border hover:border-primary rounded-lg transition flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        Enable 2FA
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-success/10 rounded-lg">
                          <Shield className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-success">2FA is enabled</p>
                          <p className="text-sm text-text-muted">Your account is protected with two-factor authentication</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              const response = await authAPI.getBackupCodes()
                              setBackupCodes(response.data.backup_codes)
                              setShowBackupCodes(true)
                            } catch (err) {
                              toast.error('Failed to get backup codes')
                            }
                          }}
                          className="px-4 py-2 border border-border hover:border-primary rounded-lg transition text-sm"
                        >
                          View Backup Codes
                        </button>
                        <button 
                          onClick={() => setShowEnableTwoFactor(true)}
                          className="px-4 py-2 border border-error text-error hover:bg-error/10 rounded-lg transition text-sm"
                        >
                          Disable 2FA
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg p-6 rounded-2xl max-w-md w-full"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-error/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <h3 className="text-xl font-semibold">Cancel Subscription</h3>
            </div>
            
            <p className="text-text-muted mb-4">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
            </p>
            
            <p className="text-sm text-text-muted mb-4">
              Type <span className="font-mono font-bold text-error">CANCEL</span> to confirm:
            </p>
            
            <input
              type="text"
              value={cancelConfirmText}
              onChange={(e) => setCancelConfirmText(e.target.value)}
              className="w-full p-3 bg-dark-bg rounded-lg mb-4 outline-none focus:ring-2 focus:ring-error"
              placeholder="Type CANCEL"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelConfirmText('')
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelConfirmText !== 'CANCEL' || loading}
                className="flex-1 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {showEnableTwoFactor && twoFactorSetup && !twoFactorEnabled && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)' }}
          >
            <h3 className="text-xl font-semibold mb-4">Enable Two-Factor Authentication</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-muted mb-2">1. Scan this QR code with your authenticator app:</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={twoFactorSetup.qr_code} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-2">2. Or enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-dark-bg rounded font-mono text-sm">{twoFactorSetup.secret}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(twoFactorSetup.secret)
                      toast.success('Secret copied to clipboard')
                    }}
                    className="p-2 hover:bg-white/10 rounded transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-2">3. Enter the 6-digit code from your app:</p>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full p-3 bg-dark-bg rounded-lg text-center text-2xl font-mono"
                  maxLength={6}
                />
              </div>
              
              <div className="p-4 bg-warning/10 rounded-lg">
                <p className="text-sm text-warning font-medium mb-2">Save these backup codes:</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {twoFactorSetup.backup_codes.map((code, i) => (
                    <code key={i} className="text-xs bg-dark-bg p-2 rounded text-center">{code}</code>
                  ))}
                </div>
                <p className="text-xs text-text-muted">Store these codes safely. You can use them to access your account if you lose your authenticator.</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEnableTwoFactor(false)
                  setTwoFactorSetup(null)
                  setTwoFactorCode('')
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (twoFactorCode.length !== 6) {
                    toast.error('Please enter a 6-digit code')
                    return
                  }
                  
                  try {
                    await authAPI.verify2FA({ code: twoFactorCode })
                    toast.success('2FA enabled successfully!')
                    setTwoFactorEnabled(true)
                    setShowEnableTwoFactor(false)
                    setTwoFactorSetup(null)
                    setTwoFactorCode('')
                    // Update user state
                    useStore.getState().updateUser({ two_factor_enabled: true })
                  } catch (err) {
                    toast.error('Invalid code. Please try again.')
                  }
                }}
                disabled={twoFactorCode.length !== 6}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                Enable 2FA
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showEnableTwoFactor && twoFactorEnabled && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg p-6 rounded-2xl max-w-md w-full"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-error/10 rounded-lg">
                <Shield className="w-6 h-6 text-error" />
              </div>
              <h3 className="text-xl font-semibold">Disable Two-Factor Authentication</h3>
            </div>
            
            <p className="text-text-muted mb-4">
              Disabling 2FA will make your account less secure. Enter your password to confirm:
            </p>
            
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full p-3 bg-dark-bg rounded-lg mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEnableTwoFactor(false)
                  setDisablePassword('')
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await authAPI.disable2FA({ password: disablePassword })
                    toast.success('2FA disabled successfully')
                    setTwoFactorEnabled(false)
                    setShowEnableTwoFactor(false)
                    setDisablePassword('')
                    // Update user state
                    useStore.getState().updateUser({ two_factor_enabled: false })
                  } catch (err) {
                    toast.error('Invalid password')
                  }
                }}
                className="flex-1 px-4 py-2 bg-error text-white rounded-lg hover:opacity-90 transition"
              >
                Disable 2FA
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg p-6 rounded-2xl max-w-md w-full"
            style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)' }}
          >
            <h3 className="text-xl font-semibold mb-4">Backup Codes</h3>
            
            <p className="text-text-muted mb-4">
              Use these codes to access your account if you lose your authenticator device:
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm bg-dark-bg p-3 rounded text-center font-mono">{code}</code>
              ))}
            </div>
            
            <p className="text-sm text-warning mb-4">
              ⚠️ Each code can only be used once. Store them in a safe place.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await authAPI.regenerateBackupCodes()
                    setBackupCodes(response.data.backup_codes)
                    toast.success('New backup codes generated')
                  } catch (err) {
                    toast.error('Failed to regenerate codes')
                  }
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
              <button
                onClick={() => {
                  const codesText = backupCodes.join('\n')
                  navigator.clipboard.writeText(codesText)
                  toast.success('Codes copied to clipboard')
                }}
                className="flex-1 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy All
              </button>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
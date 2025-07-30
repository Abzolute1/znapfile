import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, FolderOpen, Share2, Upload, Search, Filter,
  Grid, List, Download, Trash2, Plus, ArrowLeft
} from 'lucide-react'
import useStore from '../store/useStore'
import { filesAPI, collectionsAPI, plansAPI } from '../services/api'
import FileManager from '../components/FileManager'
import CollectionManager from '../components/CollectionManager'
import FileUploader from '../components/FileUploader'
import { useToastContext } from '../contexts/ToastContext'

const DashboardPageNew = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToastContext()
  const user = useStore(state => state.user)
  
  // Get initial tab from query params or default to 'files'
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') || 'files'
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showUploader, setShowUploader] = useState(false)
  const [stats, setStats] = useState({
    filesCount: 0,
    collectionsCount: 0,
    storageUsed: 0,
    monthlyTransfer: 0
  })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Update tab based on URL
    const tab = searchParams.get('tab') || 'files'
    setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [filesRes, collectionsRes, planRes] = await Promise.all([
        filesAPI.listFiles(),
        collectionsAPI.list(),
        plansAPI.getCurrentPlan()
      ])

      setStats({
        filesCount: filesRes.data.files?.length || 0,
        collectionsCount: collectionsRes.data.length || 0,
        storageUsed: planRes.data.usage?.active_storage_used || 0,
        monthlyTransfer: planRes.data.usage?.monthly_transfer_used || 0
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    navigate(`/dashboard?tab=${tab}`)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    loadStats()
  }

  const tabs = [
    { 
      id: 'files', 
      label: 'My Files', 
      icon: FileText, 
      count: stats.filesCount,
      description: 'Your uploaded files'
    },
    { 
      id: 'collections', 
      label: 'Collections', 
      icon: FolderOpen, 
      count: stats.collectionsCount,
      description: 'Organized file groups'
    }
  ]

  const activeTabData = tabs.find(tab => tab.id === activeTab)

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
              <div>
                <h1 className="text-xl font-bold">File Manager</h1>
                <p className="text-sm text-text-muted">{activeTabData?.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-4 px-1 border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text hover:border-border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-white/10 text-text-muted'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'files' && (
              <FileManager 
                refreshKey={refreshKey}
                onRefresh={handleRefresh}
              />
            )}
            
            {activeTab === 'collections' && (
              <CollectionManager 
                refreshKey={refreshKey}
                onRefresh={handleRefresh}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
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
              style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)' }}
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
                  handleRefresh()
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardPageNew
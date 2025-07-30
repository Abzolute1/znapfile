import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, List, Upload, Folder, Clock, Download,
  HardDrive, FileText, Settings, Plus, Search, Filter,
  Globe, Lock, X, Home, Cloud, Trash2, Copy, Check, Share2, Eye
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import FileUploader from '../components/FileUploader'
import CollectionManager from '../components/CollectionManager'
import FileMetadataEditor from '../components/FileMetadataEditor'
import EmailVerificationBanner from '../components/EmailVerificationBanner'
import AnimatedButton from '../components/AnimatedButton'
import LoadingSpinner from '../components/LoadingSpinner'
import Link from '../components/Link'
import AddToCollectionModal from '../components/AddToCollectionModal'
import ShareModal from '../components/ShareModal'
import FilePreviewModal from '../components/FilePreviewModal'
import { filesAPI, plansAPI } from '../services/api'
import { formatBytes, formatTimeRemaining } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'
import ZnapfileLogo from '../components/ZnapfileLogo'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('files')
  const [viewMode, setViewMode] = useState('grid')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showUploader, setShowUploader] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterExpired, setFilterExpired] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalDownloads: 0,
    activeLinks: 0,
    storageLimit: 0
  })
  const [planInfo, setPlanInfo] = useState(null)
  const [showEmailBanner, setShowEmailBanner] = useState(true)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedFileForCollection, setSelectedFileForCollection] = useState(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedFileForShare, setSelectedFileForShare] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null)
  
  const user = useStore(state => state.user)
  const toast = useToastContext()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadFiles()
    loadPlanInfo()
  }, [user, navigate])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const response = await filesAPI.listFiles()
      setFiles(response.data.files)
      
      // Calculate stats
      const stats = response.data.files.reduce((acc, file) => ({
        totalFiles: acc.totalFiles + 1,
        totalSize: acc.totalSize + file.file_size,
        totalDownloads: acc.totalDownloads + file.download_count,
        activeLinks: acc.activeLinks + (new Date(file.expires_at) > new Date() ? 1 : 0)
      }), {
        totalFiles: 0,
        totalSize: 0,
        totalDownloads: 0,
        activeLinks: 0,
        storageLimit: response.data.storage_limit
      })
      
      stats.storageLimit = response.data.storage_limit
      setStats(stats)
    } catch (err) {
      console.error('Failed to load files:', err)
      toast.error('Failed to load files. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadPlanInfo = async () => {
    try {
      const response = await plansAPI.getCurrentPlan()
      setPlanInfo(response.data)
    } catch (err) {
      console.error('Failed to load plan info:', err)
    }
  }

  const handleDeleteExpiredFiles = async () => {
    if (!confirm('Are you sure you want to delete all expired files? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await filesAPI.deleteExpiredFiles()
      const { deleted_count, message } = response.data
      
      if (deleted_count > 0) {
        toast.success(message)
        // Reload files to update the list
        await loadFiles()
      } else {
        toast.info('No expired files found to delete')
      }
    } catch (err) {
      console.error('Failed to delete expired files:', err)
      toast.error('Failed to delete expired files. Please try again.')
    }
  }

  const handleFileAction = async (action, file) => {
    switch (action) {
      case 'edit':
        setSelectedFile(file)
        break
      case 'delete':
        if (confirm('Are you sure you want to delete this file?')) {
          try {
            await filesAPI.deleteFile(file.id)
            toast.success('File deleted successfully')
            loadFiles()
          } catch (err) {
            console.error('Failed to delete file:', err)
            toast.error('Failed to delete file')
          }
        }
        break
      case 'download':
        window.open(`${window.location.origin}/d/${file.short_code}`, '_blank')
        break
      case 'share':
        setSelectedFileForShare(file)
        setShowShareModal(true)
        break
      case 'preview':
        setSelectedFileForPreview(file)
        setShowPreviewModal(true)
        break
      case 'addToCollection':
        setSelectedFileForCollection(file)
        setShowCollectionModal(true)
        break
    }
  }

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
    const isExpired = new Date(file.expires_at) < new Date()
    return matchesSearch && (!filterExpired || !isExpired)
  })

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass-card p-6 rounded-xl border border-gray-800 hover:border-primary/50 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}/10`}>
          <Icon className={`w-6 h-6 text-${color}`} />
        </div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-text-muted">{label}</p>
    </motion.div>
  )

  const FileCard = ({ file }) => {
    const isExpired = new Date(file.expires_at) < new Date()
    
    return (
      <motion.div
        whileHover={{ y: -5 }}
        className={`glass-card p-6 rounded-xl border border-gray-800 hover:border-primary/50 transition-all ${
          isExpired ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <FileText className={`w-8 h-8 ${isExpired ? 'text-text-muted' : 'text-primary'}`} />
          <div className="flex gap-2">
            {file.is_public && <Globe className="w-4 h-4 text-accent" />}
            {file.has_password && <Lock className="w-4 h-4 text-secondary" />}
          </div>
        </div>
        
        <h3 className="font-medium mb-2 truncate cursor-pointer hover:text-primary transition" onClick={() => !isExpired && handleFileAction('preview', file)}>{file.original_filename}</h3>
        
        {file.description && (
          <p className="text-sm text-text-muted line-clamp-2 mb-4">
            {file.description}
          </p>
        )}
        
        <div className="space-y-2 text-xs text-text-muted">
          <div className="flex justify-between">
            <span>{formatBytes(file.file_size)}</span>
            <span>{file.download_count} downloads</span>
          </div>
          <div className="flex justify-between">
            <span className={isExpired ? 'text-error' : ''}>
              {isExpired ? 'Expired' : formatTimeRemaining(file.expires_at)}
            </span>
            <span>v{file.version}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {!isExpired && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFileAction('preview', file)
                }}
                className="flex-1 py-2 bg-dark-bg rounded-lg hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFileAction('share', file)
                }}
                className="flex-1 py-2 bg-dark-bg rounded-lg hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFileAction('addToCollection', file)
                }}
                className="p-2 bg-dark-bg rounded-lg hover:bg-primary/20 hover:text-primary transition"
                title="Add to collection"
              >
                <Folder className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleFileAction('delete', file)
            }}
            className={`p-2 bg-dark-bg rounded-lg hover:bg-error/20 hover:text-error transition ${isExpired ? 'flex-1' : ''}`}
            title={isExpired ? 'Delete expired file' : 'Delete file'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg">
      {/* Email Verification Banner - Don't show for superusers */}
      {user && !user.email_verified && !user.is_superuser && showEmailBanner && (
        <EmailVerificationBanner
          email={user.email}
          isVerified={user.email_verified}
          onClose={() => setShowEmailBanner(false)}
        />
      )}
      

      {/* Header */}
      <header className="border-b border-gray-800 bg-dark-bg/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <ZnapfileLogo onClick={() => navigate('/')} />
              <nav className="hidden md:flex items-center gap-4">
                <Link to="/" className="text-sm text-text-muted hover:text-text transition">
                  <Home className="w-4 h-4" />
                </Link>
                <button className="text-sm text-text-muted hover:text-text transition">
                  <Settings className="w-4 h-4" />
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm text-text-muted">{user?.username || user?.email}</span>
                {planInfo && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    planInfo.plan.id === 'max' ? 'bg-orange-500/20 text-orange-400' :
                    planInfo.plan.id === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {planInfo.plan.name} Plan
                  </span>
                )}
              </div>
              <AnimatedButton
                onClick={() => setShowUploader(true)}
                variant="primary"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </AnimatedButton>
              <button
                onClick={() => {
                  useStore.getState().clearAuth()
                  navigate('/')
                }}
                className="text-sm text-text-muted hover:text-text transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            label="Total Files"
            value={stats.totalFiles}
            color="primary"
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={formatBytes(stats.totalSize)}
            color="secondary"
          />
          <StatCard
            icon={Download}
            label="Total Downloads"
            value={stats.totalDownloads}
            color="accent"
          />
          <StatCard
            icon={Clock}
            label="Active Links"
            value={stats.activeLinks}
            color="primary"
          />
        </div>

        {/* Storage Bar */}
        {planInfo && (
          <div className="glass-card p-4 rounded-xl mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-medium mb-1">Plan Usage</h3>
                <p className="text-sm text-text-muted">
                  {planInfo.plan.name} Plan
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Monthly Transfer */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Monthly Transfer</span>
                  <span className="font-medium">
                    {formatBytes(planInfo.usage.monthly_transfer_used)} / {formatBytes(planInfo.usage.monthly_transfer_limit)}
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(planInfo.usage.monthly_transfer_used / planInfo.usage.monthly_transfer_limit) * 100}%` }}
                    className={`h-full ${
                      (planInfo.usage.monthly_transfer_used / planInfo.usage.monthly_transfer_limit) > 0.8 ? 'bg-error' : 
                      (planInfo.usage.monthly_transfer_used / planInfo.usage.monthly_transfer_limit) > 0.6 ? 'bg-yellow-500' : 
                      'bg-primary'
                    }`}
                  />
                </div>
              </div>
              
              {/* Daily Transfers for Free Plan */}
              {planInfo.limits.daily_transfer_limit && (
                <div className="text-sm text-text-muted">
                  Daily transfers: {planInfo.usage.daily_transfers_used} / {planInfo.limits.daily_transfer_limit}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 p-1 bg-card-bg rounded-lg">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'files' 
                  ? 'bg-primary text-white' 
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'collections' 
                  ? 'bg-primary text-white' 
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Collections
            </button>
          </div>
          
          {activeTab === 'files' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-card-bg border border-gray-700 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <button
                onClick={() => setFilterExpired(!filterExpired)}
                className={`p-2 rounded-lg transition-colors ${
                  filterExpired ? 'bg-primary text-white' : 'bg-card-bg text-text-muted hover:text-text'
                }`}
                title="Filter expired files"
              >
                <Filter className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteExpiredFiles}
                className="p-2 rounded-lg bg-card-bg text-text-muted hover:text-error hover:bg-error/10 transition-all"
                title="Delete all expired files"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex gap-1 p-1 bg-card-bg rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          ) : activeTab === 'files' ? (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFiles.map(file => (
                    <FileCard key={file.id} file={file} />
                  ))}
                  
                  {filteredFiles.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
                      <p className="text-text-muted mb-4">
                        {searchTerm ? 'No files found' : 'No files uploaded yet'}
                      </p>
                      {!searchTerm && (
                        <AnimatedButton
                          onClick={() => setShowUploader(true)}
                          variant="primary"
                        >
                          Upload Your First File
                        </AnimatedButton>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-card-bg/50 border-b border-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Downloads
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredFiles.map(file => {
                        const isExpired = new Date(file.expires_at) < new Date()
                        return (
                          <tr key={file.id} className={`hover:bg-card-bg/30 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium truncate max-w-xs">
                                    {file.original_filename}
                                  </p>
                                  {file.description && (
                                    <p className="text-xs text-text-muted truncate max-w-xs">
                                      {file.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                              {formatBytes(file.file_size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                              {file.download_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={isExpired ? 'text-error' : 'text-text-muted'}>
                                {isExpired ? 'Expired' : formatTimeRemaining(file.expires_at)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center gap-2 justify-end">
                                {!isExpired && (
                                  <>
                                    <button
                                      onClick={() => handleFileAction('preview', file)}
                                      className="text-text-muted hover:text-primary transition-colors"
                                      title="Preview file"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleFileAction('share', file)}
                                      className="text-text-muted hover:text-primary transition-colors"
                                      title="Share file"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleFileAction('edit', file)}
                                      className="text-text-muted hover:text-primary transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleFileAction('delete', file)}
                                  className="text-text-muted hover:text-error transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="collections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CollectionManager onFileSelect={setSelectedFile} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploader(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-6 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold gradient-text">Upload Files</h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="p-2 hover:bg-card-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <FileUploader
                onUploadComplete={() => {
                  setShowUploader(false)
                  loadFiles()
                }}
              />
            </motion.div>
          </motion.div>
        )}
        
        {selectedFile && (
          <FileMetadataEditor
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onSave={() => {
              toast.success('File details updated successfully')
              loadFiles()
              setSelectedFile(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        file={selectedFileForCollection}
        isOpen={showCollectionModal}
        onClose={() => {
          setShowCollectionModal(false)
          setSelectedFileForCollection(null)
        }}
      />

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false)
            setSelectedFileForShare(null)
          }}
          file={selectedFileForShare}
        />
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        file={selectedFileForPreview}
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setSelectedFileForPreview(null)
        }}
        onDownload={(file) => window.open(`${window.location.origin}/d/${file.short_code}`, '_blank')}
        onShare={(file) => {
          setShowPreviewModal(false)
          setSelectedFileForShare(file)
          setShowShareModal(true)
        }}
        allFiles={filteredFiles}
        currentIndex={filteredFiles.findIndex(f => f.id === selectedFileForPreview?.id) || 0}
      />
    </div>
  )
}

export default DashboardPage
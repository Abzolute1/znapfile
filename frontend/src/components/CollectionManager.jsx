import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Folder, Lock, Globe, Edit3, Trash2, Share2,
  Eye, EyeOff, X, Check, FileText, Package, Users,
  FolderPlus, Copy, ExternalLink, Download, Clock
} from 'lucide-react'
import { collectionsAPI } from '../services/api'
import api from '../services/api'
import AnimatedButton from './AnimatedButton'
import LoadingSpinner from './LoadingSpinner'
import CollectionFileTree from './CollectionFileTree'
import ProfessionalCollectionView from './ProfessionalCollectionView'
import ReactMarkdown from 'react-markdown'
import { useToastContext } from '../contexts/ToastContext'
import AddFilesToCollectionModal from './AddFilesToCollectionModal'
import FileUploader from './FileUploader'
import ShareModal from './ShareModal'

const CollectionManager = ({ onFileSelect }) => {
  const toast = useToastContext()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [showAddFilesModal, setShowAddFilesModal] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [useProfessionalView, setUseProfessionalView] = useState(true)

  const iconMap = {
    folder: '📁',
    code: '💻',
    document: '📄',
    media: '🎬',
    archive: '📦'
  }

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      setLoading(true)
      const response = await collectionsAPI.list()
      setCollections(response.data)
    } catch (err) {
      setError('Failed to load collections')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  const loadCollectionDetails = async (slug) => {
    try {
      const response = await collectionsAPI.get(slug)
      console.log('Collection details response:', response.data)
      setSelectedCollection(response.data)
    } catch (err) {
      setError('Failed to load collection details')
      console.error(err)
    }
  }

  const CreateEditModal = ({ collection, onClose, onSave }) => {
    const [formData, setFormData] = useState({
      name: collection?.name || '',
      description: collection?.description || '',
      readme_content: collection?.readme_content || '',
      icon: collection?.icon || 'folder',
      color: collection?.color || '#8B5CF6',
      is_public: collection?.is_public || false,
      password: '',
      allow_delete: collection?.allow_delete || false,
      expires_in_hours: null
    })
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e) => {
      e.preventDefault()
      try {
        if (collection) {
          await collectionsAPI.update(collection.id, formData)
        } else {
          await collectionsAPI.create(formData)
        }
        onSave()
        onClose()
      } catch (err) {
        setError('Failed to save collection')
        console.error(err)
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
            <h2 className="text-2xl font-bold gradient-text">
              {collection ? 'Edit Collection' : 'Create Collection'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-card-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="My Project Files"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                placeholder="Brief description of this collection"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">README (Markdown)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <textarea
                    value={formData.readme_content}
                    onChange={e => setFormData({ ...formData, readme_content: e.target.value })}
                    className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none font-mono text-sm"
                    placeholder="# Project Title&#10;&#10;## Description&#10;Detailed information about your files..."
                    rows={10}
                  />
                </div>
                <div className="bg-card-bg border border-gray-700 rounded-lg p-4 overflow-y-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {formData.readme_content || '*Preview will appear here*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <select
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="folder">📁 Folder</option>
                  <option value="code">💻 Code</option>
                  <option value="document">📄 Document</option>
                  <option value="media">🎬 Media</option>
                  <option value="archive">📦 Archive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 bg-card-bg border border-gray-700 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={e => setFormData({ ...formData, is_public: e.target.checked })}
                  className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
                />
                <span className="text-sm">Make this collection public</span>
                <Globe className="w-4 h-4 text-text-muted" />
              </label>

              {formData.is_public && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password Protection (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-card-bg border border-gray-700 rounded-lg px-4 py-3 pr-10 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Optional password for public access"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {formData.is_public && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_delete}
                    onChange={e => setFormData({ ...formData, allow_delete: e.target.checked })}
                    className="w-4 h-4 bg-card-bg border-gray-700 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Allow viewers to delete files from collection</span>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Collection Expiry (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.expires_in_hours || ''}
                  onChange={e => setFormData({ ...formData, expires_in_hours: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-32 bg-card-bg border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="24"
                  min="1"
                  max="720"
                />
                <span className="text-sm text-text-muted">hours (max 30 days)</span>
                <Clock className="w-4 h-4 text-text-muted ml-2" />
              </div>
              {formData.expires_in_hours && (
                <p className="text-xs text-text-muted mt-2">
                  Collection will expire on {new Date(Date.now() + formData.expires_in_hours * 3600000).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <AnimatedButton
                type="button"
                onClick={onClose}
                variant="secondary"
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                variant="primary"
              >
                {collection ? 'Update' : 'Create'} Collection
              </AnimatedButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    )
  }

  const CollectionCard = ({ collection }) => {
    const [showShareModal, setShowShareModal] = useState(false)
    const shareUrl = `${window.location.origin}/c/${collection.slug}`


    return (
      <>
        <motion.div
          className="glass-card p-6 rounded-xl border border-gray-800 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          onClick={() => loadCollectionDetails(collection.slug)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
              >
                {iconMap[collection.icon] || '📁'}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{collection.name}</h3>
                <p className="text-sm text-text-muted">
                  {collection.file_count} files • {formatBytes(collection.total_size)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {collection.is_public ? (
                <Globe className="w-4 h-4 text-accent" title="Public collection" />
              ) : (
                <Lock className="w-4 h-4 text-text-muted" title="Private collection" />
              )}
              {collection.allow_delete && (
                <Trash2 className="w-4 h-4 text-red-500" title="Viewers can delete files" />
              )}
              <button
                onClick={e => {
                  e.stopPropagation()
                  window.open(`/api/v1/collections/${collection.id}/download-all`, '_blank')
                }}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                title="Download all files"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setShowShareModal(true)
                }}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                title="Share collection"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setEditingCollection(collection)
                  setShowCreateModal(true)
                }}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {collection.description && (
            <p className="text-sm text-text-muted line-clamp-2 mb-4">
              {collection.description}
            </p>
          )}

          {collection.expires_at && (
            <div className="flex items-center gap-2 text-xs text-warning mb-2">
              <Clock className="w-3 h-3" />
              <span>Expires {new Date(collection.expires_at).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{collection.view_count} views</span>
            <span>{collection.download_count} downloads</span>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {showShareModal && (
            <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              collection={collection}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading collections..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Collections</h2>
        <AnimatedButton
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Collection
        </AnimatedButton>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-error/10 border border-error/50 rounded-lg text-error"
        >
          {error}
        </motion.div>
      )}

      {selectedCollection && useProfessionalView ? (
        <ProfessionalCollectionView
          collection={selectedCollection}
          onRefresh={() => loadCollectionDetails(selectedCollection.slug)}
          onBack={() => setSelectedCollection(null)}
          isOwner={true}
          collectionPassword={null}
        />
      ) : selectedCollection ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <button
            onClick={() => setSelectedCollection(null)}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            ← Back to collections
          </button>

          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${selectedCollection.color}20`, color: selectedCollection.color }}
                >
                  {iconMap[selectedCollection.icon] || '📁'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{selectedCollection.name}</h1>
                  <p className="text-text-muted">
                    {selectedCollection.file_count} files • {formatBytes(selectedCollection.total_size)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <AnimatedButton
                  onClick={() => setShowCreateFolder(true)}
                  variant="primary"
                  size="sm"
                  title="Create a new folder"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowUploader(true)}
                  variant="primary"
                  size="sm"
                  title="Upload new files from your computer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Files
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => {
                    console.log('Add Existing clicked, collection:', selectedCollection)
                    setShowAddFilesModal(true)
                  }}
                  variant="secondary"
                  size="sm"
                  title="Add existing files from your account"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Add Existing
                </AnimatedButton>
                <AnimatedButton 
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/c/${selectedCollection.slug}`
                    navigator.clipboard.writeText(shareUrl)
                    toast.success('Collection link copied to clipboard!')
                  }}
                  variant="secondary" 
                  size="sm"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </AnimatedButton>
                <AnimatedButton variant="secondary" size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  Download All
                </AnimatedButton>
              </div>
            </div>

            {selectedCollection.readme_content && (
              <div className="prose prose-invert max-w-none mb-6">
                <ReactMarkdown>{selectedCollection.readme_content}</ReactMarkdown>
              </div>
            )}

            <div className="border-t border-gray-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Files</h3>
                  {/* Breadcrumb navigation */}
                  {currentPath && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-text-muted">/</span>
                      <button
                        onClick={() => setCurrentPath('')}
                        className="text-primary hover:underline"
                      >
                        root
                      </button>
                      {currentPath.split('/').filter(Boolean).map((part, index, parts) => (
                        <div key={index} className="flex items-center gap-1">
                          <span className="text-text-muted">/</span>
                          <button
                            onClick={() => {
                              const newPath = parts.slice(0, index + 1).join('/')
                              setCurrentPath(newPath)
                            }}
                            className={`hover:underline ${
                              index === parts.length - 1 ? 'text-text font-medium' : 'text-primary'
                            }`}
                          >
                            {part}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {selectedCollection.file_tree ? (
                <CollectionFileTree
                  fileTree={selectedCollection.file_tree}
                  currentPath={currentPath}
                  onFolderNavigate={(folderPath) => setCurrentPath(folderPath)}
                  onFileDownload={(file) => {
                    if (file.short_code) {
                      window.open(`/api/v1/download/${file.short_code}`, '_blank')
                    }
                  }}
                  onFilePreview={(file) => console.log('Preview:', file)}
                />
              ) : (
                <p className="text-text-muted">No files in this collection yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(collection => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
          
          {collections.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12"
            >
              <Folder className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
              <p className="text-text-muted mb-4">No collections yet</p>
              <AnimatedButton
                onClick={() => setShowCreateModal(true)}
                variant="primary"
              >
                Create Your First Collection
              </AnimatedButton>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {(showCreateModal || editingCollection) && (
          <CreateEditModal
            collection={editingCollection}
            onClose={() => {
              setShowCreateModal(false)
              setEditingCollection(null)
            }}
            onSave={() => {
              loadCollections()
              if (selectedCollection) {
                loadCollectionDetails(selectedCollection.slug)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Add Files to Collection Modal */}
      {selectedCollection && (
        <AddFilesToCollectionModal
          collection={selectedCollection}
          isOpen={showAddFilesModal}
          onClose={() => setShowAddFilesModal(false)}
          onFilesAdded={() => {
            loadCollectionDetails(selectedCollection.slug)
            setShowAddFilesModal(false)
          }}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && selectedCollection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateFolder(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-card p-6 rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Folder</h2>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full px-4 py-2 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
              
              {currentPath && (
                <div className="text-sm text-text-muted">
                  <span className="font-medium">Location:</span> /{currentPath}
                </div>
              )}
              
              <div className="flex gap-2">
                <AnimatedButton
                  onClick={() => {
                    setShowCreateFolder(false)
                    setNewFolderName('')
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  onClick={async () => {
                    if (newFolderName.trim()) {
                      try {
                        // Call API to create folder
                        await collectionsAPI.createFolder(selectedCollection.id, {
                          path: currentPath || '',
                          name: newFolderName
                        })
                        
                        const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName
                        toast.success(`Folder "${newFolderName}" created at /${folderPath}`)
                        setShowCreateFolder(false)
                        setNewFolderName('')
                        // Reload collection to show new folder
                        loadCollectionDetails(selectedCollection.slug)
                      } catch (err) {
                        console.error('Failed to create folder:', err)
                        toast.error('Failed to create folder')
                      }
                    }
                  }}
                  variant="primary"
                  className="flex-1"
                  disabled={!newFolderName.trim()}
                >
                  Create Folder
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* File Uploader Modal */}
      {showUploader && selectedCollection && (
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
            className="glass-card p-6 rounded-xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Files to {selectedCollection.name}</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <FileUploader
              collection={selectedCollection}
              currentPath={currentPath}
              onSuccess={async (uploadedFile) => {
                try {
                  // Add the uploaded file to the collection at current path
                  const filePath = currentPath || ''
                    
                  await collectionsAPI.addFiles(selectedCollection.id, {
                    file_ids: [uploadedFile.id],
                    paths: { [uploadedFile.id]: filePath }
                  })
                  toast.success(`File added to collection${currentPath ? ` in /${currentPath}` : ''}`)
                  loadCollectionDetails(selectedCollection.slug)
                  setShowUploader(false)
                } catch (err) {
                  console.error('Failed to add file to collection:', err)
                  toast.error('Failed to add file to collection')
                }
              }}
            />
          </motion.div>
        </motion.div>
      )}

    </div>
  )
}

// Format bytes helper
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default CollectionManager
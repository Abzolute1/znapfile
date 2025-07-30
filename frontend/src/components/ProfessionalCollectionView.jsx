import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderPlus, File, Upload, Download, Trash2, 
  Edit3, ChevronRight, Grid, List, Search, ArrowLeft,
  FileText, Image, Video, Music, Archive, Code, Home,
  MoreVertical, Eye, Share2, Move, Copy, Plus, X
} from 'lucide-react'
import AnimatedButton from './AnimatedButton'
import { formatBytes, formatTimeAgo } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'
import { collectionsAPI } from '../services/api'
import FileUploader from './FileUploader'
import AddFilesToCollectionModal from './AddFilesToCollectionModal'

const ProfessionalCollectionView = ({ 
  collection, 
  onRefresh,
  onBack,
  isOwner = false,
  collectionPassword = null
}) => {
  const [currentPath, setCurrentPath] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAddExistingModal, setShowAddExistingModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [sortBy, setSortBy] = useState('name')
  
  const toast = useToastContext()

  // Parse file tree to get current location content
  const getCurrentContent = () => {
    if (!collection.file_tree) return { folders: {}, files: [] }
    
    let current = collection.file_tree
    for (const folder of currentPath) {
      if (current.folders && current.folders[folder]) {
        current = current.folders[folder]
      } else {
        return { folders: {}, files: [] }
      }
    }
    return current
  }

  const navigateToFolder = (folderName) => {
    setCurrentPath([...currentPath, folderName])
    setSelectedItems(new Set())
  }

  const navigateUp = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1))
      setSelectedItems(new Set())
    }
  }

  const navigateToPath = (index) => {
    setCurrentPath(currentPath.slice(0, index + 1))
    setSelectedItems(new Set())
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    try {
      await collectionsAPI.createFolder(collection.id, {
        path: currentPath.join('/'),
        name: newFolderName
      })
      
      toast.success(`Created folder "${newFolderName}"`)
      setShowNewFolderModal(false)
      setNewFolderName('')
      onRefresh()
    } catch (err) {
      console.error('Failed to create folder:', err)
      toast.error(err.response?.data?.detail || 'Failed to create folder')
    }
  }

  const handleFileDownload = (file) => {
    if (file.short_code) {
      window.open(`/api/v1/download/${file.short_code}`, '_blank')
    }
  }

  const handleBulkDownload = () => {
    // Download selected items
    selectedItems.forEach(itemId => {
      const file = currentContent.files.find(f => f.id === itemId)
      if (file) handleFileDownload(file)
    })
  }

  const handleDelete = async () => {
    if (!selectedItems.size) return
    
    // Check if user can delete
    const canDelete = isOwner || collection.allow_delete
    
    if (!canDelete) {
      toast.error('You do not have permission to delete files from this collection')
      return
    }
    
    if (confirm(`Delete ${selectedItems.size} items from this collection?`)) {
      try {
        // Delete each selected file
        const deletePromises = Array.from(selectedItems).map(fileId => {
          const file = currentContent.files.find(f => f.id === fileId)
          if (file) {
            // For non-owners, include password if collection has one
            return collectionsAPI.removeFile(
              collection.id, 
              fileId,
              (!isOwner && collection.has_password) ? collectionPassword : undefined
            )
          }
        }).filter(Boolean)
        
        await Promise.all(deletePromises)
        
        toast.success(`Removed ${selectedItems.size} files from collection`)
        setSelectedItems(new Set())
        onRefresh()
      } catch (err) {
        console.error('Failed to delete files:', err)
        toast.error(err.response?.data?.detail || 'Failed to delete files')
      }
    }
  }

  const getFileIcon = (file) => {
    const mime = file.type || ''
    if (mime.startsWith('image/')) return Image
    if (mime.startsWith('video/')) return Video
    if (mime.startsWith('audio/')) return Music
    if (mime.includes('zip') || mime.includes('rar')) return Archive
    if (mime.includes('javascript') || mime.includes('python')) return Code
    return FileText
  }

  const currentContent = getCurrentContent()
  const folders = Object.entries(currentContent.folders || {})
  const files = currentContent.files || []

  // Apply search filter
  const filteredFolders = folders.filter(([name]) => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort items
  const sortItems = (items, isFolder = false) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = isFolder ? a[0] : a.name
        const nameB = isFolder ? b[0] : b.name
        return nameA.localeCompare(nameB)
      }
      if (sortBy === 'size' && !isFolder) {
        return b.size - a.size
      }
      if (sortBy === 'date' && !isFolder) {
        return 0 // No date info in current structure
      }
      return 0
    })
  }

  const sortedFolders = sortItems(filteredFolders, true)
  const sortedFiles = sortItems(filteredFiles)

  const toggleSelection = (itemId) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-primary/10 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
            >
              {collection.icon === 'folder' && '📁'}
              {collection.icon === 'code' && '💻'}
              {collection.icon === 'document' && '📄'}
              {collection.icon === 'media' && '🎬'}
              {collection.icon === 'archive' && '📦'}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              <p className="text-sm text-text-muted">
                {collection.file_count} files • {formatBytes(collection.total_size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <AnimatedButton
                  onClick={() => setShowNewFolderModal(true)}
                  variant="secondary"
                  size="sm"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </AnimatedButton>
                
                <AnimatedButton
                  onClick={() => setShowUploadModal(true)}
                  variant="primary"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </AnimatedButton>
                
                <AnimatedButton
                  onClick={() => setShowAddExistingModal(true)}
                  variant="secondary"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Existing
                </AnimatedButton>
              </>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {currentPath.length > 0 && (
            <button
              onClick={navigateUp}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setCurrentPath([])}
            className="flex items-center gap-1 hover:text-primary transition"
          >
            <Home className="w-4 h-4" />
            <span>Collection</span>
          </button>
          
          {currentPath.map((folder, index) => (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-text-muted" />
              <button
                onClick={() => navigateToPath(index)}
                className="hover:text-primary transition"
              >
                {folder}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card border-b border-border p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 bg-dark-bg rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-dark-bg rounded-lg border border-border text-sm"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="date">Date</option>
          </select>

          <div className="flex items-center gap-1 bg-dark-bg rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
              <span className="text-sm text-text-muted">
                {selectedItems.size} selected
              </span>
              <button
                onClick={handleBulkDownload}
                className="p-2 hover:bg-primary/10 rounded transition"
                title="Download selected"
              >
                <Download className="w-4 h-4" />
              </button>
              {(isOwner || collection.allow_delete) && (
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-error/10 rounded transition"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {sortedFolders.length === 0 && sortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
            <p className="text-text-muted mb-4">
              {searchTerm ? 'No items found' : 'This folder is empty'}
            </p>
            {!searchTerm && (
              <div className="flex items-center gap-2 justify-center">
                <AnimatedButton
                  onClick={() => setShowNewFolderModal(true)}
                  variant="secondary"
                  size="sm"
                >
                  Create Folder
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowUploadModal(true)}
                  variant="primary"
                  size="sm"
                >
                  Upload Files
                </AnimatedButton>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedFolders.map(([name, content]) => (
              <motion.div
                key={name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative"
              >
                <div
                  className="flex flex-col items-center p-4 rounded-xl glass-card border border-border hover:border-primary/50 cursor-pointer transition-all"
                  onClick={() => navigateToFolder(name)}
                >
                  <Folder className="w-12 h-12 text-primary mb-2" />
                  <p className="text-sm font-medium text-center truncate w-full">
                    {name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {Object.keys(content.folders || {}).length} folders • {(content.files || []).length} files
                  </p>
                </div>
              </motion.div>
            ))}

            {sortedFiles.map((file) => {
              const Icon = getFileIcon(file)
              const isSelected = selectedItems.has(file.id)
              
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative"
                >
                  <div
                    className={`
                      flex flex-col items-center p-4 rounded-xl glass-card border cursor-pointer transition-all
                      ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                    `}
                    onClick={() => toggleSelection(file.id)}
                  >
                    <Icon className="w-12 h-12 text-text-muted mb-2" />
                    <p className="text-sm font-medium text-center truncate w-full">
                      {file.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFileDownload(file)
                      }}
                      className="p-1 bg-dark-bg rounded hover:bg-primary/10 transition"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFolders.map(([name, content]) => (
              <motion.div
                key={name}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-3 rounded-lg glass-card border border-border hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => navigateToFolder(name)}
              >
                <Folder className="w-5 h-5 text-primary" />
                <span className="flex-1 font-medium">{name}</span>
                <span className="text-sm text-text-muted">
                  {Object.keys(content.folders || {}).length} folders • {(content.files || []).length} files
                </span>
              </motion.div>
            ))}

            {sortedFiles.map((file) => {
              const Icon = getFileIcon(file)
              const isSelected = selectedItems.has(file.id)
              
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ x: 2 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg glass-card border cursor-pointer transition-all
                    ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                  `}
                  onClick={() => toggleSelection(file.id)}
                >
                  <Icon className="w-5 h-5 text-text-muted" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatBytes(file.size)} • {file.downloads || 0} downloads
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileDownload(file)
                    }}
                    className="p-2 hover:bg-primary/10 rounded transition"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewFolderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
              
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 bg-dark-bg rounded-lg border border-border focus:border-primary focus:outline-none mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              />
              
              <div className="flex gap-2">
                <AnimatedButton
                  onClick={() => setShowNewFolderModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  onClick={createFolder}
                  variant="primary"
                  className="flex-1"
                  disabled={!newFolderName.trim()}
                >
                  Create
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="glass-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Files</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <FileUploader
              collection={collection}
              currentPath={currentPath.join('/')}
              onSuccess={async (uploadedFile) => {
                try {
                  await collectionsAPI.addFiles(collection.id, {
                    file_ids: [uploadedFile.id],
                    paths: { [uploadedFile.id]: currentPath.join('/') }
                  })
                  toast.success('File uploaded successfully')
                  onRefresh()
                  setShowUploadModal(false)
                } catch (err) {
                  toast.error('Failed to add file to collection')
                }
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Add Existing Files Modal */}
      {showAddExistingModal && (
        <AddFilesToCollectionModal
          collection={collection}
          isOpen={showAddExistingModal}
          onClose={() => setShowAddExistingModal(false)}
          onFilesAdded={() => {
            onRefresh()
            setShowAddExistingModal(false)
          }}
        />
      )}
    </div>
  )
}

export default ProfessionalCollectionView
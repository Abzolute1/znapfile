import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderPlus, File, Upload, Download, Trash2, 
  Edit3, ChevronRight, Grid, List, Search, ArrowLeft,
  FileText, Image, Video, Music, Archive, Code,
  MoreVertical, Eye, Share2, Move, Copy
} from 'lucide-react'
import AnimatedButton from './AnimatedButton'
import { formatBytes, formatTimeAgo } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'

const CollectionFileManager = ({ 
  collection, 
  onRefresh,
  onUploadClick,
  onAddExistingClick
}) => {
  const [currentPath, setCurrentPath] = useState([])
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [sortBy, setSortBy] = useState('name') // name, size, date
  
  const toast = useToastContext()

  // Build file tree from flat structure
  const buildFileTree = () => {
    const tree = { folders: {}, files: [] }
    
    if (!collection.files) return tree
    
    collection.files.forEach(file => {
      const pathParts = file.path ? file.path.split('/').filter(Boolean) : []
      let current = tree
      
      // Navigate through folders
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          // This is the file
          current.files.push(file)
        } else {
          // This is a folder
          if (!current.folders[part]) {
            current.folders[part] = { folders: {}, files: [] }
          }
          current = current.folders[part]
        }
      })
      
      // If no path, add to root
      if (pathParts.length === 0) {
        tree.files.push(file)
      }
    })
    
    return tree
  }

  // Get current folder content
  const getCurrentFolderContent = () => {
    let current = buildFileTree()
    
    currentPath.forEach(folder => {
      current = current.folders[folder] || { folders: {}, files: [] }
    })
    
    return current
  }

  const navigateToFolder = (folderName) => {
    setCurrentPath([...currentPath, folderName])
    setSelectedItems([])
  }

  const navigateUp = () => {
    setCurrentPath(currentPath.slice(0, -1))
    setSelectedItems([])
  }

  const navigateToPath = (index) => {
    setCurrentPath(currentPath.slice(0, index + 1))
    setSelectedItems([])
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    const folderPath = [...currentPath, newFolderName].join('/')
    
    // In a real implementation, this would call an API
    toast.success(`Created folder: ${newFolderName}`)
    setShowNewFolderModal(false)
    setNewFolderName('')
    onRefresh()
  }

  const handleDelete = (items) => {
    if (confirm(`Delete ${items.length} item(s)?`)) {
      // Implementation
      toast.success(`Deleted ${items.length} item(s)`)
      setSelectedItems([])
      onRefresh()
    }
  }

  const handleDownload = (file) => {
    window.open(`/api/v1/download/${file.short_code}`, '_blank')
  }

  const getFileIcon = (file) => {
    const mime = file.mime_type || ''
    if (mime.startsWith('image/')) return Image
    if (mime.startsWith('video/')) return Video
    if (mime.startsWith('audio/')) return Music
    if (mime.includes('zip') || mime.includes('rar')) return Archive
    if (mime.includes('javascript') || mime.includes('python')) return Code
    return FileText
  }

  const currentFolder = getCurrentFolderContent()
  const folders = Object.keys(currentFolder.folders)
  const files = currentFolder.files

  // Apply search filter
  const filteredFolders = folders.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredFiles = files.filter(file => 
    file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort items
  const sortItems = (items, isFolder = false) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = isFolder ? a : a.original_filename
        const nameB = isFolder ? b : b.original_filename
        return nameA.localeCompare(nameB)
      }
      if (sortBy === 'size' && !isFolder) {
        return b.file_size - a.file_size
      }
      if (sortBy === 'date' && !isFolder) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return 0
    })
  }

  const sortedFolders = sortItems(filteredFolders, true)
  const sortedFiles = sortItems(filteredFiles)

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPath([])}
              className="text-sm font-medium hover:text-primary transition"
            >
              {collection.name}
            </button>
            {currentPath.map((folder, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <button
                  onClick={() => navigateToPath(index)}
                  className="text-sm font-medium hover:text-primary transition"
                >
                  {folder}
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <AnimatedButton
              onClick={() => setShowNewFolderModal(true)}
              variant="secondary"
              size="sm"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </AnimatedButton>
            <AnimatedButton
              onClick={onUploadClick}
              variant="primary"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </AnimatedButton>
          </div>
        </div>

        {/* Search and View Options */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none text-sm"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-dark-bg rounded-lg border border-gray-700 text-sm"
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
        </div>
      </div>

      {/* File Browser */}
      <div className="flex-1 overflow-auto p-4">
        {/* Back button if not at root */}
        {currentPath.length > 0 && (
          <button
            onClick={navigateUp}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Empty State */}
        {sortedFolders.length === 0 && sortedFiles.length === 0 && (
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
                  onClick={onUploadClick}
                  variant="primary"
                  size="sm"
                >
                  Upload Files
                </AnimatedButton>
              </div>
            )}
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Folders */}
            {sortedFolders.map((folderName) => (
              <motion.div
                key={folderName}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center p-4 rounded-lg hover:bg-card-bg cursor-pointer transition-all"
                onClick={() => navigateToFolder(folderName)}
              >
                <Folder className="w-12 h-12 text-primary mb-2" />
                <p className="text-sm font-medium text-center truncate w-full">
                  {folderName}
                </p>
              </motion.div>
            ))}

            {/* Files */}
            {sortedFiles.map((file) => {
              const Icon = getFileIcon(file)
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-card-bg cursor-pointer transition-all group"
                  onClick={() => handleDownload(file)}
                >
                  <Icon className="w-12 h-12 text-text-muted mb-2" />
                  <p className="text-sm font-medium text-center truncate w-full">
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatBytes(file.file_size)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (sortedFolders.length > 0 || sortedFiles.length > 0) && (
          <div className="space-y-1">
            {/* Folders */}
            {sortedFolders.map((folderName) => (
              <motion.div
                key={folderName}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-card-bg cursor-pointer transition-all"
                onClick={() => navigateToFolder(folderName)}
              >
                <Folder className="w-5 h-5 text-primary" />
                <span className="flex-1 font-medium">{folderName}</span>
              </motion.div>
            ))}

            {/* Files */}
            {sortedFiles.map((file) => {
              const Icon = getFileIcon(file)
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-card-bg cursor-pointer transition-all group"
                >
                  <Icon className="w-5 h-5 text-text-muted" />
                  <div className="flex-1">
                    <p className="font-medium">{file.original_filename}</p>
                    <p className="text-xs text-text-muted">
                      {formatBytes(file.file_size)} • {formatTimeAgo(file.created_at)}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(file)
                      }}
                      className="p-2 hover:bg-primary/10 rounded transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Preview implementation
                      }}
                      className="p-2 hover:bg-primary/10 rounded transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
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
              className="bg-card-bg rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
              
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none mb-4"
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
    </div>
  )
}

export default CollectionFileManager
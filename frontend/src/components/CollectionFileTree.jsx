import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, File, ChevronRight, Download, Eye,
  FileText, Image, Video, Music, Archive, Code, MoreVertical
} from 'lucide-react'
import { formatBytes } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'

const CollectionFileTree = ({ 
  fileTree, 
  onFolderNavigate,
  onFileDownload,
  onFilePreview,
  currentPath = ''
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const toast = useToastContext()

  const getFileIcon = (mimeType) => {
    if (!mimeType) return FileText
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('zip') || mimeType.includes('rar')) return Archive
    if (mimeType.includes('javascript') || mimeType.includes('python')) return Code
    return FileText
  }

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const handleFileDownload = (file) => {
    if (file.short_code) {
      window.open(`/api/v1/download/${file.short_code}`, '_blank')
    } else {
      toast.error('Download link not available')
    }
  }

  const renderFolder = (name, content, path = '') => {
    const fullPath = path ? `${path}/${name}` : name
    const isExpanded = expandedFolders.has(fullPath)
    const hasContent = Object.keys(content.folders).length > 0 || content.files.length > 0

    return (
      <div key={fullPath} className="select-none">
        <motion.div
          whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}
          className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group"
          onClick={() => {
            if (hasContent) {
              toggleFolder(fullPath)
            }
            onFolderNavigate?.(fullPath)
          }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </motion.div>
          
          {isExpanded ? (
            <FolderOpen className="w-5 h-5 text-primary" />
          ) : (
            <Folder className="w-5 h-5 text-primary" />
          )}
          
          <span className="flex-1 font-medium">{name}</span>
          
          <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {Object.keys(content.folders).length} folders, {content.files.length} files
          </span>
        </motion.div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-6 overflow-hidden"
            >
              {/* Render subfolders */}
              {Object.entries(content.folders).map(([subName, subContent]) => 
                renderFolder(subName, subContent, fullPath)
              )}
              
              {/* Render files */}
              {content.files.map((file, index) => renderFile(file, index))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderFile = (file, index) => {
    const Icon = getFileIcon(file.type)
    
    return (
      <motion.div
        key={file.id || index}
        whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}
        className="flex items-center gap-3 py-2 px-3 rounded-lg group cursor-pointer"
        onClick={() => onFilePreview?.(file)}
      >
        <Icon className="w-5 h-5 text-text-muted" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-text-muted">
            {formatBytes(file.size)} • {file.downloads || 0} downloads
          </p>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFilePreview?.(file)
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleFileDownload(file)
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )
  }

  if (!fileTree) {
    return (
      <div className="text-center py-12 text-text-muted">
        <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p>No files in this collection</p>
      </div>
    )
  }

  const hasContent = Object.keys(fileTree.folders || {}).length > 0 || (fileTree.files || []).length > 0

  if (!hasContent) {
    return (
      <div className="text-center py-12 text-text-muted">
        <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p>This collection is empty</p>
        <p className="text-sm mt-2">Start by creating folders or uploading files</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Root level folders */}
      {Object.entries(fileTree.folders || {}).map(([name, content]) => 
        renderFolder(name, content)
      )}
      
      {/* Root level files */}
      {(fileTree.files || []).map((file, index) => renderFile(file, index))}
    </div>
  )
}

export default CollectionFileTree
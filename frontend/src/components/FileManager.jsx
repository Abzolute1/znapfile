import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Image, Film, Music, Archive, Download, 
  Trash2, Link2, Clock, MoreVertical, Search
} from 'lucide-react'
import { filesAPI } from '../services/api'
import { formatBytes, formatTimeAgo, formatTimeRemaining } from '../utils/format'
import { useToastContext } from '../contexts/ToastContext'

const FileManager = ({ refreshKey, onRefresh }) => {
  const toast = useToastContext()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [viewMode, setViewMode] = useState('grid')

  useEffect(() => {
    loadFiles()
  }, [refreshKey])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const response = await filesAPI.listFiles()
      setFiles(response.data.files || [])
    } catch (err) {
      console.error('Failed to load files:', err)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    try {
      await filesAPI.deleteFile(fileId)
      toast.success('File deleted successfully')
      onRefresh()
    } catch (err) {
      toast.error('Failed to delete file')
    }
  }

  const handleCopyLink = (file) => {
    const shareUrl = `${window.location.origin}/d/${file.short_code}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard!')
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return Image
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return Film
    if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return Music
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return Archive
    return FileText
  }

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.original_filename.localeCompare(b.original_filename)
      case 'size':
        return b.file_size - a.file_size
      case 'date':
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 bg-dark-bg rounded-lg border border-border focus:border-primary focus:outline-none"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-dark-bg rounded-lg border border-border"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>

      {/* Files Grid */}
      {sortedFiles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-text-muted mb-2">
            {searchTerm ? 'No files found' : 'No files uploaded yet'}
          </p>
          <p className="text-sm text-text-muted">
            Upload some files to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFiles.map((file) => {
            const FileIcon = getFileIcon(file.original_filename)
            const isExpired = new Date(file.expires_at) < new Date()
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-4 rounded-xl hover:border-primary/50 transition group"
                style={{ 
                  backgroundColor: 'rgba(10, 10, 10, 0.7)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileIcon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleCopyLink(file)}
                      className="p-1.5 hover:bg-white/10 rounded transition"
                      title="Copy link"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-medium truncate mb-1" title={file.original_filename}>
                  {file.original_filename}
                </h3>
                
                <div className="text-xs text-text-muted space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{formatBytes(file.file_size)}</span>
                    <span>{formatTimeAgo(file.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className={isExpired ? 'text-error' : ''}>
                      {isExpired ? 'Expired' : formatTimeRemaining(file.expires_at)}
                    </span>
                  </div>
                  
                  {file.download_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{file.download_count} downloads</span>
                    </div>
                  )}
                  
                  {file.password_protected && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      Password Protected
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FileManager
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Download, Eye, Lock, Globe, FileText, Image, 
  Video, Music, Archive, Code, Folder, File, X
} from 'lucide-react'
import { collectionsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import AnimatedButton from '../components/AnimatedButton'
import { formatBytes } from '../utils/format'
import CollectionFileTree from '../components/CollectionFileTree'
import ReactMarkdown from 'react-markdown'
import FilePreviewModal from '../components/FilePreviewModal'

const CollectionPublicPage = () => {
  const { slug } = useParams()
  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Helper function to extract all files from file tree
  const extractFilesFromTree = (tree) => {
    if (!tree) return []
    const files = []
    
    // Add files at current level
    if (tree.files) {
      files.push(...tree.files)
    }
    
    // Recursively add files from folders
    if (tree.folders) {
      Object.values(tree.folders).forEach(folder => {
        files.push(...extractFilesFromTree(folder))
      })
    }
    
    return files
  }

  useEffect(() => {
    loadCollection()
  }, [slug])

  const loadCollection = async (pwd = null) => {
    try {
      setLoading(true)
      const response = await collectionsAPI.get(slug, pwd)
      setCollection(response.data)
      setAuthenticated(true)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Password required')
        setAuthenticated(false)
      } else {
        setError('Collection not found')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    loadCollection(password)
  }

  const canPreview = (mimeType, filename) => {
    // Check by mime type
    if (mimeType && (
      mimeType.startsWith('image/') || 
      mimeType.startsWith('text/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType.includes('pdf') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml')
    )) {
      return true
    }
    
    // Check by file extension
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase()
      const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sql', 'sh', 'bash', 'ps1', 'yml', 'yaml', 'json', 'xml', 'html', 'css', 'scss', 'sass', 'less', 'md', 'markdown', 'txt', 'log', 'ini', 'conf', 'config']
      return codeExtensions.includes(ext)
    }
    
    return false
  }

  const getPreviewUrl = (file) => {
    // Use the preview endpoint that serves files inline
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    return `${apiUrl}/download/${file.short_code}/preview`
  }

  const downloadAll = () => {
    // Download all files as zip
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    const params = new URLSearchParams()
    if (password) {
      params.append('password', password)
    }
    window.location.href = `${apiUrl}/collections/${collection.id}/download-all?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading collection..." />
      </div>
    )
  }

  if (!authenticated && error === 'Password required') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-2xl max-w-md w-full"
        >
          <div className="text-center mb-6">
            <Lock className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold">Password Protected Collection</h1>
            <p className="text-text-muted mt-2">Enter the password to access this collection</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
                autoFocus
              />
            </div>
            
            <AnimatedButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!password}
            >
              Access Collection
            </AnimatedButton>
          </form>
        </motion.div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-error">Collection not found</h1>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-card-bg">
      <div className="max-w-6xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
              >
                {collection.icon === 'folder' && '📁'}
                {collection.icon === 'code' && '💻'}
                {collection.icon === 'document' && '📄'}
                {collection.icon === 'media' && '🎬'}
                {collection.icon === 'archive' && '📦'}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{collection.name}</h1>
                <p className="text-text-muted mt-1">
                  {collection.file_count} files • {formatBytes(collection.total_size)}
                </p>
                {collection.description && (
                  <p className="text-sm text-text-muted mt-2">{collection.description}</p>
                )}
              </div>
            </div>
            
            <AnimatedButton
              onClick={downloadAll}
              variant="primary"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download All
            </AnimatedButton>
          </div>

          {/* README */}
          {collection.readme_content && (
            <div className="mb-8 p-6 bg-dark-bg rounded-lg">
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{collection.readme_content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Files</h2>
            <div className="bg-dark-bg rounded-lg p-4">
              {collection.file_tree ? (
                <CollectionFileTree
                  fileTree={collection.file_tree}
                  onFileDownload={(file) => {
                    if (file.short_code) {
                      window.open(`/d/${file.short_code}`, '_blank')
                    }
                  }}
                  onFilePreview={(file) => {
                    setSelectedFile(file)
                    setShowPreview(true)
                  }}
                />
              ) : (
                <p className="text-center py-8 text-text-muted">No files in this collection</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Preview Modal */}
      <FilePreviewModal
        file={selectedFile ? {
          ...selectedFile,
          original_filename: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        } : null}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setSelectedFile(null)
        }}
        onDownload={(file) => window.open(`/d/${file.short_code}`, '_blank')}
        password={password}
        allFiles={extractFilesFromTree(collection?.file_tree).map(f => ({
          ...f,
          original_filename: f.name,
          file_size: f.size,
          mime_type: f.type,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }))}
        currentIndex={extractFilesFromTree(collection?.file_tree).findIndex(f => f.short_code === selectedFile?.short_code) || 0}
      />

      {/* Old preview modal - remove this entire section */}
      {false && showPreview && selectedFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="relative bg-card-bg rounded-xl max-w-6xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{selectedFile.name}</h3>
                  <p className="text-sm text-text-muted">{formatBytes(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <AnimatedButton
                  onClick={() => window.open(`/d/${selectedFile.short_code}`, '_blank')}
                  variant="secondary"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </AnimatedButton>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview content based on file type */}
            <div className="overflow-auto" style={{ height: 'calc(90vh - 80px)' }}>
              {selectedFile.type?.startsWith('image/') && (
                <div className="flex items-center justify-center p-8 bg-gray-900">
                  <img 
                    src={getPreviewUrl(selectedFile)} 
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const errorMsg = document.createElement('p')
                      errorMsg.className = 'text-text-muted'
                      errorMsg.textContent = 'Failed to load image'
                      e.target.parentElement.appendChild(errorMsg)
                    }}
                  />
                </div>
              )}
              
              {selectedFile.type?.startsWith('video/') && (
                <div className="flex items-center justify-center p-8 bg-gray-900">
                  <video 
                    src={getPreviewUrl(selectedFile)}
                    controls
                    className="max-w-full max-h-full"
                  />
                </div>
              )}
              
              {selectedFile.type?.startsWith('audio/') && (
                <div className="flex items-center justify-center p-8">
                  <audio 
                    src={getPreviewUrl(selectedFile)}
                    controls
                    className="w-full max-w-md"
                  />
                </div>
              )}
              
              {selectedFile.type?.includes('pdf') && (
                <iframe
                  src={getPreviewUrl(selectedFile)}
                  className="w-full h-full"
                  title={selectedFile.name}
                />
              )}
              
              {(selectedFile.type?.startsWith('text/') || canPreview(null, selectedFile.name)) && !selectedFile.type?.startsWith('image/') && !selectedFile.type?.startsWith('video/') && !selectedFile.type?.startsWith('audio/') && !selectedFile.type?.includes('pdf') && (
                <div className="h-full">
                  <iframe
                    src={getPreviewUrl(selectedFile)}
                    className="w-full h-full bg-gray-900"
                    title={selectedFile.name}
                    style={{ minHeight: '500px' }}
                  />
                </div>
              )}
              
              {!canPreview(selectedFile.type, selectedFile.name) && (
                <div className="flex flex-col items-center justify-center p-8">
                  <File className="w-16 h-16 text-text-muted mb-4" />
                  <p className="text-text-muted">Preview not available for this file type</p>
                  <AnimatedButton
                    onClick={() => window.open(`/d/${selectedFile.short_code}`, '_blank')}
                    variant="primary"
                    size="sm"
                    className="mt-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
                  </AnimatedButton>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default CollectionPublicPage
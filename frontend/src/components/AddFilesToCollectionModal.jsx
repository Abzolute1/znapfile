import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FileText, Check, Search } from 'lucide-react'
import { filesAPI, collectionsAPI } from '../services/api'
import AnimatedButton from './AnimatedButton'
import { useToastContext } from '../contexts/ToastContext'
import { formatBytes } from '../utils/format'

export default function AddFilesToCollectionModal({ collection, isOpen, onClose, onFilesAdded }) {
  const [files, setFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const toast = useToastContext()

  useEffect(() => {
    if (isOpen) {
      console.log('AddFilesToCollectionModal opened for collection:', collection)
      loadUserFiles()
    }
  }, [isOpen])

  const loadUserFiles = async () => {
    try {
      setLoading(true)
      const response = await filesAPI.listFiles()
      console.log('Files API response:', response.data)
      // The response contains { files: [...], total_storage_used: ..., storage_limit: ... }
      const userFiles = response.data.files || []
      console.log('User files:', userFiles)
      // Filter out files already in collection
      const collectionFileIds = collection.files ? collection.files.map(f => f.id) : []
      console.log('Collection file IDs:', collectionFileIds)
      const availableFiles = userFiles.filter(f => !collectionFileIds.includes(f.id))
      console.log('Available files to add:', availableFiles)
      setFiles(availableFiles)
    } catch (err) {
      console.error('Failed to load files:', err)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFiles = async () => {
    if (selectedFiles.length === 0) return

    try {
      setLoading(true)
      
      // Create path mapping (using original filenames as paths)
      const paths = {}
      selectedFiles.forEach(fileId => {
        const file = files.find(f => f.id === fileId)
        if (file) {
          paths[fileId] = file.original_filename
        }
      })

      const response = await collectionsAPI.addFiles(collection.id, {
        file_ids: selectedFiles,
        paths: paths
      })
      
      console.log('Add files response:', response)
      toast.success(`Added ${selectedFiles.length} file(s) to collection`)
      onFilesAdded()
      onClose()
    } catch (err) {
      console.error('Failed to add files:', err)
      toast.error('Failed to add files to collection')
    } finally {
      setLoading(false)
    }
  }

  const toggleFile = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const filteredFiles = files.filter(file => 
    file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Add Files to {collection.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {filteredFiles.length === 0 ? (
                <p className="text-text-muted text-center py-8">
                  {searchTerm ? 'No files found' : 'No available files to add'}
                </p>
              ) : (
                filteredFiles.map(file => {
                  const isExpired = new Date(file.expires_at) < new Date()
                  return (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedFiles.includes(file.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-700 hover:border-gray-600 hover:translate-x-1'
                      } ${isExpired ? 'opacity-50' : ''}`}
                      onClick={() => !isExpired && toggleFile(file.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-text-muted" />
                          <div>
                            <p className="font-medium">{file.original_filename}</p>
                            <p className="text-xs text-text-muted">
                              {formatBytes(file.file_size)} • {file.download_count} downloads
                              {isExpired && ' • Expired'}
                            </p>
                          </div>
                        </div>
                        {selectedFiles.includes(file.id) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <AnimatedButton
                onClick={onClose}
                variant="secondary"
              >
                Cancel
              </AnimatedButton>
              <AnimatedButton
                onClick={handleAddFiles}
                variant="primary"
                className="flex-1"
                disabled={selectedFiles.length === 0}
              >
                Add {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
              </AnimatedButton>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
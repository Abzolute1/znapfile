import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Folder, Plus, Check } from 'lucide-react'
import { collectionsAPI } from '../services/api'
import AnimatedButton from './AnimatedButton'
import { useToastContext } from '../contexts/ToastContext'

export default function AddToCollectionModal({ file, isOpen, onClose }) {
  const [collections, setCollections] = useState([])
  const [selectedCollections, setSelectedCollections] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const toast = useToastContext()

  useEffect(() => {
    if (isOpen) {
      loadCollections()
    }
  }, [isOpen])

  const loadCollections = async () => {
    try {
      setLoading(true)
      const response = await collectionsAPI.list()
      setCollections(response.data)
    } catch (err) {
      console.error('Failed to load collections:', err)
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCollections = async () => {
    try {
      setLoading(true)
      
      // Add file to each selected collection
      for (const collectionId of selectedCollections) {
        await collectionsAPI.addFiles(collectionId, {
          file_ids: [file.id],
          paths: { [file.id]: file.original_filename }
        })
      }
      
      toast.success(`Added to ${selectedCollections.length} collection(s)`)
      onClose()
    } catch (err) {
      console.error('Failed to add to collections:', err)
      toast.error('Failed to add to collections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    try {
      setLoading(true)
      const response = await collectionsAPI.create({
        name: newCollectionName,
        description: `Collection created from ${file.original_filename}`,
        icon: 'folder',
        color: '#8B5CF6',
        is_public: false
      })
      
      // Add the file to the new collection
      await collectionsAPI.addFiles(response.data.id, {
        file_ids: [file.id],
        paths: { [file.id]: file.original_filename }
      })
      
      toast.success('Collection created and file added')
      onClose()
    } catch (err) {
      console.error('Failed to create collection:', err)
      toast.error('Failed to create collection')
    } finally {
      setLoading(false)
    }
  }

  const toggleCollection = (collectionId) => {
    setSelectedCollections(prev => 
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    )
  }

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
        className="glass-card p-6 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Add to Collection</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-muted">
            Adding: <span className="font-medium text-text">{file.original_filename}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : showCreateNew ? (
          <div className="space-y-4">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-4 py-2 bg-dark-bg rounded-lg border border-gray-700 focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <AnimatedButton
                onClick={handleCreateCollection}
                variant="primary"
                className="flex-1"
                disabled={!newCollectionName.trim()}
              >
                Create & Add
              </AnimatedButton>
              <AnimatedButton
                onClick={() => {
                  setShowCreateNew(false)
                  setNewCollectionName('')
                }}
                variant="secondary"
              >
                Cancel
              </AnimatedButton>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {collections.length === 0 ? (
                <p className="text-text-muted text-center py-8">
                  No collections yet
                </p>
              ) : (
                collections.map(collection => (
                  <div
                    key={collection.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCollections.includes(collection.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-700 hover:border-gray-600 hover:translate-x-1'
                    }`}
                    onClick={() => toggleCollection(collection.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5" style={{ color: collection.color }} />
                        <div>
                          <p className="font-medium">{collection.name}</p>
                          <p className="text-xs text-text-muted">
                            {collection.file_count} files
                          </p>
                        </div>
                      </div>
                      {selectedCollections.includes(collection.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <AnimatedButton
                onClick={() => setShowCreateNew(true)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Collection
              </AnimatedButton>
              {selectedCollections.length > 0 && (
                <AnimatedButton
                  onClick={handleAddToCollections}
                  variant="primary"
                  className="flex-1"
                >
                  Add to {selectedCollections.length} Collection(s)
                </AnimatedButton>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
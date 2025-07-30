import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Users, Calendar, Download, ExternalLink
} from 'lucide-react'
import { formatBytes, formatTimeAgo } from '../utils/format'

const SharedWithMe = ({ refreshKey, onRefresh }) => {
  const [sharedFiles, setSharedFiles] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: Load shared files when API endpoint is available
    setSharedFiles([])
  }, [refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading shared files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sharedFiles.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-text-muted mb-2">No files shared with you yet</p>
          <p className="text-sm text-text-muted">
            When someone shares files with you, they'll appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sharedFiles.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 rounded-xl flex items-center justify-between"
              style={{ 
                backgroundColor: 'rgba(10, 10, 10, 0.7)', 
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                
                <div>
                  <h3 className="font-medium">{file.filename}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Shared by {file.sharedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatTimeAgo(file.sharedAt)}
                    </span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-lg transition">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-lg transition">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SharedWithMe
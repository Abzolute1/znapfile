import { useState, useMemo } from 'react'
import {
  Folder, FolderOpen, File, FileText, FileImage, FileVideo, FileAudio,
  FileCode, FileArchive, ChevronRight, ChevronDown, Download,
  Eye, Edit3, Trash2, Copy, Share2, Lock, Globe, MessageSquare
} from 'lucide-react'
import { formatBytes } from '../utils/format'

const FileTree = ({ 
  files, 
  onFileSelect, 
  onFileAction, 
  onFolderClick,
  selectedFileId,
  showActions = true,
  expandAll = false 
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [hoveredItem, setHoveredItem] = useState(null)

  // Get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (!mimeType) return FileText
    
    if (mimeType.startsWith('image/')) return FileImage
    if (mimeType.startsWith('video/')) return FileVideo
    if (mimeType.startsWith('audio/')) return FileAudio
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return FileArchive
    if (mimeType.includes('javascript') || mimeType.includes('html') || mimeType.includes('css') || 
        mimeType.includes('python') || mimeType.includes('java')) return FileCode
    
    return FileText
  }

  // Build tree structure from flat files list
  const fileTree = useMemo(() => {
    const tree = { name: 'root', type: 'folder', children: {} }
    
    files.forEach(file => {
      const pathParts = file.path ? file.path.split('/').filter(Boolean) : []
      let current = tree
      
      // Create folder structure
      pathParts.forEach((part, index) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            type: 'folder',
            children: {},
            path: pathParts.slice(0, index + 1).join('/')
          }
        }
        current = current.children[part]
      })
      
      // Add file
      const fileName = file.original_filename || file.name
      current.children[fileName] = {
        ...file,
        name: fileName,
        type: 'file',
        icon: getFileIcon(file.mime_type)
      }
    })
    
    return tree.children
  }, [files])

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const FileActions = ({ item }) => (
    <div
      className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={e => e.stopPropagation()}
    >
      {item.is_public ? (
        <Globe className="w-3 h-3 text-accent" />
      ) : item.has_password ? (
        <Lock className="w-3 h-3 text-secondary" />
      ) : null}
      
      <button
        onClick={() => onFileAction('preview', item)}
        className="p-1 hover:bg-primary/10 rounded transition-colors hover:scale-110"
        title="Preview"
      >
        <Eye className="w-3 h-3 text-text-muted" />
      </button>
      
      <button
        onClick={() => onFileAction('download', item)}
        className="p-1 hover:bg-primary/10 rounded transition-colors hover:scale-110"
        title="Download"
      >
        <Download className="w-3 h-3 text-text-muted" />
      </button>
      
      <button
        onClick={() => onFileAction('share', item)}
        className="p-1 hover:bg-primary/10 rounded transition-colors hover:scale-110"
        title="Share"
      >
        <Share2 className="w-3 h-3 text-text-muted" />
      </button>
      
      <button
        onClick={() => onFileAction('edit', item)}
        className="p-1 hover:bg-primary/10 rounded transition-colors hover:scale-110"
        title="Edit"
      >
        <Edit3 className="w-3 h-3 text-text-muted" />
      </button>
      
      <button
        onClick={() => onFileAction('delete', item)}
        className="p-1 hover:bg-error/10 rounded transition-colors hover:scale-110"
        title="Delete"
      >
        <Trash2 className="w-3 h-3 text-error" />
      </button>
    </div>
  )

  const TreeNode = ({ item, depth = 0 }) => {
    const isFolder = item.type === 'folder'
    const isExpanded = expandedFolders.has(item.path)
    const isSelected = selectedFileId === item.id
    const isHovered = hoveredItem === item.path || hoveredItem === item.id
    
    const Icon = isFolder 
      ? (isExpanded ? FolderOpen : Folder)
      : item.icon || FileText

    return (
      <>
        <div
          className={`
            group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''}
            hover:bg-primary/5
          `}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onMouseEnter={() => setHoveredItem(item.path || item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.path)
              onFolderClick?.(item.path)
            } else {
              onFileSelect?.(item)
            }
          }}
        >
          {isFolder && (
            <div
              className="transition-transform duration-200"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          )}
          
          <Icon className={`w-4 h-4 ${isFolder ? 'text-primary' : 'text-text-muted'}`} />
          
          <span className={`
            flex-1 text-sm truncate
            ${isFolder ? 'font-medium' : ''}
            ${isSelected ? 'text-primary' : ''}
          `}>
            {item.name}
          </span>
          
          {!isFolder && (
            <>
              <span className="text-xs text-text-muted">
                {formatBytes(item.file_size || 0)}
              </span>
              
              {item.description && (
                <MessageSquare className="w-3 h-3 text-text-muted" />
              )}
              
              {showActions && isHovered && (
                <FileActions item={item} />
              )}
            </>
          )}
        </div>
        
        {isFolder && isExpanded && (
          <div
            className="overflow-hidden transition-all duration-300"
          >
            {Object.values(item.children).map((child, index) => (
              <TreeNode
                key={child.path || child.id || index}
                item={child}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-1">
      {Object.values(fileTree).length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No files in this collection</p>
        </div>
      ) : (
        Object.values(fileTree).map((item, index) => (
          <TreeNode key={item.path || item.id || index} item={item} />
        ))
      )}
    </div>
  )
}

export default FileTree
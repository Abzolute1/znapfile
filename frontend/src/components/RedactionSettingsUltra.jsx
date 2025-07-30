import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Plus, X, Eye, EyeOff, FileText, AlertCircle } from 'lucide-react'

const RedactionSettingsUltra = ({ onChange, fileType = null, fileContent = null }) => {
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [newRangeStart, setNewRangeStart] = useState('')
  const [newRangeEnd, setNewRangeEnd] = useState('')
  const [patterns, setPatterns] = useState([])
  const [newPattern, setNewPattern] = useState('')
  
  // Update parent whenever state changes
  useEffect(() => {
    const settings = {
      enabled,
      lineRanges,
      patterns
    }
    console.log('RedactionSettingsUltra - Sending settings:', settings)
    onChange(settings)
  }, [enabled, lineRanges, patterns, onChange])

  const handleToggle = () => {
    setEnabled(!enabled)
  }

  const addLineRange = () => {
    const start = parseInt(newRangeStart)
    const end = parseInt(newRangeEnd)
    
    if (start && end && start > 0 && end > 0) {
      setLineRanges([...lineRanges, { 
        start: Math.min(start, end), 
        end: Math.max(start, end) 
      }])
      setNewRangeStart('')
      setNewRangeEnd('')
    }
  }

  const removeLineRange = (index) => {
    setLineRanges(lineRanges.filter((_, i) => i !== index))
  }

  const addPattern = () => {
    if (newPattern.trim()) {
      setPatterns([...patterns, newPattern.trim()])
      setNewPattern('')
    }
  }

  const removePattern = (index) => {
    setPatterns(patterns.filter((_, i) => i !== index))
  }

  // Determine if file supports redaction
  const getFileInfo = () => {
    console.log('RedactionSettingsUltra - fileType:', fileType)
    
    if (!fileType) {
      return { canRedact: true, isText: true, reason: 'No file selected' }
    }

    const filename = typeof fileType === 'string' ? fileType : ''
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    
    console.log('RedactionSettingsUltra - filename:', filename, 'extension:', ext)

    // Binary formats that definitely can't be redacted
    const binaryFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
                          'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv',
                          'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac',
                          'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
                          'exe', 'dmg', 'iso', 'bin', 'dll', 'so']

    if (binaryFormats.includes(ext)) {
      return { canRedact: false, isText: false, reason: 'Binary files cannot be redacted' }
    }

    // Text formats that definitely can be redacted
    const textFormats = ['txt', 'text', 'log', 'md', 'json', 'xml', 'csv', 'ini', 'cfg', 'conf',
                        'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'cs',
                        'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sql',
                        'sh', 'bash', 'ps1', 'yaml', 'yml', 'toml', 'env', 'gitignore',
                        'dockerfile', 'makefile', 'readme', 'license', 'html', 'css', 'scss']

    if (textFormats.includes(ext) || ext === '') {
      return { canRedact: true, isText: true, reason: 'Text file' }
    }

    // Special formats that might support redaction
    const specialFormats = ['pdf', 'doc', 'docx', 'xls', 'xlsx']
    if (specialFormats.includes(ext)) {
      return { canRedact: false, isText: false, reason: `${ext.toUpperCase()} redaction coming soon` }
    }

    // Default: assume it's text if we don't recognize it
    return { canRedact: true, isText: true, reason: 'Unknown format - treating as text' }
  }

  const fileInfo = getFileInfo()

  // Demo content for preview
  const demoContent = fileContent || `Line 1: Configuration header
Line 2: Database settings
Line 3: host = localhost
Line 4: port = 5432
Line 5: username = admin
Line 6: password = SuperSecret123!
Line 7: API configuration
Line 8: api_key = sk-1234567890abcdef
Line 9: Security settings
Line 10: secret_key = my-secret-key-12345`

  // Apply redaction preview
  const getRedactedPreview = () => {
    if (!enabled || !fileInfo.isText) return demoContent
    
    let lines = demoContent.split('\n')
    
    // Apply line range redaction
    if (lineRanges.length > 0) {
      lines = lines.map((line, index) => {
        const lineNumber = index + 1
        const isVisible = lineRanges.some(range => 
          lineNumber >= range.start && lineNumber <= range.end
        )
        
        if (isVisible) {
          return line
        } else {
          // Use consistent blur characters
          return line.split('').map(char => {
            if (char === ' ' || char === '\t') return char
            return '█'
          }).join('')
        }
      })
    }
    
    let result = lines.join('\n')
    
    // Apply pattern redaction
    if (patterns.length > 0) {
      patterns.forEach(pattern => {
        try {
          const regex = new RegExp(pattern, 'gi')
          result = result.replace(regex, match => '█'.repeat(match.length))
        } catch (e) {
          console.error('Invalid regex:', pattern)
        }
      })
    }
    
    return result
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl border border-gray-800"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled && fileInfo.canRedact ? 'bg-yellow-500/20' : 'bg-gray-800'}`}>
            <Shield className={`w-5 h-5 ${enabled && fileInfo.canRedact ? 'text-yellow-500' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-medium">Preview Redaction</h3>
            <p className="text-sm text-gray-400">
              Hide sensitive data in file previews
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={!fileInfo.canRedact}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-gray-700'
          } ${!fileInfo.canRedact ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* File type status */}
      {fileType && (
        <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
          fileInfo.canRedact ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <FileText className={`w-4 h-4 mt-0.5 ${fileInfo.canRedact ? 'text-green-500' : 'text-red-500'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${fileInfo.canRedact ? 'text-green-400' : 'text-red-400'}`}>
              {fileType}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {fileInfo.reason}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {enabled && fileInfo.canRedact && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Line Range Settings */}
            <div className="bg-dark-bg/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Visible Line Ranges
              </h4>
              
              <div className="space-y-2 mb-3">
                {lineRanges.map((range, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-primary flex-1">
                      Lines {range.start} - {range.end}
                    </span>
                    <button
                      onClick={() => removeLineRange(index)}
                      className="p-1 hover:bg-gray-700 rounded transition"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={newRangeStart}
                  onChange={(e) => setNewRangeStart(e.target.value)}
                  placeholder="From line"
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={newRangeEnd}
                  onChange={(e) => setNewRangeEnd(e.target.value)}
                  placeholder="To line"
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={addLineRange}
                  className="px-3 py-2 bg-primary rounded hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {lineRanges.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  All lines will be redacted by default. Add ranges to make specific lines visible.
                </p>
              )}
            </div>

            {/* Pattern Settings */}
            <div className="bg-dark-bg/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-primary" />
                Redaction Patterns
              </h4>
              
              <div className="space-y-2 mb-3">
                {patterns.map((pattern, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <code className="text-xs text-yellow-400 flex-1">{pattern}</code>
                    <button
                      onClick={() => removePattern(index)}
                      className="p-1 hover:bg-gray-700 rounded transition"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPattern()}
                  placeholder="e.g., password|secret|api_key"
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={addPattern}
                  className="px-3 py-2 bg-primary rounded hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                <p>Use regex patterns to redact sensitive data</p>
              </div>
            </div>

            {/* Preview */}
            {fileInfo.isText && (
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Preview
                </h4>
                
                <div className="bg-dark-bg rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                    {getRedactedPreview()}
                  </pre>
                </div>
                
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    {lineRanges.length > 0 
                      ? `Showing lines ${lineRanges.map(r => `${r.start}-${r.end}`).join(', ')}` 
                      : 'All content redacted'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default RedactionSettingsUltra
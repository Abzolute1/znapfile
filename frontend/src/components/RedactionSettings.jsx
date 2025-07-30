import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Eye, EyeOff, Sparkles, Info, Plus, X,
  FileText, Hash, AlertCircle, Maximize2, Minimize2
} from 'lucide-react'
import AnimatedButton from './AnimatedButton'

const RedactionSettings = ({ onChange, fileType = null, fileContent = null }) => {
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [newRangeStart, setNewRangeStart] = useState('')
  const [newRangeEnd, setNewRangeEnd] = useState('')
  const [patterns, setPatterns] = useState([])
  const [newPattern, setNewPattern] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Automatically update parent when state changes
  useEffect(() => {
    onChange({
      enabled,
      lineRanges,
      patterns
    })
  }, [enabled, lineRanges, patterns, onChange])

  const handleToggle = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    
    if (!newEnabled) {
      // Reset all values when disabled
      setLineRanges([])
      setPatterns([])
      setShowPreview(false)
    } else {
      // Auto-show preview when enabling redaction
      setShowPreview(true)
    }
  }

  const addLineRange = () => {
    const start = newRangeStart ? parseInt(newRangeStart) : null
    const end = newRangeEnd ? parseInt(newRangeEnd) : null
    
    if (start && end) {
      // Always ensure start is less than end
      const newRange = { 
        start: Math.min(start, end), 
        end: Math.max(start, end) 
      }
      
      const updatedRanges = [...lineRanges, newRange]
      
      // Update local state - useEffect will handle updating parent
      setLineRanges(updatedRanges)
      setNewRangeStart('')
      setNewRangeEnd('')
    }
  }

  const removeLineRange = (index) => {
    const updatedRanges = lineRanges.filter((_, i) => i !== index)
    setLineRanges(updatedRanges)
  }

  const addPattern = () => {
    if (newPattern.trim()) {
      const updatedPatterns = [...patterns, newPattern.trim()]
      setPatterns(updatedPatterns)
      setNewPattern('')
    }
  }

  const removePattern = (index) => {
    const updatedPatterns = patterns.filter((_, i) => i !== index)
    setPatterns(updatedPatterns)
  }

  // Debug logging
  console.log('RedactionSettings fileType:', fileType)
  
  // Check if we have a text-based file
  // If no fileType provided, assume it's text (for demo)
  if (!fileType) {
    var isTextFile = true
  } else {
    // Get file extension
    const ext = fileType.split('.').pop()?.toLowerCase() || ''
    console.log('RedactionSettings file extension:', ext)
    
    // List of non-text extensions to exclude
    const nonTextExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
                               'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv',
                               'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac',
                               'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
                               'exe', 'dmg', 'iso', 'bin', 'dll', 'so',
                               'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
    
    // If extension is not in the non-text list, it's probably text
    var isTextFile = !nonTextExtensions.includes(ext)
  }
  
  console.log('RedactionSettings isTextFile:', isTextFile)
  
  // Check if we have an image file
  const isImageFile = fileType && ['image', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].some(ext => 
    fileType.includes(ext)
  )
  
  // Sample content for demo when no file is uploaded
  const demoContent = `# Configuration File
# WARNING: This file contains sensitive information

[database]
host = localhost
port = 5432
username = admin
password = SuperSecret123!
api_key = sk-1234567890abcdef

[security]
secret_key = my-secret-key-12345
jwt_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
ssl_enabled = true

[logging]
level = debug
output = /var/log/app.log

# End of configuration`
  
  // Apply redaction to preview content
  const getRedactedPreview = () => {
    const contentToUse = fileContent || demoContent
    
    if (!enabled) return contentToUse
    
    let lines = contentToUse.split('\n')
    const totalLines = lines.length
    
    // Apply line range redaction
    if (lineRanges.length > 0) {
      lines = lines.map((line, index) => {
        const lineNumber = index + 1
        // Check if this line is within any VISIBLE range
        const isVisible = lineRanges.some(range => 
          lineNumber >= range.start && lineNumber <= range.end
        )
        
        if (isVisible) {
          return line
        } else {
          // Create a beautiful blurred version
          if (line.trim()) {
            // Use deterministic blur based on character position
            const blurChars = '░▒▓'
            return line.split('').map((char, idx) => {
              if (char === ' ' || char === '\t') return char
              // Use character code and position to select blur char deterministically
              return blurChars[(char.charCodeAt(0) + idx) % blurChars.length]
            }).join('')
          }
          return line
        }
      })
    }
    
    let redactedContent = lines.join('\n')
    
    // Apply pattern-based redaction with magical blur
    if (patterns.length > 0) {
      patterns.forEach(pattern => {
        try {
          const regex = new RegExp(pattern, 'gi')
          const blurChars = '●○◦•∙⋅'
          redactedContent = redactedContent.replace(regex, (match, offset) => {
            // Create deterministic blur preserving length
            return match.split('').map((char, idx) => 
              blurChars[(char.charCodeAt(0) + offset + idx) % blurChars.length]
            ).join('')
          })
        } catch (e) {
          console.error('Invalid regex pattern:', pattern)
        }
      })
    }
    
    return redactedContent
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl border border-gray-800"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? 'bg-yellow-500/20' : 'bg-gray-800'}`}>
            <Shield className={`w-5 h-5 ${enabled ? 'text-yellow-500' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-medium flex items-center gap-2">
              Preview Redaction
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </h3>
            <p className="text-sm text-gray-400">
              Control what parts of your file are visible in preview
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Line Range Settings */}
            <div className={`bg-dark-bg/50 rounded-lg p-4 ${!fileType || !isTextFile ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Visible Line Ranges</span>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="ml-auto p-1 hover:bg-gray-800 rounded transition"
                  disabled={!fileType || !isTextFile}
                >
                  <Info className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400"
                >
                  <p>• Add multiple ranges to keep specific sections visible</p>
                  <p>• Example: Show lines 1-10 and 50-60 while hiding everything else</p>
                  <p>• All lines outside specified ranges will be redacted</p>
                  <p>• You can add as many ranges as needed</p>
                </motion.div>
              )}
              
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
                  disabled={!fileType || !isTextFile}
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="number"
                  min="1"
                  value={newRangeEnd}
                  onChange={(e) => setNewRangeEnd(e.target.value)}
                  placeholder="To line"
                  disabled={!fileType || !isTextFile}
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <AnimatedButton
                  onClick={addLineRange}
                  variant="secondary"
                  size="sm"
                  disabled={!newRangeStart || !newRangeEnd || !fileType || !isTextFile}
                >
                  <Plus className="w-4 h-4" />
                </AnimatedButton>
              </div>
            </div>

            {/* Pattern-based Redaction */}
            <div className={`bg-dark-bg/50 rounded-lg p-4 ${!fileType || !isTextFile ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Redaction Patterns</span>
              </div>
              
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
                  disabled={!fileType || !isTextFile}
                  className="flex-1 bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <AnimatedButton
                  onClick={addPattern}
                  variant="secondary"
                  size="sm"
                  disabled={!newPattern.trim() || !fileType || !isTextFile}
                >
                  <Plus className="w-4 h-4" />
                </AnimatedButton>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                <p>Add regex patterns to redact sensitive data</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-gray-600">Examples:</span>
                  <button
                    onClick={() => setNewPattern('password|secret|api_key')}
                    className="text-blue-400 hover:text-blue-300"
                    disabled={!fileType || !isTextFile}
                  >
                    Common secrets
                  </button>
                  <span className="text-gray-600">•</span>
                  <button
                    onClick={() => setNewPattern('\\b\\d{3}-\\d{2}-\\d{4}\\b')}
                    className="text-blue-400 hover:text-blue-300"
                    disabled={!fileType || !isTextFile}
                  >
                    SSN
                  </button>
                  <span className="text-gray-600">•</span>
                  <button
                    onClick={() => setNewPattern('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}')}
                    className="text-blue-400 hover:text-blue-300"
                    disabled={!fileType || !isTextFile}
                  >
                    Email
                  </button>
                </div>
              </div>
            </div>


            {/* Live Preview - Show when redaction is enabled */}
            {enabled && (
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Preview Redaction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {showPreview && (
                      <AnimatedButton
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        variant="secondary"
                        size="sm"
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </AnimatedButton>
                    )}
                    <AnimatedButton
                      onClick={() => setShowPreview(!showPreview)}
                      variant="secondary"
                      size="sm"
                    >
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </AnimatedButton>
                  </div>
                </div>
                
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={isFullscreen ? "fixed inset-0 z-50 bg-dark-bg p-8 overflow-auto" : "overflow-hidden"}
                    >
                      {isFullscreen && (
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Redaction Preview</h3>
                          <button
                            onClick={() => setIsFullscreen(false)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      <div className={`bg-dark-bg rounded-lg p-4 ${isFullscreen ? '' : 'mt-3 max-h-96'} overflow-y-auto`}>
                        <div className="flex">
                          <div className="text-xs text-gray-500 font-mono pr-3 select-none">
                            {getRedactedPreview().split('\n').map((_, i) => (
                              <div key={i} className="text-right">
                                {i + 1}
                              </div>
                            ))}
                          </div>
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono flex-1">
                            {getRedactedPreview().split('\n').map((line, i) => {
                              const lineNumber = i + 1
                              // Check if this line contains blur characters (it's redacted)
                              const isRedacted = line.includes('░') || line.includes('▒') || line.includes('▓') || 
                                               line.includes('╫') || line.includes('╬') || line.includes('═') ||
                                               line.includes('─') || line.includes('│') || line.includes('╌') ||
                                               line.includes('╍') || line.includes('▪') || line.includes('▫') ||
                                               line.includes('●') || line.includes('○') || line.includes('◌') ||
                                               line.includes('◍') || line.includes('◎') || line.includes('∘') ||
                                               line.includes('∙') || line.includes('⋅')
                              
                              return (
                                <motion.div 
                                  key={i} 
                                  className={isRedacted ? 'magical-blur relative' : ''}
                                  initial={isRedacted ? { opacity: 0 } : {}}
                                  animate={isRedacted ? { 
                                    opacity: [0.5, 0.7, 0.5],
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                  } : {}}
                                  transition={isRedacted ? {
                                    opacity: { duration: 3, repeat: Infinity },
                                    backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear' }
                                  } : {}}
                                  style={isRedacted ? {
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.1) 25%, rgba(217, 70, 239, 0.1) 50%, rgba(139, 92, 246, 0.1) 75%, transparent 100%)',
                                    backgroundSize: '200% 100%',
                                    filter: 'blur(0.3px)',
                                    transition: 'all 0.3s ease'
                                  } : {}}
                                >
                                  {line || '\u00A0'}
                                  {isRedacted && i % 3 === 0 && (
                                    <motion.span
                                      className="absolute"
                                      style={{
                                        left: `${(i * 20) % 80 + 10}%`,
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                      }}
                                      initial={{ opacity: 0, scale: 0 }}
                                      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                                      transition={{ duration: 2, delay: (i * 0.3) % 2 }}
                                    >
                                      ✨
                                    </motion.span>
                                  )}
                                </motion.div>
                              )
                            })}
                          </pre>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {fileContent ? 
                          "Preview showing redaction applied to your actual file content" :
                          "Demo preview - upload a file to see redaction on your actual content"
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Preview Example */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-400 mb-1">Preview Redaction Active</p>
                  <p className="text-gray-400">
                    {!fileType ? (
                      <>Redaction applies to text files. Select files to continue.</>
                    ) : isTextFile ? (
                      <>
                        {!fileContent ? (
                          <>Upload a text file to see the redaction preview. </>
                        ) : (
                          <>
                            {lineRanges.length > 0 ? (
                              <>Lines {lineRanges.map(r => `${r.start}-${r.end}`).join(', ')} will be visible. </>
                            ) : null}
                            {patterns.length > 0 ? (
                              <>Patterns matching {patterns.join(', ')} will be redacted. </>
                            ) : null}
                            {lineRanges.length === 0 && patterns.length === 0 ? (
                              <>Configure redaction settings above. </>
                            ) : null}
                          </>
                        )}
                      </>
                    ) : (
                      <>Redaction is not available for this file type. Only text files can be redacted.</>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default RedactionSettings
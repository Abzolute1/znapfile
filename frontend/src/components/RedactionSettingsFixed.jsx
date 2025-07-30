import { useState, useEffect } from 'react'
import { Shield, Plus, X, Eye } from 'lucide-react'

const RedactionSettingsFixed = ({ onChange, fileType = null, fileContent = null }) => {
  console.log('RedactionSettingsFixed - fileType:', fileType)
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [newRangeStart, setNewRangeStart] = useState('')
  const [newRangeEnd, setNewRangeEnd] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  
  // Demo content when no file is provided
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
  
  // Update parent when state changes
  useEffect(() => {
    onChange({
      enabled,
      lineRanges,
      patterns: []
    })
  }, [enabled, lineRanges, onChange])

  const handleToggle = () => {
    setEnabled(!enabled)
    if (!enabled) {
      setShowPreview(true)
    }
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

  // Apply redaction to preview content
  const getRedactedPreview = () => {
    const contentToUse = fileContent || demoContent
    
    if (!enabled) return contentToUse
    
    let lines = contentToUse.split('\n')
    
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
          // Redact the line with consistent characters
          if (line.trim()) {
            return line.split('').map(char => {
              if (char === ' ' || char === '\t') return char
              return '█'
            }).join('')
          }
          return line
        }
      })
    }
    
    return lines.join('\n')
  }

  return (
    <div className="glass-card p-6 rounded-xl border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${enabled ? 'text-yellow-500' : 'text-gray-500'}`} />
          <div>
            <h3 className="font-medium">Preview Redaction (Fixed)</h3>
            <p className="text-sm text-gray-400">
              Control what parts of your file are visible
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

      {enabled && (
        <div className="space-y-4">
          {/* Line Range Settings */}
          <div className="bg-dark-bg/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Visible Line Ranges</h4>
            
            <div className="space-y-2 mb-3">
              {lineRanges.map((range, index) => (
                <div
                  key={index}
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
                </div>
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
          </div>

          {/* Live Preview */}
          <div className="bg-dark-bg/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-primary hover:underline"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showPreview && (
              <div className="bg-dark-bg rounded-lg p-4 overflow-y-auto max-h-96">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                  {getRedactedPreview().split('\n').map((line, i) => {
                    const lineNumber = i + 1
                    const isRedacted = line.includes('█')
                    
                    return (
                      <div key={i} className="flex">
                        <span className="text-gray-500 pr-3 select-none w-8 text-right">
                          {lineNumber}
                        </span>
                        <span className={isRedacted ? 'text-red-400' : 'text-gray-300'}>
                          {line || '\u00A0'}
                        </span>
                      </div>
                    )
                  })}
                </pre>
              </div>
            )}
            
            {showPreview && (
              <div className="mt-2 text-xs text-gray-500">
                <p>• Green lines are visible</p>
                <p>• Red lines are redacted</p>
                <p>Current: {lineRanges.length} range(s) configured</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RedactionSettingsFixed
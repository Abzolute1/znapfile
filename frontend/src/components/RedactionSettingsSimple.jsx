import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Plus, X } from 'lucide-react'

const RedactionSettingsSimple = ({ onChange }) => {
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')

  // Simple demo content
  const demoContent = `Line 1: Database configuration
Line 2: host = localhost
Line 3: port = 5432
Line 4: username = admin
Line 5: password = SuperSecret123!
Line 6: api_key = sk-1234567890abcdef
Line 7: Security settings
Line 8: secret_key = my-secret-key-12345
Line 9: jwt_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Line 10: ssl_enabled = true`

  // Update parent whenever state changes
  useEffect(() => {
    onChange({ enabled, lineRanges })
  }, [enabled, lineRanges, onChange])

  const addRange = () => {
    const start = parseInt(startInput)
    const end = parseInt(endInput)
    
    if (start && end && start > 0 && end > 0) {
      setLineRanges([...lineRanges, { 
        start: Math.min(start, end), 
        end: Math.max(start, end) 
      }])
      setStartInput('')
      setEndInput('')
    }
  }

  const removeRange = (index) => {
    setLineRanges(lineRanges.filter((_, i) => i !== index))
  }

  const getRedactedPreview = () => {
    if (!enabled) return demoContent
    
    const lines = demoContent.split('\n')
    
    if (lineRanges.length === 0) return demoContent
    
    return lines.map((line, index) => {
      const lineNumber = index + 1
      const isVisible = lineRanges.some(r => 
        lineNumber >= r.start && lineNumber <= r.end
      )
      
      if (isVisible) {
        return line
      } else {
        // Simple redaction
        return line.replace(/[^\s]/g, '█')
      }
    }).join('\n')
  }

  return (
    <div className="glass-card p-6 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${enabled ? 'text-yellow-500' : 'text-gray-500'}`} />
          <h3 className="font-medium">Simple Redaction Test</h3>
        </div>
        
        <button
          onClick={() => setEnabled(!enabled)}
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
          <div>
            <h4 className="text-sm font-medium mb-2">Visible Line Ranges</h4>
            
            {lineRanges.map((range, index) => (
              <div key={index} className="flex items-center gap-2 mb-2 bg-gray-800 rounded px-3 py-2">
                <span className="text-sm">Lines {range.start} - {range.end}</span>
                <button
                  onClick={() => removeRange(index)}
                  className="ml-auto p-1 hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <div className="flex gap-2">
              <input
                type="number"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                placeholder="From"
                className="flex-1 bg-dark-bg border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                placeholder="To"
                className="flex-1 bg-dark-bg border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={addRange}
                className="px-3 py-2 bg-primary rounded hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <pre className="bg-dark-bg rounded p-4 text-xs overflow-auto max-h-64">
              {getRedactedPreview()}
            </pre>
          </div>
          
          <div className="text-xs text-gray-500">
            State: {JSON.stringify({ enabled, lineRanges })}
          </div>
        </div>
      )}
    </div>
  )
}

export default RedactionSettingsSimple
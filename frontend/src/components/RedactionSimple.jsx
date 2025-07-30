import { useState, useEffect } from 'react'
import { Shield, Plus, X } from 'lucide-react'

const RedactionSimple = ({ onChange, fileType = null, fileContent = null }) => {
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [startLine, setStartLine] = useState('')
  const [endLine, setEndLine] = useState('')
  
  // Send updates to parent
  useEffect(() => {
    const settings = {
      enabled,
      lineRanges,
      patterns: []
    }
    console.log('RedactionSimple sending settings:', settings)
    onChange(settings)
  }, [enabled, lineRanges, onChange])
  
  const addRange = () => {
    const start = parseInt(startLine)
    const end = parseInt(endLine)
    if (start > 0 && end > 0) {
      setLineRanges([...lineRanges, { start, end }])
      setStartLine('')
      setEndLine('')
    }
  }
  
  const removeRange = (index) => {
    setLineRanges(lineRanges.filter((_, i) => i !== index))
  }
  
  // Simple text preview
  const demoText = fileContent || `Configuration File
Database Settings
host = localhost
port = 5432
username = admin
password = SuperSecret123!
API Configuration
api_key = sk-1234567890abcdef
secret_key = my-secret-key-12345
End of configuration`
  
  const getPreview = () => {
    if (!enabled) return demoText
    
    // If no line ranges specified, show everything
    if (lineRanges.length === 0) return demoText
    
    const lines = demoText.split('\n')
    return lines.map((line, idx) => {
      const lineNum = idx + 1
      const isVisible = lineRanges.some(r => lineNum >= r.start && lineNum <= r.end)
      
      if (isVisible) {
        return `${lineNum.toString().padStart(2, ' ')}: ${line}`
      } else {
        // Show line number but redact content
        const redactedLine = line.replace(/[^\s]/g, '█')
        return `${lineNum.toString().padStart(2, ' ')}: ${redactedLine}`
      }
    }).join('\n')
  }
  
  return (
    <div className="glass-card p-6 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${enabled ? 'text-yellow-500' : 'text-gray-500'}`} />
          <h3 className="font-medium">Redaction Settings</h3>
        </div>
        
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
            enabled ? 'bg-primary' : 'bg-gray-700'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
      
      {enabled && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Specify which lines to keep visible:</p>
            
            {lineRanges.map((range, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2 bg-gray-800 p-2 rounded">
                <span className="text-sm">Lines {range.start} - {range.end}</span>
                <button onClick={() => removeRange(idx)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <div className="flex gap-2">
              <input
                type="number"
                value={startLine}
                onChange={(e) => setStartLine(e.target.value)}
                placeholder="From"
                className="flex-1 bg-dark-bg border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={endLine}
                onChange={(e) => setEndLine(e.target.value)}
                placeholder="To"
                className="flex-1 bg-dark-bg border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={addRange}
                className="px-3 py-2 bg-primary rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-2">Preview:</p>
            <div className="bg-dark-bg p-4 rounded overflow-auto" style={{ minHeight: '300px', maxHeight: '500px' }}>
              {enabled && lineRanges.length > 0 ? (
                demoText.split('\n').map((line, idx) => {
                  const lineNum = idx + 1
                  const isVisible = lineRanges.some(r => lineNum >= r.start && lineNum <= r.end)
                  
                  return (
                    <div key={idx} className={`font-mono text-sm ${isVisible ? 'text-green-400' : 'text-red-400'}`}>
                      <span className="text-gray-500 inline-block w-8">{lineNum.toString().padStart(2, ' ')}:</span>
                      <span className={isVisible ? '' : 'opacity-30'}>
                        {isVisible ? line : line.replace(/[^\s]/g, '█')}
                      </span>
                    </div>
                  )
                })
              ) : (
                <pre className="font-mono text-sm text-gray-300">{demoText}</pre>
              )}
            </div>
            {lineRanges.length === 0 && (
              <p className="text-xs text-yellow-500 mt-2">
                ⚠️ No line ranges specified - all content will be visible
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RedactionSimple
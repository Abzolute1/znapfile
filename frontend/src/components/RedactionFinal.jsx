import { useState, useEffect } from 'react'

const RedactionFinal = ({ onChange, fileContent }) => {
  const [enabled, setEnabled] = useState(false)
  const [lineRanges, setLineRanges] = useState([])
  const [startLine, setStartLine] = useState('')
  const [endLine, setEndLine] = useState('')
  
  useEffect(() => {
    onChange({ enabled, lineRanges, patterns: [] })
  }, [enabled, lineRanges, onChange])
  
  // Simple demo content
  const content = fileContent || `Line 1: Config header
Line 2: username = admin
Line 3: password = secret123
Line 4: api_key = sk-12345
Line 5: database = prod
Line 6: host = localhost
Line 7: port = 5432
Line 8: ssl = true
Line 9: debug = false
Line 10: End of config`
  
  return (
    <div className="glass-card p-6 rounded-xl border border-gray-800">
      <h3 className="font-medium mb-4">Redaction</h3>
      
      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Enable redaction</span>
      </label>
      
      {enabled && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Keep these lines visible:</p>
          
          {lineRanges.map((range, idx) => (
            <div key={idx} className="mb-2">
              Lines {range.start} - {range.end}
              <button onClick={() => setLineRanges(lineRanges.filter((_, i) => i !== idx))} className="ml-2 text-red-500">×</button>
            </div>
          ))}
          
          <div className="flex gap-2">
            <input
              type="number"
              value={startLine}
              onChange={(e) => setStartLine(e.target.value)}
              placeholder="From"
              className="w-20 px-2 py-1 bg-dark-bg border border-gray-700 rounded"
            />
            <input
              type="number"
              value={endLine}
              onChange={(e) => setEndLine(e.target.value)}
              placeholder="To"
              className="w-20 px-2 py-1 bg-dark-bg border border-gray-700 rounded"
            />
            <button
              onClick={() => {
                const start = parseInt(startLine)
                const end = parseInt(endLine)
                if (start > 0 && end > 0) {
                  setLineRanges([...lineRanges, { start, end }])
                  setStartLine('')
                  setEndLine('')
                }
              }}
              className="px-3 py-1 bg-primary rounded"
            >
              Add
            </button>
          </div>
          
          {/* Preview */}
          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Preview:</p>
            <pre className="bg-dark-bg p-4 rounded text-sm font-mono overflow-auto h-64">
              {enabled && lineRanges.length > 0 ? (
                content.split('\n').map((line, idx) => {
                  const lineNum = idx + 1
                  const isVisible = lineRanges.some(r => lineNum >= r.start && lineNum <= r.end)
                  return isVisible ? line : line.replace(/[^\s]/g, '█')
                }).join('\n')
              ) : content}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default RedactionFinal
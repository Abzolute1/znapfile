import { useState } from 'react'

const TestRedactionMinimal = () => {
  const [enabled, setEnabled] = useState(true)
  const [lineRanges, setLineRanges] = useState([{ start: 1, end: 3 }])
  
  const content = `Line 1: This should be visible
Line 2: This should be visible
Line 3: This should be visible
Line 4: This should be REDACTED
Line 5: This should be REDACTED
Line 6: This should be REDACTED
Line 7: This should be REDACTED
Line 8: This should be REDACTED
Line 9: This should be REDACTED
Line 10: This should be REDACTED`

  const getRedactedContent = () => {
    if (!enabled) return content
    
    const lines = content.split('\n')
    
    return lines.map((line, index) => {
      const lineNumber = index + 1
      const isVisible = lineRanges.some(range => 
        lineNumber >= range.start && lineNumber <= range.end
      )
      
      if (isVisible) {
        return line
      } else {
        // Replace with blur characters
        return line.split('').map(char => {
          if (char === ' ') return ' '
          return '░'
        }).join('')
      }
    }).join('\n')
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8 text-white">
      <h1 className="text-2xl mb-4">Minimal Redaction Test</h1>
      
      <div className="mb-4">
        <p>Enabled: {enabled ? 'YES' : 'NO'}</p>
        <p>Visible ranges: {JSON.stringify(lineRanges)}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg mb-2">Original:</h2>
          <pre className="bg-gray-900 p-4 rounded">{content}</pre>
        </div>
        
        <div>
          <h2 className="text-lg mb-2">Redacted:</h2>
          <pre className="bg-gray-900 p-4 rounded">{getRedactedContent()}</pre>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        <button 
          onClick={() => setLineRanges([{ start: 1, end: 3 }])}
          className="px-4 py-2 bg-primary rounded"
        >
          Show 1-3
        </button>
        <button 
          onClick={() => setLineRanges([{ start: 5, end: 7 }])}
          className="px-4 py-2 bg-primary rounded"
        >
          Show 5-7
        </button>
        <button 
          onClick={() => setLineRanges([{ start: 1, end: 3 }, { start: 8, end: 10 }])}
          className="px-4 py-2 bg-primary rounded"
        >
          Show 1-3 & 8-10
        </button>
      </div>
    </div>
  )
}

export default TestRedactionMinimal
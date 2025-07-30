import { useState, useEffect } from 'react'

const RedactionDebug = () => {
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

  const getRedactedPreview = () => {
    if (!enabled) return content
    
    let lines = content.split('\n')
    
    if (lineRanges.length > 0) {
      lines = lines.map((line, index) => {
        const lineNumber = index + 1
        // Check if this line is within any VISIBLE range
        const isVisible = lineRanges.some(range => 
          lineNumber >= range.start && lineNumber <= range.end
        )
        
        console.log(`Line ${lineNumber}: isVisible=${isVisible}, content="${line}"`)
        
        if (isVisible) {
          return line
        } else {
          // Create a beautiful blurred version
          if (line.trim()) {
            const blurChars = '░▒▓╫╬═─│╌╍▪▫●○◌◍◎∘∙⋅'
            return line.split('').map(char => {
              if (char === ' ' || char === '\t') return char
              return blurChars[Math.floor(Math.random() * blurChars.length)]
            }).join('')
          }
          return line
        }
      })
    }
    
    return lines.join('\n')
  }

  const redactedContent = getRedactedPreview()
  const redactedLines = redactedContent.split('\n')

  return (
    <div className="min-h-screen bg-dark-bg p-8 text-white">
      <h1 className="text-2xl mb-4">Redaction Debug</h1>
      
      <div className="mb-4 p-4 bg-gray-900 rounded">
        <p>Enabled: {enabled ? 'YES' : 'NO'}</p>
        <p>Line Ranges: {JSON.stringify(lineRanges)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <h2 className="text-lg mb-2">Original Content:</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm">
            {content.split('\n').map((line, i) => (
              <div key={i}>
                <span className="text-gray-500">{(i + 1).toString().padStart(2, ' ')}: </span>
                <span>{line}</span>
              </div>
            ))}
          </pre>
        </div>

        <div>
          <h2 className="text-lg mb-2">Redacted Content:</h2>
          <pre className="bg-gray-900 p-4 rounded text-sm">
            {redactedLines.map((line, i) => {
              const lineNumber = i + 1
              const isRedacted = line.includes('░') || line.includes('▒') || line.includes('▓')
              return (
                <div key={i} className={isRedacted ? 'text-red-400' : 'text-green-400'}>
                  <span className="text-gray-500">{lineNumber.toString().padStart(2, ' ')}: </span>
                  <span>{line}</span>
                </div>
              )
            })}
          </pre>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg mb-2">Raw Redacted Output:</h2>
        <pre className="bg-gray-900 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(redactedContent, null, 2)}
        </pre>
      </div>

      <div className="space-x-2">
        <button 
          onClick={() => setEnabled(!enabled)}
          className="px-4 py-2 bg-primary rounded"
        >
          Toggle Enabled
        </button>
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
          onClick={() => setLineRanges([])}
          className="px-4 py-2 bg-primary rounded"
        >
          Clear Ranges
        </button>
      </div>
    </div>
  )
}

export default RedactionDebug
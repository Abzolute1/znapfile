import { useState } from 'react'

const TestRedaction = () => {
  const [lineRanges, setLineRanges] = useState([])
  const [enabled, setEnabled] = useState(false)
  
  const testContent = `Line 1: This is the first line
Line 2: This is the second line
Line 3: This is the third line
Line 4: This is the fourth line
Line 5: This is the fifth line
Line 6: This is the sixth line
Line 7: This is the seventh line
Line 8: This is the eighth line
Line 9: This is the ninth line
Line 10: This is the tenth line`

  const applyRedaction = () => {
    if (!enabled) return testContent
    
    let lines = testContent.split('\n')
    
    if (lineRanges.length > 0) {
      lines = lines.map((line, index) => {
        const lineNumber = index + 1
        const isVisible = lineRanges.some(range => 
          lineNumber >= range.start && lineNumber <= range.end
        )
        
        if (isVisible) {
          return line
        } else {
          // Redact the line
          const blurChars = '░▒▓'
          return line.split('').map(char => {
            if (char === ' ' || char === '\t') return char
            return blurChars[Math.floor(Math.random() * blurChars.length)]
          }).join('')
        }
      })
    }
    
    return lines.join('\n')
  }
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h2>Redaction Test</h2>
      
      <div>
        <label>
          <input 
            type="checkbox" 
            checked={enabled} 
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable Redaction
        </label>
      </div>
      
      <div>
        <button onClick={() => {
          setLineRanges([{ start: 1, end: 3 }])
        }}>
          Show lines 1-3
        </button>
        
        <button onClick={() => {
          setLineRanges([{ start: 1, end: 3 }, { start: 7, end: 9 }])
        }}>
          Show lines 1-3 and 7-9
        </button>
        
        <button onClick={() => {
          setLineRanges([])
        }}>
          Clear ranges
        </button>
      </div>
      
      <div>
        <h3>Current Settings:</h3>
        <p>Enabled: {enabled ? 'Yes' : 'No'}</p>
        <p>Ranges: {JSON.stringify(lineRanges)}</p>
      </div>
      
      <div>
        <h3>Preview:</h3>
        <pre style={{ backgroundColor: '#2a2a2a', padding: '10px' }}>
          {applyRedaction()}
        </pre>
      </div>
    </div>
  )
}

export default TestRedaction
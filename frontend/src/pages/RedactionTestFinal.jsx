import { useState, useEffect } from 'react'
import RedactionSettings from '../components/RedactionSettings'
import RedactionSettingsFixed from '../components/RedactionSettingsFixed'

const RedactionTestFinal = () => {
  const [settings1, setSettings1] = useState({ enabled: false, lineRanges: [], patterns: [] })
  const [settings2, setSettings2] = useState({ enabled: false, lineRanges: [], patterns: [] })
  
  const testContent = `Line 1: Database configuration
Line 2: host = localhost
Line 3: port = 5432
Line 4: username = admin
Line 5: password = SuperSecret123!
Line 6: api_key = sk-1234567890abcdef
Line 7: Security settings
Line 8: secret_key = my-secret-key-12345
Line 9: jwt_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Line 10: ssl_enabled = true`

  // Apply deterministic redaction
  const applyRedaction = (content, settings) => {
    if (!settings.enabled) return content
    
    let lines = content.split('\n')
    
    if (settings.lineRanges && settings.lineRanges.length > 0) {
      lines = lines.map((line, index) => {
        const lineNumber = index + 1
        const isVisible = settings.lineRanges.some(range => 
          lineNumber >= range.start && lineNumber <= range.end
        )
        
        if (isVisible) {
          return line
        } else {
          // Use deterministic blur
          if (line.trim()) {
            const blurChars = '░▒▓'
            return line.split('').map((char, idx) => {
              if (char === ' ' || char === '\t') return char
              return blurChars[(char.charCodeAt(0) + idx) % blurChars.length]
            }).join('')
          }
          return line
        }
      })
    }
    
    return lines.join('\n')
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <h1 className="text-3xl font-bold mb-8">Redaction Test - Final Version</h1>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl mb-4">Original RedactionSettings</h2>
          <RedactionSettings 
            onChange={setSettings1}
            fileType="text/plain"
            fileContent={testContent}
          />
        </div>
        
        <div>
          <h2 className="text-xl mb-4">Fixed RedactionSettings</h2>
          <RedactionSettingsFixed 
            onChange={setSettings2}
            fileType="text/plain"
            fileContent={testContent}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-lg">
          <h3 className="font-bold mb-2">Original Content</h3>
          <pre className="text-xs bg-dark-bg p-3 rounded overflow-auto">
            {testContent}
          </pre>
        </div>
        
        <div className="glass-card p-4 rounded-lg">
          <h3 className="font-bold mb-2">Original Component Result</h3>
          <pre className="text-xs bg-dark-bg p-3 rounded overflow-auto">
            {applyRedaction(testContent, settings1)}
          </pre>
          <div className="mt-2 text-xs">
            Settings: {JSON.stringify(settings1, null, 2)}
          </div>
        </div>
        
        <div className="glass-card p-4 rounded-lg">
          <h3 className="font-bold mb-2">Fixed Component Result</h3>
          <pre className="text-xs bg-dark-bg p-3 rounded overflow-auto">
            {applyRedaction(testContent, settings2)}
          </pre>
          <div className="mt-2 text-xs">
            Settings: {JSON.stringify(settings2, null, 2)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RedactionTestFinal
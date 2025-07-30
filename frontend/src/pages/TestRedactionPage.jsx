import { useState } from 'react'
import RedactionSettings from '../components/RedactionSettings'

const TestRedactionPage = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    lineRanges: [],
    patterns: []
  })

  const testContent = `Line 1: Configuration header
Line 2: Database settings
Line 3: host = localhost
Line 4: port = 5432
Line 5: username = admin
Line 6: password = SuperSecret123!
Line 7: API configuration
Line 8: api_key = sk-1234567890abcdef
Line 9: Security settings
Line 10: secret_key = my-secret-key-12345`

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Redaction Test Page</h1>
        
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Current Settings:</h2>
          <pre className="bg-gray-900 p-4 rounded text-xs">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
        
        <RedactionSettings 
          onChange={setSettings}
          fileType="text/plain"
          fileContent={testContent}
        />
        
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Test Actions:</h2>
          <div className="space-x-2">
            <button 
              onClick={() => setSettings({
                enabled: true,
                lineRanges: [{ start: 1, end: 3 }],
                patterns: []
              })}
              className="px-4 py-2 bg-primary rounded"
            >
              Set Lines 1-3 Visible
            </button>
            
            <button 
              onClick={() => setSettings({
                enabled: true,
                lineRanges: [{ start: 1, end: 3 }, { start: 7, end: 9 }],
                patterns: []
              })}
              className="px-4 py-2 bg-primary rounded"
            >
              Set Lines 1-3 & 7-9 Visible
            </button>
            
            <button 
              onClick={() => setSettings({
                enabled: false,
                lineRanges: [],
                patterns: []
              })}
              className="px-4 py-2 bg-gray-600 rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestRedactionPage
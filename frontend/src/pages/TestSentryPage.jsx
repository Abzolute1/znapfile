import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const TestSentryPage = () => {
  const navigate = useNavigate()
  const [errorTriggered, setErrorTriggered] = useState(false)

  const triggerError = () => {
    setErrorTriggered(true)
    // This will trigger a Sentry error
    throw new Error('Test Sentry Error - This is intentional!')
  }

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-card-bg rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Sentry Test Page</h1>
          <p className="text-gray-400 mb-8">
            Click the button below to trigger a test error that will be sent to Sentry
          </p>
          
          <button
            onClick={triggerError}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            Trigger Test Error
          </button>

          {errorTriggered && (
            <p className="mt-4 text-green-400">
              Error triggered! Check your Sentry dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestSentryPage
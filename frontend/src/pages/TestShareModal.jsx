import { useState } from 'react'
import ShareModal from '../components/ShareModal'

const TestShareModal = () => {
  const [showModal, setShowModal] = useState(false)
  
  const testFile = {
    id: 'test-123',
    original_filename: 'test-document.pdf',
    file_size: 1024 * 1024 * 5, // 5MB
    short_code: 'abc123',
    has_password: false,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <h1 className="text-3xl font-bold mb-8">ShareModal Test Page</h1>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            console.log('Opening modal with file:', testFile)
            setShowModal(true)
          }}
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/80 transition"
        >
          Open Share Modal
        </button>
        
        <div className="text-sm text-gray-400">
          <p>Modal state: {showModal ? 'OPEN' : 'CLOSED'}</p>
          <p>Check console for debug messages</p>
        </div>
      </div>

      {showModal && (
        <ShareModal
          isOpen={showModal}
          onClose={() => {
            console.log('Closing modal')
            setShowModal(false)
          }}
          file={testFile}
        />
      )}
    </div>
  )
}

export default TestShareModal
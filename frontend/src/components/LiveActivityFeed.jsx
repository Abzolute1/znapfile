import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, UserPlus, Globe, FileText, Shield } from 'lucide-react'

const LiveActivityFeed = () => {
  const [activities, setActivities] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  // Simulated activity data - in production, this would come from a WebSocket
  const activityTemplates = [
    { icon: Upload, text: 'New file uploaded', location: 'San Francisco', color: 'text-green-400' },
    { icon: Download, text: 'File downloaded', location: 'London', color: 'text-blue-400' },
    { icon: UserPlus, text: 'New user joined', location: 'Tokyo', color: 'text-purple-400' },
    { icon: Shield, text: 'Secure link created', location: 'Berlin', color: 'text-yellow-400' },
    { icon: FileText, text: 'Document shared', location: 'Sydney', color: 'text-pink-400' },
  ]

  const locations = ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Berlin', 'Toronto', 'Dubai', 'Singapore', 'Mumbai']
  const fileSizes = ['1.2MB', '458KB', '2.3MB', '15.7MB', '890KB', '3.4MB']

  useEffect(() => {
    // Generate initial activities
    const initialActivities = Array.from({ length: 3 }, (_, i) => generateActivity(i))
    setActivities(initialActivities)

    // Add new activity every 3-8 seconds
    const interval = setInterval(() => {
      const newActivity = generateActivity(Date.now())
      setActivities(prev => {
        const updated = [newActivity, ...prev]
        return updated.slice(0, 5) // Keep only last 5
      })
    }, Math.random() * 5000 + 3000)

    return () => clearInterval(interval)
  }, [])

  const generateActivity = (id) => {
    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)]
    const location = locations[Math.floor(Math.random() * locations.length)]
    const size = fileSizes[Math.floor(Math.random() * fileSizes.length)]
    
    let text = template.text
    if (template.text.includes('uploaded') || template.text.includes('shared')) {
      text = `${size} ${template.text.toLowerCase()}`
    }

    return {
      id,
      ...template,
      text,
      location,
      timestamp: new Date()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-8 left-8 z-40 max-w-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Live Activity
        </h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/[0.03] backdrop-blur-sm rounded-lg p-3 border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <activity.icon className={`w-4 h-4 mt-0.5 ${activity.color}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{activity.text}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {activity.location} • just now
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse indicator */}
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <div className="w-full h-full bg-green-400 rounded-full" />
      </motion.div>
    </motion.div>
  )
}

export default LiveActivityFeed
import { useLocation } from 'react-router-dom'
import useStore from '../store/useStore'

const DebugInfo = () => {
  const location = useLocation()
  const user = useStore(state => state.user)
  
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 p-4 rounded-lg text-xs max-w-xs z-50">
      <div className="text-gray-400">Debug Info:</div>
      <div>Path: {location.pathname}</div>
      <div>User: {user ? user.email : 'Not logged in'}</div>
      <div>Tier: {user?.tier || 'N/A'}</div>
    </div>
  )
}

export default DebugInfo
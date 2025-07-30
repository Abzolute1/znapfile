import { Navigate } from 'react-router-dom'
import useStore from '../store/useStore'

const ProtectedRoute = ({ children }) => {
  const user = useStore(state => state.user)
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

export default ProtectedRoute
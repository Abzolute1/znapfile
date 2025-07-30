import { createContext, useContext } from 'react'
import useToast from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const ToastContext = createContext()

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const { toasts, removeToast, toast } = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export default ToastProvider
import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Force log to console even in production
    window.console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card-bg rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-text-muted mb-6">
              Don't worry, your files are safe. This is just a display error.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-text-muted hover:text-text">
                  Show error details
                </summary>
                <pre className="mt-2 p-4 bg-dark-bg rounded-lg text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-primary rounded-lg hover:bg-primary/80 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
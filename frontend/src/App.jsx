import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import HomePage from './pages/HomePage'
import UserHomePage from './pages/UserHomePage'
import SettingsPage from './pages/SettingsPage'
import MagicalDownloadPage from './pages/MagicalDownloadPage'
import DashboardPage from './pages/DashboardPage'
import DashboardPageNew from './pages/DashboardPageNew'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import PricingPage from './pages/PricingPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import CollectionPublicPage from './pages/CollectionPublicPage'
import TestShareModal from './pages/TestShareModal'
import TestRedactionMinimal from './pages/TestRedactionMinimal'
import RedactionDebug from './components/RedactionDebug'
import RedactionTestFinal from './pages/RedactionTestFinal'
import TestSentryPage from './pages/TestSentryPage'
import AdminDashboard from './pages/AdminDashboard'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ErrorBoundary from './components/ErrorBoundary'
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import DebugInfo from './components/DebugInfo'
import { ToastProvider } from './contexts/ToastContext'
import './App.css'

// 404 Page Component
const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-text-muted mb-8">Page not found</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary rounded-lg hover:bg-primary/80 transition inline-block"
        >
          Go to Homepage
        </button>
      </div>
    </div>
  )
}

// Loading Component
const PageLoading = () => (
  <div className="min-h-screen bg-dark-bg flex items-center justify-center">
    <LoadingSpinner />
  </div>
)

function App() {
  return (
    <SentryErrorBoundary fallback={({ error }) => (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary rounded-lg hover:bg-primary/80 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    )} showDialog>
      <ErrorBoundary>
        <Router>
          <ToastProvider>
            <div className="min-h-screen" style={{ backgroundColor: '#050505', color: '#F8FAFC' }}>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/user/home" element={<ProtectedRoute><UserHomePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/d/:code" element={<MagicalDownloadPage />} />
                <Route path="/c/:slug" element={<CollectionPublicPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPageNew /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
                <Route path="/test-share" element={<TestShareModal />} />
                <Route path="/test-redaction" element={<TestRedactionMinimal />} />
                <Route path="/redaction-debug" element={<RedactionDebug />} />
                <Route path="/redaction-final" element={<RedactionTestFinal />} />
                <Route path="/test-sentry" element={<TestSentryPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Suspense>
            <DebugInfo />
          </div>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
    </SentryErrorBoundary>
  )
}

export default App
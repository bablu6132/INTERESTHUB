import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from './AuthPage'
import ProfilePage from './ProfilePage'
import ProtectedRoute from './ProtectedRoute'
import ResultsPage from './ResultsPage'

function AppView() {
  return (
    <div className="min-h-screen bg-hero-grid px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
      <p className="text-center text-sm text-gray-500">
        Built by student developers with LOVE
      </p>
    </div>
  )
}

export default AppView

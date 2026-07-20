import { Navigate, Outlet } from 'react-router-dom'
import { useIsAuthenticated } from '../store/authStore'

export default function ProtectedRoute(): JSX.Element {
  const isAuthenticated = useIsAuthenticated()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

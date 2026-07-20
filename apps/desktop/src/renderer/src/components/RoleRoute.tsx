import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser, type UserRole } from '../store/authStore'

interface RoleRouteProps {
  allow: UserRole[]
}

/** Guards a group of routes so only the allowed roles can reach them. */
export default function RoleRoute({ allow }: RoleRouteProps): JSX.Element {
  const user = useCurrentUser()

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

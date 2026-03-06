import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface AuthGuardProps {
  requiredRole?: UserRole
  children?: React.ReactNode
}

export function AuthGuard({ requiredRole, children }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute() {
  const { isAdmin, loading } = useAuth()

  if (loading) return null

  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />
}

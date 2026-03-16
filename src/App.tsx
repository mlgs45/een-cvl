import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyNewPage from './pages/CompanyNewPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import CompanyEditPage from './pages/CompanyEditPage'
import ActivityFormPage from './pages/ActivityFormPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminActivityTypesPage from './pages/admin/AdminActivityTypesPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/new" element={<CompanyNewPage />} />
            <Route path="/companies/:id" element={<CompanyDetailPage />} />
            <Route path="/companies/:id/edit" element={<CompanyEditPage />} />
            <Route path="/activities/new" element={<ActivityFormPage />} />
            <Route path="/activities/:id/edit" element={<ActivityFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/activity-types" element={<AdminActivityTypesPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

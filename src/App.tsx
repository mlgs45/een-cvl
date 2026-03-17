import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AppLayout from './components/layout/AppLayout'

// Chargement synchrone pour les éléments critiques (auth + layout)
import LoginPage from './pages/LoginPage'

// Chargement lazy pour toutes les pages — chaque page devient un chunk séparé
const DashboardPage              = lazy(() => import('./pages/DashboardPage'))
const CompaniesPage              = lazy(() => import('./pages/CompaniesPage'))
const CompanyNewPage             = lazy(() => import('./pages/CompanyNewPage'))
const CompanyImportPage          = lazy(() => import('./pages/CompanyImportPage'))
const CompanyDetailPage          = lazy(() => import('./pages/CompanyDetailPage'))
const CompanyEditPage            = lazy(() => import('./pages/CompanyEditPage'))
const ActivityFormPage           = lazy(() => import('./pages/ActivityFormPage'))
const ProfilePage                = lazy(() => import('./pages/ProfilePage'))
const ReseauPage                 = lazy(() => import('./pages/ReseauPage'))
const ReseauLogFormPage          = lazy(() => import('./pages/ReseauLogFormPage'))
const ReseauObjectifsPage        = lazy(() => import('./pages/ReseauObjectifsPage'))
const AdminUsersPage             = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminActivityTypesPage     = lazy(() => import('./pages/admin/AdminActivityTypesPage'))
const AdminNetworkCategoriesPage = lazy(() => import('./pages/admin/AdminNetworkCategoriesPage'))

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"            element={<DashboardPage />} />
            <Route path="/companies"            element={<CompaniesPage />} />
            <Route path="/companies/new"        element={<CompanyNewPage />} />
            <Route path="/companies/import"     element={<CompanyImportPage />} />
            <Route path="/companies/:id"        element={<CompanyDetailPage />} />
            <Route path="/companies/:id/edit"   element={<CompanyEditPage />} />
            <Route path="/activities/new"       element={<ActivityFormPage />} />
            <Route path="/activities/:id/edit"  element={<ActivityFormPage />} />
            <Route path="/reseau"               element={<ReseauPage />} />
            <Route path="/reseau/log/new"       element={<ReseauLogFormPage />} />
            <Route path="/reseau/log/:id/edit"  element={<ReseauLogFormPage />} />
            <Route path="/profile"              element={<ProfilePage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users"              element={<AdminUsersPage />} />
              <Route path="/admin/activity-types"     element={<AdminActivityTypesPage />} />
              <Route path="/admin/network-categories" element={<AdminNetworkCategoriesPage />} />
              <Route path="/reseau/objectifs"         element={<ReseauObjectifsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

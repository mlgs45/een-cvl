import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
}

function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()

  const mainItems: NavItem[] = [
    { label: t('nav.dashboard'), to: '/dashboard', icon: <LayoutIcon /> },
    { label: t('nav.companies'), to: '/companies', icon: <BuildingIcon /> },
  ]

  const adminItems: NavItem[] = [
    { label: t('nav.users'), to: '/admin/users', icon: <UsersIcon /> },
    { label: t('nav.activityTypes'), to: '/admin/activity-types', icon: <TagIcon /> },
  ]

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 ${
      isActive
        ? 'bg-white/15 text-white font-medium'
        : 'text-sidebar-text hover:bg-white/8 hover:text-white'
    }`

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-60 bg-sidebar
        flex flex-col transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo officiel EEN */}
      <div className="flex flex-col items-start justify-center px-4 h-16 border-b border-sidebar-border shrink-0 gap-1">
        <img
          src="/een-logo.png"
          alt="Enterprise Europe Network"
          className="h-7 w-auto object-contain"
          draggable={false}
        />
        <span className="text-[10px] font-medium tracking-wide" style={{ color: '#9ec9e0' }}>
          CCIR Centre — CVL
        </span>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {mainItems.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onClose} className={navLinkClass}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {/* Section admin */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#5a9ab8' }}>
                {t('nav.admin')}
              </p>
            </div>
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={navLinkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bande décorative EEN en bas — le "Curve" gradient */}
      <div
        className="h-1 w-full shrink-0"
        style={{ background: 'linear-gradient(90deg, #00587C 0%, #006BA6 50%, #64B4E6 100%)' }}
      />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-[10px] font-medium" style={{ color: '#5a9ab8' }}>EEN CVL · v1.1</p>
      </div>
    </aside>
  )
}

import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success(t('auth.logoutSuccess'))
    navigate('/login')
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-2">
        {/* Lang toggle */}
        <button
          onClick={toggleLang}
          className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded transition-colors"
        >
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>

        {/* User + profil + logout */}
        <div className="flex items-center gap-1">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors group"
            title={t('nav.profile')}
          >
            {/* Avatar initiales */}
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold text-xs leading-none">
                {profile?.full_name
                  ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  : '?'}
              </span>
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 hidden sm:block max-w-[140px] truncate">
              {profile?.full_name}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('nav.logout')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

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

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="h-14 bg-white shadow-topbar flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
      {/* Bouton menu mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-2">
        {/* Lang toggle */}
        <button
          onClick={toggleLang}
          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg bg-white shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5"
          title={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
        >
          <span className={i18n.language === 'fr' ? 'font-semibold text-gray-900' : 'text-gray-400'}>FR</span>
          <span className="text-gray-300">/</span>
          <span className={i18n.language === 'en' ? 'font-semibold text-gray-900' : 'text-gray-400'}>EN</span>
        </button>

        {/* Séparateur */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Profil + déconnexion */}
        <div className="flex items-center gap-1">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all group"
            title={t('nav.profile')}
          >
            {/* Avatar avec gradient EEN */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #00587C 0%, #64B4E6 100%)' }}
            >
              <span className="text-white font-semibold text-xs leading-none">{initials}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 hidden sm:block max-w-[140px] truncate">
              {profile?.full_name}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            title={t('nav.logout')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

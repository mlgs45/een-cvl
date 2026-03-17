import { useState, FormEvent, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { profile, user } = useAuth()
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [saving, setSaving] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Initialiser le formulaire dès que le profil est chargé
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setOrganisation(profile.organisation)
    }
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim(), organisation: organisation.trim() })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('profile.updateSuccess'))
      // Rafraîchir les caches qui affichent le nom de l'utilisateur
      queryClient.invalidateQueries({ queryKey: ['advisors'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      // Recharger pour mettre à jour l'AuthContext (profil en mémoire)
      window.location.reload()
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('profile.changePasswordSuccess'))
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('profile.title')}</h1>

      {/* Avatar + résumé */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-xl leading-none">{initials}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg leading-tight">
            {profile?.full_name || '—'}
          </p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className={`mt-1 inline-flex badge ${
            profile?.role === 'admin'
              ? 'bg-primary-50 text-primary'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {profile?.role === 'admin'
              ? t('admin.users.roles.admin')
              : t('admin.users.roles.advisor')}
          </span>
        </div>
      </div>

      {/* Formulaire d'édition */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {t('profile.editSection')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email — lecture seule */}
          <div>
            <label className="label">{t('profile.email')}</label>
            <input
              type="email"
              className="input bg-gray-50 text-gray-400 cursor-not-allowed"
              value={user?.email ?? ''}
              disabled
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">{t('profile.emailReadOnly')}</p>
          </div>

          {/* Nom complet */}
          <div>
            <label className="label">{t('profile.fullName')} *</label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Prénom Nom"
              autoFocus
            />
          </div>

          {/* Organisation */}
          <div>
            <label className="label">{t('profile.organisation')}</label>
            <input
              type="text"
              className="input"
              value={organisation}
              onChange={e => setOrganisation(e.target.value)}
              placeholder="CCIR Centre"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !fullName.trim()}
            >
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </div>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {t('profile.changePassword')}
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">{t('profile.newPassword')} *</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="label">{t('profile.confirmPassword')} *</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? t('profile.saving') : t('profile.changePasswordSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

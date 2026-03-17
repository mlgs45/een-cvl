import { useState, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

interface Props {
  onDone: () => void
}

export default function ForcePasswordChangeModal({ onDone }: Props) {
  const { t } = useTranslation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    })
    setSaving(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('profile.changePasswordSuccess'))
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Icône */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          {t('forcePassword.title')}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {t('forcePassword.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
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

          <p className="text-xs text-gray-400">{t('forcePassword.hint')}</p>

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={saving || !newPassword || !confirmPassword}
          >
            {saving ? t('profile.saving') : t('forcePassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useState, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole, UserRow } from '../../types/database'

interface InviteForm {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  organisation: string
  role: UserRole
}

const emptyInvite: InviteForm = {
  email: '',
  password: '',
  confirmPassword: '',
  full_name: '',
  organisation: 'CCIR Centre',
  role: 'advisor',
}

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [form, setForm] = useState<InviteForm>(emptyInvite)
  const [inviting, setInviting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
  })

  async function handleRoleChange(userId: string, role: UserRole) {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('admin.users.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error(t('admin.users.invite.passwordMismatch'))
      return
    }
    if (form.password.length < 8) {
      toast.error(t('admin.users.invite.passwordTooShort'))
      return
    }

    setInviting(true)

    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        organisation: form.organisation,
        role: form.role,
      },
    })

    setInviting(false)

    if (error || data?.error) {
      const msg = data?.error ?? error?.message ?? t('common.error')
      // Messages d'erreur Supabase courants → traduction lisible
      if (msg.includes('already registered')) {
        toast.error(t('admin.users.invite.alreadyExists'))
      } else {
        toast.error(msg)
      }
      return
    }

    toast.success(t('admin.users.invite.success', { name: form.full_name }))
    setShowInviteModal(false)
    setForm(emptyInvite)
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  function closeModal() {
    setShowInviteModal(false)
    setForm(emptyInvite)
    setShowPassword(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('admin.users.title')}</h1>
        <button
          className="btn-primary"
          onClick={() => setShowInviteModal(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('admin.users.invite.button')}
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">{t('common.noData')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('admin.users.fullName')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">{t('admin.users.organisation')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('admin.users.role')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.full_name}</div>
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-gray-400">({t('admin.users.you')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.organisation}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input w-auto text-xs py-1"
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                      disabled={u.id === currentUser?.id}
                    >
                      <option value="advisor">{t('admin.users.roles.advisor')}</option>
                      <option value="admin">{t('admin.users.roles.admin')}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modale invitation ──────────────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header modale */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{t('admin.users.invite.title')}</h2>
              <button
                onClick={closeModal}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              {/* Nom complet */}
              <div>
                <label className="label">{t('admin.users.invite.fullName')} *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Prénom Nom"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="label">{t('admin.users.invite.email')} *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="prenom.nom@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              {/* Organisation */}
              <div>
                <label className="label">{t('admin.users.invite.organisation')}</label>
                <input
                  type="text"
                  className="input"
                  value={form.organisation}
                  onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))}
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="label">{t('admin.users.invite.role')}</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                >
                  <option value="advisor">{t('admin.users.roles.advisor')}</option>
                  <option value="admin">{t('admin.users.roles.admin')}</option>
                </select>
              </div>

              {/* Mot de passe temporaire */}
              <div>
                <label className="label">{t('admin.users.invite.password')} *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="8 caractères minimum"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('admin.users.invite.passwordHint')}</p>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label className="label">{t('admin.users.invite.confirmPassword')} *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Répéter le mot de passe"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={inviting}>
                  {inviting ? t('admin.users.invite.creating') : t('admin.users.invite.create')}
                </button>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={inviting}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

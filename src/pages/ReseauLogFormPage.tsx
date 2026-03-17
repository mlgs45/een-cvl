import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { NetworkCategoryRow, UserRow } from '../types/database'

const today = new Date().toISOString().slice(0, 10)

interface LogForm {
  date: string
  category_id: string
  name: string
  advisor_id: string
  comment: string
}

export default function ReseauLogFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const isEdit = !!id

  const [form, setForm] = useState<LogForm>({
    date: today,
    category_id: '',
    name: '',
    advisor_id: user?.id ?? '',
    comment: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  const { data: categories = [] } = useQuery({
    queryKey: ['network-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_activity_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as NetworkCategoryRow[]
    },
  })

  const { data: advisors = [] } = useQuery({
    queryKey: ['network-advisors-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
    enabled: isAdmin,
  })

  // Load existing entry when editing
  useEffect(() => {
    if (!isEdit) return
    supabase
      .from('network_activity_logs')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/reseau?tab=log'); return }
        const row = data as import('../types/database').NetworkLogRow
        setForm({
          date: row.date,
          category_id: row.category_id,
          name: row.name,
          advisor_id: row.advisor_id,
          comment: row.comment ?? '',
        })
        setLoaded(true)
      })
  }, [id, isEdit, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.category_id) { toast.error(t('common.required')); return }
    if (!form.name.trim()) { toast.error(t('common.required')); return }

    setSaving(true)

    if (isEdit) {
      const { error } = await supabase
        .from('network_activity_logs')
        .update({
          date: form.date,
          category_id: form.category_id,
          name: form.name.trim(),
          advisor_id: form.advisor_id,
          comment: form.comment.trim() || null,
        })
        .eq('id', id!)
      setSaving(false)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('network.form.updateSuccess'))
    } else {
      const { error } = await supabase
        .from('network_activity_logs')
        .insert({
          date: form.date,
          category_id: form.category_id,
          name: form.name.trim(),
          advisor_id: form.advisor_id,
          comment: form.comment.trim() || null,
          created_by: user?.id,
        })
      setSaving(false)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('network.form.createSuccess'))
    }

    navigate('/reseau?tab=log')
  }

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">
          {isEdit ? t('network.form.titleEdit') : t('network.form.titleNew')}
        </h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="label">{t('network.form.date')} *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="label">{t('network.form.category')} *</label>
            <select
              className="input"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              required
            >
              <option value="">{t('network.form.selectCategory')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label_fr}</option>
              ))}
            </select>
          </div>

          {/* Nom */}
          <div>
            <label className="label">{t('network.form.name')} *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('network.form.namePlaceholder')}
              required
            />
          </div>

          {/* Conseiller — admin uniquement peut changer */}
          {isAdmin ? (
            <div>
              <label className="label">{t('network.form.advisor')}</label>
              <select
                className="input"
                value={form.advisor_id}
                onChange={e => setForm(f => ({ ...f, advisor_id: e.target.value }))}
              >
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">{t('network.form.advisor')}</label>
              <input
                className="input bg-gray-50"
                value={advisors.find(a => a.id === form.advisor_id)?.full_name ?? user?.email ?? ''}
                disabled
                readOnly
              />
            </div>
          )}

          {/* Commentaire */}
          <div>
            <label className="label">{t('network.form.comment')}</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('network.form.saving') : t('network.form.save')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              {t('network.form.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

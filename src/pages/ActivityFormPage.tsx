import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ActivityTypeRow, ActivitySubtypeRow, ActivityRow } from '../types/database'
import { format } from 'date-fns'

interface FormState {
  company_id: string
  date: string
  activity_type_id: string
  activity_subtype_id: string
  description: string
  follow_up: boolean
  follow_up_date: string
  notes: string
}

export default function ActivityFormPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isEdit = !!id

  const companyIdFromUrl = searchParams.get('company_id') ?? ''

  const [form, setForm] = useState<FormState>({
    company_id: companyIdFromUrl,
    date: format(new Date(), 'yyyy-MM-dd'),
    activity_type_id: '',
    activity_subtype_id: '',
    description: '',
    follow_up: false,
    follow_up_date: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Load existing activity when editing
  const { data: existing } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as ActivityRow
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        company_id: existing.company_id,
        date: existing.date,
        activity_type_id: existing.activity_type_id,
        activity_subtype_id: existing.activity_subtype_id ?? '',
        description: existing.description ?? '',
        follow_up: existing.follow_up,
        follow_up_date: existing.follow_up_date ?? '',
        notes: existing.notes ?? '',
      })
    }
  }, [existing])

  // Activity types
  const { data: activityTypes = [] } = useQuery({
    queryKey: ['activity-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as ActivityTypeRow[]
    },
  })

  // Subtypes filtered by selected type
  const { data: subtypes = [] } = useQuery({
    queryKey: ['activity-subtypes', form.activity_type_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_subtypes')
        .select('*')
        .eq('activity_type_id', form.activity_type_id)
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as ActivitySubtypeRow[]
    },
    enabled: !!form.activity_type_id,
  })

  // Company name for display
  const { data: company } = useQuery({
    queryKey: ['company', form.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', form.company_id)
        .single()
      return data
    },
    enabled: !!form.company_id,
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'activity_type_id') {
      setForm(f => ({ ...f, activity_type_id: value as string, activity_subtype_id: '' }))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      company_id: form.company_id,
      date: form.date,
      activity_type_id: form.activity_type_id,
      activity_subtype_id: form.activity_subtype_id || null,
      description: form.description || null,
      follow_up: form.follow_up,
      follow_up_date: (form.follow_up && form.follow_up_date) ? form.follow_up_date : null,
      notes: form.notes || null,
    }

    let error
    if (isEdit) {
      ({ error } = await supabase.from('activities').update(payload).eq('id', id!))
    } else {
      ({ error } = await supabase.from('activities').insert({ ...payload, created_by: user.id }))
    }

    setSaving(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(isEdit ? t('activities.form.updateSuccess') : t('activities.form.createSuccess'))
      queryClient.invalidateQueries({ queryKey: ['company-activities', form.company_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] })
      navigate(form.company_id ? `/companies/${form.company_id}` : '/companies')
    }
  }

  const selectedType = activityTypes.find(t => t.id === form.activity_type_id)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isEdit ? t('activities.edit') : t('activities.new')}
          </h1>
          {company && <p className="text-sm text-gray-500">{company.name}</p>}
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div>
            <label className="label">{t('activities.form.date')} *</label>
            <input
              type="date"
              className="input sm:w-48"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
            />
          </div>

          {/* Activity type */}
          <div>
            <label className="label">{t('activities.form.activityType')} *</label>
            <select
              className="input sm:w-80"
              value={form.activity_type_id}
              onChange={e => set('activity_type_id', e.target.value)}
              required
            >
              <option value="">{t('activities.form.selectType')}</option>
              {activityTypes.map(at => (
                <option key={at.id} value={at.id}>
                  {lang === 'fr' ? at.label_fr : at.label_en}
                </option>
              ))}
            </select>
          </div>

          {/* Subtype */}
          {subtypes.length > 0 && (
            <div>
              <label className="label">{t('activities.form.activitySubtype')}</label>
              <select
                className="input sm:w-80"
                value={form.activity_subtype_id}
                onChange={e => set('activity_subtype_id', e.target.value)}
              >
                <option value="">{t('activities.form.selectSubtype')}</option>
                {subtypes.map(st => (
                  <option key={st.id} value={st.id}>
                    {lang === 'fr' ? st.label_fr : st.label_en}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label">{t('activities.form.description')}</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={form.follow_up}
                onChange={e => set('follow_up', e.target.checked)}
              />
              <span className="text-sm text-gray-700">{t('activities.form.followUp')}</span>
            </label>

            {form.follow_up && (
              <div>
                <label className="label">{t('activities.form.followUpDate')}</label>
                <input
                  type="date"
                  className="input sm:w-48"
                  value={form.follow_up_date}
                  onChange={e => set('follow_up_date', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">{t('activities.form.notes')}</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('activities.form.saving') : t('activities.form.save')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              {t('activities.form.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

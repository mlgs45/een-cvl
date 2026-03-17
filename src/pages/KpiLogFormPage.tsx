import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { UserRow, KpiManualLogRow } from '../types/database'

const today = new Date().toISOString().slice(0, 10)

const MANUAL_KPIS = [
  {
    code: 'KPI5s',
    label_fr: 'KPI5s – Communication Success stories',
    placeholder_fr: 'Ex: Success story – Entreprise X, innovation Y',
    placeholder_en: 'Ex: Success story – Company X, innovation Y',
  },
  {
    code: 'KPI5t',
    label_fr: 'KPI5t – Communication Témoignages',
    placeholder_fr: 'Ex: Témoignage – Contact Prénom NOM, Entreprise X',
    placeholder_en: 'Ex: Testimonial – Contact First LAST, Company X',
  },
  {
    code: 'KPI7',
    label_fr: 'KPI7 – Identification problématiques entreprises',
    placeholder_fr: 'Ex: Problématique identifiée – Financement R&D, secteur industrie',
    placeholder_en: 'Ex: Issue identified – R&D Funding, industrial sector',
  },
] as const

interface KpiLogForm {
  kpi_code: string
  date: string
  title: string
  advisor_id: string
  company_id: string
  comment: string
}

export default function KpiLogFormPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const isEdit = !!id

  const [form, setForm] = useState<KpiLogForm>({
    kpi_code: 'KPI5s',
    date: today,
    title: '',
    advisor_id: user?.id ?? '',
    company_id: '',
    comment: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  const { data: advisors = [] } = useQuery({
    queryKey: ['kpi-advisors-active'],
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

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  // Charger l'entrée existante en mode édition
  useEffect(() => {
    if (!isEdit) return
    supabase
      .from('kpi_manual_logs')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/kpi'); return }
        const row = data as KpiManualLogRow
        setForm({
          kpi_code: row.kpi_code,
          date: row.date,
          title: row.title,
          advisor_id: row.advisor_id,
          company_id: row.company_id ?? '',
          comment: row.comment ?? '',
        })
        setLoaded(true)
      })
  }, [id, isEdit, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error(t('common.required')); return }

    setSaving(true)
    const payload = {
      kpi_code: form.kpi_code,
      date: form.date,
      title: form.title.trim(),
      advisor_id: form.advisor_id,
      company_id: form.company_id || null,
      comment: form.comment.trim() || null,
    }

    if (isEdit) {
      const { error } = await supabase.from('kpi_manual_logs').update(payload).eq('id', id!)
      setSaving(false)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('kpi.form.updateSuccess'))
    } else {
      const { error } = await supabase
        .from('kpi_manual_logs')
        .insert({ ...payload, created_by: user?.id })
      setSaving(false)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('kpi.form.createSuccess'))
    }

    navigate('/kpi?tab=advisor')
  }

  const selectedKpiDef = MANUAL_KPIS.find(k => k.code === form.kpi_code)
  const placeholder = lang === 'fr'
    ? (selectedKpiDef?.placeholder_fr ?? '')
    : (selectedKpiDef?.placeholder_en ?? '')

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">
          {isEdit ? t('kpi.form.titleEdit') : t('kpi.form.titleNew')}
        </h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* KPI */}
          <div>
            <label className="label">{t('kpi.form.kpi')} *</label>
            <select
              className="input"
              value={form.kpi_code}
              onChange={e => setForm(f => ({ ...f, kpi_code: e.target.value }))}
            >
              {MANUAL_KPIS.map(k => (
                <option key={k.code} value={k.code}>{k.label_fr}</option>
              ))}
            </select>
          </div>

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

          {/* Titre */}
          <div>
            <label className="label">{t('kpi.form.title')} *</label>
            <input
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={placeholder}
              required
            />
          </div>

          {/* Conseiller */}
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
                value={user?.email ?? ''}
                disabled
                readOnly
              />
            </div>
          )}

          {/* Entreprise liée */}
          <div>
            <label className="label">{t('kpi.form.company')}</label>
            <select
              className="input"
              value={form.company_id}
              onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
            >
              <option value="">— {t('dashboard.filters.all')} —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

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

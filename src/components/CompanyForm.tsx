import { useState, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CompanyRow, UserRow } from '../types/database'

// VoiceInputButton est disponible dans ./VoiceInputButton — réactiver quand souhaité
// import VoiceInputButton from './VoiceInputButton'

type CompanyFormData = Omit<CompanyRow, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'users'>

interface CompanyFormProps {
  initial?: Partial<CompanyFormData>
  onSubmit: (data: CompanyFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}

const empty: CompanyFormData = {
  name: '',
  vat_number: null,
  address: null,
  postcode: null,
  city: null,
  region: null,
  country: 'France',
  contact_name: null,
  phone: null,
  mobile: null,
  email: null,
  website: null,
  keywords: null,
  een_contact_id: null,
}

export default function CompanyForm({ initial, onSubmit, onCancel, saving }: CompanyFormProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<CompanyFormData>({ ...empty, ...initial })

  const { data: advisors = [] } = useQuery({
    queryKey: ['advisors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
  })

  function set(key: keyof CompanyFormData, value: string | null) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">{t('companies.form.name')} *</label>
          <input
            className="input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">{t('companies.form.vatNumber')}</label>
          <input className="input" value={form.vat_number ?? ''} onChange={e => set('vat_number', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.contactName')}</label>
          <input className="input" value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">{t('companies.form.address')}</label>
          <input className="input" value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.postcode')}</label>
          <input className="input" value={form.postcode ?? ''} onChange={e => set('postcode', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.city')}</label>
          <input className="input" value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.region')}</label>
          <input className="input" value={form.region ?? ''} onChange={e => set('region', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.country')}</label>
          <input className="input" value={form.country ?? 'France'} onChange={e => set('country', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.phone')}</label>
          <input type="tel" className="input" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.mobile')}</label>
          <input type="tel" className="input" value={form.mobile ?? ''} onChange={e => set('mobile', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.email')}</label>
          <input type="email" className="input" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
        </div>

        <div>
          <label className="label">{t('companies.form.website')}</label>
          <input type="url" className="input" value={form.website ?? ''} onChange={e => set('website', e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">{t('companies.form.keywords')}</label>
          <input className="input" value={form.keywords ?? ''} onChange={e => set('keywords', e.target.value)} placeholder="mot1, mot2, ..." />
        </div>

        <div>
          <label className="label">{t('companies.form.eenContact')}</label>
          <select
            className="input"
            value={form.een_contact_id ?? ''}
            onChange={e => set('een_contact_id', e.target.value)}
          >
            <option value="">—</option>
            {advisors.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? t('companies.form.saving') : t('companies.form.save')}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          {t('companies.form.cancel')}
        </button>
      </div>
    </form>
  )
}

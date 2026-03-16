import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import CompanyForm from '../components/CompanyForm'

export default function CompanyNewPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(data: Parameters<typeof CompanyForm>[0]['initial']) {
    if (!user) return
    setSaving(true)
    const { data: company, error } = await supabase
      .from('companies')
      .insert({ ...data, name: data!.name as string, created_by: user.id })
      .select()
      .single()
    setSaving(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('companies.form.createSuccess'))
      navigate(`/companies/${(company as any).id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{t('companies.new')}</h1>
      </div>
      <div className="card p-6">
        <CompanyForm
          onSubmit={handleSubmit as any}
          onCancel={() => navigate(-1)}
          saving={saving}
        />
      </div>
    </div>
  )
}

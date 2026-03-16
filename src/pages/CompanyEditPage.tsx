import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CompanyRow } from '../types/database'
import CompanyForm from '../components/CompanyForm'

export default function CompanyEditPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as CompanyRow
    },
    enabled: !!id,
  })

  async function handleSubmit(data: Partial<CompanyRow>) {
    setSaving(true)
    const { error } = await supabase
      .from('companies')
      .update(data)
      .eq('id', id!)
    setSaving(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('companies.form.updateSuccess'))
      queryClient.invalidateQueries({ queryKey: ['company', id] })
      queryClient.invalidateQueries({ queryKey: ['companies-list'] })
      navigate(`/companies/${id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="card p-6 space-y-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{company?.name}</h1>
      </div>
      <div className="card p-6">
        <CompanyForm
          initial={company}
          onSubmit={handleSubmit as any}
          onCancel={() => navigate(`/companies/${id}`)}
          saving={saving}
        />
      </div>
    </div>
  )
}

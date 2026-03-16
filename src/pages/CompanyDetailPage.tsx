import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CompanyRow, ActivityRow, ActivityTypeRow, ActivitySubtypeRow } from '../types/database'
import { format } from 'date-fns'

interface ActivityWithJoins extends ActivityRow {
  activity_types: { label_fr: string; label_en: string } | null
  activity_subtypes: { label_fr: string; label_en: string } | null
  users: { full_name: string } | null
}

export default function CompanyDetailPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAdmin } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`*, users!companies_een_contact_id_fkey ( full_name )`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as CompanyRow & { users: { full_name: string } | null }
    },
    enabled: !!id,
  })

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['company-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_types ( label_fr, label_en ),
          activity_subtypes ( label_fr, label_en ),
          users ( full_name )
        `)
        .eq('company_id', id!)
        .order('date', { ascending: false })
      if (error) throw error
      return data as ActivityWithJoins[]
    },
    enabled: !!id,
  })

  const canEdit = isAdmin || company?.created_by === user?.id

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('companies').delete().eq('id', id!)
    setDeleting(false)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('companies.form.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['companies-list'] })
      navigate('/companies')
    }
  }

  async function handleDeleteActivity(activityId: string) {
    const { error } = await supabase.from('activities').delete().eq('id', activityId)
    if (error) {
      toast.error(t('common.error'))
    } else {
      toast.success(t('activities.form.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['company-activities', id] })
    }
  }

  if (companyLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-7 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="card p-6 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!company) {
    return <p className="text-center text-gray-400 mt-12">{t('common.noData')}</p>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/companies')} className="text-gray-400 hover:text-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{company.name}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Link to={`/companies/${id}/edit`} className="btn-secondary">
              {t('companies.detail.edit')}
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-danger"
              disabled={deleting}
            >
              {t('companies.detail.delete')}
            </button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">{t('companies.detail.confirmDelete')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('companies.detail.deleteWarning')}</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                {t('common.cancel')}
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('companies.detail.info')}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {company.vat_number && (
              <>
                <dt className="text-gray-500">{t('companies.form.vatNumber')}</dt>
                <dd className="text-gray-900">{company.vat_number}</dd>
              </>
            )}
            {company.address && (
              <>
                <dt className="text-gray-500">{t('companies.form.address')}</dt>
                <dd className="text-gray-900">{company.address}</dd>
              </>
            )}
            {(company.postcode || company.city) && (
              <>
                <dt className="text-gray-500">{t('companies.form.city')}</dt>
                <dd className="text-gray-900">{[company.postcode, company.city].filter(Boolean).join(' ')}</dd>
              </>
            )}
            {company.region && (
              <>
                <dt className="text-gray-500">{t('companies.form.region')}</dt>
                <dd className="text-gray-900">{company.region}</dd>
              </>
            )}
            <dt className="text-gray-500">{t('companies.form.country')}</dt>
            <dd className="text-gray-900">{company.country}</dd>
            {company.keywords && (
              <>
                <dt className="text-gray-500">{t('companies.form.keywords')}</dt>
                <dd className="text-gray-900">{company.keywords}</dd>
              </>
            )}
            {company.een_contact_id && (
              <>
                <dt className="text-gray-500">{t('companies.form.eenContact')}</dt>
                <dd className="text-gray-900">{(company as any).users?.full_name ?? '—'}</dd>
              </>
            )}
          </dl>
        </div>

        {/* Contact card */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('companies.detail.contact')}</h2>
          <dl className="space-y-2 text-sm">
            {company.contact_name && (
              <div>
                <dt className="text-gray-500 text-xs">{t('companies.form.contactName')}</dt>
                <dd className="text-gray-900 font-medium">{company.contact_name}</dd>
              </div>
            )}
            {company.phone && (
              <div>
                <dt className="text-gray-500 text-xs">{t('companies.form.phone')}</dt>
                <dd><a href={`tel:${company.phone}`} className="text-primary hover:underline">{company.phone}</a></dd>
              </div>
            )}
            {company.mobile && (
              <div>
                <dt className="text-gray-500 text-xs">{t('companies.form.mobile')}</dt>
                <dd><a href={`tel:${company.mobile}`} className="text-primary hover:underline">{company.mobile}</a></dd>
              </div>
            )}
            {company.email && (
              <div>
                <dt className="text-gray-500 text-xs">{t('companies.form.email')}</dt>
                <dd><a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a></dd>
              </div>
            )}
            {company.website && (
              <div>
                <dt className="text-gray-500 text-xs">{t('companies.form.website')}</dt>
                <dd>
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </dd>
              </div>
            )}
            {!company.contact_name && !company.phone && !company.mobile && !company.email && !company.website && (
              <p className="text-gray-400 text-xs">{t('common.noData')}</p>
            )}
          </dl>
        </div>
      </div>

      {/* Activity log */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('companies.detail.activities')}</h2>
          <Link
            to={`/activities/new?company_id=${id}`}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('companies.detail.addActivity')}
          </Link>
        </div>

        {activitiesLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded flex-1" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">{t('activities.noActivities')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map(activity => {
              const canEditActivity = isAdmin || activity.created_by === user?.id
              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs tabular-nums text-gray-400">
                          {format(new Date(activity.date), 'dd/MM/yyyy')}
                        </span>
                        <span className="badge bg-primary-50 text-primary">
                          {lang === 'fr'
                            ? activity.activity_types?.label_fr
                            : activity.activity_types?.label_en}
                        </span>
                        {activity.activity_subtypes && (
                          <span className="badge bg-gray-100 text-gray-600">
                            {lang === 'fr'
                              ? activity.activity_subtypes.label_fr
                              : activity.activity_subtypes.label_en}
                          </span>
                        )}
                        {activity.follow_up && (
                          <span className="badge bg-amber-50 text-amber-700">
                            Suivi {activity.follow_up_date ? format(new Date(activity.follow_up_date), 'dd/MM') : ''}
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-700">{activity.description}</p>
                      )}
                      {activity.notes && (
                        <p className="text-xs text-gray-400 mt-1">{activity.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{activity.users?.full_name}</p>
                    </div>
                    {canEditActivity && (
                      <div className="flex gap-1 shrink-0">
                        <Link
                          to={`/activities/${activity.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                          title={t('common.edit')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm(t('activities.form.confirmDelete'))) {
                              handleDeleteActivity(activity.id)
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title={t('common.delete')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CompanyRow, UserRow } from '../types/database'
import { format } from 'date-fns'

interface CompanyWithMeta extends CompanyRow {
  users: { full_name: string } | null
  activity_count: number
  last_activity_date: string | null
}

export default function CompaniesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterAdvisor, setFilterAdvisor] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          users!companies_een_contact_id_fkey ( full_name )
        `)
        .order('name')
      if (error) throw error
      return data as (CompanyRow & { users: { full_name: string } | null })[]
    },
  })

  const { data: activityMeta = [] } = useQuery({
    queryKey: ['company-activity-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('company_id, date')
        .order('date', { ascending: false })
      if (error) throw error
      return data as { company_id: string; date: string }[]
    },
  })

  const { data: advisors = [] } = useQuery({
    queryKey: ['advisors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
  })

  // Compute activity counts per company
  const metaByCompany = useMemo(() => {
    const map = new Map<string, { count: number; last: string | null }>()
    for (const a of activityMeta) {
      const entry = map.get(a.company_id)
      if (!entry) {
        map.set(a.company_id, { count: 1, last: a.date })
      } else {
        entry.count++
        if (!entry.last || a.date > entry.last) entry.last = a.date
      }
    }
    return map
  }, [activityMeta])

  const enriched: CompanyWithMeta[] = useMemo(() => {
    return companies.map(c => {
      const meta = metaByCompany.get(c.id) ?? { count: 0, last: null }
      return {
        ...c,
        activity_count: meta.count,
        last_activity_date: meta.last,
      }
    })
  }, [companies, metaByCompany])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(c => {
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.city?.toLowerCase().includes(q) ?? false) ||
        (c.keywords?.toLowerCase().includes(q) ?? false)
      const matchAdvisor = !filterAdvisor || c.een_contact_id === filterAdvisor
      return matchSearch && matchAdvisor
    })
  }, [enriched, search, filterAdvisor])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('companies.title')}</h1>
        <div className="flex items-center gap-2">
          <Link to="/companies/import" className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {t('companies.import')}
          </Link>
          <Link to="/companies/new" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('companies.new')}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="input pl-9 pr-8"
            placeholder={t('companies.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label="Effacer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <select
          className="input sm:w-48"
          value={filterAdvisor}
          onChange={e => setFilterAdvisor(e.target.value)}
        >
          <option value="">{t('companies.filterAdvisor')}</option>
          {advisors.map(a => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-4 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">{t('companies.noResults')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('companies.columns.name')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">{t('companies.columns.city')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">{t('companies.columns.eenContact')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">{t('companies.columns.lastActivity')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">{t('companies.columns.totalActivities')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(company => (
                  <tr key={company.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/companies/${company.id}`)}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/companies/${company.id}`}
                        className="font-medium text-gray-900 hover:text-primary"
                        onClick={e => e.stopPropagation()}
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{company.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {company.users?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell tabular-nums">
                      {company.last_activity_date
                        ? format(new Date(company.last_activity_date), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="badge bg-gray-100 text-gray-700">{company.activity_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

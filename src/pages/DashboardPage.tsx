import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ActivityRow, ActivityTypeRow, UserRow, NetworkCategoryRow, NetworkObjectiveRow, NetworkLogRow, KpiTeamObjectiveRow, KpiAutoActualRow, KpiManualLogRow } from '../types/database'
import { format } from 'date-fns'

const EEN_START = '2025-07-01'
const EEN_END = '2028-12-31'

interface ActivityWithJoins extends ActivityRow {
  activity_types: { label_fr: string; label_en: string } | null
  users: { full_name: string } | null
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'

  const [dateFrom, setDateFrom] = useState(EEN_START)
  const [dateTo, setDateTo] = useState(EEN_END)
  const [filterAdvisor, setFilterAdvisor] = useState('')
  const [filterType, setFilterType] = useState('')

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_types ( label_fr, label_en ),
          users ( full_name )
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })
      if (error) throw error
      return data as ActivityWithJoins[]
    },
  })

  const { data: activityTypes = [] } = useQuery({
    queryKey: ['activity-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as ActivityTypeRow[]
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

  const { data: companiesCount = 0 } = useQuery({
    queryKey: ['companies-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
  })

  // Filter activities
  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (filterAdvisor && a.created_by !== filterAdvisor) return false
      if (filterType && a.activity_type_id !== filterType) return false
      return true
    })
  }, [activities, filterAdvisor, filterType])

  // By type
  const byType = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const at of activityTypes) {
      const label = lang === 'fr' ? at.label_fr : at.label_en
      map.set(at.id, { label, count: 0 })
    }
    for (const a of filtered) {
      const entry = map.get(a.activity_type_id)
      if (entry) entry.count++
    }
    return Array.from(map.values()).filter(e => e.count > 0)
  }, [filtered, activityTypes, lang])

  // By advisor
  const byAdvisor = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const a of filtered) {
      const name = a.users?.full_name ?? '—'
      const entry = map.get(a.created_by)
      if (entry) {
        entry.count++
      } else {
        map.set(a.created_by, { name, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [filtered])

  const { user: currentUser } = useAuth()

  const currentYear = new Date().getFullYear()

  const { data: networkCategories = [] } = useQuery({
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

  const { data: networkObjectives = [] } = useQuery({
    queryKey: ['network-objectives', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_objectives')
        .select('*')
        .eq('year', currentYear)
      if (error) throw error
      return data as NetworkObjectiveRow[]
    },
  })

  const { data: networkLogs = [] } = useQuery({
    queryKey: ['network-logs-dashboard', currentYear],
    queryFn: async () => {
      if (!currentUser) return []
      const { data, error } = await supabase
        .from('network_activity_logs')
        .select('*')
        .eq('advisor_id', currentUser.id)
        .eq('year', currentYear)
      if (error) throw error
      return data as NetworkLogRow[]
    },
    enabled: !!currentUser,
  })

  const { data: kpiTeamObjectives = [] } = useQuery({
    queryKey: ['kpi-team-objectives-dashboard', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_team_objectives')
        .select('*')
        .eq('year', currentYear)
      if (error) throw error
      return data as KpiTeamObjectiveRow[]
    },
  })

  const { data: kpiAutoActuals = [] } = useQuery({
    queryKey: ['kpi-auto-actuals-dashboard', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_auto_actuals')
        .select('*')
        .eq('year', currentYear)
      if (error) throw error
      return data as KpiAutoActualRow[]
    },
  })

  const { data: kpiManualLogs = [] } = useQuery({
    queryKey: ['kpi-manual-logs-dashboard', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_manual_logs')
        .select('*')
        .eq('year', currentYear)
      if (error) throw error
      return data as KpiManualLogRow[]
    },
  })

    function resetFilters() {
    setDateFrom(EEN_START)
    setDateTo(EEN_END)
    setFilterAdvisor('')
    setFilterType('')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.period')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dashboard.totalCompanies')}</p>
          {activitiesLoading ? (
            <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-1">{companiesCount}</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dashboard.totalActivities')}</p>
          {activitiesLoading ? (
            <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-1">{filtered.length}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">{t('common.actions')}</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">{t('dashboard.filters.dateRange')} —</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input w-36 text-xs"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="date"
                className="input w-36 text-xs"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">{t('dashboard.filters.advisor')}</label>
            <select
              className="input w-44 text-xs"
              value={filterAdvisor}
              onChange={e => setFilterAdvisor(e.target.value)}
            >
              <option value="">{t('dashboard.filters.all')}</option>
              {advisors.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">{t('dashboard.filters.activityType')}</label>
            <select
              className="input w-52 text-xs"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">{t('dashboard.filters.all')}</option>
              {activityTypes.map(at => (
                <option key={at.id} value={at.id}>
                  {lang === 'fr' ? at.label_fr : at.label_en}
                </option>
              ))}
            </select>
          </div>
          <button onClick={resetFilters} className="btn-secondary text-xs">
            {t('dashboard.filters.reset')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By type */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">{t('dashboard.activitiesByType')}</h2>
          </div>
          {activitiesLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          ) : byType.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('dashboard.columns.type')}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('dashboard.columns.count')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byType.map(row => (
                  <tr key={row.label} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.label}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{row.count}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-gray-900">{t('dashboard.columns.total')}</td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    {byType.reduce((s, r) => s + r.count, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* By advisor */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">{t('dashboard.activitiesByAdvisor')}</h2>
          </div>
          {activitiesLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 - i * 15}%` }} />
              ))}
            </div>
          ) : byAdvisor.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t('common.noData')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('dashboard.columns.advisor')}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('dashboard.columns.count')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byAdvisor.map(row => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.name}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{row.count}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-2 text-gray-900">{t('dashboard.columns.total')}</td>
                  <td className="px-4 py-2 text-right text-gray-900">
                    {byAdvisor.reduce((s, r) => s + r.count, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent activities mini-table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Activités récentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('dashboard.columns.type')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('dashboard.columns.advisor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.slice(0, 10).map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 tabular-nums">
                      {format(new Date(a.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {lang === 'fr'
                        ? a.activity_types?.label_fr
                        : a.activity_types?.label_en}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{a.users?.full_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vie du réseau — carte personnelle */}
      {networkCategories.length > 0 && (
        <NetworkCard
          t={t}
          lang={lang}
          categories={networkCategories}
          objectives={networkObjectives}
          logs={networkLogs}
          currentUserId={currentUser?.id ?? ''}
          currentYear={currentYear}
        />
      )}

      {/* Suivi KPI — carte équipe */}
      {kpiTeamObjectives.length > 0 && (
        <KpiCard
          t={t}
          teamObjectives={kpiTeamObjectives}
          autoActuals={kpiAutoActuals}
          manualLogs={kpiManualLogs}
          currentYear={currentYear}
        />
      )}
    </div>
  )
}

// ── KpiCard component ──────────────────────────────────────────────────────
const KPI_DEFS_DASHBOARD = [
  { code: 'KPI1',  label_fr: 'Contact entreprise' },
  { code: 'KPI2',  label_fr: 'Parcours client' },
  { code: 'KPI3A', label_fr: 'Impact conseil (AA)' },
  { code: 'KPI3B', label_fr: 'Accord inter-ent. (PA)' },
  { code: 'KPI4',  label_fr: 'Enquête impact' },
  { code: 'KPI5s', label_fr: 'Success stories' },
  { code: 'KPI5t', label_fr: 'Témoignages' },
  { code: 'KPI6',  label_fr: 'Contribution EEN' },
  { code: 'KPI7',  label_fr: 'Identification pb.' },
]

function KpiCard({ t, teamObjectives, autoActuals, manualLogs, currentYear }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  teamObjectives: KpiTeamObjectiveRow[]
  autoActuals: KpiAutoActualRow[]
  manualLogs: KpiManualLogRow[]
  currentYear: number
}) {
  const rows = useMemo(() => KPI_DEFS_DASHBOARD.map(kpi => {
    const target = Number(teamObjectives.find(o => o.kpi_code === kpi.code)?.target_count ?? 0)
    const auto   = autoActuals.filter(a => a.kpi_code === kpi.code).reduce((s, a) => s + Number(a.actual), 0)
    const manual = manualLogs.filter(l => l.kpi_code === kpi.code).length
    const actual = auto + manual
    const pct    = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : 0
    return { kpi, target, actual, pct }
  }).filter(r => r.target > 0), [teamObjectives, autoActuals, manualLogs])

  if (rows.length === 0) return null

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">
          {t('kpi.title')} — {currentYear}
        </h2>
        <Link to="/kpi" className="text-xs text-primary hover:underline">
          {t('dashboard.networkCard.viewAll')}
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-20">{t('kpi.table.code')}</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('kpi.table.actual')}</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('kpi.table.target')}</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-16">{t('kpi.table.rate')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ kpi, target, actual, pct }) => (
            <tr key={kpi.code} className="hover:bg-gray-50">
              <td className="px-4 py-1.5 font-mono text-xs text-gray-500">{kpi.code}</td>
              <td className="px-4 py-1.5 text-right font-medium tabular-nums">{actual}</td>
              <td className="px-4 py-1.5 text-right text-gray-500 tabular-nums">{target}</td>
              <td className="px-4 py-1.5 text-right">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                  pct >= 80 ? 'text-green-700 bg-green-50' : pct >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                }`}>{pct}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── NetworkCard component ──────────────────────────────────────────────────
function NetworkCard({ t, lang, categories, objectives, logs, currentUserId, currentYear }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  lang: 'fr' | 'en'
  categories: NetworkCategoryRow[]
  objectives: NetworkObjectiveRow[]
  logs: NetworkLogRow[]
  currentUserId: string
  currentYear: number
}) {
  const myObjectives = useMemo(
    () => objectives.filter(o => o.advisor_id === currentUserId),
    [objectives, currentUserId]
  )
  const myLogs = useMemo(
    () => logs.filter(l => l.advisor_id === currentUserId),
    [logs, currentUserId]
  )

  const rows = useMemo(() => categories.map(cat => {
    const obj = myObjectives.find(o => o.category_id === cat.id)
    const actual = myLogs.filter(l => l.category_id === cat.id).length
    const target = obj?.target_count ?? 0
    const isNa = obj?.is_na ?? false
    const pct = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : 0
    return { cat, actual, target, isNa, pct }
  }), [categories, myObjectives, myLogs])

  if (!rows.some(r => !r.isNa && r.target > 0)) return null

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">
          {t('dashboard.networkCard.title')} — {t('dashboard.networkCard.subtitle', { year: currentYear })}
        </h2>
        <Link to="/reseau" className="text-xs text-primary hover:underline">
          {t('dashboard.networkCard.viewAll')}
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {rows.filter(r => !r.isNa && r.target > 0).map(({ cat, actual, target, pct }) => (
          <div key={cat.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 truncate">
                {lang === 'fr' ? cat.label_fr : cat.label_en}
              </span>
              <span className="text-xs font-medium text-gray-700 tabular-nums ml-2">
                {actual} / {target}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

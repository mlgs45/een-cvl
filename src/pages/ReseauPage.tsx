import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { NetworkCategoryRow, NetworkObjectiveRow, NetworkLogRow, UserRow } from '../types/database'

const EEN_START = '2025-07-01'
const EEN_END   = '2028-12-31'
const YEARS = [2025, 2026, 2027, 2028]

interface LogWithJoins extends NetworkLogRow {
  advisor: { full_name: string } | null
  category: { label_fr: string; label_en: string } | null
}

function cellClass(actual: number, target: number, isNa: boolean): string {
  if (isNa) return 'bg-gray-50 text-gray-400'
  if (target === 0) return 'bg-gray-50 text-gray-500'
  const pct = actual / target
  if (pct >= 0.8) return 'bg-green-50 text-green-700'
  if (pct >= 0.5) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

export default function ReseauPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') ?? 'dashboard') as 'dashboard' | 'log'
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAdvisor, setFilterAdvisor] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function setTab(tab: 'dashboard' | 'log') {
    setSearchParams({ tab })
  }

  // ── Queries ──────────────────────────────────────────────────────────────
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
    queryKey: ['network-advisors', showInactive],
    queryFn: async () => {
      let q = supabase.from('users').select('*').order('full_name')
      if (!showInactive) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data as UserRow[]
    },
  })

  const { data: objectives = [] } = useQuery({
    queryKey: ['network-objectives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('network_objectives').select('*')
      if (error) throw error
      return data as NetworkObjectiveRow[]
    },
  })

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['network-logs', selectedYear],
    queryFn: async () => {
      let q = supabase
        .from('network_activity_logs')
        .select(`*, advisor:users!advisor_id ( full_name ), category:network_activity_categories!category_id ( label_fr, label_en )`)
        .order('date', { ascending: false })
      if (selectedYear === 'all') {
        q = q.gte('date', EEN_START).lte('date', EEN_END)
      } else {
        q = q.eq('year', selectedYear)
      }
      const { data, error } = await q
      if (error) throw error
      return data as LogWithJoins[]
    },
  })

  // ── Dashboard computation ─────────────────────────────────────────────
  const objectiveMap = useMemo(() => {
    const m = new Map<string, NetworkObjectiveRow>()
    for (const o of objectives) m.set(`${o.advisor_id}:${o.category_id}`, o)
    return m
  }, [objectives])

  const logCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of logs) {
      const k = `${l.advisor_id}:${l.category_id}`
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [logs])

  const categoryTotals = useMemo(() => {
    const m = new Map<string, { actual: number; target: number }>()
    for (const cat of categories) {
      let totalActual = 0
      let totalTarget = 0
      for (const advisor of advisors) {
        const key = `${advisor.id}:${cat.id}`
        const objective = objectiveMap.get(key)
        if (!objective || objective.is_na) continue
        totalActual += logCounts.get(key) ?? 0
        totalTarget += objective.target_count ?? 0
      }
      m.set(cat.id, { actual: totalActual, target: totalTarget })
    }
    return m
  }, [categories, advisors, objectiveMap, logCounts])

  // ── Journal filtered ──────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterCategory && l.category_id !== filterCategory) return false
      if (filterAdvisor && l.advisor_id !== filterAdvisor) return false
      return true
    })
  }, [logs, filterCategory, filterAdvisor])

  // ── Delete log ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const { error } = await supabase.from('network_activity_logs').delete().eq('id', id)
    if (error) { toast.error(t('common.error')); return }
    toast.success(t('network.form.deleteSuccess'))
    setConfirmDeleteId(null)
    queryClient.invalidateQueries({ queryKey: ['network-logs'] })
  }

  const { isAdmin: _isAdmin, user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('network.title')}</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          {isAdmin && (
            <Link to="/reseau/objectifs" className="btn-secondary text-sm">
              Objectifs
            </Link>
          )}
          <Link to="/reseau/log/new" className="btn-primary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('network.addEntry')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {(['dashboard', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`network.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Year selector */}
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              selectedYear === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('network.years.all')}
          </button>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectedYear === y
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {activeTab === 'log' && (
          <>
            <select className="input w-auto text-xs py-1.5"
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">{t('network.filters.category')} — {t('network.filters.all')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{lang === 'fr' ? c.label_fr : c.label_en}</option>
              ))}
            </select>
            <select className="input w-auto text-xs py-1.5"
              value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)}>
              <option value="">{t('network.filters.advisor')} — {t('network.filters.all')}</option>
              {advisors.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </>
        )}

        {activeTab === 'dashboard' && (
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" className="w-3.5 h-3.5 accent-primary"
              checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            {t('network.showInactive')}
          </label>
        )}
      </div>

      {/* ── TAB: DASHBOARD ─────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                    {t('network.log.advisor')}
                  </th>
                  {categories.map(cat => (
                    <th key={cat.id} className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap max-w-[120px]">
                      <span className="block truncate" title={lang === 'fr' ? cat.label_fr : cat.label_en}>
                        {lang === 'fr' ? cat.label_fr : cat.label_en}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advisors.length === 0 ? (
                  <tr>
                    <td colSpan={categories.length + 1} className="px-4 py-8 text-center text-sm text-gray-400">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : advisors.map(advisor => (
                  <tr key={advisor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {advisor.full_name}
                      {!advisor.is_active && (
                        <span className="ml-2 badge bg-gray-100 text-gray-400 text-xs">inactif</span>
                      )}
                    </td>
                    {categories.map(cat => {
                      const key = `${advisor.id}:${cat.id}`
                      const objective = objectiveMap.get(key)
                      const isNa = objective?.is_na ?? false
                      const target = objective?.target_count ?? 0
                      const actual = logCounts.get(key) ?? 0
                      const pct = target > 0 ? Math.round(actual / target * 100) : null

                      return (
                        <td key={cat.id} className="px-3 py-3 text-center">
                          {isNa ? (
                            <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-400 font-medium">
                              {t('network.dashboard.na')}
                            </span>
                          ) : objective === undefined ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${cellClass(actual, target, false)}`}>
                              {actual} / {target}
                              {pct !== null && <span className="ml-1 opacity-70">({pct}%)</span>}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {advisors.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      Total CCIR
                    </td>
                    {categories.map(cat => {
                      const totals = categoryTotals.get(cat.id) ?? { actual: 0, target: 0 }
                      const pct = totals.target > 0 ? Math.round(totals.actual / totals.target * 100) : null
                      return (
                        <td key={cat.id} className="px-3 py-3 text-center">
                          {totals.target === 0 ? (
                            <span className="text-gray-300 text-xs">—</span>
                          ) : (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${cellClass(totals.actual, totals.target, false)}`}>
                              {totals.actual} / {totals.target}
                              {pct !== null && <span className="ml-1 opacity-70">({pct}%)</span>}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: JOURNAL ───────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <div className="card overflow-hidden">
          {logsLoading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-4 bg-gray-100 rounded flex-1" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">{t('network.log.noEntries')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('network.log.date')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('network.log.advisor')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('network.log.category')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('network.log.name')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">{t('network.log.comment')}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map(log => {
                    const canEdit = isAdmin || log.created_by === user?.id
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">
                          {format(new Date(log.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {log.advisor?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge bg-primary-50 text-primary text-xs">
                            {lang === 'fr' ? log.category?.label_fr : log.category?.label_en}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{log.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell max-w-xs truncate">
                          {log.comment ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <div className="flex gap-1 justify-end">
                              <Link to={`/reseau/log/${log.id}/edit`}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </Link>
                              <button onClick={() => setConfirmDeleteId(log.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6"/><path d="M14 11v6"/>
                                  <path d="M9 6V4h6v2"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="font-semibold text-gray-900 mb-4">{t('network.log.confirmDelete')}</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDeleteId)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { UserRow, KpiObjectiveRow, KpiTeamObjectiveRow, KpiAutoActualRow, KpiManualLogRow } from '../types/database'

const YEARS = [2025, 2026, 2027, 2028]

// year = 0 dans kpi_team_objectives = période complète
const PERIOD_YEAR = 0

const KPI_DEFS = [
  { code: 'KPI1',  label_fr: 'Contact entreprise',                    label_en: 'Company contact' },
  { code: 'KPI2',  label_fr: 'Parcours client',                       label_en: 'Client journey' },
  { code: 'KPI3A', label_fr: 'Impact de mon conseil (AA)',             label_en: 'Advisory impact (AA)' },
  { code: 'KPI3B', label_fr: 'Accord inter-entreprise (PA)',           label_en: 'Inter-company agreement (PA)' },
  { code: 'KPI4',  label_fr: 'Enquête étude d\'impact',               label_en: 'Impact assessment survey' },
  { code: 'KPI5s', label_fr: 'Communication – Success stories',       label_en: 'Communication – Success stories' },
  { code: 'KPI5t', label_fr: 'Communication – Témoignages',           label_en: 'Communication – Testimonials' },
  { code: 'KPI6',  label_fr: 'Contribution auprès d\'autres EEN',     label_en: 'Contribution to other EEN partners' },
  { code: 'KPI7',  label_fr: 'Identification problématiques',         label_en: 'Identification of company issues' },
] as const

function rateClass(pct: number) {
  if (pct >= 80) return 'text-green-700 bg-green-50'
  if (pct >= 50) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

export default function KpiPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = (searchParams.get('tab') as 'team' | 'advisor') ?? 'team'
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [showInactive, setShowInactive] = useState(false)

  function setTab(t2: 'team' | 'advisor') {
    setSearchParams(p => { p.set('tab', t2); return p })
  }

  const { data: advisors = [] } = useQuery({
    queryKey: ['kpi-advisors', showInactive],
    queryFn: async () => {
      let q = supabase.from('users').select('*').order('full_name')
      if (!showInactive) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data as UserRow[]
    },
  })

  const { data: teamObjectives = [] } = useQuery({
    queryKey: ['kpi-team-objectives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_team_objectives').select('*')
      if (error) throw error
      return data as KpiTeamObjectiveRow[]
    },
  })

  const { data: advisorObjectives = [] } = useQuery({
    queryKey: ['kpi-objectives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_objectives').select('*')
      if (error) throw error
      return data as KpiObjectiveRow[]
    },
  })

  const { data: autoActuals = [] } = useQuery({
    queryKey: ['kpi-auto-actuals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_auto_actuals').select('*')
      if (error) throw error
      return data as KpiAutoActualRow[]
    },
  })

  const { data: manualLogs = [] } = useQuery({
    queryKey: ['kpi-manual-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_manual_logs').select('*')
      if (error) throw error
      return data as KpiManualLogRow[]
    },
  })

  // Objectifs équipe pour l'année sélectionnée
  const teamObjectiveMap = useMemo(() => {
    const m = new Map<string, number>()
    const yearKey = selectedYear === 'all' ? PERIOD_YEAR : selectedYear
    for (const o of teamObjectives) {
      if (o.year === yearKey) m.set(o.kpi_code, Number(o.target_count))
    }
    return m
  }, [teamObjectives, selectedYear])

  // Réalisés équipe : somme auto + manuel pour l'année sélectionnée
  const teamActuals = useMemo(() => {
    const m = new Map<string, number>()
    for (const kpi of KPI_DEFS) {
      const auto = autoActuals
        .filter(a => a.kpi_code === kpi.code && (selectedYear === 'all' || a.year === selectedYear))
        .reduce((s, a) => s + Number(a.actual), 0)
      const manual = manualLogs
        .filter(l => l.kpi_code === kpi.code && (selectedYear === 'all' || l.year === selectedYear))
        .length
      m.set(kpi.code, auto + manual)
    }
    return m
  }, [autoActuals, manualLogs, selectedYear])

  // Objectifs conseillers : "advisorId:kpiCode" → { target, is_nc }
  const advisorObjectiveMap = useMemo(() => {
    const m = new Map<string, { target: number; is_nc: boolean }>()
    for (const advisor of advisors) {
      for (const kpi of KPI_DEFS) {
        const key = `${advisor.id}:${kpi.code}`
        if (selectedYear === 'all') {
          const objs = advisorObjectives.filter(o => o.advisor_id === advisor.id && o.kpi_code === kpi.code)
          const target = objs.reduce((s, o) => s + (o.is_nc ? 0 : Number(o.target_count)), 0)
          const is_nc = objs.length > 0 && objs.every(o => o.is_nc)
          m.set(key, { target, is_nc })
        } else {
          const obj = advisorObjectives.find(
            o => o.advisor_id === advisor.id && o.kpi_code === kpi.code && o.year === selectedYear
          )
          m.set(key, { target: obj ? Number(obj.target_count) : 0, is_nc: obj?.is_nc ?? false })
        }
      }
    }
    return m
  }, [advisorObjectives, advisors, selectedYear])

  // Réalisés conseillers : "advisorId:kpiCode" → number
  const advisorActualMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const advisor of advisors) {
      for (const kpi of KPI_DEFS) {
        const key = `${advisor.id}:${kpi.code}`
        const auto = autoActuals
          .filter(a => a.advisor_id === advisor.id && a.kpi_code === kpi.code && (selectedYear === 'all' || a.year === selectedYear))
          .reduce((s, a) => s + Number(a.actual), 0)
        const manual = manualLogs
          .filter(l => l.advisor_id === advisor.id && l.kpi_code === kpi.code && (selectedYear === 'all' || l.year === selectedYear))
          .length
        m.set(key, auto + manual)
      }
    }
    return m
  }, [autoActuals, manualLogs, advisors, selectedYear])

  const yearLabel = selectedYear === 'all' ? t('network.years.all') : String(selectedYear)

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('kpi.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.period')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/kpi/objectifs" className="btn-secondary text-sm">
              {t('kpi.objectifs.title')}
            </Link>
          )}
          <Link to="/kpi/log/new" className="btn-primary text-sm flex items-center gap-1">
            <span>+</span> {t('kpi.addEntry')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {(['team', 'advisor'] as const).map(t2 => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t2
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`kpi.tabs.${t2}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Sélecteur d'année */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors font-medium ${
                selectedYear === y
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {y}
            </button>
          ))}
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors font-medium ${
              selectedYear === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('network.years.all')}
          </button>
        </div>
        {tab === 'advisor' && (
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-primary"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            {t('network.showInactive')}
          </label>
        )}
      </div>

      {/* Tab: Vue équipe */}
      {tab === 'team' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">
              {t('kpi.tabs.team')} — {yearLabel}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-20">{t('kpi.table.code')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{t('kpi.table.label')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-24">{t('kpi.table.target')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-24">{t('kpi.table.actual')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 w-24">{t('kpi.table.rate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {KPI_DEFS.map(kpi => {
                  const target = teamObjectiveMap.get(kpi.code) ?? 0
                  const actual = teamActuals.get(kpi.code) ?? 0
                  const pct = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : 0
                  return (
                    <tr key={kpi.code} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 font-medium">{kpi.code}</td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {lang === 'fr' ? kpi.label_fr : kpi.label_en}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">
                        {target > 0 ? target : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums">{actual}</td>
                      <td className="px-4 py-2.5 text-right">
                        {target > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${rateClass(pct)}`}>
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Vue par conseiller */}
      {tab === 'advisor' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap min-w-[160px]">
                    {t('network.log.advisor')}
                  </th>
                  {KPI_DEFS.map(kpi => (
                    <th
                      key={kpi.code}
                      className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 min-w-[80px]"
                      title={lang === 'fr' ? kpi.label_fr : kpi.label_en}
                    >
                      {kpi.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advisors.map(advisor => (
                  <tr key={advisor.id} className={`hover:bg-gray-50 ${!advisor.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {advisor.full_name}
                    </td>
                    {KPI_DEFS.map(kpi => {
                      const key = `${advisor.id}:${kpi.code}`
                      const obj = advisorObjectiveMap.get(key)
                      const actual = advisorActualMap.get(key) ?? 0
                      const target = obj?.target ?? 0
                      const is_nc = obj?.is_nc ?? false
                      const pct = target > 0 ? Math.min(100, Math.round(actual / target * 100)) : 0

                      if (is_nc) {
                        return (
                          <td key={kpi.code} className="px-2 py-3 text-center">
                            <span className="text-xs text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">NC</span>
                          </td>
                        )
                      }
                      return (
                        <td key={kpi.code} className="px-2 py-3 text-center">
                          {target > 0 ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${rateClass(pct)}`}>
                              {actual}/{target}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{actual > 0 ? actual : '—'}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Ligne total CCIR */}
                {advisors.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Total CCIR</td>
                    {KPI_DEFS.map(kpi => {
                      const totalActual = advisors.reduce(
                        (s, a) => s + (advisorActualMap.get(`${a.id}:${kpi.code}`) ?? 0), 0
                      )
                      const totalTarget = advisors.reduce((s, a) => {
                        const obj = advisorObjectiveMap.get(`${a.id}:${kpi.code}`)
                        return s + (obj?.is_nc ? 0 : (obj?.target ?? 0))
                      }, 0)
                      const pct = totalTarget > 0 ? Math.min(100, Math.round(totalActual / totalTarget * 100)) : 0
                      return (
                        <td key={kpi.code} className="px-2 py-3 text-center">
                          {totalTarget > 0 ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${rateClass(pct)}`}>
                              {totalActual}/{totalTarget}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{totalActual > 0 ? totalActual : '—'}</span>
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
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { KpiObjectiveRow, KpiTeamObjectiveRow, UserRow } from '../types/database'

const YEARS = [2025, 2026, 2027, 2028]
const PERIOD_YEAR = 0 // year = 0 dans kpi_team_objectives = période complète

const KPI_DEFS = [
  { code: 'KPI1',  label_fr: 'Contact entreprise',              label_en: 'Company contact' },
  { code: 'KPI2',  label_fr: 'Parcours client',                 label_en: 'Client journey' },
  { code: 'KPI3A', label_fr: 'Impact conseil (AA)',             label_en: 'Advisory impact (AA)' },
  { code: 'KPI3B', label_fr: 'Accord inter-ent. (PA)',          label_en: 'Inter-company agr. (PA)' },
  { code: 'KPI4',  label_fr: 'Enquête impact',                  label_en: 'Impact survey' },
  { code: 'KPI5s', label_fr: 'Success stories',                 label_en: 'Success stories' },
  { code: 'KPI5t', label_fr: 'Témoignages',                     label_en: 'Testimonials' },
  { code: 'KPI6',  label_fr: 'Contribution EEN',                label_en: 'EEN Contribution' },
  { code: 'KPI7',  label_fr: 'Identification pb.',              label_en: 'Issue identification' },
] as const

interface AdvisorCell {
  target_count: number
  is_nc: boolean
  etp: number
  existing_id?: string
}

interface TeamCell {
  target_count: number
  existing_id?: string
}

type AdvisorGrid = Record<string, AdvisorCell>  // "advisorId:kpiCode"
type TeamGrid    = Record<string, TeamCell>      // kpiCode

export default function KpiObjectifsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [showInactive, setShowInactive] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [advisorGrid, setAdvisorGrid] = useState<AdvisorGrid>({})
  const [teamGrid, setTeamGrid]       = useState<TeamGrid>({})
  const [saving, setSaving]           = useState(false)
  const [dirty, setDirty]             = useState(false)

  useEffect(() => {
    if (!isAdmin) navigate('/kpi', { replace: true })
  }, [isAdmin, navigate])

  const { data: advisors = [] } = useQuery({
    queryKey: ['kpi-objectifs-advisors', showInactive],
    queryFn: async () => {
      let q = supabase.from('users').select('*').order('full_name')
      if (!showInactive) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data as UserRow[]
    },
  })

  const { data: advisorObjectives = [], refetch: refetchAdvisor } = useQuery({
    queryKey: ['kpi-objectives-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_objectives').select('*')
      if (error) throw error
      return data as KpiObjectiveRow[]
    },
  })

  const { data: teamObjectives = [], refetch: refetchTeam } = useQuery({
    queryKey: ['kpi-team-objectives-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_team_objectives').select('*')
      if (error) throw error
      return data as KpiTeamObjectiveRow[]
    },
  })

  // Construire la grille conseillers pour l'année sélectionnée
  useEffect(() => {
    if (!advisors.length || selectedYear === 'all') {
      setAdvisorGrid({})
      return
    }
    const newGrid: AdvisorGrid = {}
    for (const advisor of advisors) {
      for (const kpi of KPI_DEFS) {
        const key = `${advisor.id}:${kpi.code}`
        const existing = advisorObjectives.find(
          o => o.advisor_id === advisor.id && o.kpi_code === kpi.code && o.year === selectedYear
        )
        newGrid[key] = {
          target_count: existing ? Number(existing.target_count) : 0,
          is_nc:        existing?.is_nc ?? false,
          etp:          existing ? Number(existing.etp) : 1.0,
          existing_id:  existing?.id,
        }
      }
    }
    setAdvisorGrid(newGrid)
    setDirty(false)
  }, [advisors, advisorObjectives, selectedYear])

  // Construire la grille équipe
  useEffect(() => {
    const yearKey = selectedYear === 'all' ? PERIOD_YEAR : selectedYear
    const newTeamGrid: TeamGrid = {}
    for (const kpi of KPI_DEFS) {
      const existing = teamObjectives.find(o => o.kpi_code === kpi.code && o.year === yearKey)
      newTeamGrid[kpi.code] = {
        target_count: existing ? Number(existing.target_count) : 0,
        existing_id:  existing?.id,
      }
    }
    setTeamGrid(newTeamGrid)
  }, [teamObjectives, selectedYear])

  function updateAdvisorCell(key: string, patch: Partial<AdvisorCell>) {
    setAdvisorGrid(g => ({ ...g, [key]: { ...g[key], ...patch } }))
    setDirty(true)
  }

  function updateTeamCell(kpiCode: string, patch: Partial<TeamCell>) {
    setTeamGrid(g => ({ ...g, [kpiCode]: { ...g[kpiCode], ...patch } }))
    setDirty(true)
  }

  function handleYearChange(year: number | 'all') {
    if (dirty && !window.confirm('Abandonner les modifications non sauvegardées ?')) return
    setSelectedYear(year)
  }

  // Calcul proportionnel KPI1 selon ETP
  function calculateProportionalKpi1() {
    const teamTarget = teamGrid['KPI1']?.target_count ?? 0
    if (!teamTarget || selectedYear === 'all') return
    const totalEtp = advisors.reduce((s, a) => {
      const cell = advisorGrid[`${a.id}:KPI1`]
      return s + (cell?.is_nc ? 0 : (cell?.etp ?? 1.0))
    }, 0)
    if (!totalEtp) return
    for (const advisor of advisors) {
      const key = `${advisor.id}:KPI1`
      const cell = advisorGrid[key]
      if (!cell || cell.is_nc) continue
      const etp = cell.etp ?? 1.0
      updateAdvisorCell(key, { target_count: Math.round(teamTarget * etp / totalEtp) })
    }
  }

  // Totaux par KPI (somme conseillers, hors NC)
  const advisorTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const kpi of KPI_DEFS) {
      let total = 0
      for (const advisor of advisors) {
        const cell = advisorGrid[`${advisor.id}:${kpi.code}`]
        if (!cell || cell.is_nc) continue
        total += cell.target_count
      }
      m.set(kpi.code, total)
    }
    return m
  }, [advisorGrid, advisors])

  async function handleSave() {
    setSaving(true)

    // Sauvegarder objectifs conseillers (seulement pour une année spécifique)
    if (selectedYear !== 'all' && advisors.length > 0) {
      const upserts = advisors.flatMap(advisor =>
        KPI_DEFS.map(kpi => {
          const key = `${advisor.id}:${kpi.code}`
          const cell = advisorGrid[key]
          if (!cell) return null
          return {
            ...(cell.existing_id ? { id: cell.existing_id } : {}),
            advisor_id:   advisor.id,
            kpi_code:     kpi.code,
            year:         selectedYear as number,
            target_count: cell.is_nc ? 0 : cell.target_count,
            etp:          cell.etp,
            is_nc:        cell.is_nc,
          }
        }).filter(Boolean)
      )

      const { error } = await supabase
        .from('kpi_objectives')
        .upsert(upserts as object[], { onConflict: 'advisor_id,kpi_code,year' })
      if (error) { toast.error(t('common.error')); setSaving(false); return }
    }

    // Sauvegarder objectifs équipe
    const yearKey = selectedYear === 'all' ? PERIOD_YEAR : selectedYear
    const teamUpserts = KPI_DEFS.map(kpi => {
      const cell = teamGrid[kpi.code]
      return {
        ...(cell?.existing_id ? { id: cell.existing_id } : {}),
        kpi_code:     kpi.code,
        year:         yearKey,
        target_count: cell?.target_count ?? 0,
      }
    })

    const { error: teamError } = await supabase
      .from('kpi_team_objectives')
      .upsert(teamUpserts, { onConflict: 'kpi_code,year' })
    if (teamError) { toast.error(t('common.error')); setSaving(false); return }

    setSaving(false)
    toast.success(t('kpi.objectifs.saveSuccess'))
    setDirty(false)
    refetchAdvisor()
    refetchTeam()
  }

  function handleCancel() {
    refetchAdvisor()
    refetchTeam()
    setDirty(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate('/kpi')} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{t('kpi.objectifs.title')}</h1>
      </div>

      {/* Sélecteur d'année */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
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
            onClick={() => handleYearChange('all')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors font-medium ${
              selectedYear === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t('network.years.all')}
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer ml-auto">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-primary"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          {t('network.objectifs.showInactive')}
        </label>
      </div>

      {/* Grille */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap min-w-[160px]">
                  {t('network.log.advisor')}
                </th>
                {selectedYear !== 'all' && (
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-16">ETP</th>
                )}
                {KPI_DEFS.map(kpi => (
                  <th
                    key={kpi.code}
                    className="px-2 py-2.5 text-center text-xs font-medium text-gray-500 min-w-[90px]"
                    title={lang === 'fr' ? kpi.label_fr : kpi.label_en}
                  >
                    {kpi.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Ligne équipe CCI CVDL (éditable) */}
              <tr className="bg-blue-50">
                <td className="px-4 py-3 font-semibold text-blue-800 whitespace-nowrap">
                  CCI CVDL
                  {selectedYear === 'all' && (
                    <span className="ml-2 text-xs font-normal text-blue-400">{t('network.years.all')}</span>
                  )}
                </td>
                {selectedYear !== 'all' && (
                  <td className="px-3 py-2 text-center text-xs text-gray-400">—</td>
                )}
                {KPI_DEFS.map(kpi => (
                  <td key={kpi.code} className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      className="input text-xs text-center w-16 py-1 px-1"
                      value={teamGrid[kpi.code]?.target_count ?? 0}
                      onChange={e => updateTeamCell(kpi.code, { target_count: Math.max(0, Number(e.target.value)) })}
                    />
                  </td>
                ))}
              </tr>

              {/* Lignes conseillers */}
              {selectedYear !== 'all' && advisors.map(advisor => (
                <tr key={advisor.id} className={!advisor.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{advisor.full_name}</td>
                  {/* ETP */}
                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      className="input text-xs text-center w-16 py-1 px-1"
                      value={advisorGrid[`${advisor.id}:KPI1`]?.etp ?? 1.0}
                      onChange={e => {
                        const etp = Math.min(1, Math.max(0, Number(e.target.value)))
                        KPI_DEFS.forEach(kpi => {
                          updateAdvisorCell(`${advisor.id}:${kpi.code}`, { etp })
                        })
                      }}
                    />
                  </td>
                  {KPI_DEFS.map(kpi => {
                    const key = `${advisor.id}:${kpi.code}`
                    const cell = advisorGrid[key]
                    if (!cell) return <td key={kpi.code} />
                    return (
                      <td key={kpi.code} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {cell.is_nc ? (
                            <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded">NC</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="input text-xs text-center w-16 py-1 px-1"
                              value={cell.target_count}
                              onChange={e => updateAdvisorCell(key, { target_count: Math.max(0, Number(e.target.value)) })}
                            />
                          )}
                          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 accent-primary"
                              checked={cell.is_nc}
                              onChange={e => updateAdvisorCell(key, { is_nc: e.target.checked })}
                            />
                            NC
                          </label>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Ligne total conseillers (lecture seule) */}
              {selectedYear !== 'all' && advisors.length > 0 && (
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap text-xs">
                    Σ Conseillers
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-gray-400">—</td>
                  {KPI_DEFS.map(kpi => {
                    const total = advisorTotals.get(kpi.code) ?? 0
                    return (
                      <td key={kpi.code} className="px-2 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-600">{total > 0 ? total : '—'}</span>
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bouton calcul proportionnel KPI1 */}
      {selectedYear !== 'all' && (
        <div className="flex items-center gap-3">
          <button onClick={calculateProportionalKpi1} className="btn-secondary text-sm">
            {t('kpi.objectifs.calculateKpi1')}
          </button>
          <span className="text-xs text-gray-400">{t('kpi.objectifs.calculateKpi1Help')}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? '…' : t('network.objectifs.save')}
        </button>
        <button className="btn-secondary" onClick={handleCancel} disabled={saving || !dirty}>
          {t('network.objectifs.cancel')}
        </button>
      </div>
    </div>
  )
}

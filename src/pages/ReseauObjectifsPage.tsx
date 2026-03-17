import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { NetworkCategoryRow, NetworkObjectiveRow, UserRow } from '../types/database'

interface CellState {
  target_count: number
  is_na: boolean
  period_start: string
  period_end: string
  existing_id?: string
}

type GridState = Record<string, CellState> // key = "advisorId:categoryId"

const DEFAULT_START = '2025-07-01'
const DEFAULT_END   = '2028-12-31'

export default function ReseauObjectifsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [showInactive, setShowInactive] = useState(false)
  const [grid, setGrid] = useState<GridState>({})
  const [periodStart, setPeriodStart] = useState(DEFAULT_START)
  const [periodEnd, setPeriodEnd] = useState(DEFAULT_END)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) navigate('/reseau', { replace: true })
  }, [isAdmin, navigate])

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
    queryKey: ['network-objectifs-advisors', showInactive],
    queryFn: async () => {
      let q = supabase.from('users').select('*').order('full_name')
      if (!showInactive) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data as UserRow[]
    },
  })

  const { data: objectives = [], refetch } = useQuery({
    queryKey: ['network-objectives-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('network_objectives').select('*')
      if (error) throw error
      return data as NetworkObjectiveRow[]
    },
  })

  // Build grid state from server data
  useEffect(() => {
    if (!advisors.length || !categories.length) return
    const newGrid: GridState = {}
    for (const advisor of advisors) {
      for (const cat of categories) {
        const key = `${advisor.id}:${cat.id}`
        const existing = objectives.find(o => o.advisor_id === advisor.id && o.category_id === cat.id)
        newGrid[key] = {
          target_count: existing?.target_count ?? 0,
          is_na: existing?.is_na ?? false,
          period_start: existing?.period_start ?? DEFAULT_START,
          period_end: existing?.period_end ?? DEFAULT_END,
          existing_id: existing?.id,
        }
      }
    }
    setGrid(newGrid)
    setDirty(false)
  }, [advisors, categories, objectives])

  function updateCell(key: string, patch: Partial<CellState>) {
    setGrid(g => ({ ...g, [key]: { ...g[key], ...patch } }))
    setDirty(true)
  }

  function applyPeriodToAll() {
    setGrid(g => {
      const updated = { ...g }
      for (const k of Object.keys(updated)) {
        updated[k] = { ...updated[k], period_start: periodStart, period_end: periodEnd }
      }
      return updated
    })
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const upserts: Array<{
      id?: string
      advisor_id: string
      category_id: string
      target_count: number
      is_na: boolean
      period_start: string
      period_end: string
    }> = []

    for (const advisor of advisors) {
      for (const cat of categories) {
        const key = `${advisor.id}:${cat.id}`
        const cell = grid[key]
        if (!cell) continue
        upserts.push({
          ...(cell.existing_id ? { id: cell.existing_id } : {}),
          advisor_id: advisor.id,
          category_id: cat.id,
          target_count: cell.is_na ? 0 : cell.target_count,
          is_na: cell.is_na,
          period_start: cell.period_start,
          period_end: cell.period_end,
        })
      }
    }

    const { error } = await supabase
      .from('network_objectives')
      .upsert(upserts, { onConflict: 'advisor_id,category_id' })

    setSaving(false)
    if (error) { toast.error(t('common.error')); return }
    toast.success(t('network.objectifs.saveSuccess'))
    setDirty(false)
    refetch()
  }

  function handleCancel() {
    refetch()
    setDirty(false)
  }

  const categoryTargetTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const cat of categories) {
      let total = 0
      for (const advisor of advisors) {
        const cell = grid[`${advisor.id}:${cat.id}`]
        if (!cell || cell.is_na) continue
        total += cell.target_count
      }
      m.set(cat.id, total)
    }
    return m
  }, [grid, categories, advisors])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/reseau')} className="text-gray-400 hover:text-gray-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{t('network.objectifs.title')}</h1>
      </div>

      {/* Period settings */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label text-xs">{t('network.objectifs.periodStart')}</label>
          <input type="date" className="input w-40 text-xs"
            value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">{t('network.objectifs.periodEnd')}</label>
          <input type="date" className="input w-40 text-xs"
            value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
        </div>
        <button className="btn-secondary text-xs" onClick={applyPeriodToAll}>
          {t('network.objectifs.applyAll')}
        </button>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer ml-auto">
          <input type="checkbox" className="w-3.5 h-3.5 accent-primary"
            checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          {t('network.objectifs.showInactive')}
        </label>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                  {t('network.log.advisor')}
                </th>
                {categories.map(cat => (
                  <th key={cat.id} className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 min-w-[110px]">
                    <span className="block truncate max-w-[110px]" title={lang === 'fr' ? cat.label_fr : cat.label_en}>
                      {lang === 'fr' ? cat.label_fr : cat.label_en}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {advisors.map(advisor => (
                <tr key={advisor.id} className={!advisor.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {advisor.full_name}
                  </td>
                  {categories.map(cat => {
                    const key = `${advisor.id}:${cat.id}`
                    const cell = grid[key]
                    if (!cell) return <td key={cat.id} />

                    return (
                      <td key={cat.id} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {cell.is_na ? (
                            <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded">
                              {t('network.objectifs.na') ?? 'N/A'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="input text-xs text-center w-16 py-1 px-1"
                              value={cell.target_count}
                              onChange={e => updateCell(key, { target_count: Math.max(0, Number(e.target.value)) })}
                            />
                          )}
                          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 accent-primary"
                              checked={cell.is_na}
                              onChange={e => updateCell(key, { is_na: e.target.checked })}
                            />
                            N/A
                          </label>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {advisors.length > 0 && (
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                    Total
                  </td>
                  {categories.map(cat => {
                    const total = categoryTargetTotals.get(cat.id) ?? 0
                    return (
                      <td key={cat.id} className="px-2 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-700">{total > 0 ? total : '—'}</span>
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

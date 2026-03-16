import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toInsertPayload, type ValidatedRow } from '../../lib/importUtils'

interface Props {
  validatedRows: ValidatedRow[]
  allowOverwrite: boolean
  createdBy: string
}

const BATCH_SIZE = 50

export default function ImportStepResult({ validatedRows, allowOverwrite, createdBy }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [progress, setProgress] = useState(0)    // 0-100
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped]   = useState(0)
  const [updated, setUpdated]   = useState(0)
  const [failed, setFailed]     = useState(0)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Séparer les lignes à traiter
      const toInsert   = validatedRows.filter(r => r.errors.length === 0 && !r.isDuplicate)
      const toUpsert   = validatedRows.filter(r => r.errors.length === 0 && r.isDuplicate && allowOverwrite)
      const toSkip     = validatedRows.filter(r => r.errors.length === 0 && r.isDuplicate && !allowOverwrite)
      const withErrors = validatedRows.filter(r => r.errors.length > 0)

      const total = toInsert.length + toUpsert.length
      let done_count = 0

      // ─── Inserts par batch ───
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        if (cancelled) return
        const batch = toInsert.slice(i, i + BATCH_SIZE).map(r => toInsertPayload(r.data, createdBy))
        const { error } = await supabase.from('companies').insert(batch)
        if (!error) {
          setImported(prev => prev + batch.length)
        } else {
          setFailed(prev => prev + batch.length)
        }
        done_count += batch.length
        setProgress(Math.round((done_count / Math.max(total, 1)) * 100))
      }

      // ─── Upserts par batch (doublons à mettre à jour) ───
      for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
        if (cancelled) return
        const batch = toUpsert.slice(i, i + BATCH_SIZE).map(r => toInsertPayload(r.data, createdBy))
        const { error } = await supabase
          .from('companies')
          .upsert(batch, { onConflict: 'name', ignoreDuplicates: false })
        if (!error) {
          setUpdated(prev => prev + batch.length)
        } else {
          setFailed(prev => prev + batch.length)
        }
        done_count += batch.length
        setProgress(Math.round((done_count / Math.max(total, 1)) * 100))
      }

      if (!cancelled) {
        setSkipped(toSkip.length + withErrors.length)
        setProgress(100)
        setDone(true)
        queryClient.invalidateQueries({ queryKey: ['companies-list'] })
      }
    }

    run()
    return () => { cancelled = true }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      {!done && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t('companies.importPage.result.importing')}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Résultats */}
      {done && (
        <div className="space-y-3">
          {imported > 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-green-500 shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-sm text-green-800 font-medium">
                {t('companies.importPage.result.imported', { count: imported })}
              </span>
            </div>
          )}
          {updated > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-blue-500 shrink-0">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="text-sm text-blue-800 font-medium">
                {t('companies.importPage.result.updated', { count: updated })}
              </span>
            </div>
          )}
          {skipped > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-gray-400 shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span className="text-sm text-gray-600">
                {t('companies.importPage.result.skipped', { count: skipped })}
              </span>
            </div>
          )}
          {failed > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className="text-red-500 shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-sm text-red-800">
                {t('companies.importPage.result.failed', { count: failed })}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/companies')}
            className="btn-primary mt-2"
          >
            {t('companies.importPage.result.done')}
          </button>
        </div>
      )}
    </div>
  )
}

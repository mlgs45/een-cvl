import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  autoDetectMapping,
  applyMapping,
  validateRows,
  type ParsedRow,
  type ColumnMapping,
  type ValidatedRow,
} from '../lib/importUtils'

import ImportStepUpload  from '../components/import/ImportStepUpload'
import ImportStepMapping from '../components/import/ImportStepMapping'
import ImportStepPreview from '../components/import/ImportStepPreview'
import ImportStepResult  from '../components/import/ImportStepResult'

type Step = 'upload' | 'mapping' | 'preview' | 'result'

const STEPS: Step[] = ['upload', 'mapping', 'preview', 'result']

export default function CompanyImportPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]                   = useState<Step>('upload')
  const [rawHeaders, setRawHeaders]       = useState<string[]>([])
  const [rawRows, setRawRows]             = useState<ParsedRow[]>([])
  const [mapping, setMapping]             = useState<ColumnMapping>({})
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [allowOverwrite, setAllowOverwrite] = useState(false)
  const [loading, setLoading]             = useState(false)

  // ─── Step 1 → 2 ───
  function handleFileParsed(headers: string[], rows: ParsedRow[]) {
    setRawHeaders(headers)
    setRawRows(rows)
    setMapping(autoDetectMapping(headers))
    setStep('mapping')
  }

  // ─── Step 2 → 3 ───
  async function handleMappingConfirm(confirmedMapping: ColumnMapping) {
    setLoading(true)
    setMapping(confirmedMapping)

    // Récupérer noms + TVA existants pour détection doublons
    const { data: existing } = await supabase
      .from('companies')
      .select('name, vat_number')
    const existingNames = new Set<string>(
      (existing ?? []).map((c: { name: string }) => c.name.toLowerCase().trim())
    )
    const existingVats = new Set<string>(
      (existing ?? [])
        .filter((c: { vat_number: string | null }) => c.vat_number)
        .map((c: { vat_number: string | null }) => (c.vat_number as string).toLowerCase().trim())
    )

    const mapped    = applyMapping(rawRows, confirmedMapping)
    const validated = validateRows(mapped, existingNames, existingVats)

    setValidatedRows(validated)
    setLoading(false)
    setStep('preview')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => step === 'upload' ? navigate(-1) : setStep(STEPS[stepIndex - 1] as Step)}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
          disabled={step === 'result'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-900">
          {t('companies.importPage.title')}
        </h1>
      </div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const isActive    = s === step
          const isCompleted = STEPS.indexOf(step) > i
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`
                flex items-center gap-2 text-sm font-medium
                ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'}
              `}>
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isActive ? 'bg-primary text-white' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100'}
                `}>
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : i + 1}
                </div>
                <span className="hidden sm:inline">
                  {t(`companies.importPage.steps.${s}`)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-3 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Contenu */}
      <div className="card p-6">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && step === 'upload' && (
          <ImportStepUpload onFileParsed={handleFileParsed} />
        )}

        {!loading && step === 'mapping' && (
          <ImportStepMapping
            headers={rawHeaders}
            initialMapping={mapping}
            onConfirm={handleMappingConfirm}
            onBack={() => setStep('upload')}
          />
        )}

        {!loading && step === 'preview' && (
          <ImportStepPreview
            validatedRows={validatedRows}
            allowOverwrite={allowOverwrite}
            onOverwriteChange={setAllowOverwrite}
            onConfirm={() => setStep('result')}
            onBack={() => setStep('mapping')}
          />
        )}

        {!loading && step === 'result' && user && (
          <ImportStepResult
            validatedRows={validatedRows}
            allowOverwrite={allowOverwrite}
            createdBy={user.id}
          />
        )}
      </div>
    </div>
  )
}

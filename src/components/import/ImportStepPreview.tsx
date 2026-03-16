import { useTranslation } from 'react-i18next'
import type { ValidatedRow } from '../../lib/importUtils'

interface Props {
  validatedRows: ValidatedRow[]
  allowOverwrite: boolean
  onOverwriteChange: (v: boolean) => void
  onConfirm: () => void
  onBack: () => void
}

const PREVIEW_FIELDS = ['name', 'city', 'email', 'phone', 'vat_number'] as const

export default function ImportStepPreview({
  validatedRows,
  allowOverwrite,
  onOverwriteChange,
  onConfirm,
  onBack,
}: Props) {
  const { t } = useTranslation()

  const validCount = validatedRows.filter(r => r.errors.length === 0 && !r.isDuplicate).length
  const dupCount   = validatedRows.filter(r => r.isDuplicate).length
  const errCount   = validatedRows.filter(r => r.errors.length > 0).length
  const importCount = validCount + (allowOverwrite ? dupCount : 0)

  const preview = validatedRows.slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center border-l-4 border-l-green-400">
          <p className="text-2xl font-bold text-green-600">{validCount}</p>
          <p className="text-xs text-gray-500 mt-1">{t('companies.importPage.preview.valid')}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-amber-400">
          <p className="text-2xl font-bold text-amber-600">{dupCount}</p>
          <p className="text-xs text-gray-500 mt-1">{t('companies.importPage.preview.duplicates')}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-red-400">
          <p className="text-2xl font-bold text-red-600">{errCount}</p>
          <p className="text-xs text-gray-500 mt-1">{t('companies.importPage.preview.errors')}</p>
        </div>
      </div>

      {/* Option overwrite */}
      {dupCount > 0 && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={allowOverwrite}
            onChange={e => onOverwriteChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary"
          />
          {t('companies.importPage.preview.overwrite')}
        </label>
      )}

      {/* Aperçu tableau */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
          {t('companies.importPage.preview.tableTitle', { shown: preview.length, total: validatedRows.length })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 w-6">#</th>
                {PREVIEW_FIELDS.map(f => (
                  <th key={f} className="px-3 py-2 text-left text-gray-500">{f}</th>
                ))}
                <th className="px-3 py-2 text-left text-gray-500">{t('companies.importPage.preview.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.map((row, i) => {
                const hasError = row.errors.length > 0
                const isDup    = row.isDuplicate
                const rowClass = hasError
                  ? 'bg-red-50'
                  : isDup
                  ? 'bg-amber-50'
                  : ''
                return (
                  <tr key={i} className={rowClass}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {PREVIEW_FIELDS.map(f => (
                      <td key={f} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">
                        {row.data[f] ?? <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {hasError ? (
                        <span className="badge bg-red-100 text-red-700">
                          {t('companies.importPage.preview.statusError')}
                        </span>
                      ) : isDup ? (
                        <span className="badge bg-amber-100 text-amber-700">
                          {allowOverwrite
                            ? t('companies.importPage.preview.statusUpdate')
                            : t('companies.importPage.preview.statusSkip')}
                        </span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">
                          {t('companies.importPage.preview.statusOk')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          className="btn-primary"
          disabled={importCount === 0}
        >
          {t('companies.importPage.preview.import', { count: importCount })}
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          {t('common.back')}
        </button>
      </div>
    </div>
  )
}

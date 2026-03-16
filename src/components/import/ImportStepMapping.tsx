import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { COMPANY_FIELDS, autoDetectMapping, type CompanyField, type ColumnMapping } from '../../lib/importUtils'

interface Props {
  headers: string[]
  initialMapping: ColumnMapping
  onConfirm: (mapping: ColumnMapping) => void
  onBack: () => void
}

const FIELD_LABELS: Record<CompanyField, string> = {
  name: 'Nom *',
  vat_number: 'N° TVA / SIRET',
  address: 'Adresse',
  postcode: 'Code postal',
  city: 'Ville',
  region: 'Région',
  country: 'Pays',
  contact_name: 'Nom du contact',
  phone: 'Téléphone',
  mobile: 'Mobile',
  email: 'Email',
  website: 'Site web',
  keywords: 'Mots-clés',
}

export default function ImportStepMapping({ headers, initialMapping, onConfirm, onBack }: Props) {
  const { t } = useTranslation()
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping)
  const [error, setError] = useState(false)

  function setField(header: string, value: string) {
    setMapping(m => ({ ...m, [header]: (value as CompanyField) || null }))
    setError(false)
  }

  function handleConfirm() {
    const hasName = Object.values(mapping).includes('name')
    if (!hasName) {
      setError(true)
      return
    }
    onConfirm(mapping)
  }

  function handleReset() {
    setMapping(autoDetectMapping(headers))
    setError(false)
  }

  // Champs déjà utilisés (pour détecter les doublons de mapping)
  const usedFields = new Map<CompanyField, number>()
  for (const v of Object.values(mapping)) {
    if (v) usedFields.set(v, (usedFields.get(v) ?? 0) + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('companies.importPage.mapping.subtitle', { count: headers.length })}</p>
        <button type="button" onClick={handleReset} className="text-xs text-primary hover:underline">
          {t('companies.importPage.mapping.reset')}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-1/2">
                {t('companies.importPage.mapping.fileColumn')}
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 w-1/2">
                {t('companies.importPage.mapping.targetField')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {headers.map(h => {
              const val = mapping[h]
              const isDuplicate = val != null && (usedFields.get(val) ?? 0) > 1
              const isUnmapped = !val
              return (
                <tr key={h} className={isUnmapped ? 'bg-amber-50/60' : ''}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {h}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      className={`input py-1 text-sm ${isDuplicate ? 'border-amber-400' : ''}`}
                      value={val ?? ''}
                      onChange={e => setField(h, e.target.value)}
                    >
                      <option value="">{t('companies.importPage.mapping.ignore')}</option>
                      {COMPANY_FIELDS.map(f => (
                        <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                    {isDuplicate && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {t('companies.importPage.mapping.duplicate')}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">
          {t('companies.importPage.mapping.noMapping')}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={handleConfirm} className="btn-primary">
          {t('companies.importPage.mapping.next')}
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          {t('common.back')}
        </button>
      </div>
    </div>
  )
}

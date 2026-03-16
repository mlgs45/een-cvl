import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { parseFile, type ParsedRow } from '../../lib/importUtils'

interface Props {
  onFileParsed: (headers: string[], rows: ParsedRow[]) => void
}

type UploadState = 'idle' | 'dragging' | 'loading' | 'error'

export default function ImportStepUpload({ onFileParsed }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    setState('loading')
    setErrorMsg('')
    try {
      const { headers, rows } = await parseFile(file)
      if (headers.length === 0) {
        setState('error')
        setErrorMsg(t('companies.importPage.upload.emptyFile'))
        return
      }
      onFileParsed(headers, rows)
    } catch {
      setState('error')
      setErrorMsg(t('companies.importPage.upload.error'))
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setState('dragging')
  }

  function handleDragLeave() {
    setState('idle')
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${state === 'dragging'
            ? 'border-primary bg-primary/5'
            : state === 'error'
            ? 'border-red-300 bg-red-50'
            : 'border-gray-200 hover:border-primary hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={handleChange}
        />

        {state === 'loading' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{t('companies.importPage.upload.parsing')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${state === 'error' ? 'bg-red-100' : 'bg-gray-100'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" className={state === 'error' ? 'text-red-500' : 'text-gray-400'}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-700">{t('companies.importPage.upload.dropzone')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('companies.importPage.upload.or')}{' '}
                <span className="text-primary underline">{t('companies.importPage.upload.browse')}</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">{t('companies.importPage.upload.accepted')}</p>
            </div>
            {state === 'error' && (
              <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { NetworkCategoryRow } from '../../types/database'

interface CatForm {
  label_fr: string
  label_en: string
  code: string
  is_active: boolean
  sort_order: number
}

const emptyForm: CatForm = { label_fr: '', label_en: '', code: '', is_active: true, sort_order: 0 }

export default function AdminNetworkCategoriesPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const queryClient = useQueryClient()

  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CatForm>(emptyForm)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['network-categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_activity_categories')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as NetworkCategoryRow[]
    },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['network-categories-admin'] })
    queryClient.invalidateQueries({ queryKey: ['network-categories'] })
  }

  async function handleSave() {
    if (!form.label_fr || !form.label_en || !form.code) {
      toast.error(t('common.required'))
      return
    }
    if (editingId) {
      const { error } = await supabase
        .from('network_activity_categories')
        .update({ label_fr: form.label_fr, label_en: form.label_en, code: form.code, is_active: form.is_active, sort_order: form.sort_order })
        .eq('id', editingId)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.networkCategories.updateSuccess'))
    } else {
      const maxOrder = Math.max(0, ...categories.map(c => c.sort_order)) + 1
      const { error } = await supabase
        .from('network_activity_categories')
        .insert({ ...form, sort_order: form.sort_order || maxOrder })
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.networkCategories.createSuccess'))
    }
    setEditingId(null)
    setAddingNew(false)
    setForm(emptyForm)
    invalidate()
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('common.confirm') + ' ?')) return
    const { error } = await supabase.from('network_activity_categories').delete().eq('id', id)
    if (error) { toast.error(t('common.error')); return }
    toast.success(t('admin.networkCategories.deleteSuccess'))
    invalidate()
  }

  function startEdit(cat: NetworkCategoryRow) {
    setEditingId(cat.id)
    setAddingNew(false)
    setForm({ label_fr: cat.label_fr, label_en: cat.label_en, code: cat.code, is_active: cat.is_active, sort_order: cat.sort_order })
  }

  function cancelEdit() {
    setEditingId(null)
    setAddingNew(false)
    setForm(emptyForm)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('admin.networkCategories.title')}</h1>
        <button
          className="btn-primary text-sm"
          onClick={() => { setAddingNew(true); setEditingId(null); setForm(emptyForm) }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('admin.networkCategories.addCategory')}
        </button>
      </div>

      {addingNew && (
        <div className="card p-4 border-primary border">
          <CatFormFields form={form} onChange={setForm} t={t} />
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs" onClick={handleSave}>{t('admin.networkCategories.save')}</button>
            <button className="btn-secondary text-xs" onClick={cancelEdit}>{t('admin.networkCategories.cancel')}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-100">
          {categories.map(cat => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="p-4">
                  <CatFormFields form={form} onChange={setForm} t={t} />
                  <div className="flex gap-2 mt-3">
                    <button className="btn-primary text-xs" onClick={handleSave}>{t('admin.networkCategories.save')}</button>
                    <button className="btn-secondary text-xs" onClick={cancelEdit}>{t('admin.networkCategories.cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className="w-6 text-center text-xs text-gray-400 font-mono">{cat.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {lang === 'fr' ? cat.label_fr : cat.label_en}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{cat.code}</p>
                  </div>
                  {!cat.is_active && (
                    <span className="badge bg-gray-100 text-gray-500 text-xs">inactif</span>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CatFormFields({ form, onChange, t }: {
  form: CatForm
  onChange: (f: CatForm) => void
  t: (k: string) => string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className="sm:col-span-1">
        <label className="label text-xs">{t('admin.networkCategories.labelFr')} *</label>
        <input className="input text-xs" value={form.label_fr}
          onChange={e => onChange({ ...form, label_fr: e.target.value })} />
      </div>
      <div className="sm:col-span-1">
        <label className="label text-xs">{t('admin.networkCategories.labelEn')} *</label>
        <input className="input text-xs" value={form.label_en}
          onChange={e => onChange({ ...form, label_en: e.target.value })} />
      </div>
      <div>
        <label className="label text-xs">{t('admin.networkCategories.code')} *</label>
        <input className="input text-xs font-mono" value={form.code} placeholder="snake_case"
          onChange={e => onChange({ ...form, code: e.target.value })} />
      </div>
      <div>
        <label className="label text-xs">Ordre</label>
        <input type="number" className="input text-xs" value={form.sort_order} min={0}
          onChange={e => onChange({ ...form, sort_order: Number(e.target.value) })} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="cat-active" className="w-4 h-4 accent-primary"
          checked={form.is_active} onChange={e => onChange({ ...form, is_active: e.target.checked })} />
        <label htmlFor="cat-active" className="text-xs text-gray-700">{t('admin.networkCategories.active')}</label>
      </div>
    </div>
  )
}

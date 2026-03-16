import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { ActivityTypeRow, ActivitySubtypeRow } from '../../types/database'

interface TypeFormState {
  label_fr: string
  label_en: string
  code: string
  is_active: boolean
}

interface SubtypeFormState {
  label_fr: string
  label_en: string
  code: string
  is_active: boolean
}

const emptyType: TypeFormState = { label_fr: '', label_en: '', code: '', is_active: true }
const emptySubtype: SubtypeFormState = { label_fr: '', label_en: '', code: '', is_active: true }

export default function AdminActivityTypesPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'fr' | 'en'
  const queryClient = useQueryClient()

  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [typeForm, setTypeForm] = useState<TypeFormState>(emptyType)
  const [addingType, setAddingType] = useState(false)

  const [editingSubtype, setEditingSubtype] = useState<string | null>(null)
  const [subtypeForm, setSubtypeForm] = useState<SubtypeFormState>(emptySubtype)
  const [addingSubtypeFor, setAddingSubtypeFor] = useState<string | null>(null)

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['activity-types-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as ActivityTypeRow[]
    },
  })

  const { data: subtypes = [] } = useQuery({
    queryKey: ['activity-subtypes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_subtypes')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as ActivitySubtypeRow[]
    },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['activity-types-admin'] })
    queryClient.invalidateQueries({ queryKey: ['activity-subtypes-all'] })
    queryClient.invalidateQueries({ queryKey: ['activity-types'] })
  }

  // --- Type CRUD ---
  async function saveType() {
    if (!typeForm.label_fr || !typeForm.label_en || !typeForm.code) {
      toast.error(t('common.required'))
      return
    }
    if (editingType) {
      const { error } = await supabase.from('activity_types').update(typeForm).eq('id', editingType)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.activityTypes.updateSuccess'))
    } else {
      const maxOrder = Math.max(0, ...types.map(t => t.sort_order)) + 1
      const { error } = await supabase.from('activity_types').insert({ ...typeForm, sort_order: maxOrder })
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.activityTypes.createSuccess'))
    }
    setEditingType(null)
    setAddingType(false)
    setTypeForm(emptyType)
    invalidate()
  }

  async function deleteType(id: string) {
    if (!window.confirm(t('common.confirm') + '?')) return
    const { error } = await supabase.from('activity_types').delete().eq('id', id)
    if (error) { toast.error(t('common.error')); return }
    toast.success(t('admin.activityTypes.deleteSuccess'))
    invalidate()
  }

  function startEditType(type: ActivityTypeRow) {
    setEditingType(type.id)
    setAddingType(false)
    setTypeForm({ label_fr: type.label_fr, label_en: type.label_en, code: type.code, is_active: type.is_active })
  }

  // --- Subtype CRUD ---
  async function saveSubtype(typeId: string) {
    if (!subtypeForm.label_fr || !subtypeForm.label_en) {
      toast.error(t('common.required'))
      return
    }
    if (editingSubtype) {
      const { error } = await supabase.from('activity_subtypes').update(subtypeForm).eq('id', editingSubtype)
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.activityTypes.updateSuccess'))
    } else {
      const existing = subtypes.filter(s => s.activity_type_id === typeId)
      const maxOrder = Math.max(0, ...existing.map(s => s.sort_order)) + 1
      const { error } = await supabase.from('activity_subtypes').insert({
        ...subtypeForm, activity_type_id: typeId, sort_order: maxOrder,
      })
      if (error) { toast.error(t('common.error')); return }
      toast.success(t('admin.activityTypes.createSuccess'))
    }
    setEditingSubtype(null)
    setAddingSubtypeFor(null)
    setSubtypeForm(emptySubtype)
    invalidate()
  }

  async function deleteSubtype(id: string) {
    if (!window.confirm(t('common.confirm') + '?')) return
    const { error } = await supabase.from('activity_subtypes').delete().eq('id', id)
    if (error) { toast.error(t('common.error')); return }
    toast.success(t('admin.activityTypes.deleteSuccess'))
    invalidate()
  }

  function startEditSubtype(st: ActivitySubtypeRow) {
    setEditingSubtype(st.id)
    setAddingSubtypeFor(null)
    setSubtypeForm({ label_fr: st.label_fr, label_en: st.label_en, code: st.code ?? '', is_active: st.is_active })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('admin.activityTypes.title')}</h1>
        <button
          className="btn-primary text-sm"
          onClick={() => { setAddingType(true); setEditingType(null); setTypeForm(emptyType) }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('admin.activityTypes.addType')}
        </button>
      </div>

      {/* Add type form */}
      {addingType && (
        <div className="card p-4 border-primary border">
          <TypeFormFields form={typeForm} onChange={setTypeForm} t={t} />
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs" onClick={saveType}>{t('admin.activityTypes.save')}</button>
            <button className="btn-secondary text-xs" onClick={() => { setAddingType(false); setTypeForm(emptyType) }}>{t('admin.activityTypes.cancel')}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {types.map(type => {
            const typeSubtypes = subtypes.filter(s => s.activity_type_id === type.id)
            const isExpanded = expandedType === type.id

            return (
              <div key={type.id} className="card overflow-hidden">
                {/* Type row */}
                {editingType === type.id ? (
                  <div className="p-4">
                    <TypeFormFields form={typeForm} onChange={setTypeForm} t={t} />
                    <div className="flex gap-2 mt-3">
                      <button className="btn-primary text-xs" onClick={saveType}>{t('admin.activityTypes.save')}</button>
                      <button className="btn-secondary text-xs" onClick={() => { setEditingType(null); setTypeForm(emptyType) }}>{t('admin.activityTypes.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedType(isExpanded ? null : type.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      <span className="font-medium text-sm text-gray-900">
                        {lang === 'fr' ? type.label_fr : type.label_en}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{type.code}</span>
                      {!type.is_active && (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">inactif</span>
                      )}
                      {typeSubtypes.length > 0 && (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">{typeSubtypes.length}</span>
                      )}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditType(type)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteType(type.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Subtypes */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {typeSubtypes.map(st => (
                      <div key={st.id}>
                        {editingSubtype === st.id ? (
                          <div className="px-8 py-3">
                            <SubtypeFormFields form={subtypeForm} onChange={setSubtypeForm} t={t} />
                            <div className="flex gap-2 mt-3">
                              <button className="btn-primary text-xs" onClick={() => saveSubtype(type.id)}>{t('admin.activityTypes.save')}</button>
                              <button className="btn-secondary text-xs" onClick={() => { setEditingSubtype(null); setSubtypeForm(emptySubtype) }}>{t('admin.activityTypes.cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-8 py-2 border-b border-gray-100 last:border-b-0 hover:bg-white">
                            <div className="flex-1 text-sm text-gray-700">
                              {lang === 'fr' ? st.label_fr : st.label_en}
                              {!st.is_active && <span className="ml-2 badge bg-gray-100 text-gray-400 text-xs">inactif</span>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => startEditSubtype(st)} className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button onClick={() => deleteSubtype(st.id)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add subtype */}
                    {addingSubtypeFor === type.id ? (
                      <div className="px-8 py-3">
                        <SubtypeFormFields form={subtypeForm} onChange={setSubtypeForm} t={t} />
                        <div className="flex gap-2 mt-3">
                          <button className="btn-primary text-xs" onClick={() => saveSubtype(type.id)}>{t('admin.activityTypes.save')}</button>
                          <button className="btn-secondary text-xs" onClick={() => { setAddingSubtypeFor(null); setSubtypeForm(emptySubtype) }}>{t('admin.activityTypes.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 px-8 py-2 text-xs text-primary hover:bg-white w-full text-left"
                        onClick={() => { setAddingSubtypeFor(type.id); setEditingSubtype(null); setSubtypeForm(emptySubtype) }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        {t('admin.activityTypes.addSubtype')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TypeFormFields({ form, onChange, t }: {
  form: { label_fr: string; label_en: string; code: string; is_active: boolean }
  onChange: (f: any) => void
  t: (k: string) => string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="label text-xs">{t('admin.activityTypes.labelFr')} *</label>
        <input className="input text-xs" value={form.label_fr} onChange={e => onChange((f: any) => ({ ...f, label_fr: e.target.value }))} />
      </div>
      <div>
        <label className="label text-xs">{t('admin.activityTypes.labelEn')} *</label>
        <input className="input text-xs" value={form.label_en} onChange={e => onChange((f: any) => ({ ...f, label_en: e.target.value }))} />
      </div>
      <div>
        <label className="label text-xs">{t('admin.activityTypes.code')} *</label>
        <input className="input text-xs font-mono" value={form.code} onChange={e => onChange((f: any) => ({ ...f, code: e.target.value }))} placeholder="snake_case" />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="type-active"
          className="w-4 h-4 accent-primary"
          checked={form.is_active}
          onChange={e => onChange((f: any) => ({ ...f, is_active: e.target.checked }))}
        />
        <label htmlFor="type-active" className="text-xs text-gray-700">{t('admin.activityTypes.active')}</label>
      </div>
    </div>
  )
}

function SubtypeFormFields({ form, onChange, t }: {
  form: { label_fr: string; label_en: string; code: string; is_active: boolean }
  onChange: (f: any) => void
  t: (k: string) => string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="label text-xs">{t('admin.activityTypes.labelFr')} *</label>
        <input className="input text-xs" value={form.label_fr} onChange={e => onChange((f: any) => ({ ...f, label_fr: e.target.value }))} />
      </div>
      <div>
        <label className="label text-xs">{t('admin.activityTypes.labelEn')} *</label>
        <input className="input text-xs" value={form.label_en} onChange={e => onChange((f: any) => ({ ...f, label_en: e.target.value }))} />
      </div>
      <div>
        <label className="label text-xs">{t('admin.activityTypes.code')}</label>
        <input className="input text-xs font-mono" value={form.code} onChange={e => onChange((f: any) => ({ ...f, code: e.target.value }))} placeholder="snake_case" />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="subtype-active"
          className="w-4 h-4 accent-primary"
          checked={form.is_active}
          onChange={e => onChange((f: any) => ({ ...f, is_active: e.target.checked }))}
        />
        <label htmlFor="subtype-active" className="text-xs text-gray-700">{t('admin.activityTypes.active')}</label>
      </div>
    </div>
  )
}

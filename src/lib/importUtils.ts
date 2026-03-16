import * as XLSX from 'xlsx'
import type { Database } from '../types/database'

// ─── Champs mappables (sans id, created_by, created_at, updated_at, een_contact_id) ───
export const COMPANY_FIELDS = [
  'name',
  'vat_number',
  'address',
  'postcode',
  'city',
  'region',
  'country',
  'contact_name',
  'phone',
  'mobile',
  'email',
  'website',
  'keywords',
] as const

export type CompanyField = typeof COMPANY_FIELDS[number]

// ─── Alias de détection automatique (clé en minuscules) ───
export const HEADER_ALIASES: Record<string, CompanyField> = {
  // name
  'nom': 'name', 'name': 'name', 'company': 'name', 'entreprise': 'name',
  'société': 'name', 'societe': 'name', 'raison sociale': 'name',
  // vat_number
  'tva': 'vat_number', 'vat': 'vat_number', 'vat_number': 'vat_number',
  'siret': 'vat_number', 'siren': 'vat_number', 'n° tva': 'vat_number',
  // address
  'adresse': 'address', 'address': 'address', 'rue': 'address',
  // postcode
  'cp': 'postcode', 'code postal': 'postcode', 'postcode': 'postcode',
  'zip': 'postcode', 'code_postal': 'postcode',
  // city
  'ville': 'city', 'city': 'city', 'commune': 'city',
  // region
  'région': 'region', 'region': 'region', 'departement': 'region',
  'département': 'region',
  // country
  'pays': 'country', 'country': 'country',
  // contact_name
  'contact': 'contact_name', 'contact_name': 'contact_name',
  'nom contact': 'contact_name', 'nom du contact': 'contact_name',
  'interlocuteur': 'contact_name',
  // phone
  'tel': 'phone', 'téléphone': 'phone', 'telephone': 'phone',
  'phone': 'phone', 'tél': 'phone', 'tel fixe': 'phone',
  // mobile
  'mobile': 'mobile', 'portable': 'mobile', 'gsm': 'mobile',
  'tel mobile': 'mobile', 'tél mobile': 'mobile',
  // email
  'email': 'email', 'mail': 'email', 'e-mail': 'email',
  'courriel': 'email', 'adresse mail': 'email',
  // website
  'site': 'website', 'website': 'website', 'web': 'website',
  'url': 'website', 'site web': 'website', 'site internet': 'website',
  // keywords
  'mots-clés': 'keywords', 'keywords': 'keywords', 'tags': 'keywords',
  'mots clés': 'keywords', 'secteur': 'keywords', 'activité': 'keywords',
}

// ─── Types ───
export interface ParsedRow {
  [header: string]: string
}

export type ColumnMapping = Record<string, CompanyField | null>

export interface MappedRow {
  [field: string]: string | null
}

export interface ValidatedRow {
  original: ParsedRow
  data: MappedRow
  errors: string[]
  isDuplicate: boolean
}

// ─── Parsing du fichier (CSV ou XLSX) ───
export async function parseFile(file: File): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false, cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  if (json.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = Object.keys(json[0])
  const rows: ParsedRow[] = json.map(r =>
    Object.fromEntries(headers.map(h => [h, String(r[h] ?? '').trim()]))
  )
  return { headers, rows }
}

// ─── Détection automatique des colonnes ───
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (const h of headers) {
    const alias = HEADER_ALIASES[h.toLowerCase().trim()]
    mapping[h] = alias ?? null
  }
  return mapping
}

// ─── Application du mapping ───
export function applyMapping(rows: ParsedRow[], mapping: ColumnMapping): MappedRow[] {
  return rows.map(row => {
    const mapped: MappedRow = {}
    for (const field of COMPANY_FIELDS) {
      mapped[field] = null
    }
    for (const [header, field] of Object.entries(mapping)) {
      if (field && row[header] !== undefined) {
        const val = row[header].trim()
        mapped[field] = val || null
      }
    }
    return mapped
  })
}

// ─── Validation ───
export function validateRows(
  rows: MappedRow[],
  existingNames: Set<string>,
  existingVats: Set<string>
): ValidatedRow[] {
  return rows.map((data, i) => {
    const errors: string[] = []

    // Champ name obligatoire
    if (!data['name']) {
      errors.push('name_required')
    }

    // Détection doublons
    const nameLower = (data['name'] ?? '').toLowerCase().trim()
    const vatVal = (data['vat_number'] ?? '').trim()
    const isDuplicate =
      (nameLower !== '' && existingNames.has(nameLower)) ||
      (vatVal !== '' && existingVats.has(vatVal.toLowerCase()))

    return {
      original: { _row: String(i + 1) },
      data,
      errors,
      isDuplicate,
    }
  })
}

// ─── Conversion en payload Supabase ───
export function toInsertPayload(
  row: MappedRow,
  createdBy: string
): Database['public']['Tables']['companies']['Insert'] {
  return {
    name: row['name'] as string,
    vat_number: row['vat_number'] || null,
    address: row['address'] || null,
    postcode: row['postcode'] || null,
    city: row['city'] || null,
    region: row['region'] || null,
    country: row['country'] || 'France',
    contact_name: row['contact_name'] || null,
    phone: row['phone'] || null,
    mobile: row['mobile'] || null,
    email: row['email'] || null,
    website: row['website'] || null,
    keywords: row['keywords'] || null,
    een_contact_id: null,
    created_by: createdBy,
  }
}

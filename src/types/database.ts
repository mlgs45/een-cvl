export type UserRole = 'advisor' | 'admin'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          organisation: string
          role: UserRole
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          organisation?: string
          role?: UserRole
          is_active?: boolean
          created_at?: string
        }
        Update: {
          full_name?: string
          organisation?: string
          role?: UserRole
          is_active?: boolean
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          vat_number: string | null
          address: string | null
          postcode: string | null
          city: string | null
          region: string | null
          country: string
          contact_name: string | null
          phone: string | null
          mobile: string | null
          email: string | null
          website: string | null
          keywords: string | null
          een_contact_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          vat_number?: string | null
          address?: string | null
          postcode?: string | null
          city?: string | null
          region?: string | null
          country?: string
          contact_name?: string | null
          phone?: string | null
          mobile?: string | null
          email?: string | null
          website?: string | null
          keywords?: string | null
          een_contact_id?: string | null
          created_by: string
        }
        Update: {
          name?: string
          vat_number?: string | null
          address?: string | null
          postcode?: string | null
          city?: string | null
          region?: string | null
          country?: string
          contact_name?: string | null
          phone?: string | null
          mobile?: string | null
          email?: string | null
          website?: string | null
          keywords?: string | null
          een_contact_id?: string | null
        }
        Relationships: []
      }
      activity_types: {
        Row: {
          id: string
          label_fr: string
          label_en: string
          code: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          label_fr: string
          label_en: string
          code: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          label_fr?: string
          label_en?: string
          code?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      activity_subtypes: {
        Row: {
          id: string
          activity_type_id: string
          label_fr: string
          label_en: string
          code: string | null
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          activity_type_id: string
          label_fr: string
          label_en: string
          code?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          label_fr?: string
          label_en?: string
          code?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          company_id: string
          date: string
          activity_type_id: string
          activity_subtype_id: string | null
          description: string | null
          follow_up: boolean
          follow_up_date: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          date: string
          activity_type_id: string
          activity_subtype_id?: string | null
          description?: string | null
          follow_up?: boolean
          follow_up_date?: string | null
          notes?: string | null
          created_by: string
        }
        Update: {
          date?: string
          activity_type_id?: string
          activity_subtype_id?: string | null
          description?: string | null
          follow_up?: boolean
          follow_up_date?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      network_activity_categories: {
        Row: {
          id: string
          code: string
          label_fr: string
          label_en: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          code: string
          label_fr: string
          label_en: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          label_fr?: string
          label_en?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      network_objectives: {
        Row: {
          id: string
          advisor_id: string
          category_id: string
          year: number
          target_count: number
          is_na: boolean
          period_start: string
          period_end: string
        }
        Insert: {
          id?: string
          advisor_id: string
          category_id: string
          year: number
          target_count?: number
          is_na?: boolean
          period_start?: string
          period_end?: string
        }
        Update: {
          year?: number
          target_count?: number
          is_na?: boolean
          period_start?: string
          period_end?: string
        }
        Relationships: []
      }
      network_activity_logs: {
        Row: {
          id: string
          advisor_id: string
          category_id: string
          date: string
          name: string
          year: number
          comment: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advisor_id: string
          category_id: string
          date: string
          name: string
          comment?: string | null
          created_by?: string | null
        }
        Update: {
          advisor_id?: string
          category_id?: string
          date?: string
          name?: string
          comment?: string | null
        }
        Relationships: []
      }
      kpi_objectives: {
        Row: {
          id: string
          advisor_id: string
          kpi_code: string
          year: number
          target_count: number
          etp: number
          is_nc: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advisor_id: string
          kpi_code: string
          year: number
          target_count?: number
          etp?: number
          is_nc?: boolean
        }
        Update: {
          target_count?: number
          etp?: number
          is_nc?: boolean
        }
        Relationships: []
      }
      kpi_manual_logs: {
        Row: {
          id: string
          advisor_id: string
          kpi_code: string
          date: string
          year: number
          title: string
          company_id: string | null
          comment: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advisor_id: string
          kpi_code: string
          date: string
          title: string
          company_id?: string | null
          comment?: string | null
          created_by?: string | null
        }
        Update: {
          kpi_code?: string
          date?: string
          title?: string
          company_id?: string | null
          comment?: string | null
        }
        Relationships: []
      }
      kpi_team_objectives: {
        Row: {
          id: string
          kpi_code: string
          year: number
          target_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kpi_code: string
          year?: number
          target_count: number
        }
        Update: {
          target_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      kpi_auto_actuals: {
        Row: {
          advisor_id: string
          year: number
          kpi_code: string
          actual: number
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      user_role: 'advisor' | 'admin'
    }
    CompositeTypes: Record<string, never>
  }
}

// Convenient row types
export type UserRow = Database['public']['Tables']['users']['Row']
export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type ActivityTypeRow = Database['public']['Tables']['activity_types']['Row']
export type ActivitySubtypeRow = Database['public']['Tables']['activity_subtypes']['Row']
export type ActivityRow = Database['public']['Tables']['activities']['Row']
export type NetworkCategoryRow = Database['public']['Tables']['network_activity_categories']['Row']
export type NetworkObjectiveRow = Database['public']['Tables']['network_objectives']['Row']
export type NetworkLogRow = Database['public']['Tables']['network_activity_logs']['Row']
export type KpiObjectiveRow = Database['public']['Tables']['kpi_objectives']['Row']
export type KpiManualLogRow = Database['public']['Tables']['kpi_manual_logs']['Row']
export type KpiTeamObjectiveRow = Database['public']['Tables']['kpi_team_objectives']['Row']
export type KpiAutoActualRow = Database['public']['Views']['kpi_auto_actuals']['Row']

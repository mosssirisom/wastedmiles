export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type OperatorStatus = 'pending' | 'verified' | 'suspended'
export type VerificationStatus = 'not_started' | 'pending' | 'approved' | 'rejected'
export type JourneyKind = 'standard' | 'empty_return' | 'cover_request'
export type JourneyStatus =
  | 'draft'
  | 'available'
  | 'empty_return'
  | 'cover_needed'
  | 'urgent'
  | 'claimed'
  | 'matched'
  | 'completed'
  | 'cancelled'
export type ClaimStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'
export type OperatorRole = 'owner' | 'dispatcher' | 'driver'

export interface Database {
  public: {
    Tables: {
      operators: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          slug: string
          email: string | null
          phone: string | null
          website: string | null
          base_town: string | null
          base_postcode: string | null
          service_areas: string[]
          vehicle_types: string[]
          fleet_summary: string | null
          status: OperatorStatus
          verification_status: VerificationStatus
          rating: number
          completed_journeys: number
          acceptance_rate: number
          on_time_rate: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['operators']['Row']> & {
          owner_user_id: string
          name: string
          slug: string
        }
        Update: Partial<Database['public']['Tables']['operators']['Row']>
      }
      operator_members: {
        Row: { operator_id: string; user_id: string; role: OperatorRole; created_at: string }
        Insert: { operator_id: string; user_id: string; role?: OperatorRole; created_at?: string }
        Update: Partial<Database['public']['Tables']['operator_members']['Row']>
      }
      operator_leads: {
        Row: {
          id: string
          company_name: string
          email: string
          fleet_size: string | null
          phone: string | null
          source: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_name: string
          email: string
          fleet_size?: string | null
          phone?: string | null
          source?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['operator_leads']['Row']>
      }
      airports: {
        Row: {
          id: string
          code: string
          name: string
          latitude: number
          longitude: number
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['airports']['Row']> & { id: string; code: string; name: string; latitude: number; longitude: number }
        Update: Partial<Database['public']['Tables']['airports']['Row']>
      }
      journeys: {
        Row: {
          id: string
          posting_operator_id: string
          claimed_by_operator_id: string | null
          airport_id: string | null
          kind: JourneyKind
          status: JourneyStatus
          pickup_address: string
          pickup_town: string | null
          pickup_postcode: string | null
          dropoff_address: string
          dropoff_town: string | null
          dropoff_postcode: string | null
          pickup_time: string
          flight_number: string | null
          passenger_count: number
          luggage_count: number
          seats_available: number | null
          vehicle_type: string
          price_gbp: number
          notes: string | null
          latitude: number | null
          longitude: number | null
          response_deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['journeys']['Row']> & {
          posting_operator_id: string
          pickup_address: string
          dropoff_address: string
          pickup_time: string
          vehicle_type: string
          price_gbp: number
        }
        Update: Partial<Database['public']['Tables']['journeys']['Row']>
      }
      journey_claims: {
        Row: {
          id: string
          journey_id: string
          claiming_operator_id: string
          status: ClaimStatus
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: { journey_id: string; claiming_operator_id: string; status?: ClaimStatus; message?: string | null }
        Update: Partial<Database['public']['Tables']['journey_claims']['Row']>
      }
      conversations: {
        Row: { id: string; journey_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; journey_id?: string | null; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['conversations']['Row']>
      }
      conversation_participants: {
        Row: { conversation_id: string; operator_id: string; created_at: string }
        Insert: { conversation_id: string; operator_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['conversation_participants']['Row']>
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_user_id: string
          sender_operator_id: string | null
          body: string
          created_at: string
        }
        Insert: { conversation_id: string; sender_user_id: string; sender_operator_id?: string | null; body: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['messages']['Row']>
      }
      operator_documents: {
        Row: {
          id: string
          operator_id: string
          document_type: string
          storage_path: string
          status: VerificationStatus
          rejection_reason: string | null
          uploaded_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: { operator_id: string; document_type: string; storage_path: string; status?: VerificationStatus; uploaded_by?: string | null }
        Update: Partial<Database['public']['Tables']['operator_documents']['Row']>
      }
    }
    Views: {
      available_marketplace_journeys: {
        Row: Database['public']['Tables']['journeys']['Row'] & {
          airport_code: string | null
          airport_name: string | null
          posting_operator_name: string
          posting_operator_rating: number
          posting_operator_completed: number
        }
      }
    }
    Functions: {
      is_verified_operator_member: {
        Args: { p_operator_id: string }
        Returns: boolean
      }
      claim_journey_atomic: {
        Args: { p_journey_id: string; p_claiming_operator_id: string; p_message?: string | null }
        Returns: Database['public']['Tables']['journey_claims']['Row']
      }
      accept_journey_claim: {
        Args: { p_claim_id: string }
        Returns: string
      }
      complete_journey: {
        Args: { p_journey_id: string }
        Returns: Database['public']['Tables']['journeys']['Row']
      }
    }
    Enums: {
      operator_role: OperatorRole
      operator_status: OperatorStatus
      verification_status: VerificationStatus
      journey_status: JourneyStatus
      journey_kind: JourneyKind
      claim_status: ClaimStatus
    }
  }
}

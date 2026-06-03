export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      event_photos: {
        Row: {
          caption: string | null
          cloudinary_public_id: string | null
          created_at: string
          event_id: string
          height: number | null
          id: string
          media_type: string
          thumbnail_url: string | null
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          cloudinary_public_id?: string | null
          created_at?: string
          event_id: string
          height?: number | null
          id?: string
          media_type?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          cloudinary_public_id?: string | null
          created_at?: string
          event_id?: string
          height?: number | null
          id?: string
          media_type?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          end_date: string
          format: Database["public"]["Enums"]["fixture_format"]
          id: string
          name: string
          organization_id: string | null
          sport: string
          start_date: string
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          created_at?: string
          end_date: string
          format?: Database["public"]["Enums"]["fixture_format"]
          id?: string
          name: string
          organization_id?: string | null
          sport: string
          start_date: string
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          created_at?: string
          end_date?: string
          format?: Database["public"]["Enums"]["fixture_format"]
          id?: string
          name?: string
          organization_id?: string | null
          sport?: string
          start_date?: string
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          body: string
          created_at: string
          event_type: string
          id: string
          match_id: string
          minute: number | null
        }
        Insert: {
          body: string
          created_at?: string
          event_type?: string
          id?: string
          match_id: string
          minute?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string
          minute?: number | null
        }
        Relationships: []
      }
      match_reactions: {
        Row: {
          client_id: string
          created_at: string
          emoji: string
          id: string
          match_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          emoji: string
          id?: string
          match_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          emoji?: string
          id?: string
          match_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          bracket: string
          created_at: string
          event_id: string
          id: string
          match_number: number
          prediction_deadline: string | null
          result: string | null
          round: number
          score_a: number | null
          score_b: number | null
          status: Database["public"]["Enums"]["match_status"]
          summary: string | null
          team_a_id: string | null
          team_b_id: string | null
          winner_id: string | null
        }
        Insert: {
          bracket?: string
          created_at?: string
          event_id: string
          id?: string
          match_number: number
          prediction_deadline?: string | null
          result?: string | null
          round: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          summary?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket?: string
          created_at?: string
          event_id?: string
          id?: string
          match_number?: number
          prediction_deadline?: string | null
          result?: string | null
          round?: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          summary?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          match_id: string | null
          read_at: string | null
          team_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          match_id?: string | null
          read_at?: string | null
          team_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          match_id?: string | null
          read_at?: string | null
          team_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      points: {
        Row: {
          created_at: string
          id: string
          match_id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          points?: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          match_id: string
          prediction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          prediction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          prediction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          captain: string
          created_at: string
          department: string
          event_id: string
          id: string
          logo_url: string | null
          name: string
          roster: string | null
        }
        Insert: {
          captain: string
          created_at?: string
          department: string
          event_id: string
          id?: string
          logo_url?: string | null
          name: string
          roster?: string | null
        }
        Update: {
          captain?: string
          created_at?: string
          department?: string
          event_id?: string
          id?: string
          logo_url?: string | null
          name?: string
          roster?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      event_leaderboard: {
        Row: {
          correct_predictions: number | null
          event_id: string | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard: {
        Row: {
          correct_predictions: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      can_predict: { Args: { _match_id: string }; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_organization: { Args: { _org_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      event_status: "upcoming" | "ongoing" | "completed"
      fixture_format: "single_elim" | "double_elim" | "round_robin" | "league"
      match_status: "pending" | "completed" | "bye" | "live" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      event_status: ["upcoming", "ongoing", "completed"],
      fixture_format: ["single_elim", "double_elim", "round_robin", "league"],
      match_status: ["pending", "completed", "bye", "live", "cancelled"],
    },
  },
} as const

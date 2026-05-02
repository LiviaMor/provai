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
      body_assessments: {
        Row: {
          confidence: number
          created_at: string
          fitness_assessment: Json
          gender: string | null
          id: string
          measurements: Json
          notes: string | null
          objective: string | null
          product_url: string | null
          size_recommendations: Json
          source: string
          style_recommendations: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          fitness_assessment?: Json
          gender?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          objective?: string | null
          product_url?: string | null
          size_recommendations?: Json
          source?: string
          style_recommendations?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          fitness_assessment?: Json
          gender?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          objective?: string | null
          product_url?: string | null
          size_recommendations?: Json
          source?: string
          style_recommendations?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      color_analyses: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          notes: string | null
          reference_photo: string | null
          season: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          created_at?: string
          id?: string
          notes?: string | null
          reference_photo?: string | null
          season?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          notes?: string | null
          reference_photo?: string | null
          season?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          access_until: string
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          access_until: string
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          access_until?: string
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          access_days: number
          active: boolean
          audience: string
          code: string
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          max_team_size: number | null
          max_uses: number | null
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          access_days?: number
          active?: boolean
          audience?: string
          code: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          max_team_size?: number | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          access_days?: number
          active?: boolean
          audience?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          max_team_size?: number | null
          max_uses?: number | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      favorite_products: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          price: number | null
          season: string | null
          store_id: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          price?: number | null
          season?: string | null
          store_id?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          season?: string | null
          store_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "favorite_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_stores: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          seasons: string[] | null
          tags: string[] | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          seasons?: string[] | null
          tags?: string[] | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          seasons?: string[] | null
          tags?: string[] | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          capture_preferences: Json
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          premium_access_until: string | null
          team_size: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          capture_preferences?: Json
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          premium_access_until?: string | null
          team_size?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          capture_preferences?: Json
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          premium_access_until?: string | null
          team_size?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      redeem_coupon: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      account_type: "b2c" | "b2b"
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
      account_type: ["b2c", "b2b"],
    },
  },
} as const

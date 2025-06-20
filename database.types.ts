export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          chat_summary: string | null
          created_at: string
          id: string
          parent_chat_id: string | null
          pinned: boolean | null
          project_id: string | null
          shared: boolean
          system_prompt: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_summary?: string | null
          created_at?: string
          id?: string
          parent_chat_id?: string | null
          pinned?: boolean | null
          project_id?: string | null
          shared?: boolean
          system_prompt?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_summary?: string | null
          created_at?: string
          id?: string
          parent_chat_id?: string | null
          pinned?: boolean | null
          project_id?: string | null
          shared?: boolean
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_parent_chat_id_fkey"
            columns: ["parent_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hats: {
        Row: {
          additional_prompt: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          traits: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_prompt?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          traits?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_prompt?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          traits?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          parent_message_id: string | null
          role: string
          type: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          role: string
          type: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          role?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_chats: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          messages_snapshot: Json
          original_chat_id: string
          owner_user_id: string
          title: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          messages_snapshot: Json
          original_chat_id: string
          owner_user_id: string
          title: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          messages_snapshot?: Json
          original_chat_id?: string
          owner_user_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_chats_original_chat_id_fkey"
            columns: ["original_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          chat_memory: Json | null
          created_at: string
          display_name: string | null
          id: string
          model_personality: Json | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          chat_memory?: Json | null
          created_at?: string
          display_name?: string | null
          id: string
          model_personality?: Json | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          chat_memory?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          model_personality?: Json | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          additional_info: string | null
          created_at: string | null
          id: string
          name: string | null
          occupation: string | null
          traits: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          occupation?: string | null
          traits?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          occupation?: string | null
          traits?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

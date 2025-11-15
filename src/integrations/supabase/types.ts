export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          staff_category: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          staff_category: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          staff_category?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      channel_members: {
        Row: {
          channel_id: string;
          id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          channel_id: string;
          id?: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          channel_id?: string;
          id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          channel_id: string;
          content: string;
          created_at: string;
          id: string;
          sender_id: string | null;
          ticket_id: string | null;
          type: "user" | "bot" | "announcement";
        };
        Insert: {
          channel_id: string;
          content: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          ticket_id?: string | null;
          type?: "user" | "bot" | "announcement";
        };
        Update: {
          channel_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          ticket_id?: string | null;
          type?: "user" | "bot" | "announcement";
        };
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_type: string;
          file_url: string;
          id: string;
          ticket_id: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_type: string;
          file_url: string;
          id?: string;
          ticket_id: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_type?: string;
          file_url?: string;
          id?: string;
          ticket_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
        
      };
      comments: {
        Row: {
          created_by: string;
          content: string;
          created_at: string;
          id: string;
          is_internal: boolean | null;
          ticket_id: string;
        };
        Insert: {
          created_by: string;
          content: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean | null;
          ticket_id: string;
        };
        Update: {
          created_by?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_internal?: boolean | null;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          contact_number: string | null;
          created_at: string;
          desasiswa: string | null;
          email: string;
          full_name: string;
          id: string;
          role: string;
          room_number: string | null;
          staff_category: string | null;
          student_id: string | null;
          updated_at: string;
        };
        Insert: {
          contact_number?: string | null;
          created_at?: string;
          desasiswa?: string | null;
          email: string;
          full_name: string;
          id: string;
          role: string;
          room_number?: string | null;
          staff_category?: string | null;
          student_id?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_number?: string | null;
          created_at?: string;
          desasiswa?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          role?: string;
          room_number?: string | null;
          staff_category?: string | null;
          student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          assigned_to: string | null;
          category: string;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          desasiswa: string;          
          damage_type: string;
          specific_item_or_location: string;
          individual_room: string | null;
          public_block: string | null;
          public_floor: string | null;
          resolved_at: string | null;
          status: string;
          title: string;
          updated_at: string;
          urgency: string;
        };
        Insert: {
          assigned_to?: string | null;
          category: string;
          created_at?: string;
          created_by: string;
          description: string;
          id?: string;
          location: string;
          resolved_at?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          urgency: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          location?: string;
          resolved_at?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          urgency?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ticket_feedback: {
        Row: {
          created_at: string;
          feedback: string | null;
          id: string;
          rating: number;
          ticket_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feedback?: string | null;
          id?: string;
          rating: number;
          ticket_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feedback?: string | null;
          id?: string;
          rating?: number;
          ticket_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_feedback_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
  Row: {
    id: string;
    channel_id: string;
    user_id: string;
    message_id: string | null;
    seen: boolean;
    created_at: string;
  };
  Insert: {
    id?: string;
    channel_id: string;
    user_id: string;
    message_id?: string | null;
    seen?: boolean;
    created_at?: string;
  };
  Update: {
    id?: string;
    channel_id?: string;
    user_id?: string;
    message_id?: string | null;
    seen?: boolean;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "notifications_channel_id_fkey";
      columns: ["channel_id"];
      isOneToOne: false;
      referencedRelation: "channels";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "notifications_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "notifications_message_id_fkey";
      columns: ["message_id"];
      isOneToOne: false;
      referencedRelation: "messages";
      referencedColumns: ["id"];
    }
  ];
};

      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      post_system_message_to_channel: {
        Args: { p_category: string; p_content: string; p_ticket_id?: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "staff" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["staff", "student"],
    },
  },
} as const;
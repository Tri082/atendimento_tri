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
      agent_document_chunks: {
        Row: {
          agent_id: string
          chunk_index: number
          content: string
          document_id: string
          embedding: string | null
          id: string
          organization_id: string
        }
        Insert: {
          agent_id: string
          chunk_index: number
          content: string
          document_id: string
          embedding?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          agent_id?: string
          chunk_index?: number
          content?: string
          document_id?: string
          embedding?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_document_chunks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_document_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_documents: {
        Row: {
          agent_id: string
          chunk_count: number
          created_at: string
          error_message: string | null
          filename: string
          id: string
          mime_type: string
          organization_id: string
          ready_at: string | null
          size_bytes: number
          status: string
          storage_path: string
        }
        Insert: {
          agent_id: string
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          mime_type: string
          organization_id: string
          ready_at?: string | null
          size_bytes: number
          status?: string
          storage_path: string
        }
        Update: {
          agent_id?: string
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          mime_type?: string
          organization_id?: string
          ready_at?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_faq_items: {
        Row: {
          agent_id: string
          answer: string
          created_at: string
          embedding: string | null
          id: string
          organization_id: string
          question: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          answer: string
          created_at?: string
          embedding?: string | null
          id?: string
          organization_id: string
          question: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          answer?: string
          created_at?: string
          embedding?: string | null
          id?: string
          organization_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_faq_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_faq_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completion_tokens: number | null
          conversation_id: string
          error_message: string | null
          finished_at: string | null
          id: string
          organization_id: string
          prompt_tokens: number | null
          started_at: string
          status: string
          tools_called: Json
        }
        Insert: {
          agent_id: string
          completion_tokens?: number | null
          conversation_id: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          prompt_tokens?: number | null
          started_at?: string
          status: string
          tools_called?: Json
        }
        Update: {
          agent_id?: string
          completion_tokens?: number | null
          conversation_id?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          prompt_tokens?: number | null
          started_at?: string
          status?: string
          tools_called?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage_daily: {
        Row: {
          agent_id: string
          day: string
          organization_id: string
          responses: number
          tokens_used: number
        }
        Insert: {
          agent_id: string
          day?: string
          organization_id: string
          responses?: number
          tokens_used?: number
        }
        Update: {
          agent_id?: string
          day?: string
          organization_id?: string
          responses?: number
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_daily_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_usage_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          daily_token_cap: number
          goal: string | null
          id: string
          is_active: boolean
          llm_model: string
          llm_provider: string
          name: string
          never_do: string | null
          organization_id: string
          persona: string | null
          tone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          daily_token_cap?: number
          goal?: string | null
          id?: string
          is_active?: boolean
          llm_model?: string
          llm_provider?: string
          name: string
          never_do?: string | null
          organization_id: string
          persona?: string | null
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          daily_token_cap?: number
          goal?: string | null
          id?: string
          is_active?: boolean
          llm_model?: string
          llm_provider?: string
          name?: string
          never_do?: string | null
          organization_id?: string
          persona?: string | null
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_run_steps: {
        Row: {
          action_type: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          output: Json | null
          run_id: string
          started_at: string | null
          status: string
          step_index: number
        }
        Insert: {
          action_type: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input: Json
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          step_index: number
        }
        Update: {
          action_type?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          depth: number
          error: string | null
          finished_at: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string
          trigger_event_id: string
          trigger_payload: Json
        }
        Insert: {
          automation_id: string
          created_at?: string
          depth?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: string
          trigger_event_id: string
          trigger_payload: Json
        }
        Update: {
          automation_id?: string
          created_at?: string
          depth?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          trigger_event_id?: string
          trigger_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          agent_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          external_id: string | null
          id: string
          last_error: string | null
          name: string
          organization_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          name: string
          organization_id: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          name?: string
          organization_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tag_links: {
        Row: {
          applied_at: string
          applied_by: string | null
          applied_by_kind: string
          company_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          company_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          company_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tag_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tag_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tag_links: {
        Row: {
          applied_at: string
          applied_by: string | null
          applied_by_kind: string
          contact_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          contact_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          contact_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tag_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tag_links: {
        Row: {
          applied_at: string
          applied_by: string | null
          applied_by_kind: string
          conversation_id: string
          created_at: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          conversation_id: string
          created_at?: string
          organization_id: string
          tag_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          conversation_id?: string
          created_at?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tag_links_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tag_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_status: string
          agent_thinking_started_at: string | null
          assignee_id: string | null
          channel_id: string
          contact_id: string | null
          created_at: string
          display_name: string | null
          external_thread_id: string
          handled_by: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          organization_id: string
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          agent_status?: string
          agent_thinking_started_at?: string | null
          assignee_id?: string | null
          channel_id: string
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          external_thread_id: string
          handled_by?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          organization_id: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          agent_status?: string
          agent_thinking_started_at?: string | null
          assignee_id?: string | null
          channel_id?: string
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          external_thread_id?: string
          handled_by?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          organization_id?: string
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string
          deal_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          deal_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          deal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tag_links: {
        Row: {
          applied_at: string
          applied_by: string | null
          applied_by_kind: string
          deal_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          deal_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          applied_by_kind?: string
          deal_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tag_links_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tag_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          name: string
          notes: string | null
          organization_id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string | null
          organization_id: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_usage: {
        Row: {
          day: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          day?: string
          tokens_used?: number
          user_id: string
        }
        Update: {
          day?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          failure_reason: string | null
          id: string
          media_type: string | null
          media_url: string | null
          organization_id: string
          provider_metadata: Json
          reply_to_message_id: string | null
          sender_kind: string
          sender_user_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          failure_reason?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          organization_id: string
          provider_metadata?: Json
          reply_to_message_id?: string | null
          sender_kind: string
          sender_user_id?: string | null
          sent_at?: string | null
          status: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          failure_reason?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          organization_id?: string
          provider_metadata?: Json
          reply_to_message_id?: string | null
          sender_kind?: string
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tag_suggestions: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          name: string
          occurrences: number
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_status: string | null
          source_entity: string
          source_id: string
          suggested_by: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name: string
          occurrences?: number
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_status?: string | null
          source_entity: string
          source_id: string
          suggested_by: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          occurrences?: number
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_status?: string | null
          source_entity?: string
          source_id?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          applies_to: string[]
          color: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          applies_to?: string[]
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          applies_to?: string[]
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          channel_id: string
          components: Json
          id: string
          language: string
          meta_id: string
          name: string
          organization_id: string
          param_count: number
          status: string
          synced_at: string
        }
        Insert: {
          category: string
          channel_id: string
          components?: Json
          id?: string
          language: string
          meta_id: string
          name: string
          organization_id: string
          param_count?: number
          status: string
          synced_at?: string
        }
        Update: {
          category?: string
          channel_id?: string
          components?: Json
          id?: string
          language?: string
          meta_id?: string
          name?: string
          organization_id?: string
          param_count?: number
          status?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { _token: string }
        Returns: {
          organization_id: string
          slug: string
        }[]
      }
      adjust_agent_tokens: {
        Args: { _agent_id: string; _delta: number }
        Returns: undefined
      }
      agent_search_kb: {
        Args: {
          _agent_id: string
          _limit?: number
          _min_similarity?: number
          _query_embedding: string
        }
        Returns: {
          content: string
          kind: string
          similarity: number
          source_id: string
          title: string
        }[]
      }
      assert_tag_scope: {
        Args: { p_scope: string; p_tag_id: string }
        Returns: undefined
      }
      consume_agent_tokens: {
        Args: { _agent_id: string; _tokens: number }
        Returns: boolean
      }
      consume_llm_tokens: { Args: { _tokens: number }; Returns: boolean }
      create_organization_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: {
          id: string
          slug: string
        }[]
      }
      current_user_email: { Args: never; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      tag_suggestion_upsert: {
        Args: {
          p_name: string
          p_org: string
          p_source_entity: string
          p_source_id: string
          p_suggested_by: string
        }
        Returns: undefined
      }
      transfer_ownership: {
        Args: { _org_id: string; _target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      deal_stage:
        | "new"
        | "qualified"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost"
      org_role: "owner" | "admin" | "member"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "done"
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
      deal_stage: [
        "new",
        "qualified",
        "proposal_sent",
        "negotiation",
        "won",
        "lost",
      ],
      org_role: ["owner", "admin", "member"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "done"],
    },
  },
} as const

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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          institution: string | null
          invite_key_id: string | null
          invited_at: string | null
          reason: string | null
          role_requested: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          institution?: string | null
          invite_key_id?: string | null
          invited_at?: string | null
          reason?: string | null
          role_requested?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          institution?: string | null
          invite_key_id?: string | null
          invited_at?: string | null
          reason?: string | null
          role_requested?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_invite_key_id_fkey"
            columns: ["invite_key_id"]
            isOneToOne: false
            referencedRelation: "invite_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_feedback: {
        Row: {
          analysis_id: string
          created_at: string | null
          human_verdict: string
          id: string
          suggestion_id: string
          validated_at: string | null
          validated_by: string | null
          validator_notes: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          human_verdict: string
          id?: string
          suggestion_id: string
          validated_at?: string | null
          validated_by?: string | null
          validator_notes?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          human_verdict?: string
          id?: string
          suggestion_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validator_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_history"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_history: {
        Row: {
          actual_credits_saved: number | null
          analyzed_by: string | null
          applied_fixes: string[] | null
          bugs_auto_resolved: number | null
          context_used: Json | null
          created_at: string
          estimated_credits_saved: number | null
          false_positives_filtered: number | null
          id: string
          logs_type: string
          metadata: Json | null
          resolved_at: string | null
          suggestions: Json
          total_issues: number
        }
        Insert: {
          actual_credits_saved?: number | null
          analyzed_by?: string | null
          applied_fixes?: string[] | null
          bugs_auto_resolved?: number | null
          context_used?: Json | null
          created_at?: string
          estimated_credits_saved?: number | null
          false_positives_filtered?: number | null
          id?: string
          logs_type: string
          metadata?: Json | null
          resolved_at?: string | null
          suggestions?: Json
          total_issues?: number
        }
        Update: {
          actual_credits_saved?: number | null
          analyzed_by?: string | null
          applied_fixes?: string[] | null
          bugs_auto_resolved?: number | null
          context_used?: Json | null
          created_at?: string
          estimated_credits_saved?: number | null
          false_positives_filtered?: number | null
          id?: string
          logs_type?: string
          metadata?: Json | null
          resolved_at?: string | null
          suggestions?: Json
          total_issues?: number
        }
        Relationships: []
      }
      ai_suggestion_status: {
        Row: {
          actual_credits_saved: number | null
          actual_time_spent: number | null
          analysis_id: string
          category: string
          confidence_score: number | null
          created_at: string
          estimated_credits_saved: number | null
          estimated_effort: string
          id: string
          implementation_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          suggestion_id: string
          title: string
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          actual_credits_saved?: number | null
          actual_time_spent?: number | null
          analysis_id: string
          category: string
          confidence_score?: number | null
          created_at?: string
          estimated_credits_saved?: number | null
          estimated_effort: string
          id?: string
          implementation_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          suggestion_id: string
          title: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          actual_credits_saved?: number | null
          actual_time_spent?: number | null
          analysis_id?: string
          category?: string
          confidence_score?: number | null
          created_at?: string
          estimated_credits_saved?: number | null
          estimated_effort?: string
          id?: string
          implementation_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          suggestion_id?: string
          title?: string
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_status_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_history"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_category: string
          event_metadata: Json | null
          event_name: string
          id: string
          page_path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_category: string
          event_metadata?: Json | null
          event_name: string
          id?: string
          page_path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_category?: string
          event_metadata?: Json | null
          event_name?: string
          id?: string
          page_path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_feature_usage: {
        Row: {
          feature_name: string
          first_used_at: string | null
          id: string
          last_used_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          feature_name: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          feature_name?: string
          first_used_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_user_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          events_count: number | null
          id: string
          pages_visited: number | null
          session_id: string
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          pages_visited?: number | null
          session_id: string
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          pages_visited?: number | null
          session_id?: string
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      annotated_corpus: {
        Row: {
          confianca: number | null
          contexto_direito: string | null
          contexto_esquerdo: string | null
          freq_reference_corpus: number | null
          freq_study_corpus: number | null
          id: string
          insignias_culturais: string[] | null
          is_cultural_marker: boolean | null
          job_id: string
          lema: string | null
          ll_score: number | null
          metadata: Json | null
          mi_score: number | null
          palavra: string
          pos: string | null
          posicao_no_corpus: number | null
          prosody: number | null
          significance_level: string | null
          tagset_codigo: string | null
          tagset_primario: string | null
          tagsets: Json | null
        }
        Insert: {
          confianca?: number | null
          contexto_direito?: string | null
          contexto_esquerdo?: string | null
          freq_reference_corpus?: number | null
          freq_study_corpus?: number | null
          id?: string
          insignias_culturais?: string[] | null
          is_cultural_marker?: boolean | null
          job_id: string
          lema?: string | null
          ll_score?: number | null
          metadata?: Json | null
          mi_score?: number | null
          palavra: string
          pos?: string | null
          posicao_no_corpus?: number | null
          prosody?: number | null
          significance_level?: string | null
          tagset_codigo?: string | null
          tagset_primario?: string | null
          tagsets?: Json | null
        }
        Update: {
          confianca?: number | null
          contexto_direito?: string | null
          contexto_esquerdo?: string | null
          freq_reference_corpus?: number | null
          freq_study_corpus?: number | null
          id?: string
          insignias_culturais?: string[] | null
          is_cultural_marker?: boolean | null
          job_id?: string
          lema?: string | null
          ll_score?: number | null
          metadata?: Json | null
          mi_score?: number | null
          palavra?: string
          pos?: string | null
          posicao_no_corpus?: number | null
          prosody?: number | null
          significance_level?: string | null
          tagset_codigo?: string | null
          tagset_primario?: string | null
          tagsets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "annotated_corpus_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "annotation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotated_corpus_tagset_codigo_fkey"
            columns: ["tagset_codigo"]
            isOneToOne: false
            referencedRelation: "semantic_tagset"
            referencedColumns: ["codigo"]
          },
        ]
      }
      annotation_debug_logs: {
        Row: {
          auth_status: string
          corpus_type: string
          created_at: string
          demo_mode: boolean
          error_details: Json | null
          id: string
          job_id: string | null
          metadata: Json | null
          processing_time_ms: number | null
          request_headers: Json | null
          request_id: string
          request_payload: Json
          response_data: Json | null
          response_status: number
          user_id: string | null
          words_processed: number | null
        }
        Insert: {
          auth_status: string
          corpus_type: string
          created_at?: string
          demo_mode?: boolean
          error_details?: Json | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          processing_time_ms?: number | null
          request_headers?: Json | null
          request_id?: string
          request_payload?: Json
          response_data?: Json | null
          response_status: number
          user_id?: string | null
          words_processed?: number | null
        }
        Update: {
          auth_status?: string
          corpus_type?: string
          created_at?: string
          demo_mode?: boolean
          error_details?: Json | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          processing_time_ms?: number | null
          request_headers?: Json | null
          request_id?: string
          request_payload?: Json
          response_data?: Json | null
          response_status?: number
          user_id?: string | null
          words_processed?: number | null
        }
        Relationships: []
      }
      annotation_jobs: {
        Row: {
          corpus_type: string
          cultural_markers_found: number | null
          erro_mensagem: string | null
          id: string
          metadata: Json | null
          palavras_anotadas: number | null
          palavras_processadas: number | null
          progresso: number | null
          reference_artist_filter: string | null
          reference_corpus_size: number | null
          reference_corpus_type: string | null
          size_ratio: number | null
          status: string
          study_corpus_size: number | null
          tempo_fim: string | null
          tempo_inicio: string | null
          total_palavras: number | null
          user_id: string
        }
        Insert: {
          corpus_type: string
          cultural_markers_found?: number | null
          erro_mensagem?: string | null
          id?: string
          metadata?: Json | null
          palavras_anotadas?: number | null
          palavras_processadas?: number | null
          progresso?: number | null
          reference_artist_filter?: string | null
          reference_corpus_size?: number | null
          reference_corpus_type?: string | null
          size_ratio?: number | null
          status?: string
          study_corpus_size?: number | null
          tempo_fim?: string | null
          tempo_inicio?: string | null
          total_palavras?: number | null
          user_id: string
        }
        Update: {
          corpus_type?: string
          cultural_markers_found?: number | null
          erro_mensagem?: string | null
          id?: string
          metadata?: Json | null
          palavras_anotadas?: number | null
          palavras_processadas?: number | null
          progresso?: number | null
          reference_artist_filter?: string | null
          reference_corpus_size?: number | null
          reference_corpus_type?: string | null
          size_ratio?: number | null
          status?: string
          study_corpus_size?: number | null
          tempo_fim?: string | null
          tempo_inicio?: string | null
          total_palavras?: number | null
          user_id?: string
        }
        Relationships: []
      }
      code_scan_history: {
        Row: {
          comparison_baseline: string | null
          created_at: string
          files_analyzed: number
          id: string
          improvement_percentage: number | null
          new_issues: number
          pending_issues: number
          resolved_issues: number
          scan_data: Json
          scan_duration_ms: number | null
          scan_type: string
          scanned_by: string | null
          total_issues: number
        }
        Insert: {
          comparison_baseline?: string | null
          created_at?: string
          files_analyzed?: number
          id?: string
          improvement_percentage?: number | null
          new_issues?: number
          pending_issues?: number
          resolved_issues?: number
          scan_data?: Json
          scan_duration_ms?: number | null
          scan_type: string
          scanned_by?: string | null
          total_issues?: number
        }
        Update: {
          comparison_baseline?: string | null
          created_at?: string
          files_analyzed?: number
          id?: string
          improvement_percentage?: number | null
          new_issues?: number
          pending_issues?: number
          resolved_issues?: number
          scan_data?: Json
          scan_duration_ms?: number | null
          scan_type?: string
          scanned_by?: string | null
          total_issues?: number
        }
        Relationships: []
      }
      construction_phases: {
        Row: {
          artifacts: Json | null
          challenges: Json | null
          created_at: string | null
          created_by: string | null
          date_end: string | null
          date_start: string
          decisions: Json | null
          id: string
          is_synced_to_static: boolean | null
          metrics: Json | null
          next_steps: Json | null
          objective: string
          phase_name: string
          phase_number: number
          scientific_basis: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          artifacts?: Json | null
          challenges?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_end?: string | null
          date_start: string
          decisions?: Json | null
          id?: string
          is_synced_to_static?: boolean | null
          metrics?: Json | null
          next_steps?: Json | null
          objective: string
          phase_name: string
          phase_number: number
          scientific_basis?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          artifacts?: Json | null
          challenges?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_end?: string | null
          date_start?: string
          decisions?: Json | null
          id?: string
          is_synced_to_static?: boolean | null
          metrics?: Json | null
          next_steps?: Json | null
          objective?: string
          phase_name?: string
          phase_number?: number
          scientific_basis?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      corpus_metadata_versions: {
        Row: {
          applied_by: string | null
          content_snapshot: string
          corpus_type: string
          created_at: string | null
          id: string
          metadata_count: number
          version_number: number
        }
        Insert: {
          applied_by?: string | null
          content_snapshot: string
          corpus_type: string
          created_at?: string | null
          id?: string
          metadata_count: number
          version_number: number
        }
        Update: {
          applied_by?: string | null
          content_snapshot?: string
          corpus_type?: string
          created_at?: string | null
          id?: string
          metadata_count?: number
          version_number?: number
        }
        Relationships: []
      }
      dialectal_lexicon: {
        Row: {
          atualizado_em: string | null
          categorias_tematicas: string[] | null
          classe_gramatical: string | null
          confianca_extracao: number | null
          contextos_culturais: Json | null
          criado_em: string | null
          definicoes: Json | null
          frequencia_uso: string | null
          id: string
          influencia_platina: boolean | null
          marcacao_temporal: string | null
          origem_primaria: string | null
          origem_regionalista: string[] | null
          pagina_fonte: number | null
          referencias_dicionarios: string[] | null
          remissoes: string[] | null
          sinonimos: string[] | null
          termos_espanhol: string[] | null
          validado_humanamente: boolean | null
          variantes: string[] | null
          verbete: string
          verbete_normalizado: string
          volume_fonte: string | null
        }
        Insert: {
          atualizado_em?: string | null
          categorias_tematicas?: string[] | null
          classe_gramatical?: string | null
          confianca_extracao?: number | null
          contextos_culturais?: Json | null
          criado_em?: string | null
          definicoes?: Json | null
          frequencia_uso?: string | null
          id?: string
          influencia_platina?: boolean | null
          marcacao_temporal?: string | null
          origem_primaria?: string | null
          origem_regionalista?: string[] | null
          pagina_fonte?: number | null
          referencias_dicionarios?: string[] | null
          remissoes?: string[] | null
          sinonimos?: string[] | null
          termos_espanhol?: string[] | null
          validado_humanamente?: boolean | null
          variantes?: string[] | null
          verbete: string
          verbete_normalizado: string
          volume_fonte?: string | null
        }
        Update: {
          atualizado_em?: string | null
          categorias_tematicas?: string[] | null
          classe_gramatical?: string | null
          confianca_extracao?: number | null
          contextos_culturais?: Json | null
          criado_em?: string | null
          definicoes?: Json | null
          frequencia_uso?: string | null
          id?: string
          influencia_platina?: boolean | null
          marcacao_temporal?: string | null
          origem_primaria?: string | null
          origem_regionalista?: string[] | null
          pagina_fonte?: number | null
          referencias_dicionarios?: string[] | null
          remissoes?: string[] | null
          sinonimos?: string[] | null
          termos_espanhol?: string[] | null
          validado_humanamente?: boolean | null
          variantes?: string[] | null
          verbete?: string
          verbete_normalizado?: string
          volume_fonte?: string | null
        }
        Relationships: []
      }
      dictionary_import_jobs: {
        Row: {
          atualizado_em: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          criado_em: string | null
          erro_mensagem: string | null
          erros: number | null
          id: string
          is_cancelling: boolean | null
          metadata: Json | null
          offset_inicial: number | null
          progresso: number | null
          status: string
          tempo_fim: string | null
          tempo_inicio: string | null
          tipo_dicionario: string
          total_verbetes: number | null
          verbetes_inseridos: number | null
          verbetes_processados: number | null
        }
        Insert: {
          atualizado_em?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          criado_em?: string | null
          erro_mensagem?: string | null
          erros?: number | null
          id?: string
          is_cancelling?: boolean | null
          metadata?: Json | null
          offset_inicial?: number | null
          progresso?: number | null
          status?: string
          tempo_fim?: string | null
          tempo_inicio?: string | null
          tipo_dicionario: string
          total_verbetes?: number | null
          verbetes_inseridos?: number | null
          verbetes_processados?: number | null
        }
        Update: {
          atualizado_em?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          criado_em?: string | null
          erro_mensagem?: string | null
          erros?: number | null
          id?: string
          is_cancelling?: boolean | null
          metadata?: Json | null
          offset_inicial?: number | null
          progresso?: number | null
          status?: string
          tempo_fim?: string | null
          tempo_inicio?: string | null
          tipo_dicionario?: string
          total_verbetes?: number | null
          verbetes_inseridos?: number | null
          verbetes_processados?: number | null
        }
        Relationships: []
      }
      dictionary_import_quality: {
        Row: {
          batch_number: number
          created_at: string | null
          id: string
          job_id: string | null
          lines_failed: number
          lines_processed: number
          lines_success: number
          parsing_strategy: string | null
          sample_failures: Json | null
          success_rate: number | null
        }
        Insert: {
          batch_number: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          lines_failed: number
          lines_processed: number
          lines_success: number
          parsing_strategy?: string | null
          sample_failures?: Json | null
          success_rate?: number | null
        }
        Update: {
          batch_number?: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          lines_failed?: number
          lines_processed?: number
          lines_success?: number
          parsing_strategy?: string | null
          sample_failures?: Json | null
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_import_quality_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dictionary_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dictionary_job_recovery_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          recovered_by: string | null
          recovery_attempt: number
          strategy: string
          success: boolean
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          recovered_by?: string | null
          recovery_attempt?: number
          strategy: string
          success: boolean
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          recovered_by?: string | null
          recovery_attempt?: number
          strategy?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_job_recovery_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dictionary_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          function_name: string
          id: string
          rate_limit_remaining: number | null
          rate_limited: boolean | null
          referer: string | null
          request_ip: string | null
          request_method: string
          request_path: string | null
          request_payload: Json | null
          response_payload: Json | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          function_name: string
          id?: string
          rate_limit_remaining?: number | null
          rate_limited?: boolean | null
          referer?: string | null
          request_ip?: string | null
          request_method: string
          request_path?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          function_name?: string
          id?: string
          rate_limit_remaining?: number | null
          rate_limited?: boolean | null
          referer?: string | null
          request_ip?: string | null
          request_method?: string
          request_path?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      edge_function_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          failed_requests: number | null
          function_name: string
          id: string
          max_response_time_ms: number | null
          min_response_time_ms: number | null
          p50_response_time_ms: number | null
          p95_response_time_ms: number | null
          p99_response_time_ms: number | null
          period_end: string
          period_start: string
          period_type: string
          rate_limited_requests: number | null
          status_2xx: number | null
          status_4xx: number | null
          status_5xx: number | null
          successful_requests: number | null
          total_requests: number | null
          unique_ips: number | null
          unique_users: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          failed_requests?: number | null
          function_name: string
          id?: string
          max_response_time_ms?: number | null
          min_response_time_ms?: number | null
          p50_response_time_ms?: number | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          period_end: string
          period_start: string
          period_type: string
          rate_limited_requests?: number | null
          status_2xx?: number | null
          status_4xx?: number | null
          status_5xx?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          unique_ips?: number | null
          unique_users?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          failed_requests?: number | null
          function_name?: string
          id?: string
          max_response_time_ms?: number | null
          min_response_time_ms?: number | null
          p50_response_time_ms?: number | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          rate_limited_requests?: number | null
          status_2xx?: number | null
          status_4xx?: number | null
          status_5xx?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          unique_ips?: number | null
          unique_users?: number | null
        }
        Relationships: []
      }
      enrichment_jobs: {
        Row: {
          auto_validated: number | null
          backup_url: string | null
          completed_at: string | null
          corpus_type: string
          created_at: string | null
          errors: string[] | null
          id: string
          metadata: Json | null
          needs_review: number | null
          processed_songs: number | null
          review_csv_url: string | null
          started_at: string | null
          status: string
          total_songs: number | null
          updated_at: string | null
          updated_corpus_url: string | null
          user_id: string | null
        }
        Insert: {
          auto_validated?: number | null
          backup_url?: string | null
          completed_at?: string | null
          corpus_type: string
          created_at?: string | null
          errors?: string[] | null
          id?: string
          metadata?: Json | null
          needs_review?: number | null
          processed_songs?: number | null
          review_csv_url?: string | null
          started_at?: string | null
          status?: string
          total_songs?: number | null
          updated_at?: string | null
          updated_corpus_url?: string | null
          user_id?: string | null
        }
        Update: {
          auto_validated?: number | null
          backup_url?: string | null
          completed_at?: string | null
          corpus_type?: string
          created_at?: string | null
          errors?: string[] | null
          id?: string
          metadata?: Json | null
          needs_review?: number | null
          processed_songs?: number | null
          review_csv_url?: string | null
          started_at?: string | null
          status?: string
          total_songs?: number | null
          updated_at?: string | null
          updated_corpus_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      enrichment_sessions: {
        Row: {
          completed_at: string | null
          compressed_data: string
          corpus_type: string
          created_at: string
          id: string
          last_saved_at: string
          metadata: Json | null
          processed_songs: number
          progress_percentage: number | null
          rejected_songs: number
          schema_version: number
          session_name: string | null
          started_at: string
          total_songs: number
          updated_at: string
          user_id: string
          validated_songs: number
        }
        Insert: {
          completed_at?: string | null
          compressed_data: string
          corpus_type: string
          created_at?: string
          id?: string
          last_saved_at?: string
          metadata?: Json | null
          processed_songs?: number
          progress_percentage?: number | null
          rejected_songs?: number
          schema_version?: number
          session_name?: string | null
          started_at?: string
          total_songs?: number
          updated_at?: string
          user_id: string
          validated_songs?: number
        }
        Update: {
          completed_at?: string | null
          compressed_data?: string
          corpus_type?: string
          created_at?: string
          id?: string
          last_saved_at?: string
          metadata?: Json | null
          processed_songs?: number
          progress_percentage?: number | null
          rejected_songs?: number
          schema_version?: number
          session_name?: string | null
          started_at?: string
          total_songs?: number
          updated_at?: string
          user_id?: string
          validated_songs?: number
        }
        Relationships: []
      }
      gutenberg_lexicon: {
        Row: {
          antonimos: string[] | null
          arcaico: boolean | null
          areas_conhecimento: string[] | null
          atualizado_em: string | null
          classe_gramatical: string | null
          confianca_extracao: number | null
          criado_em: string | null
          definicoes: Json | null
          derivados: string[] | null
          etimologia: string | null
          exemplos: string[] | null
          expressoes: string[] | null
          figurado: boolean | null
          genero: string | null
          id: string
          origem_lingua: string | null
          popular: boolean | null
          regional: boolean | null
          sinonimos: string[] | null
          validado: boolean | null
          verbete: string
          verbete_normalizado: string
        }
        Insert: {
          antonimos?: string[] | null
          arcaico?: boolean | null
          areas_conhecimento?: string[] | null
          atualizado_em?: string | null
          classe_gramatical?: string | null
          confianca_extracao?: number | null
          criado_em?: string | null
          definicoes?: Json | null
          derivados?: string[] | null
          etimologia?: string | null
          exemplos?: string[] | null
          expressoes?: string[] | null
          figurado?: boolean | null
          genero?: string | null
          id?: string
          origem_lingua?: string | null
          popular?: boolean | null
          regional?: boolean | null
          sinonimos?: string[] | null
          validado?: boolean | null
          verbete: string
          verbete_normalizado: string
        }
        Update: {
          antonimos?: string[] | null
          arcaico?: boolean | null
          areas_conhecimento?: string[] | null
          atualizado_em?: string | null
          classe_gramatical?: string | null
          confianca_extracao?: number | null
          criado_em?: string | null
          definicoes?: Json | null
          derivados?: string[] | null
          etimologia?: string | null
          exemplos?: string[] | null
          expressoes?: string[] | null
          figurado?: boolean | null
          genero?: string | null
          id?: string
          origem_lingua?: string | null
          popular?: boolean | null
          regional?: boolean | null
          sinonimos?: string[] | null
          validado?: boolean | null
          verbete?: string
          verbete_normalizado?: string
        }
        Relationships: []
      }
      human_validations: {
        Row: {
          aplicado: boolean | null
          contexto: string | null
          criado_em: string | null
          id: string
          justificativa: string | null
          palavra: string
          prosody_corrigida: number | null
          prosody_original: number | null
          sugestao_novo_ds: string | null
          tagset_corrigido: string | null
          tagset_original: string | null
          user_id: string
        }
        Insert: {
          aplicado?: boolean | null
          contexto?: string | null
          criado_em?: string | null
          id?: string
          justificativa?: string | null
          palavra: string
          prosody_corrigida?: number | null
          prosody_original?: number | null
          sugestao_novo_ds?: string | null
          tagset_corrigido?: string | null
          tagset_original?: string | null
          user_id: string
        }
        Update: {
          aplicado?: boolean | null
          contexto?: string | null
          criado_em?: string | null
          id?: string
          justificativa?: string | null
          palavra?: string
          prosody_corrigida?: number | null
          prosody_original?: number | null
          sugestao_novo_ds?: string | null
          tagset_corrigido?: string | null
          tagset_original?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "human_validations_tagset_corrigido_fkey"
            columns: ["tagset_corrigido"]
            isOneToOne: false
            referencedRelation: "semantic_tagset"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "human_validations_tagset_original_fkey"
            columns: ["tagset_original"]
            isOneToOne: false
            referencedRelation: "semantic_tagset"
            referencedColumns: ["codigo"]
          },
        ]
      }
      invite_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_code: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_code: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_code?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      lexical_definitions: {
        Row: {
          area_conhecimento: string | null
          criado_em: string | null
          definicao: string | null
          etimologia: string | null
          exemplos: string[] | null
          fonte: string | null
          id: string
          palavra: string
          pos: string | null
          registro_uso: string | null
        }
        Insert: {
          area_conhecimento?: string | null
          criado_em?: string | null
          definicao?: string | null
          etimologia?: string | null
          exemplos?: string[] | null
          fonte?: string | null
          id?: string
          palavra: string
          pos?: string | null
          registro_uso?: string | null
        }
        Update: {
          area_conhecimento?: string | null
          criado_em?: string | null
          definicao?: string | null
          etimologia?: string | null
          exemplos?: string[] | null
          fonte?: string | null
          id?: string
          palavra?: string
          pos?: string | null
          registro_uso?: string | null
        }
        Relationships: []
      }
      lexical_synonyms: {
        Row: {
          acepcao_descricao: string | null
          acepcao_numero: number | null
          antonimos: string[] | null
          contexto_uso: string | null
          criado_em: string | null
          fonte: string | null
          id: string
          palavra: string
          pos: string | null
          sinonimos: string[] | null
        }
        Insert: {
          acepcao_descricao?: string | null
          acepcao_numero?: number | null
          antonimos?: string[] | null
          contexto_uso?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          palavra: string
          pos?: string | null
          sinonimos?: string[] | null
        }
        Update: {
          acepcao_descricao?: string | null
          acepcao_numero?: number | null
          antonimos?: string[] | null
          contexto_uso?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          palavra?: string
          pos?: string | null
          sinonimos?: string[] | null
        }
        Relationships: []
      }
      lexicon_health_status: {
        Row: {
          check_type: string
          checked_at: string | null
          checked_by: string | null
          details: Json | null
          expires_at: string | null
          id: string
          message: string | null
          metrics: Json | null
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          checked_by?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          message?: string | null
          metrics?: Json | null
          status: string
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          checked_by?: string | null
          details?: Json | null
          expires_at?: string | null
          id?: string
          message?: string | null
          metrics?: Json | null
          status?: string
        }
        Relationships: []
      }
      metadata_application_history: {
        Row: {
          application_source: string
          applied_by: string | null
          backup_version_id: string | null
          corpus_type: string
          created_at: string | null
          id: string
          songs_updated: number
        }
        Insert: {
          application_source: string
          applied_by?: string | null
          backup_version_id?: string | null
          corpus_type: string
          created_at?: string | null
          id?: string
          songs_updated: number
        }
        Update: {
          application_source?: string
          applied_by?: string | null
          backup_version_id?: string | null
          corpus_type?: string
          created_at?: string | null
          id?: string
          songs_updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "metadata_application_history_backup_version_id_fkey"
            columns: ["backup_version_id"]
            isOneToOne: false
            referencedRelation: "corpus_metadata_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_value: number
          function_name: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          threshold: number
          triggered_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_value: number
          function_name?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          threshold: number
          triggered_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_value?: number
          function_name?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          threshold?: number
          triggered_at?: string | null
        }
        Relationships: []
      }
      phase_metrics: {
        Row: {
          created_at: string | null
          id: string
          improvement_percentage: number | null
          metric_name: string
          phase_id: string | null
          unit: string | null
          value_after: number | null
          value_before: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          improvement_percentage?: number | null
          metric_name: string
          phase_id?: string | null
          unit?: string | null
          value_after?: number | null
          value_before?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          improvement_percentage?: number | null
          metric_name?: string
          phase_id?: string | null
          unit?: string | null
          value_after?: number | null
          value_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_metrics_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_lexicon: {
        Row: {
          atualizado_em: string | null
          confianca: number
          contexto_exemplo: string | null
          criado_em: string | null
          fonte: string | null
          id: string
          insignias_culturais: string[] | null
          lema: string | null
          palavra: string
          pos: string | null
          prosody: number
          tagset_codigo: string | null
          tagset_primario: string | null
          tagsets: Json | null
          validado: boolean | null
        }
        Insert: {
          atualizado_em?: string | null
          confianca?: number
          contexto_exemplo?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          insignias_culturais?: string[] | null
          lema?: string | null
          palavra: string
          pos?: string | null
          prosody: number
          tagset_codigo?: string | null
          tagset_primario?: string | null
          tagsets?: Json | null
          validado?: boolean | null
        }
        Update: {
          atualizado_em?: string | null
          confianca?: number
          contexto_exemplo?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          insignias_culturais?: string[] | null
          lema?: string | null
          palavra?: string
          pos?: string | null
          prosody?: number
          tagset_codigo?: string | null
          tagset_primario?: string | null
          tagsets?: Json | null
          validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_lexicon_tagset_codigo_fkey"
            columns: ["tagset_codigo"]
            isOneToOne: false
            referencedRelation: "semantic_tagset"
            referencedColumns: ["codigo"]
          },
        ]
      }
      semantic_networks: {
        Row: {
          contexto: string | null
          criado_em: string | null
          fonte: string | null
          id: string
          palavra_destino: string
          palavra_origem: string
          peso_relacao: number | null
          tipo_relacao: string | null
        }
        Insert: {
          contexto?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          palavra_destino: string
          palavra_origem: string
          peso_relacao?: number | null
          tipo_relacao?: string | null
        }
        Update: {
          contexto?: string | null
          criado_em?: string | null
          fonte?: string | null
          id?: string
          palavra_destino?: string
          palavra_origem?: string
          peso_relacao?: number | null
          tipo_relacao?: string | null
        }
        Relationships: []
      }
      semantic_patterns: {
        Row: {
          atualizado_em: string | null
          contexto_tipo: string | null
          criado_em: string | null
          frequencia_validacoes: number | null
          id: string
          palavra: string
          pos: string | null
          tagsets_sugeridos: Json
          taxa_acerto: number | null
        }
        Insert: {
          atualizado_em?: string | null
          contexto_tipo?: string | null
          criado_em?: string | null
          frequencia_validacoes?: number | null
          id?: string
          palavra: string
          pos?: string | null
          tagsets_sugeridos: Json
          taxa_acerto?: number | null
        }
        Update: {
          atualizado_em?: string | null
          contexto_tipo?: string | null
          criado_em?: string | null
          frequencia_validacoes?: number | null
          id?: string
          palavra?: string
          pos?: string | null
          tagsets_sugeridos?: Json
          taxa_acerto?: number | null
        }
        Relationships: []
      }
      semantic_tagset: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria_pai: string | null
          codigo: string
          codigo_nivel_1: string | null
          codigo_nivel_2: string | null
          codigo_nivel_3: string | null
          codigo_nivel_4: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          exemplos: string[] | null
          hierarquia_completa: string | null
          id: string
          nivel_profundidade: number | null
          nome: string
          status: string
          tagset_pai: string | null
          tagsets_filhos: string[] | null
          validacoes_humanas: number | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_pai?: string | null
          codigo: string
          codigo_nivel_1?: string | null
          codigo_nivel_2?: string | null
          codigo_nivel_3?: string | null
          codigo_nivel_4?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          exemplos?: string[] | null
          hierarquia_completa?: string | null
          id?: string
          nivel_profundidade?: number | null
          nome: string
          status?: string
          tagset_pai?: string | null
          tagsets_filhos?: string[] | null
          validacoes_humanas?: number | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_pai?: string | null
          codigo?: string
          codigo_nivel_1?: string | null
          codigo_nivel_2?: string | null
          codigo_nivel_3?: string | null
          codigo_nivel_4?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          exemplos?: string[] | null
          hierarquia_completa?: string | null
          id?: string
          nivel_profundidade?: number | null
          nome?: string
          status?: string
          tagset_pai?: string | null
          tagsets_filhos?: string[] | null
          validacoes_humanas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "semantic_tagset_tagset_pai_fkey"
            columns: ["tagset_pai"]
            isOneToOne: false
            referencedRelation: "semantic_tagset"
            referencedColumns: ["codigo"]
          },
        ]
      }
      sync_metadata: {
        Row: {
          created_at: string | null
          data_hash: string
          id: string
          items_synced: number | null
          last_sync_at: string | null
          source: string
          sync_duration_ms: number | null
        }
        Insert: {
          created_at?: string | null
          data_hash: string
          id?: string
          items_synced?: number | null
          last_sync_at?: string | null
          source: string
          sync_duration_ms?: number | null
        }
        Update: {
          created_at?: string | null
          data_hash?: string
          id?: string
          items_synced?: number | null
          last_sync_at?: string | null
          source?: string
          sync_duration_ms?: number | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged: boolean
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          scan_id: string | null
          sent_to: string | null
        }
        Insert: {
          acknowledged?: boolean
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          scan_id?: string | null
          sent_to?: string | null
        }
        Update: {
          acknowledged?: boolean
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          scan_id?: string | null
          sent_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "code_scan_history"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          category: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          source: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          source?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          source?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      technical_decisions: {
        Row: {
          alternatives: Json | null
          chosen_because: string
          created_at: string | null
          decision: string
          id: string
          impact: string | null
          phase_id: string | null
          rationale: string
        }
        Insert: {
          alternatives?: Json | null
          chosen_because: string
          created_at?: string | null
          decision: string
          id?: string
          impact?: string | null
          phase_id?: string | null
          rationale: string
        }
        Update: {
          alternatives?: Json | null
          chosen_because?: string
          created_at?: string | null
          decision?: string
          id?: string
          impact?: string | null
          phase_id?: string | null
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_decisions_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "construction_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_visualization_preferences: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          modo_visualizacao: string | null
          mostrar_hierarquia_completa: boolean | null
          nivel_detalhamento: number | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          modo_visualizacao?: string | null
          mostrar_hierarquia_completa?: boolean | null
          nivel_detalhamento?: number | null
          user_id: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          modo_visualizacao?: string | null
          mostrar_hierarquia_completa?: boolean | null
          nivel_detalhamento?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tagset_hierarchy: { Args: never; Returns: undefined }
      cancel_job_atomic: {
        Args: { p_job_id: string; p_reason: string; p_user_id: string }
        Returns: {
          forced: boolean
          job_status: string
          message: string
          success: boolean
        }[]
      }
      clean_expired_health_checks: { Args: never; Returns: undefined }
      clean_old_system_logs: { Args: never; Returns: undefined }
      generate_invite_key: { Args: never; Returns: string }
      get_dialectal_stats: {
        Args: never
        Returns: {
          campeiros: number
          confianca_media: number
          platinismos: number
          total: number
          validados: number
          volume_i: number
          volume_ii: number
        }[]
      }
      get_gutenberg_stats: {
        Args: never
        Returns: {
          confianca_media: number
          total: number
          validados: number
        }[]
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_feature_usage: {
        Args: { _feature_name: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "evaluator" | "user"
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
      app_role: ["admin", "evaluator", "user"],
    },
  },
} as const

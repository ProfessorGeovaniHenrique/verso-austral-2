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
      ai_analysis_history: {
        Row: {
          actual_credits_saved: number | null
          analyzed_by: string | null
          applied_fixes: string[] | null
          created_at: string
          estimated_credits_saved: number | null
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
          created_at?: string
          estimated_credits_saved?: number | null
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
          created_at?: string
          estimated_credits_saved?: number | null
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
        }
        Insert: {
          actual_credits_saved?: number | null
          actual_time_spent?: number | null
          analysis_id: string
          category: string
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
        }
        Update: {
          actual_credits_saved?: number | null
          actual_time_spent?: number | null
          analysis_id?: string
          category?: string
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
      annotated_corpus: {
        Row: {
          confianca: number | null
          contexto_direito: string | null
          contexto_esquerdo: string | null
          id: string
          job_id: string
          lema: string | null
          metadata: Json | null
          palavra: string
          pos: string | null
          posicao_no_corpus: number | null
          prosody: number | null
          tagset_codigo: string | null
          tagset_primario: string | null
          tagsets: Json | null
        }
        Insert: {
          confianca?: number | null
          contexto_direito?: string | null
          contexto_esquerdo?: string | null
          id?: string
          job_id: string
          lema?: string | null
          metadata?: Json | null
          palavra: string
          pos?: string | null
          posicao_no_corpus?: number | null
          prosody?: number | null
          tagset_codigo?: string | null
          tagset_primario?: string | null
          tagsets?: Json | null
        }
        Update: {
          confianca?: number | null
          contexto_direito?: string | null
          contexto_esquerdo?: string | null
          id?: string
          job_id?: string
          lema?: string | null
          metadata?: Json | null
          palavra?: string
          pos?: string | null
          posicao_no_corpus?: number | null
          prosody?: number | null
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
      annotation_jobs: {
        Row: {
          corpus_type: string
          erro_mensagem: string | null
          id: string
          metadata: Json | null
          palavras_anotadas: number | null
          palavras_processadas: number | null
          progresso: number | null
          status: string
          tempo_fim: string | null
          tempo_inicio: string | null
          total_palavras: number | null
          user_id: string
        }
        Insert: {
          corpus_type: string
          erro_mensagem?: string | null
          id?: string
          metadata?: Json | null
          palavras_anotadas?: number | null
          palavras_processadas?: number | null
          progresso?: number | null
          status?: string
          tempo_fim?: string | null
          tempo_inicio?: string | null
          total_palavras?: number | null
          user_id: string
        }
        Update: {
          corpus_type?: string
          erro_mensagem?: string | null
          id?: string
          metadata?: Json | null
          palavras_anotadas?: number | null
          palavras_processadas?: number | null
          progresso?: number | null
          status?: string
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
          criado_em: string | null
          erro_mensagem: string | null
          erros: number | null
          id: string
          metadata: Json | null
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
          criado_em?: string | null
          erro_mensagem?: string | null
          erros?: number | null
          id?: string
          metadata?: Json | null
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
          criado_em?: string | null
          erro_mensagem?: string | null
          erros?: number | null
          id?: string
          metadata?: Json | null
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
      semantic_lexicon: {
        Row: {
          atualizado_em: string | null
          confianca: number
          contexto_exemplo: string | null
          criado_em: string | null
          fonte: string | null
          id: string
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
    Enums: {},
  },
} as const

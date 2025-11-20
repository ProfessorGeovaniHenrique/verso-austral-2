import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export interface DialectalEntry {
  id: string;
  verbete: string;
  verbete_normalizado: string;
  origem_regionalista: string[] | null;
  origem_primaria: string;
  classe_gramatical: string | null;
  marcacao_temporal: string | null;
  frequencia_uso: string;
  marcadores_uso: string[] | null; // ✅ FASE 2: Novo campo
  definicoes: Array<{
    numero: number;
    texto: string;
    contexto: string | null;
    exemplos: string[];
    citacoesAutores: string[];
  }>;
  sinonimos: string[] | null;
  remissoes: string[] | null;
  variantes: string[] | null;
  contextos_culturais: {
    costumes?: string[];
    crencas?: string[];
    divertimentos?: string[];
    fraseologias?: string[];
  } | null;
  influencia_platina: boolean;
  termos_espanhol: string[] | null;
  referencias_dicionarios: string[] | null;
  categorias_tematicas: string[] | null;
  volume_fonte: string | null;
  pagina_fonte: number | null;
  confianca_extracao: number;
  validado_humanamente: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface DialectalFilters {
  origem?: string;
  categoria?: string;
  searchTerm?: string;
}

export function useDialectalLexicon(filters?: DialectalFilters) {
  const queryResult = useQuery({
    queryKey: ['dialectal-lexicon', filters],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        let query = supabase
          .from('dialectal_lexicon')
          .select('*')
          .order('verbete', { ascending: true });

        if (filters?.origem) {
          query = query.eq('origem_primaria', filters.origem);
        }

        if (filters?.categoria) {
          query = query.contains('categorias_tematicas', [filters.categoria]);
        }

        if (filters?.searchTerm) {
          query = query.ilike('verbete_normalizado', `%${filters.searchTerm.toLowerCase()}%`);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        return (data || []) as unknown as DialectalEntry[];
      }, {
        maxRetries: 5,
        baseDelay: 500,
        onRetry: (error, attempt) => {
          notifications.info(
            `Reconectando... (${attempt}/5)`,
            'Tentando carregar léxico dialectal'
          );
        }
      });
    },
    // ✅ CACHE TTL: Dicionário dialectal muda raramente
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    gcTime: 48 * 60 * 60 * 1000, // 48 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const stats = {
    total: queryResult.data?.length || 0,
    porOrigem: queryResult.data?.reduce((acc, e) => {
      acc[e.origem_primaria] = (acc[e.origem_primaria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    comInfluenciaPlatina: queryResult.data?.filter(e => e.influencia_platina).length || 0,
    categorias: queryResult.data?.reduce((acc, e) => {
      e.categorias_tematicas?.forEach(cat => {
        acc[cat] = (acc[cat] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>) || {}
  };

  return {
    entries: queryResult.data || [],
    stats,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}

export function useDialectalEntry(palavra: string) {
  return useQuery({
    queryKey: ['dialectal-entry', palavra],
    queryFn: async () => {
      if (!palavra) return null;

      return retrySupabaseOperation(async () => {
        const normalizedWord = palavra.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        const { data, error } = await supabase
          .from('dialectal_lexicon')
          .select('*')
          .eq('verbete_normalizado', normalizedWord)
          .maybeSingle();

        if (error) throw error;

        return data as unknown as DialectalEntry | null;
      }, {
        maxRetries: 3,
        baseDelay: 500
      });
    },
    // ✅ CACHE: Verbete específico raramente muda
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    enabled: !!palavra,
  });
}

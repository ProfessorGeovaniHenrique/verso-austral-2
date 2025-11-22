import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CurationSuggestion {
  nome_sugerido?: string;
  descricao_sugerida?: string;
  exemplos_adicionais?: string[];
  nivel_recomendado?: number;
  pai_recomendado?: {
    codigo: string;
    nome: string;
    confianca: number;
  };
  justificativa: string;
  alertas?: string[];
  confianca_geral: number;
}

interface TagsetForCuration {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  exemplos: string[] | null;
  nivel_profundidade: number | null;
  categoria_pai: string | null;
}

export function useTagsetCuration() {
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(3);
  const [lastCallTime, setLastCallTime] = useState<number>(0);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    // Reset contador a cada 60 segundos
    if (timeSinceLastCall > 60000) {
      setRateLimitRemaining(3);
      return true;
    }
    
    if (rateLimitRemaining <= 0) {
      const timeToWait = Math.ceil((60000 - timeSinceLastCall) / 1000);
      toast.error(`Rate limit atingido. Aguarde ${timeToWait}s`);
      return false;
    }
    
    return true;
  };

  const curateTagset = async (
    tagset: TagsetForCuration,
    allTagsets: TagsetForCuration[]
  ): Promise<CurationSuggestion | null> => {
    if (!checkRateLimit()) {
      return null;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('refine-tagset-suggestions', {
        body: {
          tagsetPendente: {
            id: tagset.id,
            codigo: tagset.codigo,
            nome: tagset.nome,
            descricao: tagset.descricao,
            exemplos: tagset.exemplos || [],
            nivel_profundidade: tagset.nivel_profundidade,
          },
          tagsetsAtivos: allTagsets
            .filter(t => t.id !== tagset.id)
            .map(t => ({
              id: t.id,
              codigo: t.codigo,
              nome: t.nome,
              descricao: t.descricao,
              exemplos: t.exemplos || [],
              nivel_profundidade: t.nivel_profundidade,
            })),
        },
      });

      if (error) {
        console.error('Erro na curadoria:', error);
        toast.error('Erro ao processar curadoria com IA');
        return null;
      }

      setLastCallTime(Date.now());
      setRateLimitRemaining(prev => prev - 1);
      
      toast.success('Curadoria concluída!');
      
      // Estruturar resposta da IA
      const suggestion: CurationSuggestion = {
        nome_sugerido: data.nome_sugerido,
        descricao_sugerida: data.descricao_sugerida,
        exemplos_adicionais: data.exemplos_adicionais || [],
        nivel_recomendado: data.nivel_recomendado,
        pai_recomendado: data.pai_recomendado,
        justificativa: data.justificativa || 'Sem justificativa fornecida',
        alertas: data.alertas || [],
        confianca_geral: data.confianca_geral || 0.5,
      };

      return suggestion;
    } catch (err) {
      console.error('Erro inesperado na curadoria:', err);
      toast.error('Erro inesperado ao processar curadoria');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    curateTagset,
    isLoading,
    rateLimitRemaining,
  };
}

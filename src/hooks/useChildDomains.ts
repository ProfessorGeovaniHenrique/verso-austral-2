import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChildDomain {
  codigo: string;
  nome: string;
  descricao: string | null;
}

export function useChildDomains(parentCode: string, availableDomains: string[]) {
  const [childDomains, setChildDomains] = useState<ChildDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!parentCode || availableDomains.length === 0) return;

    const fetchChildren = async () => {
      setIsLoading(true);
      try {
        // Buscar N2 filhos do domínio pai
        const { data, error } = await supabase
          .from('semantic_tagset')
          .select('codigo, nome, descricao')
          .eq('tagset_pai', parentCode)
          .eq('nivel_profundidade', 2)
          .eq('status', 'ativo')
          .order('codigo', { ascending: true });

        if (error) throw error;

        // Filtrar apenas os N2 que aparecem no corpus
        const filtered = (data || []).filter(d => 
          availableDomains.includes(d.codigo)
        );

        setChildDomains(filtered);
      } catch (error) {
        console.error('Erro ao buscar domínios filhos:', error);
        setChildDomains([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, [parentCode, availableDomains]);

  return { childDomains, isLoading };
}

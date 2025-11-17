import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConstructionPhase {
  id: string;
  phase_number: number;
  phase_name: string;
  date_start: string;
  date_end: string | null;
  status: 'completed' | 'in-progress' | 'planned';
  objective: string;
  decisions: any[];
  artifacts: any[];
  metrics: any;
  scientific_basis: any[];
  challenges: any[];
  next_steps: any[];
  created_by: string | null;
  is_synced_to_static: boolean;
  created_at: string;
  updated_at: string;
  technical_decisions?: TechnicalDecision[];
  phase_metrics?: PhaseMetric[];
}

export interface TechnicalDecision {
  id: string;
  phase_id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  chosen_because: string;
  impact: string | null;
  created_at: string;
}

export interface PhaseMetric {
  id: string;
  phase_id: string;
  metric_name: string;
  value_before: number | null;
  value_after: number | null;
  unit: string | null;
  improvement_percentage: number | null;
  created_at: string;
}

export interface CreatePhaseInput {
  phase_number: number;
  phase_name: string;
  date_start: string;
  date_end?: string;
  status: 'completed' | 'in-progress' | 'planned';
  objective: string;
  decisions?: any[];
  artifacts?: any[];
  metrics?: any;
  scientific_basis?: any[];
  challenges?: any[];
  next_steps?: any[];
}

export function useConstructionPhases() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['construction-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('construction_phases')
        .select(`
          *,
          technical_decisions(*),
          phase_metrics(*)
        `)
        .order('phase_number', { ascending: true });
      
      if (error) throw error;
      return data as ConstructionPhase[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createPhase = useMutation({
    mutationFn: async (phaseData: CreatePhaseInput) => {
      const { data, error } = await supabase
        .from('construction_phases')
        .insert(phaseData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-phases'] });
      toast.success('Fase criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar fase: ${error.message}`);
    }
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ConstructionPhase> }) => {
      const { data, error } = await supabase
        .from('construction_phases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-phases'] });
      toast.success('Fase atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar fase: ${error.message}`);
    }
  });

  const addDecision = useMutation({
    mutationFn: async (decision: Omit<TechnicalDecision, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('technical_decisions')
        .insert(decision)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-phases'] });
      toast.success('Decisão técnica adicionada!');
    }
  });

  const addMetric = useMutation({
    mutationFn: async (metric: Omit<PhaseMetric, 'id' | 'created_at' | 'improvement_percentage'>) => {
      const improvement = metric.value_before && metric.value_after
        ? ((metric.value_after - metric.value_before) / metric.value_before) * 100
        : null;

      const { data, error } = await supabase
        .from('phase_metrics')
        .insert({ ...metric, improvement_percentage: improvement })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-phases'] });
      toast.success('Métrica adicionada!');
    }
  });

  const exportToTypeScript = (phaseId: string) => {
    const phase = query.data?.find(p => p.id === phaseId);
    if (!phase) return;
    
    const tsContent = `
// Exportado automaticamente em ${new Date().toISOString()}

export const phase${phase.phase_number} = {
  number: ${phase.phase_number},
  name: "${phase.phase_name}",
  dateStart: "${phase.date_start}",
  dateEnd: ${phase.date_end ? `"${phase.date_end}"` : 'null'},
  status: "${phase.status}",
  objective: \`${phase.objective}\`,
  decisions: ${JSON.stringify(phase.technical_decisions || [], null, 2)},
  metrics: ${JSON.stringify(phase.phase_metrics || [], null, 2)},
  scientificBasis: ${JSON.stringify(phase.scientific_basis || [], null, 2)},
  challenges: ${JSON.stringify(phase.challenges || [], null, 2)},
  nextSteps: ${JSON.stringify(phase.next_steps || [], null, 2)},
};
`;
    
    const blob = new Blob([tsContent], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phase-${phase.phase_number}-${phase.phase_name.toLowerCase().replace(/\s+/g, '-')}.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo TypeScript exportado!');
  };

  return { 
    phases: query.data,
    isLoading: query.isLoading,
    createPhase,
    updatePhase,
    addDecision,
    addMetric,
    exportToTypeScript
  };
}

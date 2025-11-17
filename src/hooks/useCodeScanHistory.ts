import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';

export interface CodeScanHistoryRecord {
  id: string;
  created_at: string;
  scan_type: 'full' | 'edge-functions' | 'components' | 'hooks';
  files_analyzed: number;
  total_issues: number;
  resolved_issues: number;
  new_issues: number;
  pending_issues: number;
  scan_data: {
    comparison: {
      resolved: any[];
      new: any[];
      pending: any[];
    };
    summary: {
      totalIssues: number;
      resolvedSinceBaseline: number;
      newIssues: number;
      overallImprovement: string;
    };
  };
  comparison_baseline: string;
  improvement_percentage: number;
  scan_duration_ms: number;
}

export function useCodeScanHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['code-scan-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('code_scan_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('❌ Erro ao buscar histórico de scans:', error);
        throw error;
      }
      
      return (data || []) as unknown as CodeScanHistoryRecord[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const runScan = useMutation({
    mutationFn: async (scanType: 'full' | 'edge-functions' | 'components' | 'hooks') => {
      console.log(`🔍 Iniciando scan: ${scanType}`);
      
      const { data, error } = await supabase.functions.invoke(
        'scan-codebase-realtime',
        { 
          body: { 
            scanType, 
            compareWithBaseline: true 
          } 
        }
      );
      
      if (error) {
        console.error('❌ Erro no scan:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['code-scan-history'] });
      
      const improvement = parseFloat(data.summary.overallImprovement);
      
      if (improvement > 0) {
        notifications.success(
          'Scan concluído!',
          `✅ Melhoria de ${improvement.toFixed(1)}% detectada`
        );
      } else if (improvement < 0) {
        notifications.warning(
          'Scan concluído',
          `⚠️ Detectadas ${data.summary.newIssues} novas issues`
        );
      } else {
        notifications.info(
          'Scan concluído',
          `Status mantido: ${data.summary.totalIssues} issues`
        );
      }
    },
    onError: (error: Error) => {
      notifications.error('Erro ao executar scan', error.message);
    }
  });

  const latestScan = query.data?.[0];
  
  const stats = {
    totalScans: query.data?.length || 0,
    averageImprovement: query.data 
      ? (query.data.reduce((acc, scan) => acc + scan.improvement_percentage, 0) / query.data.length)
      : 0,
    lastScanDate: latestScan?.created_at,
    trending: latestScan && query.data?.[1]
      ? latestScan.improvement_percentage - query.data[1].improvement_percentage
      : 0
  };

  return { 
    scans: query.data || [], 
    isLoading: query.isLoading,
    isScanning: runScan.isPending, 
    runScan: runScan.mutate,
    latestScan,
    stats
  };
}

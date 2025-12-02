/**
 * useCodeScanHistory Hook - Refatorado Sprint 1
 * Conectado com edge function scan-code-quality real
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';

export interface CodeIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
}

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
    issues?: CodeIssue[];
  };
  comparison_baseline: string;
  improvement_percentage: number;
  scan_duration_ms: number;
}

export interface ProblematicFile {
  file: string;
  issues: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  types: string[];
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
        console.error('Erro ao buscar histórico de scans:', error);
        throw error;
      }
      
      return (data || []) as unknown as CodeScanHistoryRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const runScan = useMutation({
    mutationFn: async (scanType: 'full' | 'edge-functions' | 'components' | 'hooks') => {
      notifications.info('Iniciando scan', 'Analisando qualidade do código...');
      
      const { data, error } = await supabase.functions.invoke('scan-code-quality', {
        body: { scanType }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao executar scan');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Scan falhou');
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

  // Extrair arquivos problemáticos do último scan
  const getProblematicFiles = (): ProblematicFile[] => {
    const latestScan = query.data?.[0];
    if (!latestScan?.scan_data?.issues) {
      return [];
    }

    const fileMap = new Map<string, { issues: number; severity: string; types: Set<string> }>();
    
    latestScan.scan_data.issues.forEach((issue: CodeIssue) => {
      const existing = fileMap.get(issue.file);
      if (existing) {
        existing.issues++;
        existing.types.add(issue.type);
        // Manter a severidade mais alta
        if (getSeverityWeight(issue.severity) > getSeverityWeight(existing.severity as any)) {
          existing.severity = issue.severity;
        }
      } else {
        fileMap.set(issue.file, {
          issues: 1,
          severity: issue.severity,
          types: new Set([issue.type])
        });
      }
    });

    return Array.from(fileMap.entries())
      .map(([file, data]) => ({
        file,
        issues: data.issues,
        severity: data.severity as 'critical' | 'high' | 'medium' | 'low',
        types: Array.from(data.types)
      }))
      .sort((a, b) => {
        const severityDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
        if (severityDiff !== 0) return severityDiff;
        return b.issues - a.issues;
      })
      .slice(0, 10);
  };

  const latestScan = query.data?.[0];
  
  const stats = {
    totalScans: query.data?.length || 0,
    averageImprovement: query.data && query.data.length > 0
      ? query.data.reduce((acc, scan) => acc + (scan.improvement_percentage || 0), 0) / query.data.length
      : 0,
    lastScanDate: latestScan?.created_at,
    trending: latestScan && query.data?.[1]
      ? (latestScan.improvement_percentage || 0) - (query.data[1].improvement_percentage || 0)
      : 0,
    totalIssues: latestScan?.total_issues || 0,
    pendingIssues: latestScan?.pending_issues || 0
  };

  return { 
    scans: query.data || [], 
    isLoading: query.isLoading,
    isScanning: runScan.isPending, 
    runScan: runScan.mutate,
    latestScan,
    stats,
    problematicFiles: getProblematicFiles(),
    refetch: query.refetch
  };
}

function getSeverityWeight(severity: 'critical' | 'high' | 'medium' | 'low'): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

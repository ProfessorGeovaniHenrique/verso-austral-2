import { useState, useEffect, useCallback } from 'react';
import { DevOpsMetrics, WorkflowStatus, TestHistoryData, CoverageData, CorpusMetric, Release, Alert } from '@/types/devops.types';
import { githubApi } from '@/services/devops/githubApi';
import { metricsService } from '@/services/devops/metricsService';
import { cacheManager } from '@/utils/devops/cacheManager';
import { Database, FileText, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MOCK_MODE = true; // Set to false when GitHub repo is configured

export function useDevOpsMetrics(branch?: string, autoRefresh: number = 30000) {
  const [metrics, setMetrics] = useState<DevOpsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (MOCK_MODE) {
        // Use mock data for demonstration
        const mockMetrics = await loadMockMetrics();
        setMetrics(mockMetrics);
        setLastUpdate(new Date());
        return;
      }

      // Load from multiple sources
      const [workflowRuns, releases, badgeMetrics, testReport] = await Promise.all([
        githubApi.getWorkflowRuns(branch, 10),
        githubApi.getReleases(10),
        metricsService.loadBadgeMetrics(),
        metricsService.loadLatestTestReport(),
      ]);

      // Transform GitHub data to our format
      const workflows: WorkflowStatus[] = workflowRuns.map(run => ({
        name: run.name,
        status: mapWorkflowStatus(run),
        lastRun: formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: ptBR }),
        duration: calculateDuration(run.run_started_at, run.updated_at),
        url: run.html_url,
        branch: run.head_branch,
      }));

      const releasesData: Release[] = releases.map(release => ({
        version: release.tag_name,
        date: new Date(release.published_at).toLocaleDateString('pt-BR'),
        type: getVersionType(release.tag_name),
        features: countInBody(release.body, 'feature'),
        fixes: countInBody(release.body, 'fix'),
        breaking: countInBody(release.body, 'breaking'),
        url: release.html_url,
      }));

      // Load test history
      const testHistory = await loadTestHistoryData();
      const coverageData = await loadCoverageData();
      const corpusMetrics = await loadCorpusMetrics(badgeMetrics);

      // Calculate summary
      const successRate = calculateSuccessRate(workflows);
      const averageCITime = calculateAverageCITime(workflows);
      const totalCoverage = testReport?.coverage || badgeMetrics?.coverage || 0;
      const latestVersion = badgeMetrics?.version || await metricsService.loadVersion();

      // Generate alerts
      const alerts = generateAlerts(workflows, totalCoverage, successRate);

      const consolidatedMetrics: DevOpsMetrics = {
        workflows,
        testHistory,
        coverageData,
        corpusMetrics,
        releases: releasesData,
        summary: {
          successRate,
          averageCITime,
          totalCoverage,
          latestVersion,
        },
        alerts,
        lastUpdate: new Date().toISOString(),
      };

      setMetrics(consolidatedMetrics);
      setLastUpdate(new Date());
      cacheManager.set('devops_metrics', consolidatedMetrics, 60000); // Cache for 1 minute
    } catch (err) {
      console.error('Error loading DevOps metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
      
      // Try to load from cache
      const cached = cacheManager.get<DevOpsMetrics>('devops_metrics');
      if (cached) {
        setMetrics(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    loadMetrics();

    if (autoRefresh > 0) {
      const interval = setInterval(loadMetrics, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [loadMetrics, autoRefresh]);

  const refresh = useCallback(() => {
    cacheManager.clear();
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    lastUpdate,
    refresh,
  };
}

// Helper functions
function mapWorkflowStatus(run: any): WorkflowStatus['status'] {
  if (run.status !== 'completed') return 'in_progress';
  
  switch (run.conclusion) {
    case 'success': return 'success';
    case 'failure': return 'failure';
    default: return 'pending';
  }
}

function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;
  
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
}

function getVersionType(tagName: string): 'major' | 'minor' | 'patch' {
  const match = tagName.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'minor';
  
  const [, major, minor, patch] = match;
  if (patch !== '0') return 'patch';
  if (minor !== '0') return 'minor';
  return 'major';
}

function countInBody(body: string, keyword: string): number {
  if (!body) return 0;
  const regex = new RegExp(keyword, 'gi');
  return (body.match(regex) || []).length;
}

function calculateSuccessRate(workflows: WorkflowStatus[]): number {
  if (workflows.length === 0) return 100;
  const successful = workflows.filter(w => w.status === 'success').length;
  return Math.round((successful / workflows.length) * 100);
}

function calculateAverageCITime(workflows: WorkflowStatus[]): string {
  if (workflows.length === 0) return '0m 0s';
  
  const totalSeconds = workflows.reduce((sum, w) => {
    const match = w.duration.match(/(\d+)m (\d+)s/);
    if (!match) return sum;
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    return sum + (minutes * 60) + seconds;
  }, 0);
  
  const avgSeconds = Math.floor(totalSeconds / workflows.length);
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  
  return `${minutes}m ${seconds}s`;
}

function generateAlerts(workflows: WorkflowStatus[], coverage: number, successRate: number): Alert[] {
  const alerts: Alert[] = [];
  
  const failedWorkflows = workflows.filter(w => w.status === 'failure');
  if (failedWorkflows.length > 0) {
    alerts.push({
      id: 'workflow_failures',
      level: 'critical',
      title: 'Workflows Falharam',
      message: `${failedWorkflows.length} workflow(s) falharam recentemente: ${failedWorkflows.map(w => w.name).join(', ')}`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissible: true,
    });
  }
  
  if (coverage < 80) {
    alerts.push({
      id: 'low_coverage',
      level: 'warning',
      title: 'Cobertura de Testes Baixa',
      message: `A cobertura de testes está em ${coverage}%, abaixo do recomendado (80%)`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissible: true,
    });
  }
  
  if (successRate < 90) {
    alerts.push({
      id: 'low_success_rate',
      level: 'warning',
      title: 'Taxa de Sucesso Baixa',
      message: `A taxa de sucesso dos workflows está em ${successRate}%`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissible: true,
    });
  }
  
  return alerts;
}

async function loadTestHistoryData(): Promise<TestHistoryData[]> {
  // In production, load from test-reports/history.json
  return [
    { date: "01/11", passed: 40, failed: 2, total: 42, coverage: 93 },
    { date: "05/11", passed: 41, failed: 1, total: 42, coverage: 95 },
    { date: "08/11", passed: 42, failed: 0, total: 42, coverage: 97 },
    { date: "10/11", passed: 42, failed: 1, total: 43, coverage: 96 },
    { date: "12/11", passed: 43, failed: 0, total: 43, coverage: 98 },
    { date: "14/11", passed: 44, failed: 1, total: 45, coverage: 97 },
    { date: "16/11", passed: 45, failed: 0, total: 45, coverage: 100 },
  ];
}

async function loadCoverageData(): Promise<CoverageData[]> {
  return [
    { name: "Validação", value: 15, color: "hsl(var(--primary))" },
    { name: "Integridade", value: 12, color: "hsl(var(--chart-2))" },
    { name: "Consistência", value: 10, color: "hsl(var(--chart-3))" },
    { name: "Estatísticas", value: 8, color: "hsl(var(--chart-4))" },
  ];
}

async function loadCorpusMetrics(badgeMetrics: any): Promise<CorpusMetric[]> {
  return [
    {
      label: "Palavras no Corpus",
      value: badgeMetrics?.corpusWords || 4250,
      total: 5000,
      change: 5.2,
      icon: Database,
    },
    {
      label: "Lemas Validados",
      value: badgeMetrics?.corpusLemmas || 3890,
      total: 4250,
      change: 3.1,
      icon: FileText,
    },
    {
      label: "Domínios Semânticos",
      value: badgeMetrics?.corpusDomains || 42,
      total: 50,
      change: 2.4,
      icon: Tag,
    },
  ];
}

async function loadMockMetrics(): Promise<DevOpsMetrics> {
  const workflows: WorkflowStatus[] = [
    {
      name: "Quality Gate",
      status: "success",
      lastRun: "há 2 horas",
      duration: "3m 45s",
      url: "https://github.com/user/repo/actions",
      branch: "main",
    },
    {
      name: "Test Corpus Integrity",
      status: "success",
      lastRun: "há 2 horas",
      duration: "1m 12s",
      url: "https://github.com/user/repo/actions",
      branch: "main",
    },
    {
      name: "Auto Version",
      status: "success",
      lastRun: "há 5 horas",
      duration: "45s",
      url: "https://github.com/user/repo/actions",
      branch: "main",
    },
  ];

  const testHistory = await loadTestHistoryData();
  const coverageData = await loadCoverageData();
  const corpusMetrics = await loadCorpusMetrics(null);

  const releases: Release[] = [
    {
      version: "1.3.0",
      date: "16 Nov 2024",
      type: "minor",
      features: 5,
      fixes: 3,
      breaking: 0,
      url: "https://github.com/user/repo/releases/tag/v1.3.0",
    },
  ];

  return {
    workflows,
    testHistory,
    coverageData,
    corpusMetrics,
    releases,
    summary: {
      successRate: 100,
      averageCITime: "2m 15s",
      totalCoverage: 97.8,
      latestVersion: "v1.3.0",
    },
    alerts: [],
    lastUpdate: new Date().toISOString(),
  };
}

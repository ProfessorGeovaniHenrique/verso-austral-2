import { DevOpsMetrics } from '@/types/devops.types';

export function exportMetricsToCSV(metrics: DevOpsMetrics) {
  // Export workflows
  const workflowsCSV = [
    ['Nome', 'Status', 'Última Execução', 'Duração', 'Branch'],
    ...metrics.workflows.map(w => [
      w.name,
      w.status,
      w.lastRun,
      w.duration,
      w.branch
    ])
  ];

  // Export test history
  const testsCSV = [
    ['Data', 'Aprovados', 'Falharam', 'Total', 'Cobertura'],
    ...metrics.testHistory.map(t => [
      t.date,
      t.passed.toString(),
      t.failed.toString(),
      t.total.toString(),
      `${t.coverage}%`
    ])
  ];

  // Export corpus metrics
  const corpusCSV = [
    ['Métrica', 'Valor Atual', 'Total', 'Variação'],
    ...metrics.corpusMetrics.map(m => [
      m.label,
      m.value.toString(),
      m.total.toString(),
      `${m.change > 0 ? '+' : ''}${m.change.toFixed(1)}%`
    ])
  ];

  // Export releases
  const releasesCSV = [
    ['Versão', 'Data', 'Tipo', 'Features', 'Fixes', 'Breaking Changes'],
    ...metrics.releases.map(r => [
      r.version,
      r.date,
      r.type,
      r.features.toString(),
      r.fixes.toString(),
      r.breaking.toString()
    ])
  ];

  // Create CSV content
  const csvContent = [
    '=== WORKFLOWS ===',
    convertToCSV(workflowsCSV),
    '',
    '=== HISTÓRICO DE TESTES ===',
    convertToCSV(testsCSV),
    '',
    '=== MÉTRICAS DO CORPUS ===',
    convertToCSV(corpusCSV),
    '',
    '=== RELEASES ===',
    convertToCSV(releasesCSV)
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `devops-metrics-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportWorkflowsToCSV(metrics: DevOpsMetrics) {
  const csv = [
    ['Nome', 'Status', 'Última Execução', 'Duração', 'Branch', 'URL'],
    ...metrics.workflows.map(w => [
      w.name,
      w.status,
      w.lastRun,
      w.duration,
      w.branch,
      w.url
    ])
  ];

  downloadCSV(csv, 'workflows');
}

export function exportTestHistoryToCSV(metrics: DevOpsMetrics) {
  const csv = [
    ['Data', 'Aprovados', 'Falharam', 'Total', 'Cobertura (%)'],
    ...metrics.testHistory.map(t => [
      t.date,
      t.passed.toString(),
      t.failed.toString(),
      t.total.toString(),
      t.coverage.toString()
    ])
  ];

  downloadCSV(csv, 'test-history');
}

export function exportCorpusMetricsToCSV(metrics: DevOpsMetrics) {
  const csv = [
    ['Métrica', 'Valor Atual', 'Total', 'Variação (%)'],
    ...metrics.corpusMetrics.map(m => [
      m.label,
      m.value.toString(),
      m.total.toString(),
      m.change.toFixed(2)
    ])
  ];

  downloadCSV(csv, 'corpus-metrics');
}

function convertToCSV(data: string[][]): string {
  return data
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

function downloadCSV(data: string[][], fileName: string) {
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

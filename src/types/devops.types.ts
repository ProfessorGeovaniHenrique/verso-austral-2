// GitHub API Types
export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_branch: string;
  run_started_at: string;
  run_attempt: number;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  updated_at: string;
  stargazers_count: number;
  open_issues_count: number;
}

// Internal Dashboard Types
export interface WorkflowStatus {
  name: string;
  status: 'success' | 'failure' | 'in_progress' | 'pending';
  lastRun: string;
  duration: string;
  url: string;
  branch: string;
}

export interface TestHistoryData {
  date: string;
  passed: number;
  failed: number;
  total: number;
  coverage: number;
}

export interface CoverageData {
  name: string;
  value: number;
  color: string;
}

export interface CorpusMetric {
  label: string;
  value: number;
  total: number;
  change: number;
  icon: any;
}

export interface Release {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  features: number;
  fixes: number;
  breaking: number;
  url: string;
}

// Test Report Types (from CI-generated files)
export interface TestReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: number;
  duration: number;
  categories: {
    [key: string]: {
      total: number;
      passed: number;
      failed: number;
    };
  };
}

// Badge Metrics (from metrics.json)
export interface BadgeMetrics {
  version: string;
  testsPassed: number;
  testsTotal: number;
  coverage: number;
  corpusWords: number;
  corpusLemmas: number;
  corpusDomains: number;
  lastUpdate: string;
}

// Alert Types
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissible: boolean;
}

// Dashboard Configuration
export interface DashboardConfig {
  autoRefreshInterval: number; // in milliseconds, 0 = disabled
  thresholds: {
    minCoverage: number;
    maxCITime: number; // in seconds
  };
  visibleSections: {
    workflows: boolean;
    testHistory: boolean;
    coverage: boolean;
    corpus: boolean;
    releases: boolean;
  };
  chartColors: 'default' | 'colorblind' | 'highContrast';
}

// Consolidated Metrics for Dashboard
export interface DevOpsMetrics {
  workflows: WorkflowStatus[];
  testHistory: TestHistoryData[];
  coverageData: CoverageData[];
  corpusMetrics: CorpusMetric[];
  releases: Release[];
  summary: {
    successRate: number;
    averageCITime: string;
    totalCoverage: number;
    latestVersion: string;
  };
  alerts: Alert[];
  lastUpdate: string;
}

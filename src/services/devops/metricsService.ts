import { BadgeMetrics, TestReport } from '@/types/devops.types';

class MetricsService {
  async loadBadgeMetrics(): Promise<BadgeMetrics | null> {
    try {
      const response = await fetch('/badges/metrics.json');
      if (!response.ok) {
        console.warn('Badge metrics file not found');
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading badge metrics:', error);
      return null;
    }
  }

  async loadLatestTestReport(): Promise<TestReport | null> {
    try {
      // Try to load the most recent test report
      const response = await fetch('/test-reports/latest.json');
      if (!response.ok) {
        console.warn('Test report not found');
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading test report:', error);
      return null;
    }
  }

  async loadTestHistory(days: number = 30): Promise<TestReport[]> {
    try {
      const response = await fetch('/test-reports/history.json');
      if (!response.ok) {
        console.warn('Test history not found');
        return [];
      }
      const history = await response.json();
      
      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return history.filter((report: TestReport) => 
        new Date(report.timestamp) >= cutoffDate
      );
    } catch (error) {
      console.error('Error loading test history:', error);
      return [];
    }
  }

  async loadVersion(): Promise<string> {
    try {
      const response = await fetch('/VERSION');
      if (!response.ok) {
        return '1.0.0';
      }
      return (await response.text()).trim();
    } catch (error) {
      console.error('Error loading version:', error);
      return '1.0.0';
    }
  }

  async loadChangelog(): Promise<string> {
    try {
      const response = await fetch('/CHANGELOG.md');
      if (!response.ok) {
        return '';
      }
      return await response.text();
    } catch (error) {
      console.error('Error loading changelog:', error);
      return '';
    }
  }
}

export const metricsService = new MetricsService();

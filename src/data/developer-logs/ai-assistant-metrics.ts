// 📊 AI Assistant Metrics - Tracking de Performance e ROI

export interface AIAnalysisMetrics {
  totalAnalyses: number;
  creditsUsed: number; // Lovable AI credits used
  issuesIdentified: number;
  issuesFixed: number;
  estimatedCreditsSaved: number; // Chat credits saved
  roi: number; // Return on Investment
  averageAnalysisTime: number; // seconds
  lastAnalysisDate: string;
}

export interface AIAnalysisHistory {
  id: string;
  timestamp: string;
  logsType: 'audit' | 'errors' | 'performance' | 'general';
  issuesFound: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  creditsUsed: number;
  estimatedSavings: number;
  duration: number; // seconds
}

// Métricas atuais (simuladas - em produção viriam do Supabase)
export const currentMetrics: AIAnalysisMetrics = {
  totalAnalyses: 0,
  creditsUsed: 0,
  issuesIdentified: 0,
  issuesFixed: 0,
  estimatedCreditsSaved: 0,
  roi: 0,
  averageAnalysisTime: 0,
  lastAnalysisDate: new Date().toISOString(),
};

// Histórico de análises
export const analysisHistory: AIAnalysisHistory[] = [];

// Funções auxiliares
export const updateMetrics = (analysis: AIAnalysisHistory) => {
  currentMetrics.totalAnalyses++;
  currentMetrics.creditsUsed += analysis.creditsUsed;
  currentMetrics.issuesIdentified += analysis.issuesFound;
  currentMetrics.estimatedCreditsSaved += analysis.estimatedSavings;
  currentMetrics.lastAnalysisDate = analysis.timestamp;
  
  // Calcular ROI
  currentMetrics.roi = currentMetrics.creditsUsed > 0 
    ? (currentMetrics.estimatedCreditsSaved / currentMetrics.creditsUsed)
    : 0;
  
  // Atualizar tempo médio
  const totalTime = analysisHistory.reduce((acc, h) => acc + h.duration, 0) + analysis.duration;
  currentMetrics.averageAnalysisTime = totalTime / currentMetrics.totalAnalyses;
  
  analysisHistory.push(analysis);
};

export const markIssueFixed = () => {
  currentMetrics.issuesFixed++;
};

export const getROIPercentage = (): string => {
  return `${(currentMetrics.roi * 100).toFixed(0)}%`;
};

export const getTotalCreditsSaved = (): number => {
  return currentMetrics.estimatedCreditsSaved - currentMetrics.creditsUsed;
};

export const getEfficiencyScore = (): number => {
  // Score de 0-100 baseado em issues identificados vs fixados
  if (currentMetrics.issuesIdentified === 0) return 0;
  return Math.round((currentMetrics.issuesFixed / currentMetrics.issuesIdentified) * 100);
};

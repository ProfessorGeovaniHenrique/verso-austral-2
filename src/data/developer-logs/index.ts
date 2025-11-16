// 📋 Developer Logs - Exportações centralizadas

export {
  constructionLog,
  projectStats,
  getPhaseByName,
  getCompletedPhases,
  getInProgressPhases,
  getAllScientificReferences,
  getMetricEvolution,
  type ConstructionPhase,
  type TechnicalDecision,
  type Artifact,
  type Metrics,
  type ScientificReference
} from './construction-log';

export {
  scientificChangelog,
  scientificStats,
  methodologies,
  fullReferences,
  getVersionByNumber,
  getLatestVersion,
  getAccuracyEvolution,
  getAllConcepts,
  getReferenceByKey,
  type ScientificChangelog,
  type ScientificAdvance
} from './changelog-scientific';

export {
  backendBugs,
  frontendBugs,
  architectureBugs,
  refactoringStrategy,
  executiveSummary,
  actionPlan,
  validationChecklist,
  type BugReport,
  type RefactoringStrategy
} from './audit-report-2024-11';

// 🎯 CORPUS MASTER - Fonte única de verdade
export { 
  corpusMaster,
  getPalavrasTematicas,
  getPalavrasByDominio,
  getPalavrasByProsodia,
  getPalavrasChave,
  getDominiosAgregados,
  getProsodiaStats,
  findPalavra,
  findFormasByLema,
  type CorpusMasterWord
} from './corpus-master';

// Arquivos originais (mantidos para compatibilidade legada)
export { dominiosNormalizados } from './dominios-normalized';
export { dominiosSeparated } from './dominios-separated';
export { prosodiasMap, getProsodiaSemantica } from './prosodias-map';
export { prosodiasLemasMap, getProsodiaByLema, getProsodiaInfo } from './prosodias-lemas';
export { kwicDataMap } from './kwic';
export { dominiosData } from './dominios';
export { enrichedSemanticData, enrichSemanticWords } from './enrichedSemanticData';
export { 
  logLikelihoodData, 
  miScoreData, 
  palavrasChaveData, 
  palavraStats,
  lematizacaoData 
} from './palavras-chave';
export { prosodiaSemanticaData } from './prosodias';
export { frequenciaNormalizadaData } from './frequencia-normalizada';

// 🔍 Validação e auditoria
export { auditCorpusData } from './validation/auditCorpusData';
export { runAllTests, runTestsWithConsoleOutput } from './validation/corpusTests';
export type { TestResult, TestSuite } from './validation/corpusTests';

// Re-exportar types para conveniência
export type {
  KWICEntry,
  KWICDataMap,
  DominioSemantico,
  PalavraChave,
  ScoreData,
  PalavraStats,
  PalavraStatsMap,
  ProsodiaType,
  ProsodiaData,
  LematizacaoData
} from '../types/corpus.types';

export type {
  SemanticWord,
  FogDomain,
  SemanticConnection,
  FogPlanetVisualizationData,
  VisualizationFilters
} from '../types/fogPlanetVisualization.types';

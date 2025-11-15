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

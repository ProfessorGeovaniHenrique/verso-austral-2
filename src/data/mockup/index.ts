// Exportação centralizada de todos os dados mockados
export { kwicDataMap } from './kwic';
export { dominiosData } from './dominios';
export { 
  logLikelihoodData, 
  miScoreData, 
  palavrasChaveData, 
  palavraStats,
  lematizacaoData 
} from './palavras-chave';
export { prosodiaSemanticaData } from './prosodias';

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

export { dominiosNormalizados } from './dominios-normalized';
export { prosodiasMap, getProsodiaSemantica } from './prosodias-map';
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

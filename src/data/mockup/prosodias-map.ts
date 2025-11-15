import { ProsodiaType } from '../types/corpus.types';

/**
 * Mapa de Prosódia Semântica - Análise Contextual Completa
 * 
 * Prosódia Semântica: tendência de uma palavra em coocorrer com contextos
 * positivos, negativos ou neutros, revelando a carga emocional implícita.
 * 
 * Classificação baseada no uso específico no corpus do poema gaúcho.
 */
export const prosodiasMap: Record<string, ProsodiaType> = {
  // ========== NATUREZA E PAISAGEM ==========
  "coxilha": "Neutra",
  "sol": "Positiva",
  "sombra": "Negativa", 
  "tarde": "Positiva",
  "tarumã": "Positiva",
  "várzea": "Neutra",
  "asa": "Positiva",
  "aurora": "Positiva",
  "campo": "Neutra",
  "campanha": "Positiva",
  "chão": "Neutra",
  "fogo": "Positiva",
  "horizonte": "Positiva",
  "madrugada": "Neutra",
  "manhã": "Positiva",
  "maçanilha": "Positiva",
  "noite": "Negativa",
  "primavera": "Positiva",
  "reponte": "Positiva",
  "ventito": "Positiva",
  
  // ========== CULTURA E LIDA GAÚCHA ==========
  "gateado": "Positiva",
  "arreio": "Negativa", // "arreios suados" = trabalho árduo, abandono
  "bomba": "Neutra",
  "brasa": "Positiva",
  "cambona": "Neutra",
  "campereada": "Neutra",
  "cancela": "Negativa", // "cancela encostada" = descuido, perda
  "candeeiro": "Positiva",
  "caseiro": "Positiva",
  "copla": "Positiva",
  "cuia": "Neutra",
  "espora": "Neutra",
  "galpão": "Neutra",
  "galponeiro": "Positiva",
  "jujado": "Neutra",
  "lombo": "Neutra",
  "lonjura": "Negativa", // Distâncias que causam cansaço e saudade
  "maragato": "Neutra",
  "mate": "Positiva",
  "pañuelo": "Positiva",
  "prenda": "Positiva",
  "pura-folha": "Positiva",
  "quarto": "Positiva",
  "querência": "Positiva",
  "ramada": "Neutra",
  "templado": "Positiva",
  "tropa": "Neutra",
  
  // ========== AÇÕES E PROCESSOS ==========
  "trazer": "Neutra",
  "ser": "Neutra",
  "sonhar": "Positiva",
  "abrir": "Positiva",
  "aquerenciar": "Positiva",
  "cair": "Neutra",
  "cevar": "Positiva",
  "chegar": "Neutra",
  "deixar": "Negativa",
  "desencilhar": "Neutra",
  "desgarrar": "Negativa",
  "encilhar": "Neutra",
  "estampar": "Positiva",
  "ficar": "Negativa", // "Ficaram arreios suados" = abandono
  "ganhar": "Positiva",
  "pontear": "Positiva",
  "queimar": "Neutra",
  "rondar": "Neutra",
  "ter": "Neutra",
  
  // ========== SENTIMENTOS E ABSTRAÇÕES ==========
  "verso": "Positiva",
  "saudade": "Negativa",
  "sonho": "Positiva",
  "açoite": "Negativa", // Metáfora direta para dor
  "calma": "Positiva",
  "canto": "Positiva",
  "cerne": "Neutra",
  "cor": "Neutra",
  "espera": "Negativa", // "olhos adormecidos na espera" = ansiedade
  "figura": "Positiva",
  "fim": "Negativa",
  "jeito": "Positiva",
  "luz": "Positiva",
  "mansidão": "Positiva",
  "respeito": "Positiva",
  "silencio": "Negativa", // "silencio de esporas" = ausência, solidão
  
  // ========== QUALIDADES E ESTADOS ==========
  "aberto": "Positiva",
  "adormecido": "Negativa",
  "campeiro": "Positiva",
  "cansado": "Negativa",
  "copado": "Positiva",
  "encostado": "Negativa",
  "espichado": "Neutra",
  "feito": "Neutra",
  "gordo": "Positiva",
  "lindo": "Positiva",
  "negro": "Negativa", // "olhos negros de noite" = escuridão, melancolia
  "novo": "Positiva",
  "recostado": "Negativa",
  "redomona": "Negativa", // "saudade redomona" = selvagem, indomada
  "suado": "Negativa",
  "vestido": "Neutra",
  
  // ========== PARTES DO CORPO E SERES VIVOS ==========
  "olho": "Neutra",
  "galo": "Positiva"
};

/**
 * Obtém a prosódia de uma palavra
 * Retorna 'Neutra' como padrão se a palavra não estiver no mapa
 */
export function getProsodiaSemantica(palavra: string): ProsodiaType {
  return prosodiasMap[palavra.toLowerCase()] || 'Neutra';
}

/**
 * Filtra palavras por prosódia
 */
export function filterByProsody(palavras: string[], prosody: ProsodiaType[]): string[] {
  if (prosody.length === 0) return palavras;
  return palavras.filter(p => prosody.includes(getProsodiaSemantica(p)));
}

/**
 * Conta palavras por prosódia em um domínio
 */
export function countProsodyInDomain(palavras: string[]): Record<ProsodiaType, number> {
  return palavras.reduce((acc, palavra) => {
    const pros = getProsodiaSemantica(palavra);
    acc[pros] = (acc[pros] || 0) + 1;
    return acc;
  }, { Positiva: 0, Negativa: 0, Neutra: 0 } as Record<ProsodiaType, number>);
}

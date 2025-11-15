import { SemanticWord } from '../types/fogPlanetVisualization.types';
import { dominiosSeparated } from './dominios-separated';
import { kwicDataMap } from './kwic';
import { getProsodiaSemantica } from './prosodias-map';
import { planetTextures } from '@/assets/planets';

/**
 * Enriquecimento de Dados Semânticos para Visualização FOG & PLANETS
 * 
 * Gera dados mock para:
 * - Justificativas de prosódia
 * - Definições contextuais
 * - Palavras relacionadas
 * - Atribuição de texturas
 * - Cálculo de hue shift
 */

// ===== MOCK DATA: Definições Contextuais =====
const contextualDefinitions: Record<string, string> = {
  // Cultura e Lida Gaúcha
  "gateado": "Pelagem de cavalo com listras que lembram as do gato montês, muito apreciada no pampa.",
  "arreio": "Conjunto de apetrechos usado para montar e conduzir o cavalo.",
  "bomba": "Canudo de metal usado para tomar chimarrão, símbolo da hospitalidade gaúcha.",
  "querência": "Lugar onde nascemos ou que amamos profundamente, nossa terra natal.",
  "mate": "Erva-mate preparada em infusão quente, bebida tradicional compartilhada em roda.",
  "prenda": "Termo carinhoso para a mulher gaúcha, tradicionalmente trajada com vestido de prenda.",
  "galpão": "Construção rústica no campo onde se realizam festas, danças e reuniões.",
  "cuia": "Recipiente feito de porongo para tomar chimarrão, passada em roda.",
  "tropa": "Conjunto de cavalos ou mulas conduzidos pelo tropeiro.",
  
  // Natureza e Paisagem
  "coxilha": "Elevação suave do terreno típica do pampa gaúcho.",
  "várzea": "Terreno baixo e úmido à margem de rios.",
  "campo": "Extensão plana coberta de vegetação rasteira, característico do pampa.",
  "horizonte": "Linha onde a terra encontra o céu, visível nas planícies infinitas.",
  "madrugada": "Início do dia, momento de começar a lida campeira.",
  
  // Ações e Processos
  "aquerenciar": "Criar apego ou querência por um lugar.",
  "desencilhar": "Tirar a cilha e os arreios do cavalo.",
  "pontear": "Tocar violão ou guitarra, dedilhando as cordas.",
  "cevar": "Preparar o chimarrão, adicionar água quente na erva-mate.",
  
  // Sentimentos e Abstrações
  "saudade": "Sentimento de nostalgia e lembrança afetiva, muito presente na poesia gaúcha.",
  "verso": "Linha poética, composição literária cantada ou recitada.",
  "mansidão": "Qualidade de ser manso, tranquilo, pacífico.",
  
  // Seres Vivos
  "galo": "Ave doméstica que anuncia o amanhecer no campo.",
  
  // Partes do Corpo
  "olho": "Órgão da visão, frequentemente usado em metáforas poéticas.",
};

// ===== MOCK DATA: Justificativas de Prosódia =====
const prosodyJustifications: Record<string, string> = {
  "saudade": "Evoca sentimento melancólico e nostálgico, mas valorizado positivamente na cultura gaúcha.",
  "querência": "Representa amor pela terra natal, sentimento profundamente positivo.",
  "horizonte": "Simboliza liberdade e amplitude, conotação positiva de possibilidades.",
  "açoite": "Instrumento de castigo ou flagelo, conotação negativa de violência.",
  "cansado": "Estado de exaustão, geralmente conotação negativa.",
  "sol": "Fonte de luz e calor, essencial para a vida, conotação positiva.",
  "noite": "Momento de descanso após a lida, conotação neutra ou positiva.",
};

// ===== FUNÇÃO: Gerar Palavras Relacionadas =====
function generateRelatedWords(palavra: string, dominio: string): string[] {
  // Encontrar o domínio
  const dom = dominiosSeparated.find(d => d.dominio === dominio);
  if (!dom) return [];
  
  // Retornar outras palavras do mesmo domínio (máximo 8)
  return dom.palavras
    .filter(p => p !== palavra)
    .slice(0, 8);
}

// ===== FUNÇÃO: Atribuir Textura e Hue Shift =====
function assignPlanetVisuals(
  palavra: string, 
  wordIndex: number, 
  domainColor: string
): { texture: string; hueShift: number } {
  // Distribuir texturas ciclicamente
  const textureIndex = wordIndex % planetTextures.length;
  const texture = planetTextures[textureIndex];
  
  // Calcular hue shift baseado na cor do domínio
  // Extrair hue da cor HSL do domínio (ex: "hsl(142, 71%, 45%)" -> 142)
  const hueMatch = domainColor.match(/hsl\((\d+)/);
  const domainHue = hueMatch ? parseInt(hueMatch[1]) : 0;
  
  // Gerar variação de hue (-30 a +30 graus) baseada no índice da palavra
  const hueVariation = ((wordIndex % 7) - 3) * 10; // -30, -20, -10, 0, 10, 20, 30
  const hueShift = domainHue + hueVariation;
  
  return { texture, hueShift };
}

// ===== FUNÇÃO PRINCIPAL: Enriquecer Palavras =====
export function enrichSemanticWords(): SemanticWord[] {
  const enrichedWords: SemanticWord[] = [];
  let globalWordIndex = 0;
  
  // Filtrar domínios temáticos (excluir Palavras Funcionais)
  const thematicDomains = dominiosSeparated.filter(
    d => d.dominio !== "Palavras Funcionais"
  );
  
  for (const domain of thematicDomains) {
    const domainWords = domain.palavrasComFrequencia || [];
    const domainColor = domain.cor;
    
    for (let i = 0; i < domainWords.length; i++) {
      const wordData = domainWords[i];
      const palavra = wordData.palavra;
      
      // Obter prosódia
      const prosody = getProsodiaSemantica(palavra);
      
      // Obter concordâncias (KWIC)
      const concordances = kwicDataMap[palavra] || [];
      
      // Gerar palavras relacionadas
      const relatedWords = generateRelatedWords(palavra, domain.dominio);
      
      // Obter definição contextual (ou gerar mock)
      const contextualDefinition = contextualDefinitions[palavra] || 
        `Termo característico do domínio "${domain.dominio}", usado frequentemente no vocabulário gaúcho.`;
      
      // Obter justificativa de prosódia (ou gerar mock)
      const prosodyJustification = prosodyJustifications[palavra] || 
        `Classificada como "${prosody}" com base no contexto de uso no corpus gaúcho.`;
      
      // Atribuir textura e hue shift
      const { texture, hueShift } = assignPlanetVisuals(palavra, globalWordIndex, domainColor);
      
      // Calcular propriedades orbitais
      const frequency = wordData.ocorrencias;
      const normalizedFreq = frequency / Math.max(...domainWords.map(w => w.ocorrencias));
      
      // Palavras mais frequentes ficam mais próximas do centro
      const orbitalRadius = 1.5 - (normalizedFreq * 0.8); // 0.7 a 1.5
      
      // Distribuir ângulos uniformemente
      const angleStep = (Math.PI * 2) / domainWords.length;
      const orbitalAngle = i * angleStep;
      
      // Velocidade orbital inversamente proporcional à frequência
      const orbitalSpeed = 0.0005 + (1 - normalizedFreq) * 0.002; // 0.0005 a 0.0025
      
      // Excentricidade baseada em prosódia
      const orbitalEccentricity = prosody === 'Positiva' ? 0.2 : 
                                   prosody === 'Negativa' ? 0.4 : 0.1;
      
      // Criar palavra enriquecida
      const enrichedWord: SemanticWord = {
        palavra,
        ocorrencias: frequency,
        dominio: domain.dominio,
        prosody,
        prosodyJustification,
        contextualDefinition,
        concordances,
        relatedWords,
        planetTexture: texture,
        hueShift,
        orbitalRadius,
        orbitalAngle,
        orbitalSpeed,
        orbitalEccentricity
      };
      
      enrichedWords.push(enrichedWord);
      globalWordIndex++;
    }
  }
  
  return enrichedWords;
}

// ===== MOCK DATA: Definições adicionais para palavras comuns =====
const additionalDefinitions: Record<string, string> = {
  // Adicionar mais definições conforme necessário
  "campeiro": "Homem experiente na lida campeira, conhecedor dos costumes do campo.",
  "galponeiro": "Aquele que cuida do galpão, responsável por manter a tradição viva.",
  "maragato": "Denominação histórica dos revolucionários federalistas gaúchos.",
  "templado": "Bem preparado, em boas condições, pronto para o trabalho.",
  "pañuelo": "Lenço tradicional usado no traje gaúcho.",
  "redomona": "Égua ou cavalo ainda não completamente domado.",
  "tarumã": "Árvore típica do sul do Brasil, de madeira resistente.",
  "ventito": "Vento suave e fresco característico do pampa.",
  "maçanilha": "Planta medicinal aromática, usada para chás calmantes.",
  "copla": "Estrofe de canção popular, geralmente improvisada.",
};

// Mesclar definições adicionais
Object.assign(contextualDefinitions, additionalDefinitions);

// ===== EXPORTAR DADOS ENRIQUECIDOS =====
export const enrichedSemanticData = enrichSemanticWords();

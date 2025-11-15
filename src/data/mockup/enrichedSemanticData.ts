import { SemanticWord } from '../types/fogPlanetVisualization.types';
import { dominiosSeparated } from './dominios-separated';
import { kwicDataMap } from './kwic';
import { getProsodiaSemantica } from './prosodias-map';
import { planetTextures } from '@/assets/planets';
import { 
  calculateWordMIScore, 
  frequencyToOrbitalLayer,
  calculateUniformAngle
} from '@/lib/linguisticStats';

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
  
  // Definições adicionais
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

// ===== MOCK DATA: Justificativas de Prosódia =====
const prosodyJustifications: Record<string, string> = {
  "saudade": "Evoca sentimento melancólico e nostálgico, mas valorizado positivamente na cultura gaúcha.",
  "querência": "Representa amor pela terra natal, sentimento profundamente positivo.",
  "horizonte": "Simboliza liberdade e amplitude, conotação positiva de possibilidades.",
  "açoite": "Instrumento de castigo ou flagelo, conotação negativa de violência.",
  "cansado": "Estado de exaustão, geralmente conotação negativa.",
  "sol": "Fonte de luz e calor, essencial para a vida, conotação positiva.",
  "mate": "Bebida compartilhada que representa hospitalidade e conexão social, conotação positiva.",
  "galpão": "Espaço de encontro e celebração, conotação positiva de comunidade.",
  "bomba": "Objeto associado ao ritual positivo do chimarrão.",
  "prenda": "Termo carinhoso que celebra a mulher gaúcha, conotação positiva.",
  "gateado": "Pelagem apreciada e valorizada, conotação positiva.",
  "arreio": "Ferramenta de trabalho essencial, conotação neutra/positiva.",
  "tropa": "Conjunto de animais que representa trabalho e mobilidade, conotação neutra.",
  "campo": "Paisagem característica do pampa, conotação neutra descritiva.",
  "coxilha": "Formação geográfica típica, conotação neutra descritiva.",
};

/**
 * Gera lista mock de palavras relacionadas dentro do mesmo domínio
 */
function generateRelatedWords(palavra: string, dominio: string): string[] {
  const domainData = dominiosSeparated.find(d => d.dominio === dominio);
  if (!domainData) return [];
  
  const relacionadas = domainData.palavrasComFrequencia
    .map(w => w.palavra)
    .filter(p => p !== palavra);
  
  return relacionadas.filter(p => p !== palavra).slice(0, 5);
}

/**
 * Pré-conta palavras por camada e prosódia para distribuição uniforme real
 */
interface LayerCount {
  [layerId: number]: {
    Positiva: number;
    Neutra: number;
    Negativa: number;
  };
}

function countWordsPerLayerAndProsody(domainWords: Array<{ palavra: string; ocorrencias: number }>, domainName: string): LayerCount {
  const counts: LayerCount = {
    1: { Positiva: 0, Neutra: 0, Negativa: 0 },
    2: { Positiva: 0, Neutra: 0, Negativa: 0 },
    3: { Positiva: 0, Neutra: 0, Negativa: 0 },
    4: { Positiva: 0, Neutra: 0, Negativa: 0 },
    5: { Positiva: 0, Neutra: 0, Negativa: 0 },
    6: { Positiva: 0, Neutra: 0, Negativa: 0 },
  };
  
  domainWords.forEach(wordData => {
    const frequency = wordData.ocorrencias;
    const prosody = getProsodiaSemantica(wordData.palavra);
    const layer = frequencyToOrbitalLayer(frequency).layer;
    
    counts[layer][prosody]++;
  });
  
  return counts;
}

/**
 * Atribui textura de planeta e calcula hue shift baseado na cor do domínio
 */
function assignPlanetVisuals(palavra: string, wordIndex: number, domainColor: string): { texture: string; hueShift: number } {
  const textureIndex = wordIndex % planetTextures.length;
  const texture = planetTextures[textureIndex];
  
  const wordHash = palavra.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorHash = domainColor.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const hueShift = ((wordHash + colorHash) % 360) - 180;
  
  return { texture, hueShift };
}

/**
 * Função principal que enriquece todas as palavras dos domínios
 */
export function enrichSemanticWords(): SemanticWord[] {
  const allWords: SemanticWord[] = [];
  let globalWordIndex = 0;
  
  if (!dominiosSeparated || dominiosSeparated.length === 0) {
    console.error('❌ dominiosSeparated is empty or undefined');
    return [];
  }
  
  const thematicDomains = dominiosSeparated.filter(
    d => d.dominio !== "Palavras Funcionais"
  );
  
  if (thematicDomains.length === 0) {
    console.warn('⚠️ No thematic domains found after filtering');
    return [];
  }
  
  console.log(`📊 Processing ${thematicDomains.length} thematic domains...`);
  
  for (const domain of thematicDomains) {
    const domainWords = domain.palavrasComFrequencia || [];
    const domainColor = domain.cor;
    
    if (domainWords.length === 0) {
      console.warn(`⚠️ Domain "${domain.dominio}" has no words, skipping...`);
      continue;
    }
    
    console.log(`  🌫️ ${domain.dominio}: ${domainWords.length} words`);
    
    // PRÉ-PROCESSAR: Contar palavras por camada e prosódia ANTES de distribuir
    const layerCounts = countWordsPerLayerAndProsody(domainWords, domain.dominio);
    
    // Contadores incrementais por camada e prosódia (índice dentro do setor)
    const layerIndexCounters: Record<number, Record<string, number>> = {
      1: { Positiva: 0, Neutra: 0, Negativa: 0 },
      2: { Positiva: 0, Neutra: 0, Negativa: 0 },
      3: { Positiva: 0, Neutra: 0, Negativa: 0 },
      4: { Positiva: 0, Neutra: 0, Negativa: 0 },
      5: { Positiva: 0, Neutra: 0, Negativa: 0 },
      6: { Positiva: 0, Neutra: 0, Negativa: 0 },
    };
    
    for (let i = 0; i < domainWords.length; i++) {
      const wordData = domainWords[i];
      
      if (!wordData || !wordData.palavra) {
        console.warn(`⚠️ Invalid word data at index ${i} in domain "${domain.dominio}", skipping...`);
        continue;
      }
      
      const palavra = wordData.palavra;
      const prosody = getProsodiaSemantica(palavra);
      const concordances = kwicDataMap[palavra] || [];
      const relatedWords = generateRelatedWords(palavra, domain.dominio);
      
      const contextualDefinition = contextualDefinitions[palavra] || 
        `Termo característico do domínio "${domain.dominio}", usado frequentemente no vocabulário gaúcho.`;
      
      const prosodyJustification = prosodyJustifications[palavra] || 
        `Classificada como "${prosody}" com base no contexto de uso no corpus gaúcho.`;
      
      const { texture, hueShift } = assignPlanetVisuals(palavra, globalWordIndex, domainColor);
      
      // ===== 1. CALCULAR MI SCORE =====
      const frequency = wordData.ocorrencias;
      const domainTotalFreq = domain.ocorrencias;
      const miScore = calculateWordMIScore(frequency, domainTotalFreq, 10000);

      // ===== 2. MAPEAR PARA CAMADA ORBITAL DISCRETA (baseado em FREQUÊNCIA) =====
      const orbitalLayer = frequencyToOrbitalLayer(frequency);
      
      // ===== 3. SETOR ANGULAR (baseado em Prosódia) =====
      let sectorStart: number;
      const sectorSpread = (Math.PI * 2) / 3;

      if (prosody === 'Positiva') {
        sectorStart = 0;
      } else if (prosody === 'Neutra') {
        sectorStart = (Math.PI * 2) / 3;
      } else {
        sectorStart = (Math.PI * 4) / 3;
      }

      // ===== 4. DISTRIBUIÇÃO UNIFORME DENTRO DO SETOR (usando contagem REAL) =====
      const wordIndexInLayerSector = layerIndexCounters[orbitalLayer.layer][prosody];
      const totalWordsInLayerSector = layerCounts[orbitalLayer.layer][prosody];
      layerIndexCounters[orbitalLayer.layer][prosody]++;

      const baseAngle = calculateUniformAngle(
        wordIndexInLayerSector,
        totalWordsInLayerSector, // ✅ CONTAGEM REAL de palavras nesta camada+setor
        sectorStart,
        sectorSpread
      );

      const wordHash = palavra.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const microJitter = ((wordHash % 100) / 100 - 0.5) * 0.1;
      const orbitalAngle = baseAngle + microJitter;

      // ===== 5. JITTER RADIAL DENTRO DA CAMADA =====
      const radialJitter = (wordHash % 500) / 500;
      const finalOrbitalRadius = orbitalLayer.minRadius + (radialJitter * (orbitalLayer.maxRadius - orbitalLayer.minRadius));

      // ===== 6. VELOCIDADE E EXCENTRICIDADE =====
      const normalizedDistance = (finalOrbitalRadius - 2.0) / 11.5; // Ajustado para novo range (2.0-13.5)
      const orbitalSpeed = 0.5 - (normalizedDistance * 0.35);
      const orbitalEccentricity = normalizedDistance * 0.3;

      // 🔍 DEBUG DETALHADO
      if (i < 3) {
        console.log(`🪐 ${domain.dominio} | ${palavra}: freq=${frequency}, MI=${miScore.toFixed(2)}, layer=${orbitalLayer.layer}, radius=${finalOrbitalRadius.toFixed(2)}, totalInLayerSector=${totalWordsInLayerSector}, angle=${(orbitalAngle * 180 / Math.PI).toFixed(0)}°, prosody=${prosody}`);
      }

      // ===== 7. CRIAR PALAVRA ENRIQUECIDA =====
      const enrichedWord: SemanticWord = {
        palavra,
        ocorrencias: frequency,
        dominio: domain.dominio,
        prosody,
        miScore,
        orbitalRadius: finalOrbitalRadius,
        orbitalAngle,
        orbitalSpeed,
        orbitalEccentricity,
        orbitalLayer: orbitalLayer.layer,
        contextualDefinition,
        prosodyJustification,
        relatedWords,
        concordances,
        planetTexture: texture,
        hueShift: hueShift,
      };

      allWords.push(enrichedWord);
      globalWordIndex++;
    }
    
    // Debug: Mostrar distribuição final por camadas
    console.log(`📊 ${domain.dominio} - Distribuição por camadas:`, layerCounts);
  }

  console.log(`✅ Enrichment complete: ${allWords.length} words processed`);
  return allWords;
}

// Exportar dados enriquecidos (gerados uma única vez)
export const enrichedSemanticData = enrichSemanticWords();

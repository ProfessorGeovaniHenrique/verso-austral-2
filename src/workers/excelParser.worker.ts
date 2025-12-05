import * as XLSX from 'xlsx';
import type { ParsedMusic } from '../lib/excelParser';

interface WorkerMessage {
  action: 'parse';
  file: File;
  columns?: {
    titulo: string;
    artista: string;
    compositor?: string;
    ano?: string;
    letra?: string;
    url?: string;
  };
}

interface WorkerResponse {
  success: boolean;
  data?: ParsedMusic[];
  error?: string;
}

interface ComposerExtractionResult {
  composer: string | null;
  cleanedLyrics: string;
  extractionType: 'parentheses' | 'prefix' | 'name_line' | 'none';
  confidence: number;
}

// Métricas de extração para logging
const extractionStats = {
  total: 0,
  withParentheses: 0,
  withPrefix: 0,
  withNameLine: 0,
  noExtraction: 0,
  falsePositivesAvoided: 0,
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Remove número de faixa do início do título
 * Exemplos: "8 Mexe Mexe" → "Mexe Mexe", "15 Por Amor" → "Por Amor"
 */
function cleanTrackNumber(title: string): string {
  if (!title) return '';
  // Remove números seguidos de espaço no início (ex: "8 ", "15 ", "123 ")
  return title.replace(/^\d+\s+/, '').trim();
}

/**
 * Normaliza compositor extraído para formato padrão
 */
function normalizeComposer(rawComposer: string): string {
  return rawComposer
    .replace(/<br\s*\/?>/gi, ' ')         // Remover quebras HTML
    .replace(/\s+/g, ' ')                  // Normalizar espaços
    .replace(/\s*[\/]\s*/g, ' / ')         // Normalizar separador /
    .replace(/\s*[&]\s*/g, ' & ')          // Normalizar separador &
    .replace(/\s+e\s+/gi, ' e ')           // Normalizar separador "e"
    .replace(/^\s*[-–—]\s*/, '')           // Remover traço inicial
    .replace(/[()]/g, '')                  // Remover parênteses residuais
    .trim();
}

/**
 * Verifica se texto parece ser nome de compositor (não início de verso)
 */
function looksLikeComposerName(text: string): boolean {
  const normalized = text.trim();
  
  // Falsos positivos comuns - início de versos ou indicações
  const falsePositivePatterns = [
    /^declamad[ao]/i,
    /^instrumental/i,
    /^(vou|eu|se|quando|como|pra|que|um|uma|o|a|os|as|no|na|em|de|do|da)\s/i,
    /^(era|foi|tem|tinha|estou|estava|sou|és|é)\s/i,
    /^\d+/,                                // Começa com número
    /[!?.,;:]$/,                           // Termina com pontuação de verso
    /^[a-záéíóúàâêôãõç]+$/i,              // Palavra única minúscula (verso)
  ];
  
  for (const pattern of falsePositivePatterns) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  
  // Padrão de nome: Palavra capitalizada, possivelmente com separadores
  const namePattern = /^[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*(?:\s*[\/&e]\s*[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)*$/;
  
  // Também aceita nomes com iniciais: "J. Silva / M. Santos"
  const nameWithInitialsPattern = /^[A-ZÀ-Ú]\.?\s*[A-ZÀ-Ú]?[a-zà-ú]*(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*(?:\s*[\/&e]\s*[A-ZÀ-Ú]\.?\s*[A-ZÀ-Ú]?[a-zà-ú]*(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)*$/;
  
  return namePattern.test(normalized) || nameWithInitialsPattern.test(normalized);
}

/**
 * Extrai compositor de letra usando detecção de padrões
 */
function extractComposerFromLyrics(rawLyrics: string): ComposerExtractionResult {
  extractionStats.total++;
  
  if (!rawLyrics || rawLyrics.length < 10) {
    extractionStats.noExtraction++;
    return { composer: null, cleanedLyrics: rawLyrics || '', extractionType: 'none', confidence: 0 };
  }
  
  let lyrics = rawLyrics.trim();
  
  // === PADRÃO 1: Prefixo estruturado (maior confiança) ===
  // Ex: "- Aut.: Leonir / Aristides", "- Autor: João Silva"
  const prefixPatterns = [
    /^-?\s*Aut\.?\s*:?\s*(.+?)(?:<br\s*\/?>|\n|$)/im,
    /^-?\s*Autor(?:es)?\.?\s*:?\s*(.+?)(?:<br\s*\/?>|\n|$)/im,
    /^-?\s*Compositor(?:es)?\.?\s*:?\s*(.+?)(?:<br\s*\/?>|\n|$)/im,
    /^-?\s*Comp\.?\s*:?\s*(.+?)(?:<br\s*\/?>|\n|$)/im,
  ];
  
  for (const pattern of prefixPatterns) {
    const match = lyrics.match(pattern);
    if (match && match[1]) {
      const extracted = normalizeComposer(match[1]);
      if (extracted.length > 2 && extracted.length < 200) {
        extractionStats.withPrefix++;
        const cleanedLyrics = lyrics.replace(pattern, '').trim();
        return {
          composer: extracted,
          cleanedLyrics: cleanedLyrics.replace(/^(<br\s*\/?>|\n|\s)+/gi, '').trim(),
          extractionType: 'prefix',
          confidence: 0.95,
        };
      }
    }
  }
  
  // === PADRÃO 2: Compositor em parênteses no início ===
  // Ex: "( Rogério Villagran / André Teixeira )", "(Juliano Borges)"
  const parenthesesPattern = /^\s*\(\s*([^)]+)\s*\)/;
  const parenthesesMatch = lyrics.match(parenthesesPattern);
  
  if (parenthesesMatch && parenthesesMatch[1]) {
    const content = parenthesesMatch[1].trim();
    
    // Verificar se parece nome de compositor (não indicação como "declamada")
    if (looksLikeComposerName(content)) {
      const extracted = normalizeComposer(content);
      if (extracted.length > 2 && extracted.length < 200) {
        extractionStats.withParentheses++;
        const cleanedLyrics = lyrics.replace(parenthesesPattern, '').trim();
        return {
          composer: extracted,
          cleanedLyrics: cleanedLyrics.replace(/^(<br\s*\/?>|\n|\s)+/gi, '').trim(),
          extractionType: 'parentheses',
          confidence: 0.90,
        };
      }
    } else {
      extractionStats.falsePositivesAvoided++;
    }
  }
  
  // === PADRÃO 3: Nome(s) na primeira linha seguido de linha em branco ===
  // Ex: "Leonir / Aristides dos Passos\n\nQuando o galo canta..."
  // Detecta: Nome1 / Nome2 seguido de quebra dupla
  const firstLineMatch = lyrics.match(/^([^\n<]+?)(?:\s*<br\s*\/?>|\n)(?:\s*<br\s*\/?>|\n)/i);
  
  if (firstLineMatch && firstLineMatch[1]) {
    const firstLine = firstLineMatch[1].trim();
    
    // Verificar se primeira linha parece nomes de compositores
    // Deve ter formato: "Nome1 / Nome2" ou "Nome1 e Nome2" ou "Nome Sobrenome"
    if (looksLikeComposerName(firstLine) && firstLine.length < 150) {
      const extracted = normalizeComposer(firstLine);
      if (extracted.length > 2) {
        extractionStats.withNameLine++;
        const cleanedLyrics = lyrics.replace(/^[^\n<]+?(?:\s*<br\s*\/?>|\n)+/i, '').trim();
        return {
          composer: extracted,
          cleanedLyrics: cleanedLyrics.replace(/^(<br\s*\/?>|\n|\s)+/gi, '').trim(),
          extractionType: 'name_line',
          confidence: 0.75,
        };
      }
    }
  }
  
  // === PADRÃO 4: Nome entre aspas no início ===
  // Ex: "JP Batista/João Luiz Corrêa/Sandro Coelho" (aspas tipográficas)
  const quotedPattern = /^[""]([^""]+)[""]\s*(?:;|\n|<br)/i;
  const quotedMatch = lyrics.match(quotedPattern);
  
  if (quotedMatch && quotedMatch[1]) {
    const content = quotedMatch[1].trim();
    if (looksLikeComposerName(content)) {
      const extracted = normalizeComposer(content);
      if (extracted.length > 2 && extracted.length < 200) {
        extractionStats.withNameLine++;
        const cleanedLyrics = lyrics.replace(quotedPattern, '').trim();
        return {
          composer: extracted,
          cleanedLyrics: cleanedLyrics.replace(/^(<br\s*\/?>|\n|\s|;)+/gi, '').trim(),
          extractionType: 'name_line',
          confidence: 0.80,
        };
      }
    }
  }
  
  // Nenhum compositor detectado
  extractionStats.noExtraction++;
  return { composer: null, cleanedLyrics: lyrics, extractionType: 'none', confidence: 0 };
}

function sanitizeLyrics(rawLyrics: string): string {
  if (!rawLyrics) return '';
  
  const invalidPatterns = [
    /letra\s*n[ãa]o\s*encontrada/i,
    /sabe\s*a\s*letra\?\s*envie/i,
    /\[email.*protected\]/i,
    /envie-nos\s*por\s*e-?mail/i,
    /email&#160;protected/i,
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(rawLyrics)) {
      console.log('[Parser] Letra placeholder detectada e removida');
      return '';
    }
  }
  
  return rawLyrics.trim();
}

function detectColumns(headers: string[]): Record<string, number> {
  const normalized = headers.map(h => normalizeText(h || ''));
  
  const titlePatterns = [
    'titulo',
    'title',
    'musica',
    'song',
    'nome da musica',
    'cancao',
    'faixa',
    'track'
  ];
  
  const artistPatterns = [
    'artista',
    'artist',
    'interprete',
    'cantor',
    'banda',
    'grupo',
    'nome do artista',
    'nome'
  ];
  
  const composerPatterns = ['compositor', 'composer', 'autor', 'compositores'];
  const yearPatterns = ['ano', 'year', 'lancamento'];
  const lyricsPatterns = ['letra', 'lyrics', 'texto'];
  const urlPatterns = ['url', 'link', 'fonte', 'source'];

  const findColumn = (patterns: string[]) => {
    let exactMatchIndex = normalized.findIndex(h => 
      h && patterns.some(p => h === p)
    );
    if (exactMatchIndex !== -1) return exactMatchIndex;
    
    return normalized.findIndex(h => 
      h && patterns.some(p => h.includes(p))
    );
  };

  const columnMap = {
    titulo: findColumn(titlePatterns),
    artista: findColumn(artistPatterns),
    compositor: findColumn(composerPatterns),
    ano: findColumn(yearPatterns),
    letra: findColumn(lyricsPatterns),
    url: findColumn(urlPatterns),
  };

  const detectedIndices = Object.values(columnMap).filter(idx => idx !== -1);
  const hasDuplicates = new Set(detectedIndices).size !== detectedIndices.length;
  
  if (hasDuplicates) {
    console.warn('[Parser] ALERTA: Mesma coluna detectada para múltiplos campos!', {
      headers,
      columnMap
    });
  }

  if (columnMap.titulo === -1 && columnMap.artista !== -1) {
    for (let i = 0; i < headers.length; i++) {
      if (i !== columnMap.artista && i !== columnMap.compositor && i !== columnMap.ano && i !== columnMap.letra) {
        columnMap.titulo = i;
        console.log('[Parser] Fallback: Título assumido como coluna', i, ':', headers[i]);
        break;
      }
    }
  }

  console.log('[Parser] Cabeçalhos detectados:', headers);
  console.log('[Parser] Mapeamento:', {
    titulo: columnMap.titulo >= 0 ? headers[columnMap.titulo] : 'NÃO DETECTADO',
    artista: columnMap.artista >= 0 ? headers[columnMap.artista] : 'NÃO DETECTADO',
    compositor: columnMap.compositor >= 0 ? headers[columnMap.compositor] : 'NÃO DETECTADO'
  });

  return columnMap;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { file, columns: providedColumns } = e.data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      throw new Error('O arquivo está vazio');
    }

    const headers = jsonData[0] as string[];
    const columnMap = providedColumns || detectColumns(headers);

    const parsedData: ParsedMusic[] = [];
    let lastArtista = '';

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      if (!row || row.length === 0 || !row[columnMap.titulo]) {
        continue;
      }

      const tituloRaw = String(row[columnMap.titulo] || '').trim();
      const titulo = cleanTrackNumber(tituloRaw);
      if (!titulo) continue;

      const artista = row[columnMap.artista] 
        ? String(row[columnMap.artista]).trim() 
        : lastArtista;

      const compositor = row[columnMap.compositor]
        ? String(row[columnMap.compositor]).trim()
        : '';

      const ano = row[columnMap.ano] 
        ? String(row[columnMap.ano]).trim() 
        : '';

      const letraRaw = row[columnMap.letra]
        ? String(row[columnMap.letra]).trim()
        : '';
      const letraSanitized = sanitizeLyrics(letraRaw);
      
      // Extrair compositor da letra se não vier da planilha
      const { composer: extractedComposer, cleanedLyrics, extractionType, confidence } = 
        extractComposerFromLyrics(letraSanitized);
      
      // Prioridade: compositor da planilha > compositor extraído da letra
      const compositorFinal = compositor || extractedComposer || '';
      
      // Usar letra limpa (sem compositor no início)
      const letraFinal = cleanedLyrics;
      
      // Log para debug das primeiras extrações
      if (extractedComposer && i <= 5) {
        console.log(`[Parser] Compositor extraído (${extractionType}, conf: ${confidence}):`, {
          titulo,
          compositor: extractedComposer,
          original: letraSanitized.substring(0, 100) + '...',
        });
      }

      const lyricsUrl = row[columnMap.url]
        ? String(row[columnMap.url]).trim()
        : '';

      if (artista) lastArtista = artista;

      parsedData.push({
        id: `${i}-${Date.now()}`,
        titulo,
        artista,
        compositor: compositorFinal,
        ano,
        letra: letraFinal,
        lyricsUrl: lyricsUrl || undefined,
        fonte: file.name,
      });
    }

    // Log de métricas de extração
    console.log('[Parser] Extração de compositores:', {
      total: extractionStats.total,
      comPrefixo: extractionStats.withPrefix,
      comParenteses: extractionStats.withParentheses,
      comNomeLinha: extractionStats.withNameLine,
      semExtracao: extractionStats.noExtraction,
      falsosPositivosEvitados: extractionStats.falsePositivesAvoided,
    });
    
    console.log('[Parser] Primeiras 3 músicas parseadas:', parsedData.slice(0, 3));

    const response: WorkerResponse = {
      success: true,
      data: parsedData,
    };

    self.postMessage(response);

  } catch (error) {
    const response: WorkerResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar arquivo',
    };
    
    self.postMessage(response);
  }
};

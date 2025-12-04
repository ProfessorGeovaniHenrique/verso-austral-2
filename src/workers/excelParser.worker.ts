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
  };
}

interface WorkerResponse {
  success: boolean;
  data?: ParsedMusic[];
  error?: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
  const normalized = headers.map(h => normalizeText(h));
  
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
  
  const composerPatterns = ['compositor', 'composer', 'autor'];
  const yearPatterns = ['ano', 'year', 'lancamento'];
  const lyricsPatterns = ['letra', 'lyrics', 'texto'];

  const findColumn = (patterns: string[]) => {
    let exactMatchIndex = normalized.findIndex(h => 
      patterns.some(p => h === p)
    );
    if (exactMatchIndex !== -1) return exactMatchIndex;
    
    return normalized.findIndex(h => 
      patterns.some(p => h.includes(p))
    );
  };

  const columnMap = {
    titulo: findColumn(titlePatterns),
    artista: findColumn(artistPatterns),
    compositor: findColumn(composerPatterns),
    ano: findColumn(yearPatterns),
    letra: findColumn(lyricsPatterns),
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

      const titulo = String(row[columnMap.titulo] || '').trim();
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
      const letra = sanitizeLyrics(letraRaw);

      if (artista) lastArtista = artista;

      parsedData.push({
        id: `${i}-${Date.now()}`,
        titulo,
        artista,
        compositor,
        ano,
        letra,
        fonte: file.name,
      });
    }

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

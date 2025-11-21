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

function detectColumns(headers: string[]): Record<string, number> {
  const normalized = headers.map(h => normalizeText(h));
  
  const titlePatterns = ['titulo', 'title', 'musica', 'song', 'nome'];
  const artistPatterns = ['artista', 'artist', 'cantor', 'interprete', 'banda'];
  const composerPatterns = ['compositor', 'composer', 'autor'];
  const yearPatterns = ['ano', 'year', 'lancamento'];
  const lyricsPatterns = ['letra', 'lyrics', 'texto'];

  const findColumn = (patterns: string[]) => {
    return normalized.findIndex(h => 
      patterns.some(p => h.includes(p))
    );
  };

  return {
    titulo: findColumn(titlePatterns),
    artista: findColumn(artistPatterns),
    compositor: findColumn(composerPatterns),
    ano: findColumn(yearPatterns),
    letra: findColumn(lyricsPatterns),
  };
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
    let lastCompositor = '';

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
        : lastCompositor || artista;

      const ano = row[columnMap.ano] 
        ? String(row[columnMap.ano]).trim() 
        : '';

      const letra = row[columnMap.letra]
        ? String(row[columnMap.letra]).trim()
        : '';

      if (artista) lastArtista = artista;
      if (compositor) lastCompositor = compositor;

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

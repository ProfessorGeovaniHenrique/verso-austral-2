import * as XLSX from 'xlsx';

function normalizeCellValue(cellValue: any): string | null {
  if (cellValue === null || cellValue === undefined) {
    return null;
  }

  if (typeof cellValue === 'object') {
    const value = (cellValue as any)?.value;
    if (value === null || value === undefined) return null;
    cellValue = value;
  }

  const str = String(cellValue).trim();
  if (str === '' || str === 'undefined' || str === 'null') {
    return null;
  }
  return str;
}

export function parseExcelWithWorker(
  file: File,
  onProgress?: (message: string, percentage: number) => void
): Promise<RawParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/excelParser.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error('Timeout: O processamento do arquivo excedeu 30 segundos. Tente um arquivo menor ou divida-o em partes.'));
    }, 30000);

    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        clearTimeout(timeoutId);
        reject(new Error('Falha ao ler arquivo'));
        return;
      }

      worker.postMessage({
        type: 'PARSE_EXCEL',
        data: e.target.result,
        filename: file.name
      });
    };

    reader.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Erro ao ler arquivo'));
      worker.terminate();
    };

    worker.onmessage = (e) => {
      const response = e.data;

      if (response.type === 'SUCCESS') {
        clearTimeout(timeoutId);
        resolve(response.result);
        worker.terminate();
      } else if (response.type === 'ERROR') {
        clearTimeout(timeoutId);
        reject(new Error(response.error));
        worker.terminate();
      } else if (response.type === 'PROGRESS' && onProgress) {
        onProgress(response.message, response.percentage);
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Worker error: ${error.message}`));
      worker.terminate();
    };

    reader.readAsArrayBuffer(file);
  });
}

export interface ParsedMusic {
  titulo: string;
  artista?: string;
  compositor?: string;
  ano?: string;
  letra?: string;
  lyricsUrl?: string;
  fonte: string;
  id: string;
}

export interface ParseResult {
  filename: string;
  totalRows: number;
  extractedData: ParsedMusic[];
  columnsDetected: {
    musica: boolean;
    artista: boolean;
    compositor: boolean;
    ano: boolean;
  };
  detectionConfidence?: 'high' | 'low';
}

export interface RawParseResult {
  filename: string;
  rawRows: any[][];
  totalRows: number;
  detectionConfidence: 'high' | 'low';
}

export interface ColumnMap {
  tituloIndex: number;
  artistaIndex: number;
  compositorIndex: number;
  anoIndex: number;
  letraIndex: number;
  hasHeader: boolean;
}

function cleanTitle(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/^(nome da musica|t[ií]tulo|m[uú]sica)\s*[:=-]?\s*/i, '');
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/^\d+[\.\)\-\s]+/, '');
  return cleaned;
}

function chooseLonger(a?: string, b?: string): string | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

function consolidateDuplicates(musics: ParsedMusic[]): ParsedMusic[] {
  console.log(`[Consolidação] Iniciando com ${musics.length} itens...`);

  const uniqueMap = new Map<string, ParsedMusic>();

  musics.forEach((music, index) => {
    const normalizedTitle = (music.titulo || '').toLowerCase().trim();
    const normalizedArtist = (music.artista || '').toLowerCase().trim();

    if (index < 5) {
      console.log(`[Consolidação] Item ${index}: "${normalizedTitle}" - "${normalizedArtist}"`);
    }

    const key = `${normalizedTitle}|||${normalizedArtist}`;

    if (uniqueMap.has(key)) {
      const existing = uniqueMap.get(key)!;
      console.log(`[Consolidação] Duplicata encontrada: "${music.titulo}" - "${music.artista}"`);

      const merged: ParsedMusic = {
        ...existing,
        compositor: existing.compositor || music.compositor,
        ano: existing.ano || music.ano,
        letra: existing.letra || music.letra,
      };

      uniqueMap.set(key, merged);
    } else {
      uniqueMap.set(key, music);
    }
  });

  const result = Array.from(uniqueMap.values());
  console.log(`[Consolidação] Finalizado. Resultado: ${result.length} músicas únicas.`);
  return result;
}

export function cleanScraperData(
  data: ParsedMusic[],
  logger?: (msg: string) => void
): ParsedMusic[] {
  const log = logger || (() => {});

  if (data.length === 0) return data;

  log(`Iniciando limpeza de scraper em ${data.length} linhas...`);

  const normalize = (str: string) =>
    str.toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const sorted = [...data].sort((a, b) => {
    const titleCompare = normalize(a.titulo).localeCompare(normalize(b.titulo));
    if (titleCompare !== 0) return titleCompare;
    return normalize(a.artista || '').localeCompare(normalize(b.artista || ''));
  });

  log(`Ordenação concluída. Analisando duplicatas...`);

  const cleaned: ParsedMusic[] = [];
  let mergedCount = 0;
  let i = 0;

  while (i < sorted.length) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (next &&
        normalize(current.titulo) === normalize(next.titulo) &&
        normalize(current.artista || '') === normalize(next.artista || '')) {

      const merged: ParsedMusic = {
        id: current.id,
        titulo: current.titulo || next.titulo,
        artista: chooseLonger(current.artista, next.artista),
        compositor: chooseLonger(current.compositor, next.compositor),
        ano: chooseLonger(current.ano, next.ano),
        fonte: current.fonte,
      };

      cleaned.push(merged);
      mergedCount++;
      log(`✓ Mesclando duplicata: "${current.titulo}" - ${current.artista || 'Sem artista'}`);

      i += 2;
    } else {
      cleaned.push(current);
      i++;
    }
  }

  log(`Limpeza concluída! ${mergedCount} duplicatas mescladas.`);
  log(`De ${data.length} linhas originais → ${cleaned.length} músicas únicas.`);

  return cleaned;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          throw new Error("O arquivo parece estar vazio.");
        }

        let headerRowIndex = -1;
        const columnIndices: any = {};

        // Fase 1: Varredura inteligente de cabeçalhos (primeiras 20 linhas)
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
          const row = jsonData[i];
          row.forEach((cell: any, index: number) => {
            if (typeof cell !== 'string') return;
            const lowerCell = cell.toLowerCase().trim();

            // PRIORIDADE 1: Detectar "letra" primeiro (mais específico)
            if (lowerCell.includes('letra') || lowerCell.includes('lyric')) {
              if (columnIndices.letra === undefined) {
                columnIndices.letra = index;
              }
            }

            // PRIORIDADE 2: "Nome da música" tem precedência máxima para título
            if ((lowerCell.includes('nome') && lowerCell.includes('musica')) ||
                (lowerCell.includes('nome') && lowerCell.includes('música'))) {
              columnIndices.musica = index;
            }
            // Detecção de música/título - só se não for a coluna de letra e não tiver sido detectado ainda
            else if (columnIndices.musica === undefined &&
                     columnIndices.letra !== index &&
                     (lowerCell.includes('música') || lowerCell.includes('musica') ||
                      lowerCell.includes('titulo') || lowerCell.includes('título') ||
                      lowerCell === 'nome' || lowerCell.includes('faixa') ||
                      lowerCell.includes('track') || lowerCell.includes('song'))) {
              columnIndices.musica = index;
            }

            // Detecção de artista
            if (lowerCell.includes('artista') || lowerCell.includes('intérprete') ||
                lowerCell.includes('interprete') || lowerCell.includes('cantor') ||
                lowerCell.includes('autor') || lowerCell.includes('banda') ||
                lowerCell.includes('artist')) {
              columnIndices.artista = index;
            }

            // Compositor
            if (lowerCell.includes('compositor') || lowerCell.includes('composer')) {
              columnIndices.compositor = index;
            }

            // Ano
            if (lowerCell.includes('ano') || lowerCell.includes('lançamento') ||
                lowerCell.includes('lancamento') || lowerCell.includes('year')) {
              columnIndices.ano = index;
            }

            // URL da fonte da letra
            if (lowerCell === 'url' || lowerCell === 'link' || 
                lowerCell.includes('fonte') || lowerCell.includes('source')) {
              columnIndices.url = index;
            }
          });

          if (columnIndices.musica !== undefined) {
            headerRowIndex = i;
            break;
          }
        }

        // Fase 2: Fallback Posicional (CRÍTICO)
        if (headerRowIndex === -1 || columnIndices.musica === undefined) {
          console.warn('[Parser] Cabeçalhos não identificados. Aplicando fallback posicional padrão.');

          const hasMultipleColumns = jsonData.length > 0 && jsonData[0].length >= 2;

          if (hasMultipleColumns) {
            if (columnIndices.artista === undefined) columnIndices.artista = 0;
            if (columnIndices.musica === undefined) columnIndices.musica = 1;

            console.log('[Parser] Fallback aplicado: Artista=Coluna A (0), Música=Coluna B (1)');
            headerRowIndex = 0;
          } else {
            columnIndices.musica = 0;
            console.log('[Parser] Detectado formato de coluna única (alternado)');
          }
        }

        console.log('[Parser] Detecção de cabeçalho:', {
          headerRowIndex,
          columnIndices,
          detectouMultiplasColunas: Object.keys(columnIndices).length > 1,
          musicaColuna: columnIndices.musica,
          artistaColuna: columnIndices.artista
        });

        const extractedData: ParsedMusic[] = [];

        const isAlternatingFormat = (
          headerRowIndex === -1 &&
          Object.keys(columnIndices).length <= 1
        );
        const startIndex = isAlternatingFormat ? 0 : headerRowIndex + 1;
        const dataColumnIndex = 0;

        if (isAlternatingFormat) {
          // FORMATO ALTERNADO: Linha 1 = Título, Linha 2 = Artista
          let pendingTitle: string | null = null;
          let pendingTitleRowIndex = -1;

          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            const cellValue = row[dataColumnIndex];
            const cleanedValue = cleanTitle(String(cellValue || ''));

            if (!cleanedValue || cleanedValue.length < 2) {
              continue;
            }

            if (pendingTitle === null) {
              pendingTitle = cleanedValue;
              pendingTitleRowIndex = i;
            } else {
              extractedData.push({
                id: `${file.name}-${pendingTitleRowIndex}`,
                titulo: pendingTitle,
                artista: cleanedValue,
                fonte: file.name
              });
              pendingTitle = null;
              pendingTitleRowIndex = -1;
            }
          }

          if (pendingTitle !== null) {
            extractedData.push({
              id: `${file.name}-${pendingTitleRowIndex}`,
              titulo: pendingTitle,
              artista: 'Não Identificado',
              fonte: file.name
            });
          }

        } else {
          // FORMATO TABULAR COM FILL DOWN
          console.log('[Parser] Iniciando extração robusta (formato tabular)...');
          console.log('[Parser] Colunas detectadas:', columnIndices);

          let lastValidArtist: string = 'Desconhecido';
          let lastValidComposer: string = '';
          let fillDownCount = 0;

          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];

            if (!row || row.length === 0) continue;

            const rawArtist = columnIndices.artista !== undefined ? row[columnIndices.artista] : undefined;
            const rawTitle = row[columnIndices.musica];
            const rawComposer = columnIndices.compositor !== undefined ? row[columnIndices.compositor] : undefined;
            const rawYear = columnIndices.ano !== undefined ? row[columnIndices.ano] : undefined;
            const rawLyrics = columnIndices.letra !== undefined ? row[columnIndices.letra] : undefined;
            const rawUrl = columnIndices.url !== undefined ? row[columnIndices.url] : undefined;

            const titleStr = String(rawTitle || '').trim();

            if (!titleStr) {
              continue;
            }

            const artistStr = String(rawArtist || '').trim();
            let effectiveArtist = '';

            if (artistStr.length > 0) {
              effectiveArtist = artistStr;
              lastValidArtist = artistStr;
            } else {
              effectiveArtist = lastValidArtist;
              fillDownCount++;
            }

            const composerStr = String(rawComposer || '').trim();
            let effectiveComposer = '';

            if (composerStr.length > 0) {
              effectiveComposer = composerStr;
              lastValidComposer = composerStr;
            } else {
              effectiveComposer = lastValidComposer;
            }

            extractedData.push({
              id: `${file.name}-${i}`,
              titulo: cleanTitle(titleStr),
              artista: effectiveArtist,
              compositor: effectiveComposer || undefined,
              ano: String(rawYear || '').trim() || undefined,
              letra: String(rawLyrics || '').trim() || undefined,
              lyricsUrl: String(rawUrl || '').trim() || undefined,
              fonte: file.name
            });
          }

          if (fillDownCount > 0) {
            console.log(`[Parser] Fill Down aplicado ${fillDownCount} vezes. Último artista: '${lastValidArtist}'`);
          } else {
            console.log('[Parser] Fill Down não foi necessário (artista presente em todas as linhas)');
          }
        }

        console.log('[Parser] Dados extraídos:', extractedData.length, 'músicas');
        console.log('[Parser] Primeiras 3 músicas:', extractedData.slice(0, 3));

        const uniqueTitles = new Set(extractedData.map(m => m.titulo.toLowerCase()));
        const diversityRatio = uniqueTitles.size / extractedData.length;

        if (diversityRatio < 0.5) {
          console.warn(`[Parser] ⚠️ ALERTA: Apenas ${uniqueTitles.size} títulos únicos de ${extractedData.length} linhas (${(diversityRatio * 100).toFixed(0)}%)`);
          console.warn('[Parser] Títulos detectados:', Array.from(uniqueTitles).slice(0, 5));
          console.warn('[Parser] Possível erro de mapeamento de colunas! Verifique se as colunas foram detectadas corretamente.');
        } else {
          console.log(`[Parser] ✓ Diversidade de títulos: ${(diversityRatio * 100).toFixed(0)}% (${uniqueTitles.size}/${extractedData.length})`);
        }

        console.log('[Parser] Retornando dados extraídos sem consolidação (deduplicação será feita no FileUpload)');

        const detectionConfidence: 'high' | 'low' =
          (headerRowIndex > -1 && columnIndices.musica !== undefined) ? 'high' : 'low';

        resolve({
          filename: file.name,
          totalRows: extractedData.length,
          extractedData: extractedData,
          columnsDetected: {
            musica: true,
            artista: isAlternatingFormat ? true : (columnIndices.artista !== undefined),
            compositor: isAlternatingFormat ? false : (columnIndices.compositor !== undefined),
            ano: isAlternatingFormat ? false : (columnIndices.ano !== undefined)
          },
          detectionConfidence
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcelRaw(file: File): Promise<RawParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          throw new Error("O arquivo parece estar vazio.");
        }

        let hasKnownHeader = false;
        if (jsonData.length > 0) {
          const firstRow = jsonData[0];
          firstRow.forEach((cell: any) => {
            if (typeof cell === 'string') {
              const lowerCell = cell.toLowerCase().trim();
              if (lowerCell.includes('música') || lowerCell.includes('titulo') ||
                  lowerCell.includes('artista') || lowerCell.includes('compositor')) {
                hasKnownHeader = true;
              }
            }
          });
        }

        resolve({
          filename: file.name,
          rawRows: jsonData.slice(0, 20),
          totalRows: jsonData.length,
          detectionConfidence: hasKnownHeader ? 'high' : 'low'
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export async function extractDataFromMap(file: File, map: ColumnMap): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        console.log('[Parser] Iniciando extração robusta (mapeamento manual)...');
        const extractedData: ParsedMusic[] = [];
        const startIndex = map.hasHeader ? 1 : 0;

        let lastValidArtist: string = 'Desconhecido';
        let lastValidComposer: string = '';

        for (let i = startIndex; i < jsonData.length; i++) {
          const row = jsonData[i];

          if (!row || row.length === 0) continue;

          const rawArtist = map.artistaIndex >= 0 ? row[map.artistaIndex] : undefined;
          const rawTitle = row[map.tituloIndex];
          const rawComposer = map.compositorIndex >= 0 ? row[map.compositorIndex] : undefined;
          const rawYear = map.anoIndex >= 0 ? row[map.anoIndex] : undefined;
          const rawLyrics = map.letraIndex >= 0 ? row[map.letraIndex] : undefined;

          const titleStr = String(rawTitle || '').trim();

          if (!titleStr) {
            continue;
          }

          const artistStr = String(rawArtist || '').trim();
          let effectiveArtist = '';

          if (artistStr.length > 0) {
            effectiveArtist = artistStr;
            lastValidArtist = artistStr;
          } else {
            effectiveArtist = lastValidArtist;
            console.log(`[Parser] Linha ${i}: Herdando artista '${effectiveArtist}'`);
          }

          const composerStr = String(rawComposer || '').trim();
          let effectiveComposer = '';

          if (composerStr.length > 0) {
            effectiveComposer = composerStr;
            lastValidComposer = composerStr;
          } else {
            effectiveComposer = lastValidComposer;
          }

          extractedData.push({
            id: `${file.name}-${i}`,
            titulo: cleanTitle(titleStr),
            artista: effectiveArtist,
            compositor: effectiveComposer || undefined,
            ano: String(rawYear || '').trim() || undefined,
            letra: String(rawLyrics || '').trim() || undefined,
            fonte: file.name
          });
        }

        console.log('[Parser] Fill Down (manual map) aplicado. Último artista:', lastValidArtist);
        console.log('[Parser] Dados extraídos após mapeamento:', extractedData.length, 'músicas');
        console.log('[Parser] Primeiras 3 músicas:', extractedData.slice(0, 3));

        const consolidatedData = consolidateDuplicates(extractedData);
        console.log('[Parser] Após consolidação:', consolidatedData.length, 'músicas únicas');

        resolve({
          filename: file.name,
          totalRows: consolidatedData.length,
          extractedData: consolidatedData,
          columnsDetected: {
            musica: true,
            artista: map.artistaIndex >= 0,
            compositor: map.compositorIndex >= 0,
            ano: map.anoIndex >= 0
          },
          detectionConfidence: 'high'
        });

      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
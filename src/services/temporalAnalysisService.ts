import { CorpusCompleto } from "@/data/types/full-text-corpus.types";

export interface TemporalDataPoint {
  ano: number;
  frequencia: number;
  frequenciaNormalizada: number;
  totalPalavras: number;
  ocorrencias: Array<{
    artista: string;
    musica: string;
    album: string;
  }>;
}

export interface TemporalAnalysis {
  palavra: string;
  dataPoints: TemporalDataPoint[];
  totalOcorrencias: number;
  anoInicio: number;
  anoFim: number;
  tendencia: 'crescente' | 'decrescente' | 'estável';
}

export function generateTemporalAnalysis(
  corpus: CorpusCompleto,
  palavras: string[]
): Map<string, TemporalAnalysis> {
  const analyses = new Map<string, TemporalAnalysis>();

  palavras.forEach(palavra => {
    const palavraLower = palavra.toLowerCase();
    const yearData = new Map<number, {
      count: number;
      totalWords: number;
      occurrences: Array<{ artista: string; musica: string; album: string }>;
    }>();

    // Processar cada música do corpus
    corpus.musicas.forEach(musica => {
      const anoStr = musica.metadata.ano;
      if (!anoStr) return;
      
      const ano = parseInt(anoStr);
      if (isNaN(ano)) return;

      // Contar ocorrências da palavra
      const count = musica.palavras.filter(p => p.toLowerCase() === palavraLower).length;
      
      if (count > 0) {
        if (!yearData.has(ano)) {
          yearData.set(ano, {
            count: 0,
            totalWords: 0,
            occurrences: []
          });
        }

        const data = yearData.get(ano)!;
        data.count += count;
        data.totalWords += musica.palavras.length;
        data.occurrences.push({
          artista: musica.metadata.artista,
          musica: musica.metadata.musica,
          album: musica.metadata.album
        });
      } else {
        // Adicionar anos sem ocorrência mas com dados
        if (!yearData.has(ano)) {
          yearData.set(ano, {
            count: 0,
            totalWords: musica.palavras.length,
            occurrences: []
          });
        } else {
          yearData.get(ano)!.totalWords += musica.palavras.length;
        }
      }
    });

    // Converter para array de data points
    const dataPoints: TemporalDataPoint[] = Array.from(yearData.entries())
      .map(([ano, data]) => ({
        ano,
        frequencia: data.count,
        frequenciaNormalizada: data.totalWords > 0 ? (data.count / data.totalWords) * 10000 : 0,
        totalPalavras: data.totalWords,
        ocorrencias: data.occurrences
      }))
      .sort((a, b) => a.ano - b.ano);

    if (dataPoints.length === 0) {
      analyses.set(palavra, {
        palavra,
        dataPoints: [],
        totalOcorrencias: 0,
        anoInicio: 0,
        anoFim: 0,
        tendencia: 'estável'
      });
      return;
    }

    // Calcular tendência
    const firstPoint = dataPoints[0].frequenciaNormalizada;
    const lastPoint = dataPoints[dataPoints.length - 1].frequenciaNormalizada;
    const diff = lastPoint - firstPoint;
    const percentChange = firstPoint > 0 ? (diff / firstPoint) * 100 : 0;

    let tendencia: 'crescente' | 'decrescente' | 'estável';
    if (percentChange > 20) tendencia = 'crescente';
    else if (percentChange < -20) tendencia = 'decrescente';
    else tendencia = 'estável';

    const totalOcorrencias = dataPoints.reduce((sum, dp) => sum + dp.frequencia, 0);

    analyses.set(palavra, {
      palavra,
      dataPoints,
      totalOcorrencias,
      anoInicio: dataPoints[0].ano,
      anoFim: dataPoints[dataPoints.length - 1].ano,
      tendencia
    });
  });

  return analyses;
}

export function exportTemporalAnalysisToCSV(analyses: Map<string, TemporalAnalysis>): string {
  const headers = ['Ano'];
  const palavras = Array.from(analyses.keys());
  
  palavras.forEach(palavra => {
    headers.push(`${palavra} (Freq)`, `${palavra} (Norm/10k)`);
  });

  // Coletar todos os anos únicos
  const allYears = new Set<number>();
  analyses.forEach(analysis => {
    analysis.dataPoints.forEach(dp => allYears.add(dp.ano));
  });

  const sortedYears = Array.from(allYears).sort((a, b) => a - b);

  const rows = [headers.join(',')];

  sortedYears.forEach(ano => {
    const row = [ano.toString()];
    
    palavras.forEach(palavra => {
      const analysis = analyses.get(palavra)!;
      const dataPoint = analysis.dataPoints.find(dp => dp.ano === ano);
      
      if (dataPoint) {
        row.push(dataPoint.frequencia.toString());
        row.push(dataPoint.frequenciaNormalizada.toFixed(2));
      } else {
        row.push('0');
        row.push('0.00');
      }
    });

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

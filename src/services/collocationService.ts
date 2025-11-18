import { CorpusCompleto, KWICContext } from "@/data/types/full-text-corpus.types";

export interface Collocation {
  palavra: string;
  frequencia: number;
  frequenciaTotal: number;
  score: number;
  posicaoRelativa: 'esquerda' | 'direita' | 'ambos';
  exemplos: string[];
}

/**
 * Count how many times a word appears in the entire corpus
 */
function countWordInCorpus(corpus: CorpusCompleto, palavra: string): number {
  let count = 0;
  const palavraLower = palavra.toLowerCase();
  
  corpus.musicas.forEach(musica => {
    musica.palavras.forEach(p => {
      if (p.toLowerCase() === palavraLower) {
        count++;
      }
    });
  });
  
  return count;
}

/**
 * Analyze collocations for a keyword in KWIC contexts
 * 
 * @param contexts - KWIC contexts
 * @param corpus - Full corpus for frequency calculations
 * @param janela - Collocation window size (default: 3 words)
 * @param minFreq - Minimum frequency to include (default: 3)
 * @returns Array of collocations sorted by MI score
 */
export function analyzeCollocations(
  contexts: KWICContext[],
  corpus: CorpusCompleto,
  janela: number = 3,
  minFreq: number = 3
): Collocation[] {
  if (contexts.length === 0) return [];

  // Map to store collocation candidates
  const colocadosCandidatos = new Map<string, {
    freq: number;
    posicoes: ('esquerda' | 'direita')[];
    exemplos: string[];
  }>();

  // Extract words within the collocation window
  contexts.forEach(ctx => {
    // Left context words
    const palavrasEsquerda = ctx.contextoEsquerdo
      .split(/\s+/)
      .filter(p => p.length > 0)
      .slice(-janela);
    
    palavrasEsquerda.forEach(palavra => {
      const palavraLower = palavra.toLowerCase();
      if (!colocadosCandidatos.has(palavraLower)) {
        colocadosCandidatos.set(palavraLower, { freq: 0, posicoes: [], exemplos: [] });
      }
      const entry = colocadosCandidatos.get(palavraLower)!;
      entry.freq++;
      entry.posicoes.push('esquerda');
      if (entry.exemplos.length < 3) {
        const exemplo = `${ctx.contextoEsquerdo} [${ctx.palavra}] ${ctx.contextoDireito}`;
        entry.exemplos.push(exemplo.substring(0, 100));
      }
    });

    // Right context words
    const palavrasDireita = ctx.contextoDireito
      .split(/\s+/)
      .filter(p => p.length > 0)
      .slice(0, janela);
    
    palavrasDireita.forEach(palavra => {
      const palavraLower = palavra.toLowerCase();
      if (!colocadosCandidatos.has(palavraLower)) {
        colocadosCandidatos.set(palavraLower, { freq: 0, posicoes: [], exemplos: [] });
      }
      const entry = colocadosCandidatos.get(palavraLower)!;
      entry.freq++;
      entry.posicoes.push('direita');
      if (entry.exemplos.length < 3) {
        const exemplo = `${ctx.contextoEsquerdo} [${ctx.palavra}] ${ctx.contextoDireito}`;
        entry.exemplos.push(exemplo.substring(0, 100));
      }
    });
  });

  // Calculate MI scores
  const totalPalavrasCorpus = corpus.totalPalavras;
  const freqPalavraChave = contexts.length;

  const colocacoes: Collocation[] = [];

  colocadosCandidatos.forEach((data, palavra) => {
    if (data.freq < minFreq) return;

    // Get total frequency of the word in corpus
    const freqTotal = countWordInCorpus(corpus, palavra);

    if (freqTotal === 0) return;

    // Calculate MI Score = log2((freq_colocacao * totalPalavras) / (freqPalavraChave * freqTotal))
    const miScore = Math.log2(
      (data.freq * totalPalavrasCorpus) / (freqPalavraChave * freqTotal)
    );

    // Determine position
    const hasLeft = data.posicoes.includes('esquerda');
    const hasRight = data.posicoes.includes('direita');
    const posicaoRelativa = hasLeft && hasRight ? 'ambos' : hasLeft ? 'esquerda' : 'direita';

    colocacoes.push({
      palavra,
      frequencia: data.freq,
      frequenciaTotal: freqTotal,
      score: miScore,
      posicaoRelativa,
      exemplos: data.exemplos
    });
  });

  // Sort by MI score (descending)
  return colocacoes.sort((a, b) => b.score - a.score);
}

/**
 * Export collocations to CSV format
 */
export function exportCollocationsToCSV(
  colocacoes: Collocation[],
  palavraChave: string
): string {
  const headers = ['Rank', 'Palavra', 'Frequência', 'MI Score', 'Posição', 'Exemplo'];
  const rows = colocacoes.map((col, idx) => [
    idx + 1,
    col.palavra,
    col.frequencia,
    col.score.toFixed(2),
    col.posicaoRelativa,
    `"${col.exemplos[0] || ''}"`
  ]);

  const csv = [
    `# Análise de Colocações para: ${palavraChave}`,
    `# Total de colocações: ${colocacoes.length}`,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

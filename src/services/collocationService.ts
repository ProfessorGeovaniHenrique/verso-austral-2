import { KWICContext } from "@/data/types/full-text-corpus.types";
import { CorpusCompleto } from "@/data/types/full-text-corpus.types";

export interface Collocation {
  palavra: string;
  frequencia: number;              // Vezes que aparece perto da palavra-chave
  frequenciaTotal: number;         // Vezes que aparece no corpus
  score: number;                   // MI Score
  posicaoRelativa: 'esquerda' | 'direita' | 'ambos';
  exemplos: string[];              // Até 3 exemplos de uso
}

/**
 * Conta frequência total de uma palavra no corpus
 */
function countWordInCorpus(corpus: CorpusCompleto, palavra: string): number {
  const palavraNormalizada = palavra.toLowerCase().trim();
  let count = 0;
  
  corpus.musicas.forEach(musica => {
    musica.palavras.forEach(p => {
      if (p === palavraNormalizada) count++;
    });
  });
  
  return count;
}

/**
 * Analisa colocações (palavras que aparecem frequentemente próximas à palavra-chave)
 * usando MI Score (Mutual Information)
 */
export function analyzeCollocations(
  contexts: KWICContext[],
  corpus: CorpusCompleto,
  janela: number = 3,
  minFreq: number = 3
): Collocation[] {
  if (contexts.length === 0) return [];
  
  console.log(`🔗 Analisando colocações com janela de ${janela} palavras (min freq: ${minFreq})`);
  
  // 1. Extrair todas as palavras na janela colocacional
  const colocadosCandidatos = new Map<string, {
    freq: number,
    posicoes: ('esquerda' | 'direita')[],
    exemplos: string[]
  }>();

  contexts.forEach(ctx => {
    // Palavras à esquerda
    const palavrasEsquerda = ctx.contextoEsquerdo
      .toLowerCase()
      .split(/\s+/)
      .filter(p => p.length > 0)
      .slice(-janela);
    
    palavrasEsquerda.forEach(p => {
      if (!colocadosCandidatos.has(p)) {
        colocadosCandidatos.set(p, { freq: 0, posicoes: [], exemplos: [] });
      }
      const entry = colocadosCandidatos.get(p)!;
      entry.freq++;
      entry.posicoes.push('esquerda');
      if (entry.exemplos.length < 3) {
        entry.exemplos.push(`${ctx.contextoEsquerdo} [${ctx.palavra}] ${ctx.contextoDireito}`);
      }
    });

    // Palavras à direita
    const palavrasDireita = ctx.contextoDireito
      .toLowerCase()
      .split(/\s+/)
      .filter(p => p.length > 0)
      .slice(0, janela);
    
    palavrasDireita.forEach(p => {
      if (!colocadosCandidatos.has(p)) {
        colocadosCandidatos.set(p, { freq: 0, posicoes: [], exemplos: [] });
      }
      const entry = colocadosCandidatos.get(p)!;
      entry.freq++;
      entry.posicoes.push('direita');
      if (entry.exemplos.length < 3) {
        entry.exemplos.push(`${ctx.contextoEsquerdo} [${ctx.palavra}] ${ctx.contextoDireito}`);
      }
    });
  });

  // 2. Calcular MI Score para cada colocado
  const totalPalavrasCorpus = corpus.totalPalavras;
  const freqPalavraChave = contexts.length;

  const colocacoes: Collocation[] = [];

  colocadosCandidatos.forEach((data, palavra) => {
    if (data.freq < minFreq) return;

    // Calcular frequência total da palavra no corpus
    const freqTotal = countWordInCorpus(corpus, palavra);
    
    if (freqTotal === 0) return;

    // MI Score = log2((freq_colocacao * totalPalavras) / (freqPalavraChave * freqTotal))
    const miScore = Math.log2(
      (data.freq * totalPalavrasCorpus) / (freqPalavraChave * freqTotal)
    );

    // Determinar posição relativa
    const posEsquerda = data.posicoes.filter(p => p === 'esquerda').length;
    const posDireita = data.posicoes.filter(p => p === 'direita').length;
    
    let posicaoRelativa: 'esquerda' | 'direita' | 'ambos';
    if (posEsquerda > 0 && posDireita > 0) {
      posicaoRelativa = 'ambos';
    } else if (posEsquerda > 0) {
      posicaoRelativa = 'esquerda';
    } else {
      posicaoRelativa = 'direita';
    }

    colocacoes.push({
      palavra,
      frequencia: data.freq,
      frequenciaTotal: freqTotal,
      score: miScore,
      posicaoRelativa,
      exemplos: data.exemplos.slice(0, 3)
    });
  });

  // 3. Ordenar por score (MI) descendente
  const sorted = colocacoes.sort((a, b) => b.score - a.score);
  
  console.log(`  ✓ ${sorted.length} colocações encontradas`);
  if (sorted.length > 0) {
    console.log(`  ✓ Top 3: ${sorted.slice(0, 3).map(c => `${c.palavra} (${c.score.toFixed(2)})`).join(', ')}`);
  }
  
  return sorted;
}

/**
 * Exporta colocações para CSV
 */
export function exportCollocationsToCSV(colocacoes: Collocation[], palavraChave: string): string {
  const header = 'Rank,Palavra,Frequência na Janela,Frequência Total,MI Score,Posição Relativa,Exemplo\n';
  
  const rows = colocacoes.map((col, idx) => {
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    
    return [
      idx + 1,
      escapeCsv(col.palavra),
      col.frequencia,
      col.frequenciaTotal,
      col.score.toFixed(4),
      escapeCsv(col.posicaoRelativa),
      escapeCsv(col.exemplos[0] || '')
    ].join(',');
  });
  
  return header + rows.join('\n');
}

import type { CorpusType, CorpusWord } from '@/data/types/corpus-tools.types';
import { parseTSVCorpus } from '@/lib/corpusParser';
import { loadFullTextCorpus } from '@/lib/fullTextParser';

export async function loadAndParseCorpus(
  corpusId: CorpusType,
  artist?: string
): Promise<{ parsedCorpus: CorpusWord[]; fullCorpus?: any; wordFreqMap?: Map<string, number> }> {
  if (artist) {
    // Subcorpus por artista
    const fullCorpus = await loadFullTextCorpus(corpusId);
    const artistSongs = fullCorpus.musicas.filter(m => m.metadata.artista === artist);
    
    if (artistSongs.length === 0) {
      throw new Error(`Nenhuma música encontrada para o artista ${artist}`);
    }
    
    const wordFreqMap = new Map<string, number>();
    artistSongs.forEach(song => {
      song.palavras.forEach(word => {
        const cleaned = word.toLowerCase();
        if (cleaned) {
          wordFreqMap.set(cleaned, (wordFreqMap.get(cleaned) || 0) + 1);
        }
      });
    });
    
    const totalWords = Array.from(wordFreqMap.values()).reduce((a, b) => a + b, 0);
    
    const parsedCorpus = Array.from(wordFreqMap.entries())
      .map(([word, freq], index) => ({
        headword: word,
        freq,
        rank: index + 1,
        range: 0,
        normFreq: (freq / totalWords) * 1000000,
        normRange: 0
      }))
      .sort((a, b) => b.freq - a.freq);
    
    return { parsedCorpus, fullCorpus, wordFreqMap };
  } else {
    // Corpus completo
    const path = getCorpusPath(corpusId);
    const response = await fetch(path);
    const text = await response.text();
    const parsedCorpus = parseTSVCorpus(text);
    
    return { parsedCorpus };
  }
}

function getCorpusPath(corpus: CorpusType): string {
  const paths: Partial<Record<CorpusType, string>> = {
    'gaucho': '/corpus/corpus-gaucho.tsv',
    'nordestino': '/corpus/corpus-nordestino.tsv',
  };
  return paths[corpus] || '/corpus/corpus-gaucho.tsv';
}

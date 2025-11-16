import { CorpusWord } from "@/data/types/corpus-tools.types";

/**
 * Parse CSV corpus file with format:
 * type,pos,headword,freq,range
 */
export function parseTSVCorpus(tsvContent: string): CorpusWord[] {
  const lines = tsvContent.split('\n').slice(1); // Skip header
  
  return lines
    .filter(line => line.trim())
    .map((line, index) => {
      const columns = line.split(',');
      
      // CSV format: type, pos, headword, freq, range
      const headword = columns[2]?.trim() || '';
      const rank = index + 1; // Use line number as rank
      const freq = parseInt(columns[3]) || 0;
      const range = parseInt(columns[4]) || 0;
      
      return {
        headword,
        rank,
        freq,
        range,
        normFreq: 0, // Will be calculated dynamically
        normRange: 0 // Will be calculated dynamically
      };
    })
    .filter(word => word.headword && word.freq > 0); // Filter out invalid entries
}

/**
 * Calculate total tokens from corpus
 */
export function calculateTotalTokens(corpus: CorpusWord[]): number {
  return corpus.reduce((total, word) => total + word.freq, 0);
}

import { CorpusWord } from "@/data/types/corpus-tools.types";

/**
 * Parse CSV corpus file with format:
 * type,pos,headword,freq,range
 */
export function parseTSVCorpus(tsvContent: string): CorpusWord[] {
  const lines = tsvContent.split('\n').slice(1); // Skip header
  
  console.log(`🔍 Parsing TSV - Total lines (excluding header): ${lines.length}`);
  
  const parsed = lines
    .filter(line => line.trim())
    .map((line, index) => {
      const columns = line.split(',');
      
      let headword: string;
      let freq: number;
      let range: number;
      
      // Auto-detect format based on number of columns
      if (columns.length >= 5) {
        // Format: type,pos,headword,freq,range
        headword = columns[2]?.trim() || '';
        freq = parseInt(columns[3]) || 0;
        range = parseInt(columns[4]) || 0;
      } else if (columns.length === 3) {
        // Format: headword,freq,range
        headword = columns[0]?.trim() || '';
        freq = parseInt(columns[1]) || 0;
        range = parseInt(columns[2]) || 0;
      } else {
        // Fallback: assume simple format
        headword = columns[0]?.trim() || '';
        freq = parseInt(columns[1]) || 0;
        range = parseInt(columns[2]) || 0;
      }
      
      const rank = index + 1;
      
      return {
        headword,
        rank,
        freq,
        range,
        normFreq: 0, // Will be calculated dynamically
        normRange: 0 // Will be calculated dynamically
      };
    })
    .filter(word => {
      const isValid = word.headword && word.freq > 0;
      if (!isValid && word.headword) {
        console.log(`⚠️ Filtered out: ${word.headword} (freq: ${word.freq})`);
      }
      return isValid;
    });
  
  console.log(`✅ Parsed corpus: ${parsed.length} valid words`);
  return parsed;
}

/**
 * Calculate total tokens from corpus
 */
export function calculateTotalTokens(corpus: CorpusWord[]): number {
  return corpus.reduce((total, word) => total + word.freq, 0);
}

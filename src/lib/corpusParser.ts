import { CorpusWord } from "@/data/types/corpus-tools.types";

/**
 * Parse CSV corpus file with format:
 * type,pos,headword,freq,range
 */
export function parseTSVCorpus(tsvContent: string): CorpusWord[] {
  const lines = tsvContent.split('\n').slice(1); // Skip header
  
  console.log(`🔍 Parsing TSV - Total lines (excluding header): ${lines.length}`);
  console.log(`📄 First 3 raw lines:`, lines.slice(0, 3));
  
  const parsed = lines
    .filter(line => line.trim())
    .map((line, index) => {
      // Log primeiras 5 linhas para ver formato exato
      if (index < 5) {
        console.log(`🔬 Line ${index}:`, JSON.stringify(line));
      }
      
      // Remove numerical prefixes (e.g., "4: 2: a,,,183538,49032" → "a,,,183538,49032")
      let cleanedLine = line;
      const prefixPattern = /^(\d+:\s*)+/;
      if (prefixPattern.test(line)) {
        cleanedLine = line.replace(prefixPattern, '').trim();
        
        if (index < 5) {
          console.log(`✂️ After cleaning:`, JSON.stringify(cleanedLine));
        }
      }
      
      const columns = cleanedLine.split(',');
      
      if (index < 5) {
        console.log(`📊 Columns (${columns.length}):`, columns);
      }
      
      let headword: string;
      let freq: number;
      let range: number;
      
      // Auto-detect format based on number of columns
      if (columns.length >= 5) {
        // Detect if format is "headword,,,freq,range" or "type,pos,headword,freq,range"
        if (columns[1] === '' && columns[2] === '') {
          // Format: headword,,,freq,range (middle columns empty)
          headword = columns[0]?.trim() || '';
          freq = parseInt(columns[3]) || 0;
          range = parseInt(columns[4]?.replace(/\r$/, '')) || 0;
        } else {
          // Format AntConc: type,pos,headword,freq,range
          headword = columns[2]?.trim() || '';
          freq = parseInt(columns[3]) || 0;
          range = parseInt(columns[4]?.replace(/\r$/, '')) || 0;
        }
      } else if (columns.length === 3) {
        // Format: headword,freq,range
        headword = columns[0]?.trim() || '';
        freq = parseInt(columns[1]) || 0;
        range = parseInt(columns[2]?.replace(/\r$/, '')) || 0;
      } else {
        // Fallback: assume simple format
        headword = columns[0]?.trim() || '';
        freq = parseInt(columns[1]) || 0;
        range = parseInt(columns[2]?.replace(/\r$/, '')) || 0;
      }
      
      if (index < 5) {
        console.log(`✅ Parsed: headword="${headword}", freq=${freq}, range=${range}`);
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
  console.log(`📊 First 3 valid words:`, parsed.slice(0, 3));
  
  return parsed;
}

/**
 * Calculate total tokens from corpus
 */
export function calculateTotalTokens(corpus: CorpusWord[]): number {
  return corpus.reduce((total, word) => total + word.freq, 0);
}

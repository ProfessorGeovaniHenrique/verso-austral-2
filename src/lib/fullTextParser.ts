import { CorpusCompleto, SongEntry, SongMetadata } from "@/data/types/full-text-corpus.types";
import { CorpusType } from "@/data/types/corpus-tools.types";

/**
 * Parse full-text corpus in the format:
 * Artista - Álbum
 * Nome_Música_Ano
 * Letra...
 * ---------------
 */
export function parseFullTextCorpus(
  textContent: string, 
  tipo: CorpusType
): CorpusCompleto {
  const musicas: SongEntry[] = [];
  
  // Split by separator
  const blocos = textContent
    .split(/[-]{10,}/)
    .map(b => b.trim())
    .filter(b => b.length > 0);
  
  console.log(`📚 Parsing ${tipo} corpus: ${blocos.length} blocos encontrados`);
  
  let posicaoGlobal = 0;
  
  blocos.forEach((bloco, index) => {
    const linhas = bloco.split('\n').filter(l => l.trim());
    
    if (linhas.length < 2) {
      console.warn(`⚠️ Bloco ${index} muito curto, pulando...`);
      return;
    }
    
    let artista: string;
    let compositor: string | undefined;
    let album: string;
    let musica: string;
    let ano: string | undefined;
    let letrasLinhas: string[];
    let isNordestinoFormat = false;
    
    // Detect format: Nordestino (title only) vs Gaúcho (artist - album)
    const firstLine = linhas[0];
    const secondLine = linhas[1] || '';
    
    // Check if it's Nordestino format: no artist separator, title-like first line
    if (!firstLine.includes(' - ') && !firstLine.includes('(Compositor:')) {
      // Nordestino format detected: Title_Year\nLyrics...
      isNordestinoFormat = true;
      
      const tituloAnoParts = firstLine.split('_');
      musica = tituloAnoParts[0]?.trim() || 'Sem título';
      ano = tituloAnoParts[1]?.trim() || undefined;
      
      artista = 'Desconhecido'; // Mark for AI enrichment
      compositor = undefined;
      album = '';
      letrasLinhas = linhas.slice(1); // Lyrics start from second line
      
      if (index < 3) {
        console.log(`🎭 Nordestino: ${musica} (${ano || 'sem ano'})`);
      }
    } else {
      // Gaúcho format: "Artista (Compositor: Nome) - Album"
      const [artistaAlbum, tituloAno, ...resto] = linhas;
      
      // Extract artist, composer, and album
      const compositorMatch = artistaAlbum.match(/\(Compositor:\s*([^)]+)\)/);
      compositor = compositorMatch ? compositorMatch[1].trim() : undefined;
      
      const artistaAlbumClean = artistaAlbum.replace(/\s*\(Compositor:[^)]+\)\s*/, '');
      const artistaAlbumParts = artistaAlbumClean.split(' - ');
      artista = artistaAlbumParts[0]?.trim() || 'Desconhecido';
      album = artistaAlbumParts[1]?.trim() || '';
      
      // Extract title and year
      const tituloAnoParts = tituloAno.split('_');
      musica = tituloAnoParts[0]?.trim() || 'Sem título';
      ano = tituloAnoParts[1]?.trim() || undefined;
      
      letrasLinhas = resto;
    }
    
    const metadata: SongMetadata = {
      artista,
      compositor,
      album,
      musica,
      ano,
      fonte: compositor ? 'manual' : 'original'
    };
    
    // Process lyrics
    const letra = letrasLinhas.join('\n');
    
    // Tokenize words (preserve accents, remove punctuation)
    const palavras = letra
      .toLowerCase()
      .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length > 0);
    
    if (palavras.length === 0) {
      console.warn(`⚠️ Música sem palavras: ${musica}`);
      return;
    }
    
    musicas.push({
      metadata,
      letra,
      linhas: letrasLinhas,
      palavras,
      posicaoNoCorpus: posicaoGlobal
    });
    
    posicaoGlobal += palavras.length;
    
    if (index < 3) {
      console.log(`✅ Música ${index + 1}: ${artista} - ${musica} (${palavras.length} palavras)`);
    }
  });
  
  console.log(`📊 Total: ${musicas.length} músicas, ${posicaoGlobal} palavras`);
  
  return {
    tipo,
    totalMusicas: musicas.length,
    totalPalavras: posicaoGlobal,
    musicas
  };
}

/**
 * Load and parse multiple corpus files with optional filters
 */
export async function loadFullTextCorpus(
  tipo: CorpusType,
  filters?: {
    artistas?: string[];
    albuns?: string[];
    anoInicio?: number;
    anoFim?: number;
  }
): Promise<CorpusCompleto> {
  const paths = tipo === 'gaucho' 
    ? ['/src/data/corpus/full-text/gaucho-completo.txt']
    : tipo === 'nordestino'
    ? [
        '/src/data/corpus/full-text/nordestino-parte-01.txt',
        '/src/data/corpus/full-text/nordestino-parte-02.txt',
        '/src/data/corpus/full-text/nordestino-parte-03.txt'
      ]
    : ['/src/data/corpus/corpus-luiz-marenco-verso.txt']; // marenco-verso
  
  console.log(`📂 Carregando corpus ${tipo}...`);
  
  const responses = await Promise.all(paths.map(p => fetch(p)));
  const texts = await Promise.all(responses.map(r => r.text()));
  const fullText = texts.join('\n---------------\n');
  
  const corpus = parseFullTextCorpus(fullText, tipo);
  
  // Apply filters if provided
  if (filters) {
    const filteredMusicas = corpus.musicas.filter(musica => {
      if (filters.artistas && filters.artistas.length > 0 && !filters.artistas.includes(musica.metadata.artista)) {
        return false;
      }
      if (filters.albuns && filters.albuns.length > 0 && !filters.albuns.includes(musica.metadata.album)) {
        return false;
      }
      if (filters.anoInicio && musica.metadata.ano && parseInt(musica.metadata.ano) < filters.anoInicio) {
        return false;
      }
      if (filters.anoFim && musica.metadata.ano && parseInt(musica.metadata.ano) > filters.anoFim) {
        return false;
      }
      return true;
    });
    
    return {
      ...corpus,
      musicas: filteredMusicas,
      totalMusicas: filteredMusicas.length,
      totalPalavras: filteredMusicas.reduce((sum, m) => sum + m.palavras.length, 0)
    };
  }
  
  return corpus;
}

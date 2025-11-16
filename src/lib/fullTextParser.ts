import { CorpusCompleto, SongEntry, SongMetadata } from "@/data/types/full-text-corpus.types";

/**
 * Parse full-text corpus in the format:
 * Artista - Álbum
 * Nome_Música_Ano
 * Letra...
 * ---------------
 */
export function parseFullTextCorpus(
  textContent: string, 
  tipo: 'gaucho' | 'nordestino'
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
    
    if (linhas.length < 3) {
      console.warn(`⚠️ Bloco ${index} muito curto, pulando...`);
      return;
    }
    
    // Parse metadata (first two lines)
    const [artistaAlbum, tituloAno, ...letrasLinhas] = linhas;
    
    // Extract artist and album
    const artistaAlbumParts = artistaAlbum.split(' - ');
    const artista = artistaAlbumParts[0]?.trim() || 'Desconhecido';
    const album = artistaAlbumParts[1]?.trim() || '';
    
    // Extract title and year
    const tituloAnoParts = tituloAno.split('_');
    const musica = tituloAnoParts[0]?.trim() || 'Sem título';
    const ano = tituloAnoParts[1]?.trim() || undefined;
    
    const metadata: SongMetadata = {
      artista,
      album,
      musica,
      ano
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
  tipo: 'gaucho' | 'nordestino',
  filters?: {
    artistas?: string[];
    albuns?: string[];
    anoInicio?: number;
    anoFim?: number;
  }
): Promise<CorpusCompleto> {
  const paths = tipo === 'gaucho' 
    ? ['/src/data/corpus/full-text/gaucho-completo.txt']
    : [
        '/src/data/corpus/full-text/nordestino-parte-01.txt',
        '/src/data/corpus/full-text/nordestino-parte-02.txt',
        '/src/data/corpus/full-text/nordestino-parte-03.txt'
      ];
  
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

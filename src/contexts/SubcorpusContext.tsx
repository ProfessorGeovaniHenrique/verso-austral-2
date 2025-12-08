import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { CorpusCompleto, SongEntry } from '@/data/types/full-text-corpus.types';
import { SubcorpusMetadata } from '@/data/types/subcorpus.types';
import { supabase } from '@/integrations/supabase/client';
import { loadCorpusInChunks } from '@/services/corpusChunkService';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('SubcorpusContext');

export type SubcorpusMode = 'complete' | 'single' | 'compare';

export interface SubcorpusSelection {
  mode: SubcorpusMode;
  corpusBase: CorpusType;
  artistaA: string | null;
  artistaB: string | null;
}

interface SubcorpusContextType {
  selection: SubcorpusSelection;
  setSelection: (selection: SubcorpusSelection) => void;
  
  // Corpus filtrado pronto para uso
  getFilteredCorpus: () => Promise<CorpusCompleto>;
  loadedCorpus: CorpusCompleto | null;
  
  // NOVO UC-3: Injeção direta de corpus (para corpus do usuário)
  setLoadedCorpusDirectly: (corpus: CorpusCompleto | null) => void;
  
  // Metadados do subcorpus atual
  currentMetadata: SubcorpusMetadata | null;
  
  // Lista de artistas disponíveis
  availableArtists: string[];
  
  // Lista de metadados de todos os subcorpora
  subcorpora: SubcorpusMetadata[];
  
  isLoading: boolean;
  
  // NOVO R-1.2: Flag indicando que availableCorpora está carregado
  isReady: boolean;
  
  // NOVO: Seleção para Ferramentas Estilísticas
  stylisticSelection: any | null;
  setStylisticSelection: (selection: any | null) => void;
  
  // NOVO: Job de anotação ativo
  activeAnnotationJobId: string | null;
  setActiveAnnotationJobId: (jobId: string | null) => void;
}

const SubcorpusContext = createContext<SubcorpusContextType | undefined>(undefined);

// Carregar seleção salva do localStorage com validação robusta
const loadSavedSelection = (availableArtists: string[]): SubcorpusSelection | null => {
  try {
    const saved = localStorage.getItem('subcorpus-selection');
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    
    // Validação de estrutura básica
    if (!parsed.corpusBase || !parsed.mode) {
      console.warn('Seleção salva inválida: faltando campos obrigatórios');
      localStorage.removeItem('subcorpus-selection');
      return null;
    }
    
    // Validar corpus base
    if (!['gaucho', 'nordestino'].includes(parsed.corpusBase)) {
      console.warn('Seleção salva inválida: corpus base desconhecido');
      localStorage.removeItem('subcorpus-selection');
      return null;
    }
    
    // Validar modo
    if (!['complete', 'single', 'compare'].includes(parsed.mode)) {
      console.warn('Seleção salva inválida: modo desconhecido');
      parsed.mode = 'complete';
    }
    
    // Se artista selecionado não existe mais, limpar seleção
    if (parsed.artistaA && !availableArtists.includes(parsed.artistaA)) {
      console.warn(`Artista ${parsed.artistaA} não existe mais, limpando seleção`);
      parsed.artistaA = null;
      parsed.mode = 'complete';
    }
    
    if (parsed.artistaB && !availableArtists.includes(parsed.artistaB)) {
      console.warn(`Artista ${parsed.artistaB} não existe mais, limpando`);
      parsed.artistaB = null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Erro ao carregar seleção salva:', error);
    localStorage.removeItem('subcorpus-selection');
  }
  return null;
};

export function SubcorpusProvider({ children }: { children: ReactNode }) {
  // Estado de seleção inicial
  const [selection, setSelectionState] = useState<SubcorpusSelection>({
    mode: 'complete',
    corpusBase: 'gaucho',
    artistaA: null,
    artistaB: null
  });
  
  // Estados de loading e corpus
  const [isLoading, setIsLoading] = useState(false);
  const [fullCorpus, setFullCorpus] = useState<CorpusCompleto | null>(null);
  const [lastLoadedCorpus, setLastLoadedCorpus] = useState<CorpusCompleto | null>(null); // NOVO: armazena resultado de getFilteredCorpus
  const [subcorpora, setSubcorpora] = useState<SubcorpusMetadata[]>([]);
  const [availableCorpora, setAvailableCorpora] = useState<Array<{ id: string; name: string; normalized_name: string }>>([]);
  
  // Estado de progresso para carregamento de corpus completo
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number; percentage: number }>({ loaded: 0, total: 0, percentage: 0 });
  
  // NOVO: Seleção para ferramentas estilísticas (persistido em localStorage)
  const [stylisticSelection, setStylisticSelectionState] = useState<any | null>(null);
  const [activeAnnotationJobId, setActiveAnnotationJobIdState] = useState<string | null>(null);
  
  // Salvar seleção no localStorage quando mudar
  const setSelection = useCallback((newSelection: SubcorpusSelection) => {
    setSelectionState(newSelection);
    try {
      localStorage.setItem('subcorpus-selection', JSON.stringify(newSelection));
    } catch (error) {
      console.error('Erro ao salvar seleção:', error);
    }
  }, []);
  
  // NOVO: Salvar seleção estilística no localStorage
  const setStylisticSelection = useCallback((newSelection: any | null) => {
    setStylisticSelectionState(newSelection);
    try {
      if (newSelection) {
        localStorage.setItem('stylistic-selection', JSON.stringify(newSelection));
      } else {
        localStorage.removeItem('stylistic-selection');
      }
    } catch (error) {
      console.error('Erro ao salvar seleção estilística:', error);
    }
  }, []);
  
  // NOVO: Salvar job ativo no localStorage
  const setActiveAnnotationJobId = useCallback((jobId: string | null) => {
    setActiveAnnotationJobIdState(jobId);
    try {
      if (jobId) {
        localStorage.setItem('active-annotation-job-id', jobId);
      } else {
        localStorage.removeItem('active-annotation-job-id');
      }
    } catch (error) {
      console.error('Erro ao salvar job ativo:', error);
    }
  }, []);
  
  // NOVO UC-3: Injeção direta de corpus (para corpus do usuário convertido)
  const setLoadedCorpusDirectly = useCallback((corpus: CorpusCompleto | null) => {
    log.info('Setting loaded corpus directly', { 
      hasCorpus: !!corpus, 
      totalMusicas: corpus?.totalMusicas || 0 
    });
    setLastLoadedCorpus(corpus);
  }, []);
  
  // Carregar corpora disponíveis ao montar
  useEffect(() => {
    const loadAvailableCorpora = async () => {
      try {
        const { data: corpora, error } = await supabase
          .from('corpora')
          .select('id, name, normalized_name')
          .order('name');
        
        if (error) throw error;
        setAvailableCorpora(corpora || []);
        log.info('Available corpora loaded', { count: corpora?.length });
      } catch (error) {
        log.error('Failed to load available corpora', error as Error);
      }
    };
    
    loadAvailableCorpora();
    
    // NOVO: Restaurar seleção estilística e job ativo do localStorage
    try {
      const savedStylistic = localStorage.getItem('stylistic-selection');
      if (savedStylistic) {
        setStylisticSelectionState(JSON.parse(savedStylistic));
        log.info('Stylistic selection restored from localStorage');
      }
      
      const savedJobId = localStorage.getItem('active-annotation-job-id');
      if (savedJobId) {
        setActiveAnnotationJobIdState(savedJobId);
        log.info('Active annotation job restored', { jobId: savedJobId });
      }
    } catch (error) {
      console.error('Erro ao restaurar estados:', error);
    }
  }, []);
  
  // Carregar artistas quando corpus base mudar
  useEffect(() => {
    const loadArtists = async () => {
      try {
        setIsLoading(true);
        
        // Buscar corpus_id pelo normalized_name
        const corpus = availableCorpora.find(c => c.normalized_name === selection.corpusBase);
        if (!corpus) {
          log.warn('Corpus not found', { corpusBase: selection.corpusBase });
          return;
        }
        
        // Carregar artistas do corpus
        const { data: artists, error } = await supabase
          .from('artists')
          .select('id, name')
          .eq('corpus_id', corpus.id)
          .order('name');
        
        if (error) throw error;
        
        // Criar metadados básicos (sem contar músicas ainda)
        const metadata: SubcorpusMetadata[] = (artists || []).map(artist => ({
          id: artist.id,
          artista: artist.name,
          totalMusicas: 0, // Será carregado sob demanda
          totalPalavras: 0,
          totalPalavrasUnicas: 0,
          riquezaLexical: 0,
          albums: []
        }));
        
        setSubcorpora(metadata);
        
        // Restaurar seleção salva se aplicável
        const artistNames = metadata.map(m => m.artista);
        const savedSelection = loadSavedSelection(artistNames);
        if (savedSelection && savedSelection.corpusBase === selection.corpusBase) {
          setSelectionState(savedSelection);
          log.info('Saved selection restored', { 
            mode: savedSelection.mode, 
            corpusBase: savedSelection.corpusBase 
          });
        }
        
        log.info('Artists loaded', { corpusBase: selection.corpusBase, count: artists?.length });
      } catch (error) {
        log.error('Failed to load artists', error as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (availableCorpora.length > 0) {
      loadArtists();
    }
  }, [selection.corpusBase, availableCorpora]);
  
  // Lista de artistas disponíveis
  const availableArtists = useMemo(() => {
    return subcorpora.map(s => s.artista).sort();
  }, [subcorpora]);
  
  // Metadados do subcorpus atual
  const currentMetadata = useMemo(() => {
    if (selection.mode !== 'single' || !selection.artistaA) {
      return null;
    }
    return subcorpora.find(s => s.artista === selection.artistaA) || null;
  }, [selection, subcorpora]);
  
  // Função para obter corpus filtrado
  const getFilteredCorpus = useCallback(async (): Promise<CorpusCompleto> => {
    // Buscar corpus_id
    const corpus = availableCorpora.find(c => c.normalized_name === selection.corpusBase);
    if (!corpus) {
      throw new Error('Corpus não encontrado');
    }
    
    // Modo completo: carregar corpus inteiro em chunks
    if (selection.mode === 'complete') {
      if (fullCorpus) {
        setLastLoadedCorpus(fullCorpus);
        return fullCorpus;
      }
      
      log.info('Loading full corpus in chunks', { corpusBase: selection.corpusBase });
      
      const loadedCorpus = await loadCorpusInChunks(
        corpus.id,
        selection.corpusBase,
        {
          chunkSize: 1000,
          onProgress: (loaded, total, percentage) => {
            setLoadProgress({ loaded, total, percentage });
            log.info('Loading progress', { loaded, total, percentage });
          }
        }
      );
      
      setFullCorpus(loadedCorpus);
      setLastLoadedCorpus(loadedCorpus);
      return loadedCorpus;
    }
    
    // Modo single: carregar apenas músicas do artista selecionado
    if (selection.mode === 'single' && selection.artistaA) {
      log.info('Loading songs for artist', { artist: selection.artistaA });
      
      const { data: songs, error } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          lyrics,
          release_year,
          enrichment_source,
          artists!inner (
            id,
            name
          )
        `)
        .eq('artists.name', selection.artistaA)
        .eq('artists.corpus_id', corpus.id)
        .not('lyrics', 'is', null);
      
      if (error) throw error;
      
      const songEntries: SongEntry[] = [];
      let posicaoGlobal = 0;
      
      for (const song of songs || []) {
        if (!song.lyrics || !song.artists) continue;
        
        const letra = song.lyrics.trim();
        const linhas = letra.split('\n').filter(l => l.trim());
        const palavras = letra
          .toLowerCase()
          .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s]/g, ' ')
          .split(/\s+/)
          .filter(p => p.length > 0);
        
        if (palavras.length === 0) continue;
        
        songEntries.push({
          metadata: {
            artista: song.artists.name,
            compositor: undefined,
            album: '',
            musica: song.title,
            ano: song.release_year || undefined,
            fonte: (song.enrichment_source as any) || 'manual'
          },
          letra,
          linhas,
          palavras,
          posicaoNoCorpus: posicaoGlobal
        });
        
        posicaoGlobal += palavras.length;
      }
      
      const totalPalavras = songEntries.reduce((sum, s) => sum + s.palavras.length, 0);
      
      const singleCorpus: CorpusCompleto = {
        tipo: selection.corpusBase,
        totalMusicas: songEntries.length,
        totalPalavras,
        musicas: songEntries
      };
      
      setLastLoadedCorpus(singleCorpus); // NOVO: armazena resultado do modo single
      return singleCorpus;
    }
    
    // Modo compare: carregar dois artistas para comparação
    if (selection.mode === 'compare' && selection.artistaA && selection.artistaB) {
      log.info('Loading songs for comparison', { 
        artistA: selection.artistaA, 
        artistB: selection.artistaB 
      });
      
      // Helper para processar músicas em SongEntry[]
      const processSongsToEntries = (songs: any[], artistName: string, startPosition: number): { entries: SongEntry[], endPosition: number } => {
        const entries: SongEntry[] = [];
        let posicaoGlobal = startPosition;
        
        for (const song of songs || []) {
          if (!song.lyrics || !song.artists) continue;
          
          const letra = song.lyrics.trim();
          const linhas = letra.split('\n').filter((l: string) => l.trim());
          const palavras = letra
            .toLowerCase()
            .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s]/g, ' ')
            .split(/\s+/)
            .filter((p: string) => p.length > 0);
          
          if (palavras.length === 0) continue;
          
          entries.push({
            metadata: {
              artista: artistName,
              compositor: undefined,
              album: '',
              musica: song.title,
              ano: song.release_year || undefined,
              fonte: (song.enrichment_source as any) || 'manual'
            },
            letra,
            linhas,
            palavras,
            posicaoNoCorpus: posicaoGlobal
          });
          
          posicaoGlobal += palavras.length;
        }
        
        return { entries, endPosition: posicaoGlobal };
      };
      
      // Carregar músicas do artista A
      const { data: songsA, error: errorA } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          lyrics,
          release_year,
          enrichment_source,
          artists!inner (
            id,
            name
          )
        `)
        .eq('artists.name', selection.artistaA)
        .eq('artists.corpus_id', corpus.id)
        .not('lyrics', 'is', null);
      
      if (errorA) throw errorA;
      
      // Carregar músicas do artista B
      const { data: songsB, error: errorB } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          lyrics,
          release_year,
          enrichment_source,
          artists!inner (
            id,
            name
          )
        `)
        .eq('artists.name', selection.artistaB)
        .eq('artists.corpus_id', corpus.id)
        .not('lyrics', 'is', null);
      
      if (errorB) throw errorB;
      
      // Processar e combinar corpus
      const processedA = processSongsToEntries(songsA || [], selection.artistaA, 0);
      const processedB = processSongsToEntries(songsB || [], selection.artistaB, processedA.endPosition);
      
      const combinedSongs = [...processedA.entries, ...processedB.entries];
      const totalPalavras = combinedSongs.reduce((sum, s) => sum + s.palavras.length, 0);
      
      const compareCorpus: CorpusCompleto = {
        tipo: selection.corpusBase,
        totalMusicas: combinedSongs.length,
        totalPalavras,
        musicas: combinedSongs
      };
      
      log.info('Compare corpus loaded', {
        artistA: { name: selection.artistaA, songs: processedA.entries.length },
        artistB: { name: selection.artistaB, songs: processedB.entries.length },
        totalSongs: combinedSongs.length,
        totalWords: totalPalavras
      });
      
      setLastLoadedCorpus(compareCorpus);
      return compareCorpus;
    }
    
    // Fallback se modo compare mas faltando artistas
    throw new Error('Modo compare requer dois artistas selecionados');
  }, [selection, availableCorpora, fullCorpus]);
  
  // NOVO R-1.2: Flag indicando que availableCorpora está carregado
  const isReady = useMemo(() => availableCorpora.length > 0, [availableCorpora]);
  
  return (
    <SubcorpusContext.Provider value={{
      selection,
      setSelection,
      getFilteredCorpus,
      loadedCorpus: lastLoadedCorpus,
      setLoadedCorpusDirectly,
      currentMetadata,
      availableArtists,
      subcorpora,
      isLoading,
      isReady,
      stylisticSelection,
      setStylisticSelection,
      activeAnnotationJobId,
      setActiveAnnotationJobId
    }}>
      {children}
    </SubcorpusContext.Provider>
  );
}

export function useSubcorpus() {
  const context = useContext(SubcorpusContext);
  if (!context) {
    throw new Error('useSubcorpus must be used within SubcorpusProvider');
  }
  return context;
}

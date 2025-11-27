/**
 * 🎯 SEMANTIC DOMAINS SERVICE - Domínios Semânticos Reais
 * 
 * Busca domínios semânticos processados pela ferramenta de anotação
 * da tabela annotated_corpus + semantic_tagset
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';
import { DominioSemantico } from '@/data/types/corpus.types';

const log = createLogger('semanticDomainsService');

/**
 * Busca domínios semânticos por song_id do cache
 * Usado para demo de música específica
 */
export async function fetchSemanticDomainsFromCache(songId: string): Promise<DominioSemantico[]> {
  try {
    log.info('Fetching semantic domains from cache by songId', { songId });

    const { data: cacheData, error } = await supabase
      .from('semantic_disambiguation_cache')
      .select(`
        palavra,
        tagset_codigo,
        confianca,
        semantic_tagset!inner(
          codigo,
          nome,
          cor,
          codigo_nivel_1,
          nivel_profundidade
        )
      `)
      .eq('song_id', songId);

    if (error) {
      log.error('Error fetching from cache', error);
      return [];
    }

    if (!cacheData || cacheData.length === 0) {
      log.warn('No cache data found for songId', { songId });
      return [];
    }

    log.info('Cache data loaded', { count: cacheData.length });

    // Agregar por domínio N1
    const dominiosMap = new Map<string, {
      palavras: string[];
      ocorrencias: number;
      avgConfianca: number;
      totalConfianca: number;
    }>();

    for (const entry of cacheData) {
      const tagset = entry.semantic_tagset as any;
      const dominioN1 = tagset.codigo_nivel_1 || tagset.codigo;
      const nomeN1 = tagset.nome;

      if (!dominiosMap.has(dominioN1)) {
        dominiosMap.set(dominioN1, {
          palavras: [],
          ocorrencias: 0,
          avgConfianca: 0,
          totalConfianca: 0
        });
      }

      const dominio = dominiosMap.get(dominioN1)!;
      if (!dominio.palavras.includes(entry.palavra)) {
        dominio.palavras.push(entry.palavra);
      }
      dominio.ocorrencias++;
      dominio.totalConfianca += entry.confianca || 0.5;
    }

    // Converter para DominioSemantico[]
    const totalOcorrencias = Array.from(dominiosMap.values())
      .reduce((sum, d) => sum + d.ocorrencias, 0);

    const dominios: DominioSemantico[] = Array.from(dominiosMap.entries()).map(([codigo, data]) => {
      const tagset = cacheData.find(c => (c.semantic_tagset as any).codigo_nivel_1 === codigo)?.semantic_tagset as any;
      
      return {
        dominio: tagset?.nome || codigo,
        ocorrencias: data.ocorrencias,
        percentual: (data.ocorrencias / totalOcorrencias) * 100,
        riquezaLexical: data.palavras.length,
        avgLL: 0, // Não calculado para demo
        cor: tagset?.cor || '#666666',
        palavras: data.palavras,
        palavrasComFrequencia: data.palavras.map(p => ({ palavra: p, ocorrencias: 1 })),
        corTexto: '#ffffff',
        frequenciaNormalizada: (data.ocorrencias / totalOcorrencias) * 100,
        percentualTematico: (data.ocorrencias / totalOcorrencias) * 100,
        comparacaoCorpus: 'equilibrado' as const,
        diferencaCorpus: 0,
        percentualCorpusNE: 0
      };
    });

    dominios.sort((a, b) => b.ocorrencias - a.ocorrencias);

    log.info('Domains aggregated', { count: dominios.length });
    return dominios;

  } catch (error) {
    log.error('Error in fetchSemanticDomainsFromCache', error as Error);
    return [];
  }
}

/**
 * Busca domínios semânticos reais do corpus anotado
 * Se cache vazio, dispara processamento on-demand
 */
export async function getSemanticDomainsFromAnnotatedCorpus(
  corpusType: 'gaucho' | 'nordestino',
  artistFilter?: string,
  onProgress?: (progress: { processedWords: number; totalWords: number; message: string }) => void
): Promise<DominioSemantico[]> {
  try {
    log.info('Fetching semantic domains from annotated corpus', { corpusType, artistFilter });

    // 🔍 FASE 1: Verificar cache primeiro (por artista se filtrado)
    if (artistFilter) {
      const cacheData = await fetchFromCacheByArtist(artistFilter);
      
      // Se cache tem dados suficientes (>50 palavras), usar
      if (cacheData && cacheData.length > 50) {
        log.info('Using cache data', { count: cacheData.length });
        return buildDomainsFromCache(cacheData);
      }

      // Cache vazio ou insuficiente → processar on-demand
      log.warn('Cache insufficient, triggering on-demand processing', { artistFilter });
      
      if (onProgress) {
        onProgress({ processedWords: 0, totalWords: 0, message: `Processando ${artistFilter}...` });
      }

      await triggerArtistAnnotation(artistFilter, onProgress);

      // Buscar novamente após processamento
      const newCacheData = await fetchFromCacheByArtist(artistFilter);
      if (newCacheData && newCacheData.length > 0) {
        return buildDomainsFromCache(newCacheData);
      }
    }

    // 🔍 FASE 2: Fallback - buscar de annotated_corpus (método original)
    const { data: corpus } = await supabase
      .from('corpora')
      .select('id, name')
      .eq('normalized_name', corpusType)
      .single();

    if (!corpus) {
      throw new Error(`Corpus ${corpusType} não encontrado`);
    }

    // Buscar job_id mais recente para este corpus
    let jobQuery = supabase
      .from('annotation_jobs')
      .select('id, tempo_fim, corpus_type')
      .eq('corpus_type', corpusType)
      .eq('status', 'concluido')
      .order('tempo_fim', { ascending: false })
      .limit(1);

    if (artistFilter) {
      jobQuery = jobQuery.eq('reference_artist_filter', artistFilter);
    }

    const { data: jobs, error: jobError } = await jobQuery;

    if (jobError || !jobs || jobs.length === 0) {
      log.warn('No completed annotation jobs found', { corpusType, artistFilter });
      return [];
    }

    const jobId = jobs[0].id;
    log.info('Found annotation job', { jobId, corpusType });

    // Buscar palavras anotadas deste job
    const { data: annotatedWords, error: wordsError } = await supabase
      .from('annotated_corpus')
      .select('palavra, tagset_codigo, tagset_primario, freq_study_corpus, ll_score, mi_score')
      .eq('job_id', jobId);

    if (wordsError || !annotatedWords) {
      log.error('Error fetching annotated words', wordsError);
      throw new Error('Erro ao buscar palavras anotadas');
    }

    log.info('Annotated words loaded', { count: annotatedWords.length });

    // Buscar tagsets N1 (domínios principais)
    const { data: tagsets, error: tagsetsError } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome, descricao, nivel_profundidade')
      .eq('nivel_profundidade', 1)
      .eq('status', 'ativo')
      .order('codigo');

    if (tagsetsError || !tagsets) {
      log.error('Error fetching tagsets', tagsetsError);
      throw new Error('Erro ao buscar tagsets');
    }

    // Mapa de cores padrão por domínio N1
    const colorMap: Record<string, string> = {
      'AB': '#9333EA', 'AP': '#10B981', 'CC': '#F59E0B', 'EL': '#EF4444',
      'EQ': '#8B5CF6', 'MG': '#6B7280', 'NA': '#268BC8', 'NC': '#6B7280',
      'OA': '#F97316', 'SB': '#EC4899', 'SE': '#8B5CF6', 'SH': '#24A65B', 'SP': '#EC4899'
    };

    // Criar mapa de códigos N1
    const tagsetMap = new Map(
      tagsets.map(t => [t.codigo, { nome: t.nome, descricao: t.descricao }])
    );

    // Agregar palavras por domínio N1
    const domainMap = new Map<string, {
      nome: string;
      descricao: string;
      cor: string;
      palavras: string[];
      palavrasComFrequencia: Array<{ palavra: string; ocorrencias: number }>;
      ocorrencias: number;
      llScores: number[];
      miScores: number[];
    }>();

    annotatedWords.forEach(word => {
      // Extrair código N1 (primeiros 2 caracteres do tagset_codigo)
      const tagsetCodigo = word.tagset_codigo || word.tagset_primario || 'NC';
      const n1Code = tagsetCodigo.substring(0, 2);
      
      const tagsetInfo = tagsetMap.get(n1Code);
      if (!tagsetInfo) return; // Pular palavras sem domínio N1 válido

      if (!domainMap.has(n1Code)) {
        domainMap.set(n1Code, {
          nome: tagsetInfo.nome,
          descricao: tagsetInfo.descricao || '',
          cor: colorMap[n1Code] || '#6B7280',
          palavras: [],
          palavrasComFrequencia: [],
          ocorrencias: 0,
          llScores: [],
          miScores: []
        });
      }

      const domain = domainMap.get(n1Code)!;
      const freq = word.freq_study_corpus || 1;
      
      domain.palavras.push(word.palavra);
      domain.palavrasComFrequencia.push({ palavra: word.palavra, ocorrencias: freq });
      domain.ocorrencias += freq;
      
      if (word.ll_score) domain.llScores.push(word.ll_score);
      if (word.mi_score) domain.miScores.push(word.mi_score);
    });

    // Calcular total de ocorrências
    const totalOcorrencias = Array.from(domainMap.values())
      .reduce((sum, d) => sum + d.ocorrencias, 0);

    // Converter para formato DominioSemantico
    const dominios: DominioSemantico[] = Array.from(domainMap.entries())
      .map(([codigo, data]) => {
        const percentual = (data.ocorrencias / totalOcorrencias) * 100;
        
        return {
          dominio: data.nome,
          cor: data.cor,
          corTexto: data.cor,
          palavras: [...new Set(data.palavras)], // Remover duplicatas
          palavrasComFrequencia: data.palavrasComFrequencia,
          ocorrencias: data.ocorrencias,
          percentual,
          frequenciaNormalizada: percentual,
          percentualTematico: percentual,
          riquezaLexical: data.palavras.length / data.ocorrencias,
          comparacaoCorpus: 'equilibrado' as const,
          diferencaCorpus: 0,
          percentualCorpusNE: 0
        };
      })
      .sort((a, b) => b.ocorrencias - a.ocorrencias);

    log.info('Semantic domains processed', { 
      domains: dominios.length,
      totalWords: annotatedWords.length,
      totalOccurrences: totalOcorrencias
    });

    return dominios;

  } catch (error) {
    log.error('Error fetching semantic domains', error as Error);
    throw error;
  }
}

/**
 * Buscar dados do cache por artista
 */
async function fetchFromCacheByArtist(artistName: string): Promise<any[] | null> {
  // Primeiro buscar artist_id
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .ilike('name', `%${artistName}%`)
    .single();

  if (!artist) return null;

  // Buscar palavras do cache deste artista
  const { data, error } = await supabase
    .from('semantic_disambiguation_cache')
    .select('palavra, tagset_codigo, confianca')
    .eq('artist_id', artist.id);

  if (error || !data) return null;
  return data;
}

/**
 * Construir domínios a partir do cache
 */
function buildDomainsFromCache(cacheData: any[]): DominioSemantico[] {
  const colorMap: Record<string, string> = {
    'AB': '#9333EA', 'AP': '#10B981', 'CC': '#F59E0B', 'EL': '#EF4444',
    'EQ': '#8B5CF6', 'MG': '#6B7280', 'NA': '#268BC8', 'NC': '#6B7280',
    'OA': '#F97316', 'SB': '#EC4899', 'SE': '#8B5CF6', 'SH': '#24A65B', 'SP': '#EC4899'
  };

  // Agregar por domínio (usar tagset_codigo completo ou primeiros 2 chars)
  const domainMap = new Map<string, {
    palavras: string[];
    ocorrencias: number;
  }>();

  cacheData.forEach(word => {
    const domain = word.tagset_codigo.substring(0, 2); // N1
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { palavras: [], ocorrencias: 0 });
    }

    const data = domainMap.get(domain)!;
    data.palavras.push(word.palavra);
    data.ocorrencias++;
  });

  const totalOcorrencias = Array.from(domainMap.values())
    .reduce((sum, d) => sum + d.ocorrencias, 0);

  return Array.from(domainMap.entries())
    .map(([codigo, data]) => {
      const percentual = (data.ocorrencias / totalOcorrencias) * 100;
      
      return {
        dominio: codigo,
        cor: colorMap[codigo] || '#6B7280',
        corTexto: colorMap[codigo] || '#6B7280',
        palavras: [...new Set(data.palavras)],
        palavrasComFrequencia: data.palavras.map(p => ({ palavra: p, ocorrencias: 1 })),
        ocorrencias: data.ocorrencias,
        percentual,
        frequenciaNormalizada: percentual,
        percentualTematico: percentual,
        riquezaLexical: data.palavras.length / data.ocorrencias,
        comparacaoCorpus: 'equilibrado' as const,
        diferencaCorpus: 0,
        percentualCorpusNE: 0
      };
    })
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/**
 * Disparar anotação on-demand via edge function
 * Retorna jobId para polling
 */
async function triggerArtistAnnotation(
  artistName: string,
  onProgress?: (progress: { processedWords: number; totalWords: number; message: string }) => void
): Promise<string> {
  try {
    const response = await supabase.functions.invoke('annotate-artist-songs', {
      body: { artistName }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const { jobId, totalWords } = response.data;
    
    if (!jobId) {
      throw new Error('Job ID não retornado');
    }

    if (onProgress) {
      onProgress({
        processedWords: 0,
        totalWords: totalWords || 0,
        message: `Job ${jobId} iniciado`
      });
    }

    log.info('Job created', { artistName, jobId, totalWords });
    return jobId;
    
  } catch (error) {
    log.error('Error triggering on-demand annotation', error as Error);
    throw error;
  }
}


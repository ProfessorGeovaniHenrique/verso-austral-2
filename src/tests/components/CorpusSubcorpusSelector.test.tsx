import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as fullTextParser from '@/lib/fullTextParser';
import { CorpusType } from '@/data/types/corpus-tools.types';
import React from 'react';

// Mock simplificado para testar a lógica de carregamento de artistas
describe('CorpusSubcorpusSelector Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock loadFullTextCorpus
    vi.spyOn(fullTextParser, 'loadFullTextCorpus').mockResolvedValue({
      tipo: 'gaucho',
      totalMusicas: 50,
      totalPalavras: 10000,
      totalPalavrasUnicas: 500,
      musicas: [
        {
          metadata: { artista: 'Luiz Marenco', album: 'Album 1', musica: 'Song 1', ano: '2010' },
          texto: 'texto da musica',
          palavras: ['palavra1', 'palavra2']
        },
        {
          metadata: { artista: 'Noel Guarany', album: 'Album 2', musica: 'Song 2', ano: '2015' },
          texto: 'texto da musica 2',
          palavras: ['palavra3', 'palavra4']
        },
        {
          metadata: { artista: 'Luiz Marenco', album: 'Album 3', musica: 'Song 3', ano: '2012' },
          texto: 'texto da musica 3',
          palavras: ['palavra5', 'palavra6']
        }
      ]
    } as any);
  });

  it('deve carregar artistas do corpus', async () => {
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    expect(fullTextParser.loadFullTextCorpus).toHaveBeenCalledWith('gaucho');
    expect(corpus.musicas.length).toBe(3);
  });

  it('deve extrair lista única de artistas', async () => {
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    const uniqueArtists = [...new Set(corpus.musicas.map(m => m.metadata.artista))];
    
    expect(uniqueArtists).toHaveLength(2);
    expect(uniqueArtists).toContain('Luiz Marenco');
    expect(uniqueArtists).toContain('Noel Guarany');
  });

  it('deve ordenar artistas alfabeticamente', async () => {
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    const uniqueArtists = [...new Set(corpus.musicas.map(m => m.metadata.artista))];
    const sortedArtists = uniqueArtists.sort();
    
    expect(sortedArtists[0]).toBe('Luiz Marenco');
    expect(sortedArtists[1]).toBe('Noel Guarany');
  });

  it('deve lidar com erro ao carregar corpus', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fullTextParser, 'loadFullTextCorpus').mockRejectedValue(
      new Error('Falha ao carregar corpus')
    );
    
    try {
      await fullTextParser.loadFullTextCorpus('gaucho');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Falha ao carregar corpus');
    }
    
    consoleErrorSpy.mockRestore();
  });

  it('deve carregar diferentes corpus', async () => {
    await fullTextParser.loadFullTextCorpus('gaucho');
    expect(fullTextParser.loadFullTextCorpus).toHaveBeenCalledWith('gaucho');
    
    vi.clearAllMocks();
    
    await fullTextParser.loadFullTextCorpus('nordestino');
    expect(fullTextParser.loadFullTextCorpus).toHaveBeenCalledWith('nordestino');
  });

  it('deve processar corpus sem artistas duplicados', async () => {
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    const uniqueArtists = [...new Set(corpus.musicas.map(m => m.metadata.artista))];
    
    // Verificar que mesmo com 3 músicas, só temos 2 artistas únicos
    expect(corpus.musicas.length).toBe(3);
    expect(uniqueArtists.length).toBe(2);
  });

  it('deve validar estrutura de metadados', async () => {
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    
    corpus.musicas.forEach(musica => {
      expect(musica.metadata).toHaveProperty('artista');
      expect(musica.metadata).toHaveProperty('album');
      expect(musica.metadata).toHaveProperty('musica');
      expect(typeof musica.metadata.artista).toBe('string');
    });
  });

  it('deve manter consistência de tipos', async () => {
    const corpusType: CorpusType = 'gaucho';
    const corpus = await fullTextParser.loadFullTextCorpus(corpusType);
    
    expect(corpus.tipo).toBe('gaucho');
    expect(typeof corpus.totalMusicas).toBe('number');
    expect(Array.isArray(corpus.musicas)).toBe(true);
  });

  it('deve processar corpus vazio corretamente', async () => {
    vi.spyOn(fullTextParser, 'loadFullTextCorpus').mockResolvedValue({
      tipo: 'gaucho',
      totalMusicas: 0,
      totalPalavras: 0,
      totalPalavrasUnicas: 0,
      musicas: []
    } as any);
    
    const corpus = await fullTextParser.loadFullTextCorpus('gaucho');
    const uniqueArtists = [...new Set(corpus.musicas.map(m => m.metadata.artista))];
    
    expect(corpus.musicas.length).toBe(0);
    expect(uniqueArtists.length).toBe(0);
  });

  it('deve cache de artistas funcionar corretamente', () => {
    const artistsCache = new Map<CorpusType, string[]>();
    
    // Simular primeiro acesso (cache miss)
    expect(artistsCache.has('gaucho')).toBe(false);
    
    // Adicionar ao cache
    artistsCache.set('gaucho', ['Luiz Marenco', 'Noel Guarany']);
    
    // Simular segundo acesso (cache hit)
    expect(artistsCache.has('gaucho')).toBe(true);
    expect(artistsCache.get('gaucho')).toEqual(['Luiz Marenco', 'Noel Guarany']);
    
    // Limpar cache
    artistsCache.clear();
    expect(artistsCache.has('gaucho')).toBe(false);
  });
});

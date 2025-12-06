/**
 * User Corpus Converter
 * Converts UserCorpusFile to CorpusCompletoEnriquecido with proper text structure
 */

import { UserCorpusFile } from '@/contexts/AnalysisToolsContext';
import { SongEntry, SongMetadata } from '@/data/types/full-text-corpus.types';
import { CorpusCompletoEnriquecido, TextStructureMetadata, TextType } from '@/data/types/text-structure.types';

/**
 * Tokenizes text into words (matches fullTextParser.ts logic)
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\wáéíóúâêôãõàèìòùäëïöüçñ\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Extracts poetry structure: lines as sentences, stanzas as paragraphs
 */
function extractPoetryStructure(text: string): { sentencas: string[]; paragrafos: string[][] } {
  const lines = text.split('\n').map(l => l.trim());
  const sentencas = lines.filter(l => l.length > 0);
  
  // Stanzas are separated by empty lines
  const paragrafos: string[][] = [];
  let currentStanza: string[] = [];
  
  for (const line of lines) {
    if (line.length === 0) {
      if (currentStanza.length > 0) {
        paragrafos.push([...currentStanza]);
        currentStanza = [];
      }
    } else {
      currentStanza.push(line);
    }
  }
  
  // Don't forget the last stanza
  if (currentStanza.length > 0) {
    paragrafos.push(currentStanza);
  }
  
  return { sentencas, paragrafos };
}

/**
 * Extracts sentences from a paragraph with abbreviation protection
 */
function extractSentencesFromParagraph(paragraph: string): string[] {
  // Protect common abbreviations
  const protected_ = paragraph
    .replace(/\bDr\./gi, 'Dr§')
    .replace(/\bSr\./gi, 'Sr§')
    .replace(/\bSra\./gi, 'Sra§')
    .replace(/\betc\./gi, 'etc§')
    .replace(/\bex\./gi, 'ex§')
    .replace(/\bp\.ex\./gi, 'p§ex§');
  
  // Split by sentence-ending punctuation
  const parts = protected_.split(/([.!?;]+)/);
  const sentences: string[] = [];
  
  for (let i = 0; i < parts.length; i += 2) {
    let sentence = parts[i]?.trim() || '';
    // Restore abbreviations
    sentence = sentence
      .replace(/Dr§/g, 'Dr.')
      .replace(/Sr§/g, 'Sr.')
      .replace(/Sra§/g, 'Sra.')
      .replace(/etc§/g, 'etc.')
      .replace(/ex§/g, 'ex.')
      .replace(/p§ex§/g, 'p.ex.');
    
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
  }
  
  return sentences;
}

/**
 * Extracts prose structure: sentences by punctuation, paragraphs by blocks
 */
function extractProseStructure(text: string): { sentencas: string[]; paragrafos: string[][] } {
  // Split into paragraph blocks (separated by empty lines or double newlines)
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 0);
  
  const paragrafos: string[][] = [];
  const allSentencas: string[] = [];
  
  for (const block of blocks) {
    // Normalize newlines within block to spaces
    const normalizedBlock = block.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const sentences = extractSentencesFromParagraph(normalizedBlock);
    
    if (sentences.length > 0) {
      paragrafos.push(sentences);
      allSentencas.push(...sentences);
    }
  }
  
  return { sentencas: allSentencas, paragrafos };
}

/**
 * Calculates average words per sentence
 */
function calculateAvgWords(sentencas: string[]): number {
  if (sentencas.length === 0) return 0;
  const totalWords = sentencas.reduce((sum, s) => sum + tokenizeText(s).length, 0);
  return Math.round((totalWords / sentencas.length) * 100) / 100;
}

/**
 * Converts UserCorpusFile to CorpusCompletoEnriquecido
 */
export function userCorpusToCorpusCompleto(userCorpus: UserCorpusFile): CorpusCompletoEnriquecido {
  const { id, name, content, textType } = userCorpus;
  
  // Extract structure based on text type
  const { sentencas, paragrafos } = textType === 'poetry'
    ? extractPoetryStructure(content)
    : extractProseStructure(content);
  
  // Tokenize full content
  const palavras = tokenizeText(content);
  const linhas = content.split('\n').filter(l => l.trim().length > 0);
  
  // Build text structure metadata
  const textStructure: TextStructureMetadata = {
    textType,
    sentencas,
    paragrafos,
    unidadeBase: textType === 'poetry' ? 'verso' : 'sentença',
    totalSentencas: sentencas.length,
    totalParagrafos: paragrafos.length,
    avgPalavrasPorSentenca: calculateAvgWords(sentencas),
    avgSentencasPorParagrafo: paragrafos.length > 0 
      ? Math.round((sentencas.length / paragrafos.length) * 100) / 100 
      : 0
  };
  
  // Create metadata for the "song" entry
  const metadata: SongMetadata = {
    artista: 'Corpus do Usuário',
    album: name,
    musica: name,
    ano: new Date().getFullYear().toString(),
    fonte: 'manual'
  };
  
  // Create song entry
  const songEntry: SongEntry = {
    metadata,
    letra: content,
    linhas,
    palavras,
    posicaoNoCorpus: 0
  };
  
  // Build enriched corpus
  const corpus: CorpusCompletoEnriquecido = {
    tipo: 'gaucho', // Default, not really used for user corpus
    totalMusicas: 1,
    totalPalavras: palavras.length,
    musicas: [songEntry],
    _textStructure: textStructure,
    _isUserCorpus: true,
    _sourceFileName: name
  };
  
  console.log(`[userCorpusConverter] Convertido: "${name}" (${textType})`, {
    totalPalavras: palavras.length,
    totalSentencas: textStructure.totalSentencas,
    totalParagrafos: textStructure.totalParagrafos,
    avgPalavrasPorSentenca: textStructure.avgPalavrasPorSentenca
  });
  
  return corpus;
}

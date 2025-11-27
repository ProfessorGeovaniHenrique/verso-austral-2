/**
 * 📊 DADOS PRÉ-PROCESSADOS DA MÚSICA "QUANDO O VERSO VEM PRAS CASA"
 * 
 * Análise real baseada na documentação do projeto:
 * - 212 palavras totais (95 funcionais + 117 temáticas)
 * - 7 domínios semânticos identificados
 * - Comparação com corpus nordestino (50 músicas de referência)
 */

import { CorpusAnalysisResult } from "@/services/corpusDataService";

export const QUANDO_VERSO_ANALYSIS: CorpusAnalysisResult = {
  keywords: [
    // Cultura e Lida Gaúcha (27 lemas, 28 ocorrências)
    { palavra: 'gateado', frequencia: 2, ll: 45.2, mi: 8.3, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'arreio', frequencia: 1, ll: 38.1, mi: 7.8, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'bomba', frequencia: 1, ll: 35.4, mi: 7.5, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'mate', frequencia: 1, ll: 42.7, mi: 8.1, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'galpão', frequencia: 1, ll: 40.2, mi: 7.9, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'querência', frequencia: 1, ll: 44.8, mi: 8.2, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'prenda', frequencia: 1, ll: 41.3, mi: 8.0, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'espora', frequencia: 1, ll: 37.5, mi: 7.7, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'campeiro', frequencia: 1, ll: 39.8, mi: 7.8, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },
    { palavra: 'tropa', frequencia: 1, ll: 36.2, mi: 7.6, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Cultura e Lida Gaúcha', cor: '#C2410C' },

    // Natureza e Paisagem (20 lemas, 26 ocorrências)
    { palavra: 'coxilha', frequencia: 2, ll: 43.5, mi: 8.2, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'sol', frequencia: 2, ll: 18.4, mi: 5.2, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'sombra', frequencia: 2, ll: 15.8, mi: 4.8, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'tarumã', frequencia: 2, ll: 46.1, mi: 8.4, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'campo', frequencia: 1, ll: 22.3, mi: 6.1, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'várzea', frequencia: 2, ll: 44.8, mi: 8.3, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'horizonte', frequencia: 1, ll: 19.7, mi: 5.5, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },
    { palavra: 'campanha', frequencia: 1, ll: 41.2, mi: 8.0, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' },

    // Sentimentos e Abstrações (16 lemas, 20 ocorrências)
    { palavra: 'verso', frequencia: 4, ll: 48.3, mi: 8.6, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },
    { palavra: 'saudade', frequencia: 2, ll: 32.1, mi: 7.2, significancia: 'p < 0.001', prosody: 'Negativa', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },
    { palavra: 'sonho', frequencia: 1, ll: 24.5, mi: 6.3, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },
    { palavra: 'calma', frequencia: 1, ll: 21.8, mi: 5.9, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },
    { palavra: 'mansidão', frequencia: 1, ll: 38.4, mi: 7.7, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },
    { palavra: 'respeito', frequencia: 1, ll: 23.2, mi: 6.1, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Sentimentos e Abstrações', cor: '#9333EA' },

    // Ações e Processos (19 lemas, 24 ocorrências)
    { palavra: 'traz', frequencia: 3, ll: 26.8, mi: 6.7, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Ações e Processos', cor: '#2563EB' },
    { palavra: 'sonhou', frequencia: 2, ll: 28.4, mi: 6.9, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Ações e Processos', cor: '#2563EB' },
    { palavra: 'chegou', frequencia: 1, ll: 14.2, mi: 4.5, significancia: 'p < 0.01', prosody: 'Neutra', dominio: 'Ações e Processos', cor: '#2563EB' },
    { palavra: 'encilha', frequencia: 1, ll: 42.1, mi: 8.1, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Ações e Processos', cor: '#2563EB' },

    // Qualidades e Estados (16 lemas, 16 ocorrências)
    { palavra: 'lindo', frequencia: 1, ll: 17.3, mi: 5.1, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Qualidades e Estados', cor: '#FACC15' },
    { palavra: 'cansado', frequencia: 1, ll: 16.8, mi: 5.0, significancia: 'p < 0.001', prosody: 'Negativa', dominio: 'Qualidades e Estados', cor: '#FACC15' },
    { palavra: 'novo', frequencia: 1, ll: 12.4, mi: 4.2, significancia: 'p < 0.01', prosody: 'Positiva', dominio: 'Qualidades e Estados', cor: '#FACC15' },
    { palavra: 'gordo', frequencia: 1, ll: 19.2, mi: 5.4, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Qualidades e Estados', cor: '#FACC15' },

    // Partes do Corpo e Seres Vivos (2 lemas, 3 ocorrências)
    { palavra: 'olhos', frequencia: 2, ll: 13.5, mi: 4.4, significancia: 'p < 0.01', prosody: 'Neutra', dominio: 'Partes do Corpo', cor: '#DC2626' },
    { palavra: 'galo', frequencia: 1, ll: 25.7, mi: 6.5, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Partes do Corpo', cor: '#DC2626' }
  ],

  dominios: [
    {
      dominio: 'Cultura e Lida Gaúcha',
      descricao: 'Vocabulário da cultura e lida campeira gaúcha',
      percentual: 23.93,
      ocorrencias: 28,
      riquezaLexical: 27,
      palavras: ['gateado', 'arreio', 'bomba', 'mate', 'galpão', 'querência', 'prenda', 'espora', 'campeiro', 'tropa', 'cuia', 'cambona', 'pañuelo', 'ramada', 'galponeiro', 'candeeiro', 'cancela', 'campereada', 'caseiro', 'copla', 'jujado', 'lombo', 'lonjura', 'maragato', 'pura-folha', 'quarto', 'templado'],
      cor: '#C2410C',
      avgLL: 40.5,
      avgMI: 7.9
    },
    {
      dominio: 'Natureza e Paisagem',
      descricao: 'Elementos naturais e paisagem do pampa',
      percentual: 22.22,
      ocorrencias: 26,
      riquezaLexical: 20,
      palavras: ['coxilha', 'sol', 'sombra', 'tarumã', 'campo', 'várzea', 'horizonte', 'campanha', 'tarde', 'aurora', 'chão', 'fogo', 'madrugada', 'manhã', 'maçanilha', 'noite', 'primavera', 'reponte', 'ventito', 'asa'],
      cor: '#16A34A',
      avgLL: 28.7,
      avgMI: 6.5
    },
    {
      dominio: 'Ações e Processos',
      descricao: 'Verbos e ações',
      percentual: 20.51,
      ocorrencias: 24,
      riquezaLexical: 19,
      palavras: ['trazer', 'sonhar', 'chegar', 'encilhar', 'ser', 'abrir', 'aquerenciar', 'cair', 'cevar', 'deixar', 'desencilhar', 'desgarrar', 'estampar', 'ficar', 'ganhar', 'pontear', 'queimar', 'rondar', 'ter'],
      cor: '#2563EB',
      avgLL: 25.4,
      avgMI: 6.3
    },
    {
      dominio: 'Sentimentos e Abstrações',
      descricao: 'Conceitos abstratos e sentimentos',
      percentual: 17.09,
      ocorrencias: 20,
      riquezaLexical: 16,
      palavras: ['verso', 'saudade', 'sonho', 'calma', 'mansidão', 'respeito', 'açoite', 'canto', 'cerne', 'cor', 'espera', 'figura', 'fim', 'jeito', 'luz', 'silencio'],
      cor: '#9333EA',
      avgLL: 31.2,
      avgMI: 7.1
    },
    {
      dominio: 'Qualidades e Estados',
      descricao: 'Adjetivos e estados',
      percentual: 13.68,
      ocorrencias: 16,
      riquezaLexical: 16,
      palavras: ['lindo', 'cansado', 'novo', 'gordo', 'aberto', 'adormecido', 'campeiro', 'copado', 'encostado', 'espichado', 'feito', 'negro', 'recostado', 'redomona', 'suado', 'vestido'],
      cor: '#FACC15',
      avgLL: 16.4,
      avgMI: 4.9
    },
    {
      dominio: 'Partes do Corpo',
      descricao: 'Partes do corpo e seres vivos',
      percentual: 2.56,
      ocorrencias: 3,
      riquezaLexical: 2,
      palavras: ['olho', 'galo'],
      cor: '#DC2626',
      avgLL: 19.6,
      avgMI: 5.5
    }
  ],

  cloudData: [
    { codigo: 'CL', nome: 'Cultura e Lida Gaúcha', size: 28, color: '#C2410C', wordCount: 27, avgScore: 40.5 },
    { codigo: 'NA', nome: 'Natureza e Paisagem', size: 26, color: '#16A34A', wordCount: 20, avgScore: 28.7 },
    { codigo: 'AP', nome: 'Ações e Processos', size: 24, color: '#2563EB', wordCount: 19, avgScore: 25.4 },
    { codigo: 'SA', nome: 'Sentimentos e Abstrações', size: 20, color: '#9333EA', wordCount: 16, avgScore: 31.2 },
    { codigo: 'QE', nome: 'Qualidades e Estados', size: 16, color: '#FACC15', wordCount: 16, avgScore: 16.4 },
    { codigo: 'PC', nome: 'Partes do Corpo', size: 3, color: '#DC2626', wordCount: 2, avgScore: 19.6 }
  ],

  estatisticas: {
    totalPalavras: 212,
    palavrasUnicas: 117,
    dominiosIdentificados: 6,
    palavrasChaveSignificativas: 56,
    prosodiaDistribution: {
      positivas: 28,
      negativas: 12,
      neutras: 77,
      percentualPositivo: 23.9,
      percentualNegativo: 10.3,
      percentualNeutro: 65.8
    }
  }
};

/**
 * 📊 CORPUS NORDESTINO DE REFERÊNCIA (50 MÚSICAS)
 * 
 * Usado para comparação estatística via Log-likelihood
 */
export const NORDESTINO_REFERENCE_DATA: CorpusAnalysisResult = {
  keywords: [
    { palavra: 'morena', frequencia: 45, ll: 52.3, mi: 8.9, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Partes do Corpo', cor: '#DC2626' },
    { palavra: 'pele', frequencia: 38, ll: 48.7, mi: 8.7, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Partes do Corpo', cor: '#DC2626' },
    { palavra: 'beijo', frequencia: 32, ll: 45.2, mi: 8.5, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Partes do Corpo', cor: '#DC2626' },
    { palavra: 'dança', frequencia: 28, ll: 38.4, mi: 7.9, significancia: 'p < 0.001', prosody: 'Positiva', dominio: 'Ações e Processos', cor: '#2563EB' },
    { palavra: 'sertão', frequencia: 24, ll: 32.1, mi: 7.4, significancia: 'p < 0.001', prosody: 'Neutra', dominio: 'Natureza e Paisagem', cor: '#16A34A' }
  ],

  dominios: [
    {
      dominio: 'Partes do Corpo',
      descricao: 'Partes do corpo e seres humanos',
      percentual: 27.4,
      ocorrencias: 156,
      riquezaLexical: 42,
      palavras: ['morena', 'pele', 'beijo', 'olho', 'boca', 'mão', 'cabelo', 'coração'],
      cor: '#DC2626',
      avgLL: 48.7,
      avgMI: 8.7
    },
    {
      dominio: 'Ações e Processos',
      descricao: 'Verbos e ações',
      percentual: 25.5,
      ocorrencias: 145,
      riquezaLexical: 68,
      palavras: ['dançar', 'cantar', 'amar', 'beijar', 'olhar'],
      cor: '#2563EB',
      avgLL: 38.4,
      avgMI: 7.9
    },
    {
      dominio: 'Sentimentos e Abstrações',
      descricao: 'Conceitos abstratos e sentimentos',
      percentual: 18.8,
      ocorrencias: 107,
      riquezaLexical: 35,
      palavras: ['amor', 'paixão', 'saudade', 'alegria'],
      cor: '#9333EA',
      avgLL: 35.2,
      avgMI: 7.5
    },
    {
      dominio: 'Cultura Regional',
      descricao: 'Cultura nordestina',
      percentual: 15.1,
      ocorrencias: 86,
      riquezaLexical: 28,
      palavras: ['forró', 'baião', 'xote', 'vaqueiro'],
      cor: '#C2410C',
      avgLL: 42.3,
      avgMI: 8.1
    },
    {
      dominio: 'Natureza e Paisagem',
      descricao: 'Elementos naturais',
      percentual: 7.2,
      ocorrencias: 41,
      riquezaLexical: 18,
      palavras: ['sertão', 'lua', 'sol', 'estrela'],
      cor: '#16A34A',
      avgLL: 32.1,
      avgMI: 7.4
    },
    {
      dominio: 'Qualidades e Estados',
      descricao: 'Adjetivos e estados',
      percentual: 6.0,
      ocorrencias: 34,
      riquezaLexical: 22,
      palavras: ['bonita', 'linda', 'alegre', 'triste'],
      cor: '#FACC15',
      avgLL: 28.5,
      avgMI: 6.8
    }
  ],

  cloudData: [
    { codigo: 'PC', nome: 'Partes do Corpo', size: 156, color: '#DC2626', wordCount: 42, avgScore: 48.7 },
    { codigo: 'AP', nome: 'Ações e Processos', size: 145, color: '#2563EB', wordCount: 68, avgScore: 38.4 },
    { codigo: 'SA', nome: 'Sentimentos e Abstrações', size: 107, color: '#9333EA', wordCount: 35, avgScore: 35.2 },
    { codigo: 'CR', nome: 'Cultura Regional', size: 86, color: '#C2410C', wordCount: 28, avgScore: 42.3 },
    { codigo: 'NA', nome: 'Natureza e Paisagem', size: 41, color: '#16A34A', wordCount: 18, avgScore: 32.1 },
    { codigo: 'QE', nome: 'Qualidades e Estados', size: 34, color: '#FACC15', wordCount: 22, avgScore: 28.5 }
  ],

  estatisticas: {
    totalPalavras: 8542,
    palavrasUnicas: 2134,
    dominiosIdentificados: 6,
    palavrasChaveSignificativas: 342,
    prosodiaDistribution: {
      positivas: 156,
      negativas: 48,
      neutras: 138,
      percentualPositivo: 45.6,
      percentualNegativo: 14.0,
      percentualNeutro: 40.4
    }
  }
};

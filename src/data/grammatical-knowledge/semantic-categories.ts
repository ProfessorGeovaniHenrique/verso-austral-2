/**
 * Categorias Semânticas do Português Brasileiro
 * Classificações semânticas relevantes para análise textual
 */

// Categorias semânticas principais
export const semanticCategories = {
  // 1. Dêixis (referência ao contexto de enunciação)
  deixis: {
    espacial: ['aqui', 'aí', 'ali', 'lá', 'cá', 'este', 'esse', 'aquele'],
    temporal: ['agora', 'hoje', 'ontem', 'amanhã', 'então', 'naquele dia'],
    pessoal: ['eu', 'tu', 'você', 'ele', 'nós', 'eles'],
  },
  
  // 2. Predicação (expressão de ações, processos e estados)
  predicacao: {
    acao: [
      'correr', 'pular', 'trabalhar', 'estudar', 'construir',
      'escrever', 'falar', 'caminhar', 'dançar', 'cantar'
    ],
    processo: [
      'crescer', 'amadurecer', 'envelhecer', 'apodrecer',
      'desenvolver', 'evoluir', 'transformar'
    ],
    estado: [
      'ser', 'estar', 'ter', 'haver', 'existir', 'parecer',
      'permanecer', 'ficar', 'continuar'
    ],
  },
  
  // 3. Verificação (classificação e caracterização)
  verificacao: {
    classificadores: [
      'solar', 'lunar', 'aquático', 'terrestre', 'marítimo',
      'urbano', 'rural', 'nacional', 'internacional'
    ],
    qualificadores: [
      'bom', 'mau', 'grande', 'pequeno', 'alto', 'baixo',
      'forte', 'fraco', 'rápido', 'lento', 'belo', 'feio'
    ],
  },
  
  // 4. Modalização (atitude do falante em relação ao conteúdo)
  modalizacao: {
    epistemica: {
      certeza: ['certamente', 'obviamente', 'evidentemente', 'claramente'],
      duvida: ['talvez', 'possivelmente', 'provavelmente', 'quiçá'],
    },
    deontica: {
      obrigacao: ['dever', 'ter que', 'precisar', 'ser necessário'],
      permissao: ['poder', 'ser permitido', 'ser possível'],
    },
    volitiva: [
      'querer', 'desejar', 'pretender', 'aspirar', 'ansiar'
    ],
  },
};

// Traços semânticos binários
export const semanticFeatures = {
  // Animacidade
  animado: {
    plus: ['pessoa', 'animal', 'cachorro', 'pássaro', 'homem'],
    minus: ['pedra', 'mesa', 'livro', 'água', 'vento'],
  },
  
  // Humanidade
  humano: {
    plus: ['homem', 'mulher', 'criança', 'professor', 'médico'],
    minus: ['cachorro', 'gato', 'árvore', 'pedra', 'carro'],
  },
  
  // Concretude
  concreto: {
    plus: ['mesa', 'casa', 'livro', 'árvore', 'pessoa'],
    minus: ['amor', 'felicidade', 'justiça', 'liberdade', 'ideia'],
  },
  
  // Contabilidade
  contavel: {
    plus: ['livro', 'mesa', 'pessoa', 'árvore', 'carro'],
    minus: ['água', 'ar', 'amor', 'felicidade', 'arroz'],
  },
};

// Domínios semânticos temáticos (para análise de corpus)
export const thematicDomains = {
  natureza: [
    'campo', 'pampa', 'coxilha', 'cerro', 'rio', 'arroio',
    'vento', 'sol', 'lua', 'estrela', 'céu', 'terra',
    'árvore', 'pasto', 'mata', 'flor', 'erva'
  ],
  
  trabalho: [
    'lida', 'campear', 'laçar', 'tropear', 'domar', 'marcar',
    'estância', 'galpão', 'curral', 'mangueira', 'patrão', 'peão'
  ],
  
  cultura_gaucha: [
    'mate', 'chimarrão', 'churrasco', 'rodeio', 'fandango',
    'gaúcho', 'prenda', 'pilcha', 'bombacha', 'bota', 'chapéu',
    'lenço', 'poncho', 'laço', 'boleadeira'
  ],
  
  sentimentos: [
    'saudade', 'amor', 'paixão', 'alegria', 'tristeza', 'dor',
    'felicidade', 'sofrimento', 'esperança', 'medo', 'coragem'
  ],
  
  movimento: [
    'andar', 'cavalgar', 'galopar', 'trotar', 'correr', 'voar',
    'partir', 'chegar', 'voltar', 'ir', 'vir', 'seguir'
  ],
  
  tempo: [
    'manhã', 'tarde', 'noite', 'dia', 'ano', 'tempo', 'hora',
    'momento', 'instante', 'época', 'era', 'idade'
  ],
};

// Relações semânticas
export const semanticRelations = {
  sinonimia: [
    { words: ['gaúcho', 'guasca', 'tchê'], type: 'regional' },
    { words: ['cavalo', 'pingo', 'bagual'], type: 'regional' },
    { words: ['bonito', 'lindo', 'belo'], type: 'geral' },
  ],
  
  antonimia: [
    { pair: ['dia', 'noite'], type: 'complementar' },
    { pair: ['grande', 'pequeno'], type: 'gradual' },
    { pair: ['vivo', 'morto'], type: 'complementar' },
  ],
  
  hiponimia: [
    { hiperonym: 'animal', hyponyms: ['cavalo', 'vaca', 'ovelha', 'cachorro'] },
    { hiperonym: 'árvore', hyponyms: ['eucalipto', 'araucária', 'pinus'] },
  ],
  
  meronimia: [
    { whole: 'cavalo', parts: ['casco', 'crina', 'cauda', 'pata'] },
    { whole: 'casa', parts: ['telhado', 'porta', 'janela', 'parede'] },
  ],
};

// Campos semânticos prosódicos (avaliação positiva/negativa)
export const prosody = {
  positivo: [
    'belo', 'bom', 'feliz', 'alegre', 'lindo', 'maravilhoso',
    'excelente', 'ótimo', 'adorável', 'encantador', 'nobre'
  ],
  
  negativo: [
    'feio', 'mau', 'triste', 'horrível', 'péssimo', 'terrível',
    'desagradável', 'ruim', 'cruel', 'violento', 'injusto'
  ],
  
  neutro: [
    'coisa', 'objeto', 'elemento', 'aspecto', 'forma', 'modo',
    'parte', 'lado', 'ponto', 'lugar', 'momento'
  ],
};

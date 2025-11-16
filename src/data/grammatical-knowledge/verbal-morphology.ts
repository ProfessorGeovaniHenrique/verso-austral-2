/**
 * Morfologia Verbal do Português Brasileiro
 * Regras de conjugação, flexão e padrões morfológicos dos verbos
 */

export interface VerbPattern {
  infinitive: RegExp;
  presente: Record<string, RegExp>;
  preterito: Record<string, RegExp>;
  imperfeito: Record<string, RegExp>;
  futuro: Record<string, RegExp>;
  gerundio: RegExp;
  participio: RegExp;
}

// Conjugações regulares dos verbos em -AR, -ER, -IR
export const regularVerbPatterns: Record<string, VerbPattern> = {
  ar: {
    infinitive: /ar$/,
    presente: {
      p1: /o$/,
      p2: /as$/,
      p3: /a$/,
      p4: /amos$/,
      p5: /ais$/,
      p6: /am$/,
    },
    preterito: {
      p1: /ei$/,
      p2: /aste$/,
      p3: /ou$/,
      p4: /amos$/,
      p5: /astes$/,
      p6: /aram$/,
    },
    imperfeito: {
      p1: /ava$/,
      p2: /avas$/,
      p3: /ava$/,
      p4: /ávamos$/,
      p5: /áveis$/,
      p6: /avam$/,
    },
    futuro: {
      p1: /arei$/,
      p2: /arás$/,
      p3: /ará$/,
      p4: /aremos$/,
      p5: /areis$/,
      p6: /arão$/,
    },
    gerundio: /ando$/,
    participio: /ado$/,
  },
  er: {
    infinitive: /er$/,
    presente: {
      p1: /o$/,
      p2: /es$/,
      p3: /e$/,
      p4: /emos$/,
      p5: /eis$/,
      p6: /em$/,
    },
    preterito: {
      p1: /i$/,
      p2: /este$/,
      p3: /eu$/,
      p4: /emos$/,
      p5: /estes$/,
      p6: /eram$/,
    },
    imperfeito: {
      p1: /ia$/,
      p2: /ias$/,
      p3: /ia$/,
      p4: /íamos$/,
      p5: /íeis$/,
      p6: /iam$/,
    },
    futuro: {
      p1: /erei$/,
      p2: /erás$/,
      p3: /erá$/,
      p4: /eremos$/,
      p5: /ereis$/,
      p6: /erão$/,
    },
    gerundio: /endo$/,
    participio: /ido$/,
  },
  ir: {
    infinitive: /ir$/,
    presente: {
      p1: /o$/,
      p2: /es$/,
      p3: /e$/,
      p4: /imos$/,
      p5: /is$/,
      p6: /em$/,
    },
    preterito: {
      p1: /i$/,
      p2: /iste$/,
      p3: /iu$/,
      p4: /imos$/,
      p5: /istes$/,
      p6: /iram$/,
    },
    imperfeito: {
      p1: /ia$/,
      p2: /ias$/,
      p3: /ia$/,
      p4: /íamos$/,
      p5: /íeis$/,
      p6: /iam$/,
    },
    futuro: {
      p1: /irei$/,
      p2: /irás$/,
      p3: /irá$/,
      p4: /iremos$/,
      p5: /ireis$/,
      p6: /irão$/,
    },
    gerundio: /indo$/,
    participio: /ido$/,
  },
};

// Verbos irregulares mais comuns do português brasileiro
export const irregularVerbs: Record<string, {
  infinitivo: string;
  presente: string[];
  preterito: string[];
  imperfeito?: string[];
  futuro?: string[];
  gerundio: string;
  participio: string;
  radical?: string;
}> = {
  // Verbos auxiliares
  ser: {
    infinitivo: 'ser',
    presente: ['sou', 'és', 'é', 'somos', 'sois', 'são'],
    preterito: ['fui', 'foste', 'foi', 'fomos', 'fostes', 'foram'],
    imperfeito: ['era', 'eras', 'era', 'éramos', 'éreis', 'eram'],
    futuro: ['serei', 'serás', 'será', 'seremos', 'sereis', 'serão'],
    gerundio: 'sendo',
    participio: 'sido',
  },
  estar: {
    infinitivo: 'estar',
    presente: ['estou', 'estás', 'está', 'estamos', 'estais', 'estão'],
    preterito: ['estive', 'estiveste', 'esteve', 'estivemos', 'estivestes', 'estiveram'],
    gerundio: 'estando',
    participio: 'estado',
  },
  ter: {
    infinitivo: 'ter',
    presente: ['tenho', 'tens', 'tem', 'temos', 'tendes', 'têm'],
    preterito: ['tive', 'tiveste', 'teve', 'tivemos', 'tivestes', 'tiveram'],
    gerundio: 'tendo',
    participio: 'tido',
  },
  haver: {
    infinitivo: 'haver',
    presente: ['hei', 'hás', 'há', 'havemos', 'haveis', 'hão'],
    preterito: ['houve', 'houveste', 'houve', 'houvemos', 'houvestes', 'houveram'],
    gerundio: 'havendo',
    participio: 'havido',
  },
  
  // Verbos de uso frequente
  ir: {
    infinitivo: 'ir',
    presente: ['vou', 'vais', 'vai', 'vamos', 'ides', 'vão'],
    preterito: ['fui', 'foste', 'foi', 'fomos', 'fostes', 'foram'],
    imperfeito: ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'],
    gerundio: 'indo',
    participio: 'ido',
  },
  fazer: {
    infinitivo: 'fazer',
    presente: ['faço', 'fazes', 'faz', 'fazemos', 'fazeis', 'fazem'],
    preterito: ['fiz', 'fizeste', 'fez', 'fizemos', 'fizestes', 'fizeram'],
    gerundio: 'fazendo',
    participio: 'feito',
  },
  dizer: {
    infinitivo: 'dizer',
    presente: ['digo', 'dizes', 'diz', 'dizemos', 'dizeis', 'dizem'],
    preterito: ['disse', 'disseste', 'disse', 'dissemos', 'dissestes', 'disseram'],
    gerundio: 'dizendo',
    participio: 'dito',
  },
  trazer: {
    infinitivo: 'trazer',
    presente: ['trago', 'trazes', 'traz', 'trazemos', 'trazeis', 'trazem'],
    preterito: ['trouxe', 'trouxeste', 'trouxe', 'trouxemos', 'trouxestes', 'trouxeram'],
    gerundio: 'trazendo',
    participio: 'trazido',
  },
  poder: {
    infinitivo: 'poder',
    presente: ['posso', 'podes', 'pode', 'podemos', 'podeis', 'podem'],
    preterito: ['pude', 'pudeste', 'pôde', 'pudemos', 'pudestes', 'puderam'],
    gerundio: 'podendo',
    participio: 'podido',
  },
  pôr: {
    infinitivo: 'pôr',
    presente: ['ponho', 'pões', 'põe', 'pomos', 'pondes', 'põem'],
    preterito: ['pus', 'puseste', 'pôs', 'pusemos', 'pusestes', 'puseram'],
    gerundio: 'pondo',
    participio: 'posto',
  },
  ver: {
    infinitivo: 'ver',
    presente: ['vejo', 'vês', 'vê', 'vemos', 'vedes', 'veem'],
    preterito: ['vi', 'viste', 'viu', 'vimos', 'vistes', 'viram'],
    gerundio: 'vendo',
    participio: 'visto',
  },
  vir: {
    infinitivo: 'vir',
    presente: ['venho', 'vens', 'vem', 'vimos', 'vindes', 'vêm'],
    preterito: ['vim', 'vieste', 'veio', 'viemos', 'viestes', 'vieram'],
    gerundio: 'vindo',
    participio: 'vindo',
  },
  dar: {
    infinitivo: 'dar',
    presente: ['dou', 'dás', 'dá', 'damos', 'dais', 'dão'],
    preterito: ['dei', 'deste', 'deu', 'demos', 'destes', 'deram'],
    gerundio: 'dando',
    participio: 'dado',
  },
  saber: {
    infinitivo: 'saber',
    presente: ['sei', 'sabes', 'sabe', 'sabemos', 'sabeis', 'sabem'],
    preterito: ['soube', 'soubeste', 'soube', 'soubemos', 'soubestes', 'souberam'],
    gerundio: 'sabendo',
    participio: 'sabido',
  },
  querer: {
    infinitivo: 'querer',
    presente: ['quero', 'queres', 'quer', 'queremos', 'quereis', 'querem'],
    preterito: ['quis', 'quiseste', 'quis', 'quisemos', 'quisestes', 'quiseram'],
    gerundio: 'querendo',
    participio: 'querido',
  },
};

// Mapa de formas conjugadas para infinitivos (para lematização rápida)
export const conjugatedToInfinitive: Record<string, string> = {};

// Popular o mapa automaticamente
Object.entries(irregularVerbs).forEach(([infinitive, forms]) => {
  // Adicionar todas as formas conjugadas
  forms.presente.forEach(form => conjugatedToInfinitive[form] = infinitive);
  forms.preterito.forEach(form => conjugatedToInfinitive[form] = infinitive);
  if (forms.imperfeito) {
    forms.imperfeito.forEach(form => conjugatedToInfinitive[form] = infinitive);
  }
  if (forms.futuro) {
    forms.futuro.forEach(form => conjugatedToInfinitive[form] = infinitive);
  }
  conjugatedToInfinitive[forms.gerundio] = infinitive;
  conjugatedToInfinitive[forms.participio] = infinitive;
  conjugatedToInfinitive[infinitive] = infinitive;
});

// Classes acionais dos verbos (aspecto lexical)
export const verbalAspect = {
  // Verbos perfectivos (ação pontual, com término definido)
  perfectivo: [
    'chegar', 'sair', 'nascer', 'morrer', 'encontrar', 'começar', 
    'terminar', 'partir', 'cair', 'quebrar', 'explodir'
  ],
  
  // Verbos imperfectivos (ação durativa, sem término definido)
  imperfectivo: [
    'correr', 'trabalhar', 'viver', 'estudar', 'cantar', 'dançar',
    'nadar', 'caminhar', 'falar', 'escrever', 'ler', 'jogar'
  ],
  
  // Verbos estativos (estado, não ação)
  estativo: [
    'ser', 'estar', 'ter', 'haver', 'existir', 'parecer', 'ficar',
    'permanecer', 'conhecer', 'saber', 'amar', 'gostar', 'odiar'
  ],
  
  // Verbos de mudança de estado
  mudancaEstado: [
    'tornar', 'virar', 'transformar', 'converter', 'mudar', 'crescer',
    'envelhecer', 'amadurecer', 'apodrecer', 'secar', 'molhar'
  ],
};

// Verbos de ligação (copulativos)
export const linkingVerbs = [
  'ser', 'estar', 'ficar', 'permanecer', 'continuar', 'andar',
  'parecer', 'tornar', 'virar', 'revelar-se', 'mostrar-se'
];

// Verbos auxiliares (para construções perifrásticas)
export const auxiliaryVerbs = [
  'ter', 'haver', 'ser', 'estar', 'ir', 'vir', 'ficar', 'andar',
  'começar', 'continuar', 'terminar', 'acabar', 'deixar', 'parar',
  'poder', 'dever', 'querer', 'precisar', 'necessitar', 'costumar'
];

// Sufixos verbalizadores (formam verbos a partir de outras classes)
export const verbalizingSuffixes = [
  'izar', 'ear', 'ejar', 'itar', 'ecer', 'escer', 'ficar', 'ificar'
];

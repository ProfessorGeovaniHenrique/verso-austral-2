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

// Verbos irregulares mais comuns do português brasileiro (50+ formas)
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
    imperfeito: ['estava', 'estavas', 'estava', 'estávamos', 'estáveis', 'estavam'],
    gerundio: 'estando',
    participio: 'estado',
  },
  ter: {
    infinitivo: 'ter',
    presente: ['tenho', 'tens', 'tem', 'temos', 'tendes', 'têm'],
    preterito: ['tive', 'tiveste', 'teve', 'tivemos', 'tivestes', 'tiveram'],
    imperfeito: ['tinha', 'tinhas', 'tinha', 'tínhamos', 'tínheis', 'tinham'],
    gerundio: 'tendo',
    participio: 'tido',
  },
  haver: {
    infinitivo: 'haver',
    presente: ['hei', 'hás', 'há', 'havemos', 'haveis', 'hão'],
    preterito: ['houve', 'houveste', 'houve', 'houvemos', 'houvestes', 'houveram'],
    imperfeito: ['havia', 'havias', 'havia', 'havíamos', 'havíeis', 'haviam'],
    gerundio: 'havendo',
    participio: 'havido',
  },
  
  // Verbos de movimento
  ir: {
    infinitivo: 'ir',
    presente: ['vou', 'vais', 'vai', 'vamos', 'ides', 'vão'],
    preterito: ['fui', 'foste', 'foi', 'fomos', 'fostes', 'foram'],
    imperfeito: ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'],
    gerundio: 'indo',
    participio: 'ido',
  },
  vir: {
    infinitivo: 'vir',
    presente: ['venho', 'vens', 'vem', 'vimos', 'vindes', 'vêm'],
    preterito: ['vim', 'vieste', 'veio', 'viemos', 'viestes', 'vieram'],
    imperfeito: ['vinha', 'vinhas', 'vinha', 'vínhamos', 'vínheis', 'vinham'],
    gerundio: 'vindo',
    participio: 'vindo',
  },
  sair: {
    infinitivo: 'sair',
    presente: ['saio', 'sais', 'sai', 'saímos', 'saís', 'saem'],
    preterito: ['saí', 'saíste', 'saiu', 'saímos', 'saístes', 'saíram'],
    gerundio: 'saindo',
    participio: 'saído',
  },
  cair: {
    infinitivo: 'cair',
    presente: ['caio', 'cais', 'cai', 'caímos', 'caís', 'caem'],
    preterito: ['caí', 'caíste', 'caiu', 'caímos', 'caístes', 'caíram'],
    gerundio: 'caindo',
    participio: 'caído',
  },
  
  // Verbos de ação
  fazer: {
    infinitivo: 'fazer',
    presente: ['faço', 'fazes', 'faz', 'fazemos', 'fazeis', 'fazem'],
    preterito: ['fiz', 'fizeste', 'fez', 'fizemos', 'fizestes', 'fizeram'],
    imperfeito: ['fazia', 'fazias', 'fazia', 'fazíamos', 'fazíeis', 'faziam'],
    gerundio: 'fazendo',
    participio: 'feito',
  },
  dizer: {
    infinitivo: 'dizer',
    presente: ['digo', 'dizes', 'diz', 'dizemos', 'dizeis', 'dizem'],
    preterito: ['disse', 'disseste', 'disse', 'dissemos', 'dissestes', 'disseram'],
    imperfeito: ['dizia', 'dizias', 'dizia', 'dizíamos', 'dizíeis', 'diziam'],
    gerundio: 'dizendo',
    participio: 'dito',
  },
  trazer: {
    infinitivo: 'trazer',
    presente: ['trago', 'trazes', 'traz', 'trazemos', 'trazeis', 'trazem'],
    preterito: ['trouxe', 'trouxeste', 'trouxe', 'trouxemos', 'trouxestes', 'trouxeram'],
    imperfeito: ['trazia', 'trazias', 'trazia', 'trazíamos', 'trazíeis', 'traziam'],
    gerundio: 'trazendo',
    participio: 'trazido',
  },
  pôr: {
    infinitivo: 'pôr',
    presente: ['ponho', 'pões', 'põe', 'pomos', 'pondes', 'põem'],
    preterito: ['pus', 'puseste', 'pôs', 'pusemos', 'pusestes', 'puseram'],
    imperfeito: ['punha', 'punhas', 'punha', 'púnhamos', 'púnheis', 'punham'],
    gerundio: 'pondo',
    participio: 'posto',
  },
  
  // Verbos modais e de percepção
  poder: {
    infinitivo: 'poder',
    presente: ['posso', 'podes', 'pode', 'podemos', 'podeis', 'podem'],
    preterito: ['pude', 'pudeste', 'pôde', 'pudemos', 'pudestes', 'puderam'],
    imperfeito: ['podia', 'podias', 'podia', 'podíamos', 'podíeis', 'podiam'],
    gerundio: 'podendo',
    participio: 'podido',
  },
  ver: {
    infinitivo: 'ver',
    presente: ['vejo', 'vês', 'vê', 'vemos', 'vedes', 'veem'],
    preterito: ['vi', 'viste', 'viu', 'vimos', 'vistes', 'viram'],
    imperfeito: ['via', 'vias', 'via', 'víamos', 'víeis', 'viam'],
    gerundio: 'vendo',
    participio: 'visto',
  },
  dar: {
    infinitivo: 'dar',
    presente: ['dou', 'dás', 'dá', 'damos', 'dais', 'dão'],
    preterito: ['dei', 'deste', 'deu', 'demos', 'destes', 'deram'],
    imperfeito: ['dava', 'davas', 'dava', 'dávamos', 'dáveis', 'davam'],
    gerundio: 'dando',
    participio: 'dado',
  },
  saber: {
    infinitivo: 'saber',
    presente: ['sei', 'sabes', 'sabe', 'sabemos', 'sabeis', 'sabem'],
    preterito: ['soube', 'soubeste', 'soube', 'soubemos', 'soubestes', 'souberam'],
    imperfeito: ['sabia', 'sabias', 'sabia', 'sabíamos', 'sabíeis', 'sabiam'],
    gerundio: 'sabendo',
    participio: 'sabido',
  },
  querer: {
    infinitivo: 'querer',
    presente: ['quero', 'queres', 'quer', 'queremos', 'quereis', 'querem'],
    preterito: ['quis', 'quiseste', 'quis', 'quisemos', 'quisestes', 'quiseram'],
    imperfeito: ['queria', 'querias', 'queria', 'queríamos', 'queríeis', 'queriam'],
    gerundio: 'querendo',
    participio: 'querido',
  },
  
  // Verbos derivados de pôr
  compor: {
    infinitivo: 'compor',
    presente: ['componho', 'compões', 'compõe', 'compomos', 'compondes', 'compõem'],
    preterito: ['compus', 'compuseste', 'compôs', 'compusemos', 'compusestes', 'compuseram'],
    gerundio: 'compondo',
    participio: 'composto',
  },
  dispor: {
    infinitivo: 'dispor',
    presente: ['disponho', 'dispões', 'dispõe', 'dispomos', 'dispondes', 'dispõem'],
    preterito: ['dispus', 'dispuseste', 'dispôs', 'dispusemos', 'dispusestes', 'dispuseram'],
    gerundio: 'dispondo',
    participio: 'disposto',
  },
  propor: {
    infinitivo: 'propor',
    presente: ['proponho', 'propões', 'propõe', 'propomos', 'propondes', 'propõem'],
    preterito: ['propus', 'propuseste', 'propôs', 'propusemos', 'propusestes', 'propuseram'],
    gerundio: 'propondo',
    participio: 'proposto',
  },
  
  // Verbos derivados de ter
  conter: {
    infinitivo: 'conter',
    presente: ['contenho', 'conténs', 'contém', 'contemos', 'contendes', 'contêm'],
    preterito: ['contive', 'contiveste', 'conteve', 'contivemos', 'contivestes', 'contiveram'],
    gerundio: 'contendo',
    participio: 'contido',
  },
  manter: {
    infinitivo: 'manter',
    presente: ['mantenho', 'manténs', 'mantém', 'mantemos', 'mantendes', 'mantêm'],
    preterito: ['mantive', 'mantiveste', 'manteve', 'mantivemos', 'mantivestes', 'mantiveram'],
    gerundio: 'mantendo',
    participio: 'mantido',
  },
  obter: {
    infinitivo: 'obter',
    presente: ['obtenho', 'obténs', 'obtém', 'obtemos', 'obtendes', 'obtêm'],
    preterito: ['obtive', 'obtiveste', 'obteve', 'obtivemos', 'obtivestes', 'obtiveram'],
    gerundio: 'obtendo',
    participio: 'obtido',
  },
  
  // Verbos derivados de vir
  convir: {
    infinitivo: 'convir',
    presente: ['convenho', 'convéns', 'convém', 'convimos', 'convindes', 'convêm'],
    preterito: ['convim', 'convieste', 'conveio', 'conviemos', 'conviestes', 'convieram'],
    gerundio: 'convindo',
    participio: 'convindo',
  },
  intervir: {
    infinitivo: 'intervir',
    presente: ['intervenho', 'intervéns', 'intervém', 'intervimos', 'intervindes', 'intervêm'],
    preterito: ['intervim', 'intervieste', 'interveio', 'interviemos', 'interviestes', 'intervieram'],
    gerundio: 'intervindo',
    participio: 'intervindo',
  },
  
  // Verbos com alternância vocálica
  perder: {
    infinitivo: 'perder',
    presente: ['perco', 'perdes', 'perde', 'perdemos', 'perdeis', 'perdem'],
    preterito: ['perdi', 'perdeste', 'perdeu', 'perdemos', 'perdestes', 'perderam'],
    gerundio: 'perdendo',
    participio: 'perdido',
  },
  pedir: {
    infinitivo: 'pedir',
    presente: ['peço', 'pedes', 'pede', 'pedimos', 'pedis', 'pedem'],
    preterito: ['pedi', 'pediste', 'pediu', 'pedimos', 'pedistes', 'pediram'],
    gerundio: 'pedindo',
    participio: 'pedido',
  },
  medir: {
    infinitivo: 'medir',
    presente: ['meço', 'medes', 'mede', 'medimos', 'medis', 'medem'],
    preterito: ['medi', 'mediste', 'mediu', 'medimos', 'medistes', 'mediram'],
    gerundio: 'medindo',
    participio: 'medido',
  },
  ouvir: {
    infinitivo: 'ouvir',
    presente: ['ouço', 'ouves', 'ouve', 'ouvimos', 'ouvis', 'ouvem'],
    preterito: ['ouvi', 'ouviste', 'ouviu', 'ouvimos', 'ouvistes', 'ouviram'],
    gerundio: 'ouvindo',
    participio: 'ouvido',
  },
  dormir: {
    infinitivo: 'dormir',
    presente: ['durmo', 'dormes', 'dorme', 'dormimos', 'dormis', 'dormem'],
    preterito: ['dormi', 'dormiste', 'dormiu', 'dormimos', 'dormistes', 'dormiram'],
    gerundio: 'dormindo',
    participio: 'dormido',
  },
  subir: {
    infinitivo: 'subir',
    presente: ['subo', 'sobes', 'sobe', 'subimos', 'subis', 'sobem'],
    preterito: ['subi', 'subiste', 'subiu', 'subimos', 'subistes', 'subiram'],
    gerundio: 'subindo',
    participio: 'subido',
  },
  
  // Verbos com particípio duplo
  aceitar: {
    infinitivo: 'aceitar',
    presente: ['aceito', 'aceitas', 'aceita', 'aceitamos', 'aceitais', 'aceitam'],
    preterito: ['aceitei', 'aceitaste', 'aceitou', 'aceitamos', 'aceitastes', 'aceitaram'],
    gerundio: 'aceitando',
    participio: 'aceito', // também: aceitado
  },
  entregar: {
    infinitivo: 'entregar',
    presente: ['entrego', 'entregas', 'entrega', 'entregamos', 'entregais', 'entregam'],
    preterito: ['entreguei', 'entregaste', 'entregou', 'entregamos', 'entregastes', 'entregaram'],
    gerundio: 'entregando',
    participio: 'entregue', // também: entregado
  },
  ganhar: {
    infinitivo: 'ganhar',
    presente: ['ganho', 'ganhas', 'ganha', 'ganhamos', 'ganhais', 'ganham'],
    preterito: ['ganhei', 'ganhaste', 'ganhou', 'ganhamos', 'ganhastes', 'ganharam'],
    gerundio: 'ganhando',
    participio: 'ganho', // também: ganhado
  },
  gastar: {
    infinitivo: 'gastar',
    presente: ['gasto', 'gastas', 'gasta', 'gastamos', 'gastais', 'gastam'],
    preterito: ['gastei', 'gastaste', 'gastou', 'gastamos', 'gastastes', 'gastaram'],
    gerundio: 'gastando',
    participio: 'gasto', // também: gastado
  },
  pagar: {
    infinitivo: 'pagar',
    presente: ['pago', 'pagas', 'paga', 'pagamos', 'pagais', 'pagam'],
    preterito: ['paguei', 'pagaste', 'pagou', 'pagamos', 'pagastes', 'pagaram'],
    gerundio: 'pagando',
    participio: 'pago', // também: pagado
  },
  
  // Verbos reflexivos comuns
  chamar: {
    infinitivo: 'chamar',
    presente: ['chamo', 'chamas', 'chama', 'chamamos', 'chamais', 'chamam'],
    preterito: ['chamei', 'chamaste', 'chamou', 'chamamos', 'chamastes', 'chamaram'],
    gerundio: 'chamando',
    participio: 'chamado',
  },
  sentir: {
    infinitivo: 'sentir',
    presente: ['sinto', 'sentes', 'sente', 'sentimos', 'sentis', 'sentem'],
    preterito: ['senti', 'sentiste', 'sentiu', 'sentimos', 'sentistes', 'sentiram'],
    gerundio: 'sentindo',
    participio: 'sentido',
  },
  
  // Verbos regionais gauchescos
  campear: {
    infinitivo: 'campear',
    presente: ['campeio', 'campeias', 'campeia', 'campeamos', 'campeais', 'campeiam'],
    preterito: ['campeei', 'campeaste', 'campeou', 'campeamos', 'campeastes', 'campearam'],
    gerundio: 'campeando',
    participio: 'campeado',
    radical: 'Trabalho de campo, lida campeira',
  },
  laçar: {
    infinitivo: 'laçar',
    presente: ['laço', 'laças', 'laça', 'laçamos', 'laçais', 'laçam'],
    preterito: ['lacei', 'laçaste', 'laçou', 'laçamos', 'laçastes', 'laçaram'],
    gerundio: 'laçando',
    participio: 'laçado',
    radical: 'Prender com laço',
  },
  tropear: {
    infinitivo: 'tropear',
    presente: ['tropeio', 'tropeias', 'tropeia', 'tropeamos', 'tropeais', 'tropeiam'],
    preterito: ['tropeei', 'tropeaste', 'tropeou', 'tropeamos', 'tropeastes', 'tropearam'],
    gerundio: 'tropeando',
    participio: 'tropeado',
    radical: 'Conduzir tropa',
  },
  domar: {
    infinitivo: 'domar',
    presente: ['domo', 'domas', 'doma', 'domamos', 'domais', 'domam'],
    preterito: ['domei', 'domaste', 'domou', 'domamos', 'domastes', 'domaram'],
    gerundio: 'domando',
    participio: 'domado',
    radical: 'Amansar cavalo',
  },
  marcar: {
    infinitivo: 'marcar',
    presente: ['marco', 'marcas', 'marca', 'marcamos', 'marcais', 'marcam'],
    preterito: ['marquei', 'marcaste', 'marcou', 'marcamos', 'marcastes', 'marcaram'],
    gerundio: 'marcando',
    participio: 'marcado',
    radical: 'Marcar gado a ferro',
  },
  galopar: {
    infinitivo: 'galopar',
    presente: ['galopo', 'galopas', 'galopa', 'galopamos', 'galopais', 'galopam'],
    preterito: ['galopei', 'galopaste', 'galopou', 'galopamos', 'galopastes', 'galoparam'],
    gerundio: 'galopando',
    participio: 'galopado',
  },
  cavalgar: {
    infinitivo: 'cavalgar',
    presente: ['cavalgo', 'cavalgas', 'cavalga', 'cavalgamos', 'cavalgais', 'cavalgam'],
    preterito: ['cavalguei', 'cavalgaste', 'cavalgou', 'cavalgamos', 'cavalgastes', 'cavalgaram'],
    gerundio: 'cavalgando',
    participio: 'cavalgado',
  },
  
  // Verbos de comunicação
  contar: {
    infinitivo: 'contar',
    presente: ['conto', 'contas', 'conta', 'contamos', 'contais', 'contam'],
    preterito: ['contei', 'contaste', 'contou', 'contamos', 'contastes', 'contaram'],
    gerundio: 'contando',
    participio: 'contado',
  },
  cantar: {
    infinitivo: 'cantar',
    presente: ['canto', 'cantas', 'canta', 'cantamos', 'cantais', 'cantam'],
    preterito: ['cantei', 'cantaste', 'cantou', 'cantamos', 'cantastes', 'cantaram'],
    gerundio: 'cantando',
    participio: 'cantado',
  },
  tocar: {
    infinitivo: 'tocar',
    presente: ['toco', 'tocas', 'toca', 'tocamos', 'tocais', 'tocam'],
    preterito: ['toquei', 'tocaste', 'tocou', 'tocamos', 'tocastes', 'tocaram'],
    gerundio: 'tocando',
    participio: 'tocado',
  },
  
  // Verbos de emoção
  amar: {
    infinitivo: 'amar',
    presente: ['amo', 'amas', 'ama', 'amamos', 'amais', 'amam'],
    preterito: ['amei', 'amaste', 'amou', 'amamos', 'amastes', 'amaram'],
    gerundio: 'amando',
    participio: 'amado',
  },
  sofrer: {
    infinitivo: 'sofrer',
    presente: ['sofro', 'sofres', 'sofre', 'sofremos', 'sofreis', 'sofrem'],
    preterito: ['sofri', 'sofreste', 'sofreu', 'sofremos', 'sofrestes', 'sofreram'],
    gerundio: 'sofrendo',
    participio: 'sofrido',
  },
  chorar: {
    infinitivo: 'chorar',
    presente: ['choro', 'choras', 'chora', 'choramos', 'chorais', 'choram'],
    preterito: ['chorei', 'choraste', 'chorou', 'choramos', 'chorastes', 'choraram'],
    gerundio: 'chorando',
    participio: 'chorado',
  },
  
  // Verbos de transformação
  crescer: {
    infinitivo: 'crescer',
    presente: ['cresço', 'cresces', 'cresce', 'crescemos', 'cresceis', 'crescem'],
    preterito: ['cresci', 'cresceste', 'cresceu', 'crescemos', 'crescestes', 'cresceram'],
    gerundio: 'crescendo',
    participio: 'crescido',
  },
  nascer: {
    infinitivo: 'nascer',
    presente: ['nasço', 'nasces', 'nasce', 'nascemos', 'nasceis', 'nascem'],
    preterito: ['nasci', 'nasceste', 'nasceu', 'nascemos', 'nascestes', 'nasceram'],
    gerundio: 'nascendo',
    participio: 'nascido',
  },
  morrer: {
    infinitivo: 'morrer',
    presente: ['morro', 'morres', 'morre', 'morremos', 'morreis', 'morrem'],
    preterito: ['morri', 'morreste', 'morreu', 'morremos', 'morrestes', 'morreram'],
    gerundio: 'morrendo',
    participio: 'morto',
  },
  
  // Verbos de conhecimento
  conhecer: {
    infinitivo: 'conhecer',
    presente: ['conheço', 'conheces', 'conhece', 'conhecemos', 'conheceis', 'conhecem'],
    preterito: ['conheci', 'conheceste', 'conheceu', 'conhecemos', 'conhecestes', 'conheceram'],
    gerundio: 'conhecendo',
    participio: 'conhecido',
  },
  aprender: {
    infinitivo: 'aprender',
    presente: ['aprendo', 'aprendes', 'aprende', 'aprendemos', 'aprendeis', 'aprendem'],
    preterito: ['aprendi', 'aprendeste', 'aprendeu', 'aprendemos', 'aprendestes', 'aprenderam'],
    gerundio: 'aprendendo',
    participio: 'aprendido',
  },
  
  // Verbos de posição
  ficar: {
    infinitivo: 'ficar',
    presente: ['fico', 'ficas', 'fica', 'ficamos', 'ficais', 'ficam'],
    preterito: ['fiquei', 'ficaste', 'ficou', 'ficamos', 'ficastes', 'ficaram'],
    gerundio: 'ficando',
    participio: 'ficado',
  },
  chegar: {
    infinitivo: 'chegar',
    presente: ['chego', 'chegas', 'chega', 'chegamos', 'chegais', 'chegam'],
    preterito: ['cheguei', 'chegaste', 'chegou', 'chegamos', 'chegastes', 'chegaram'],
    gerundio: 'chegando',
    participio: 'chegado',
  },
  partir: {
    infinitivo: 'partir',
    presente: ['parto', 'partes', 'parte', 'partimos', 'partis', 'partem'],
    preterito: ['parti', 'partiste', 'partiu', 'partimos', 'partistes', 'partiram'],
    gerundio: 'partindo',
    participio: 'partido',
  },
  voltar: {
    infinitivo: 'voltar',
    presente: ['volto', 'voltas', 'volta', 'voltamos', 'voltais', 'voltam'],
    preterito: ['voltei', 'voltaste', 'voltou', 'voltamos', 'voltastes', 'voltaram'],
    gerundio: 'voltando',
    participio: 'voltado',
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

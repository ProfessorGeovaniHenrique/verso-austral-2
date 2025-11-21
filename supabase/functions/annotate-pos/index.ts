// Deno Edge Runtime - POS Tagging with Expanded Grammar Rules (50+ irregular verbs)

import { RateLimiter, addRateLimitHeaders } from "../_shared/rateLimiter.ts";
import { EdgeFunctionLogger } from "../_shared/logger.ts";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface POSToken {
  palavra: string;
  lema: string;
  pos: string;
  posDetalhada: string;
  features: Record<string, string>;
  posicao: number;
}

// ============= EXPANDED KNOWLEDGE BASE: 50+ IRREGULAR VERBS =============

const IRREGULAR_VERBS: Record<string, { infinitivo: string; forms: string[] }> = {
  // Auxiliares
  'ser': { infinitivo: 'ser', forms: ['sou', 'és', 'é', 'somos', 'são', 'fui', 'foi', 'foram', 'era', 'eram', 'sendo', 'sido', 'serei'] },
  'estar': { infinitivo: 'estar', forms: ['estou', 'está', 'estão', 'estive', 'esteve', 'estava', 'estavam', 'estando', 'estado'] },
  'ter': { infinitivo: 'ter', forms: ['tenho', 'tens', 'tem', 'temos', 'têm', 'tive', 'teve', 'tinha', 'tinham', 'tendo', 'tido'] },
  'haver': { infinitivo: 'haver', forms: ['hei', 'há', 'hão', 'houve', 'havia', 'havendo', 'havido'] },
  
  // Movimento
  'ir': { infinitivo: 'ir', forms: ['vou', 'vai', 'vamos', 'vão', 'fui', 'foi', 'foram', 'ia', 'iam', 'indo', 'ido'] },
  'vir': { infinitivo: 'vir', forms: ['venho', 'vem', 'vêm', 'vim', 'veio', 'vinha', 'vinham', 'vindo'] },
  'sair': { infinitivo: 'sair', forms: ['saio', 'sai', 'saem', 'saí', 'saiu', 'saindo', 'saído'] },
  'cair': { infinitivo: 'cair', forms: ['caio', 'cai', 'caem', 'caí', 'caiu', 'caindo', 'caído'] },
  'chegar': { infinitivo: 'chegar', forms: ['chego', 'chega', 'chegam', 'cheguei', 'chegou', 'chegando', 'chegado'] },
  'partir': { infinitivo: 'partir', forms: ['parto', 'parte', 'partem', 'parti', 'partiu', 'partindo', 'partido'] },
  'voltar': { infinitivo: 'voltar', forms: ['volto', 'volta', 'voltam', 'voltei', 'voltou', 'voltando', 'voltado'] },
  
  // Ação
  'fazer': { infinitivo: 'fazer', forms: ['faço', 'faz', 'fazem', 'fiz', 'fez', 'fizeram', 'fazia', 'fazendo', 'feito'] },
  'dizer': { infinitivo: 'dizer', forms: ['digo', 'diz', 'dizem', 'disse', 'disseram', 'dizia', 'dizendo', 'dito'] },
  'trazer': { infinitivo: 'trazer', forms: ['trago', 'traz', 'trazem', 'trouxe', 'trouxeram', 'trazia', 'trazendo', 'trazido'] },
  'pôr': { infinitivo: 'pôr', forms: ['ponho', 'põe', 'põem', 'pus', 'pôs', 'puseram', 'punha', 'pondo', 'posto'] },
  
  // Derivados de pôr
  'compor': { infinitivo: 'compor', forms: ['componho', 'compõe', 'compõem', 'compus', 'compondo', 'composto'] },
  'dispor': { infinitivo: 'dispor', forms: ['disponho', 'dispõe', 'dispõem', 'dispus', 'dispondo', 'disposto'] },
  'propor': { infinitivo: 'propor', forms: ['proponho', 'propõe', 'propõem', 'propus', 'propondo', 'proposto'] },
  
  // Derivados de ter
  'conter': { infinitivo: 'conter', forms: ['contenho', 'contém', 'contêm', 'contive', 'conteve', 'contendo', 'contido'] },
  'manter': { infinitivo: 'manter', forms: ['mantenho', 'mantém', 'mantêm', 'mantive', 'manteve', 'mantendo', 'mantido'] },
  'obter': { infinitivo: 'obter', forms: ['obtenho', 'obtém', 'obtêm', 'obtive', 'obteve', 'obtendo', 'obtido'] },
  
  // Derivados de vir
  'convir': { infinitivo: 'convir', forms: ['convenho', 'convém', 'convêm', 'convim', 'conveio', 'convindo'] },
  'intervir': { infinitivo: 'intervir', forms: ['intervenho', 'intervém', 'intervêm', 'intervim', 'interveio', 'intervindo'] },
  
  // Modais
  'poder': { infinitivo: 'poder', forms: ['posso', 'pode', 'podem', 'pude', 'pôde', 'podia', 'podiam', 'podendo', 'podido'] },
  'ver': { infinitivo: 'ver', forms: ['vejo', 'vê', 'veem', 'vi', 'viu', 'viram', 'via', 'viam', 'vendo', 'visto'] },
  'dar': { infinitivo: 'dar', forms: ['dou', 'dá', 'dão', 'dei', 'deu', 'deram', 'dava', 'davam', 'dando', 'dado'] },
  'saber': { infinitivo: 'saber', forms: ['sei', 'sabe', 'sabem', 'soube', 'souberam', 'sabia', 'sabendo', 'sabido'] },
  'querer': { infinitivo: 'querer', forms: ['quero', 'quer', 'querem', 'quis', 'quiseram', 'queria', 'querendo', 'querido'] },
  
  // Alternância vocálica
  'perder': { infinitivo: 'perder', forms: ['perco', 'perde', 'perdem', 'perdi', 'perdeu', 'perdendo', 'perdido'] },
  'pedir': { infinitivo: 'pedir', forms: ['peço', 'pede', 'pedem', 'pedi', 'pediu', 'pedindo', 'pedido'] },
  'medir': { infinitivo: 'medir', forms: ['meço', 'mede', 'medem', 'medi', 'mediu', 'medindo', 'medido'] },
  'ouvir': { infinitivo: 'ouvir', forms: ['ouço', 'ouve', 'ouvem', 'ouvi', 'ouviu', 'ouvindo', 'ouvido'] },
  'dormir': { infinitivo: 'dormir', forms: ['durmo', 'dorme', 'dormem', 'dormi', 'dormiu', 'dormindo', 'dormido'] },
  'subir': { infinitivo: 'subir', forms: ['subo', 'sobe', 'sobem', 'subi', 'subiu', 'subindo', 'subido'] },
  
  // Particípio duplo
  'aceitar': { infinitivo: 'aceitar', forms: ['aceito', 'aceita', 'aceitam', 'aceitei', 'aceitou', 'aceitando', 'aceito'] },
  'entregar': { infinitivo: 'entregar', forms: ['entrego', 'entrega', 'entregam', 'entreguei', 'entregou', 'entregando', 'entregue'] },
  'ganhar': { infinitivo: 'ganhar', forms: ['ganho', 'ganha', 'ganham', 'ganhei', 'ganhou', 'ganhando', 'ganho'] },
  'gastar': { infinitivo: 'gastar', forms: ['gasto', 'gasta', 'gastam', 'gastei', 'gastou', 'gastando', 'gasto'] },
  'pagar': { infinitivo: 'pagar', forms: ['pago', 'paga', 'pagam', 'paguei', 'pagou', 'pagando', 'pago'] },
  
  // Comuns
  'chamar': { infinitivo: 'chamar', forms: ['chamo', 'chama', 'chamam', 'chamei', 'chamou', 'chamando', 'chamado'] },
  'sentir': { infinitivo: 'sentir', forms: ['sinto', 'sente', 'sentem', 'senti', 'sentiu', 'sentindo', 'sentido'] },
  'ficar': { infinitivo: 'ficar', forms: ['fico', 'fica', 'ficam', 'fiquei', 'ficou', 'ficando', 'ficado'] },
  
  // Transformação
  'crescer': { infinitivo: 'crescer', forms: ['cresço', 'cresce', 'crescem', 'cresci', 'cresceu', 'crescendo', 'crescido'] },
  'nascer': { infinitivo: 'nascer', forms: ['nasço', 'nasce', 'nascem', 'nasci', 'nasceu', 'nascendo', 'nascido'] },
  'morrer': { infinitivo: 'morrer', forms: ['morro', 'morre', 'morrem', 'morri', 'morreu', 'morrendo', 'morto'] },
  'conhecer': { infinitivo: 'conhecer', forms: ['conheço', 'conhece', 'conhecem', 'conheci', 'conheceu', 'conhecendo', 'conhecido'] },
  'aprender': { infinitivo: 'aprender', forms: ['aprendo', 'aprende', 'aprendem', 'aprendi', 'aprendeu', 'aprendendo', 'aprendido'] },
  
  // Comunicação/Arte
  'contar': { infinitivo: 'contar', forms: ['conto', 'conta', 'contam', 'contei', 'contou', 'contando', 'contado'] },
  'cantar': { infinitivo: 'cantar', forms: ['canto', 'canta', 'cantam', 'cantei', 'cantou', 'cantaram', 'cantando', 'cantado'] },
  'tocar': { infinitivo: 'tocar', forms: ['toco', 'toca', 'tocam', 'toquei', 'tocou', 'tocaram', 'tocando', 'tocado'] },
  
  // Emoção
  'amar': { infinitivo: 'amar', forms: ['amo', 'ama', 'amam', 'amei', 'amou', 'amaram', 'amando', 'amado'] },
  'sofrer': { infinitivo: 'sofrer', forms: ['sofro', 'sofre', 'sofrem', 'sofri', 'sofreu', 'sofreram', 'sofrendo', 'sofrido'] },
  'chorar': { infinitivo: 'chorar', forms: ['choro', 'chora', 'choram', 'chorei', 'chorou', 'choraram', 'chorando', 'chorado'] },
  
  // ========== VERBOS REGIONAIS GAUCHESCOS ==========
  'campear': { infinitivo: 'campear', forms: ['campeio', 'campeia', 'campeiam', 'campeei', 'campeou', 'campearam', 'campeando', 'campeado'] },
  'laçar': { infinitivo: 'laçar', forms: ['laço', 'laça', 'laçam', 'lacei', 'laçou', 'laçaram', 'laçando', 'laçado'] },
  'tropear': { infinitivo: 'tropear', forms: ['tropeio', 'tropeia', 'tropeiam', 'tropeei', 'tropeou', 'tropearam', 'tropeando', 'tropeado'] },
  'domar': { infinitivo: 'domar', forms: ['domo', 'doma', 'domam', 'domei', 'domou', 'domaram', 'domando', 'domado'] },
  'marcar': { infinitivo: 'marcar', forms: ['marco', 'marca', 'marcam', 'marquei', 'marcou', 'marcaram', 'marcando', 'marcado'] },
  'galopar': { infinitivo: 'galopar', forms: ['galopo', 'galopa', 'galopam', 'galopei', 'galopou', 'galoparam', 'galopando', 'galopado'] },
  'cavalgar': { infinitivo: 'cavalgar', forms: ['cavalgo', 'cavalga', 'cavalgam', 'cavalguei', 'cavalgou', 'cavalgaram', 'cavalgando', 'cavalgado'] },
};

// Mapa de lematização instantânea
const CONJUGATED_TO_INFINITIVE: Record<string, string> = {};
Object.entries(IRREGULAR_VERBS).forEach(([inf, data]) => {
  data.forms.forEach(form => CONJUGATED_TO_INFINITIVE[form] = inf);
  CONJUGATED_TO_INFINITIVE[inf] = inf;
});

const AUXILIARY_VERBS = new Set(['ter', 'haver', 'ser', 'estar', 'ir', 'vir', 'poder', 'dever', 'querer']);
const PRONOUNS = {
  pessoais: new Set(['eu', 'tu', 'você', 'ele', 'ela', 'nós', 'eles', 'elas', 'a gente']),
  obliquos: new Set(['me', 'te', 'se', 'o', 'a', 'lhe', 'nos', 'vos', 'os', 'as', 'lhes']),
  possessivos: new Set(['meu', 'minha', 'teu', 'tua', 'seu', 'sua', 'nosso', 'nossa', 'meus', 'minhas', 'seus', 'suas']),
  demonstrativos: new Set(['este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'isto', 'isso', 'aquilo']),
  indefinidos: new Set(['algum', 'alguma', 'nenhum', 'nenhuma', 'todo', 'toda', 'outro', 'outra', 'muito', 'muita', 'pouco', 'pouca', 'alguém', 'ninguém', 'tudo', 'nada']),
  relativos: new Set(['que', 'quem', 'qual', 'onde', 'cujo', 'cuja']),
};
const DETERMINERS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']);
const PREPOSITIONS = new Set(['de', 'em', 'para', 'por', 'com', 'sem', 'sobre', 'até', 'desde', 'após', 'ante', 'contra', 'entre', 'perante', 'sob']);
const CONJUNCTIONS = {
  coordenativas: new Set(['e', 'ou', 'mas', 'porém', 'contudo', 'todavia', 'entretanto']),
  subordinativas: new Set(['que', 'se', 'porque', 'quando', 'como', 'embora', 'conquanto', 'caso']),
};
const ADVERBS = new Set(['não', 'sim', 'nunca', 'sempre', 'talvez', 'aqui', 'ali', 'lá', 'cá', 'hoje', 'ontem', 'amanhã', 'agora', 'já', 'ainda', 'logo', 'cedo', 'tarde', 'bem', 'mal', 'muito', 'pouco', 'mais', 'menos', 'bastante', 'demais', 'longe', 'perto', 'dentro', 'fora', 'acima', 'abaixo']);

console.log(`[annotate-pos] Base carregada: ${Object.keys(IRREGULAR_VERBS).length} verbos irregulares, ${Object.keys(CONJUGATED_TO_INFINITIVE).length} formas catalogadas`);

// ============= SERVER =============

Deno.serve(withInstrumentation('annotate-pos', async (req) => {
  // Health check endpoint - verifica query parameter
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.get('health') === 'true') {
    const health = await createHealthCheck('annotate-pos', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Inicializar logger
  const logger = new EdgeFunctionLogger('annotate-pos');

  try {
    // Rate Limiting (sempre por IP para esta função pública)
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkByIP(req, 10, 60); // 10 req/min

    if (!rateLimit.allowed) {
      await logger.logResponse(req, 429, {
        rateLimited: true,
        rateLimitRemaining: rateLimit.remaining
      });

      const errorResponse = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Limite de 10 requisições por minuto excedido. Tente novamente em ${rateLimit.resetAt - Math.floor(Date.now() / 1000)} segundos.`,
          resetAt: rateLimit.resetAt
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

      return addRateLimitHeaders(errorResponse, rateLimit);
    }

    // Log de início
    logger.logRequest(req);

    const { texto, idioma = 'pt' } = await req.json();

    if (!texto || typeof texto !== 'string') {
      await logger.logResponse(req, 400, {
        requestPayload: { texto: 'invalid' },
        error: new Error('Texto inválido')
      });

      return new Response(JSON.stringify({ error: 'Texto inválido' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[annotate-pos] Processando ${texto.length} caracteres (base expandida: 50+ verbos)`);
    const tokens = await processText(texto);
    console.log(`[annotate-pos] ${tokens.length} tokens processados`);

    // Log de sucesso
    await logger.logResponse(req, 200, {
      requestPayload: { texto: texto.substring(0, 100), idioma },
      responsePayload: { tokensCount: tokens.length },
      rateLimited: false,
      rateLimitRemaining: rateLimit.remaining
    });

    const successResponse = new Response(JSON.stringify({ tokens }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    return addRateLimitHeaders(successResponse, rateLimit);

  } catch (error) {
    console.error('[annotate-pos] Erro:', error);
    
    // Log de erro
    await logger.logResponse(req, 500, { error: error as Error });
    
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));

async function processText(texto: string): Promise<POSToken[]> {
  const words = texto.toLowerCase().replace(/[^\w\sáàâãéêíóôõúç\-]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const tokens: POSToken[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const palavra = words[i];
    const contexto = { anterior: i > 0 ? words[i - 1] : null, proximo: i < words.length - 1 ? words[i + 1] : null };
    const pos = inferPOS(palavra, contexto);
    const lema = lemmatize(palavra, pos);
    const features = inferFeatures(palavra, pos);
    tokens.push({ palavra, lema, pos, posDetalhada: pos, features, posicao: i });
  }
  
  return tokens;
}

function inferPOS(palavra: string, ctx: { anterior: string | null; proximo: string | null }): string {
  if (DETERMINERS.has(palavra)) return 'DET';
  if (PREPOSITIONS.has(palavra)) return 'ADP';
  if (CONJUNCTIONS.coordenativas.has(palavra) || CONJUNCTIONS.subordinativas.has(palavra)) {
    return CONJUNCTIONS.subordinativas.has(palavra) ? 'SCONJ' : 'CCONJ';
  }
  if (PRONOUNS.pessoais.has(palavra) || PRONOUNS.obliquos.has(palavra) || PRONOUNS.indefinidos.has(palavra) || PRONOUNS.relativos.has(palavra)) return 'PRON';
  if (PRONOUNS.possessivos.has(palavra) || PRONOUNS.demonstrativos.has(palavra)) return 'DET';
  if (ADVERBS.has(palavra)) return 'ADV';
  if (palavra.endsWith('mente')) return 'ADV';
  
  // VERBOS IRREGULARES (PRIORIDADE)
  if (CONJUGATED_TO_INFINITIVE[palavra]) {
    return AUXILIARY_VERBS.has(CONJUGATED_TO_INFINITIVE[palavra]) ? 'AUX' : 'VERB';
  }
  
  if (palavra.match(/(ando|endo|indo)$/)) return 'VERB';
  if (palavra.match(/(ado|ido)$/)) return 'VERB';
  if (palavra.match(/^(des|re|pre|sobre|sub)/) && palavra.match(/(ar|er|ir|ando|endo|indo|ado|ido)$/)) return 'VERB';
  if (palavra.match(/(ei|ou|amos|aram|ava|avam|rei|rá|rão)$/)) return 'VERB';
  
  if (ctx.anterior && DETERMINERS.has(ctx.anterior)) {
    if (palavra.match(/(oso|osa|ico|ica|al|ar|ário|ária|eiro|eira)$/)) return 'ADJ';
    return 'NOUN';
  }
  
  if (palavra.match(/(oso|osa|ável|ível|ante|ente|dor|dora)$/)) return 'ADJ';
  if (palavra.match(/(ção|mento|dade|ez|eza|ismo|ista|agem|ura|ância|ência)$/)) return 'NOUN';
  if (palavra.endsWith('s') && palavra.length > 2) {
    if (palavra.match(/(oso|osa|ico|ica|ável)s$/)) return 'ADJ';
    return 'NOUN';
  }
  
  return 'NOUN';
}

function lemmatize(palavra: string, pos: string): string {
  if (pos === 'VERB' || pos === 'AUX') {
    const lemma = CONJUGATED_TO_INFINITIVE[palavra];
    if (lemma) return lemma;
    
    if (palavra.endsWith('ando')) return palavra.slice(0, -4) + 'ar';
    if (palavra.endsWith('endo')) return palavra.slice(0, -4) + 'er';
    if (palavra.endsWith('indo')) return palavra.slice(0, -4) + 'ir';
    if (palavra.endsWith('ado')) return palavra.slice(0, -3) + 'ar';
    if (palavra.endsWith('ido')) return palavra.slice(0, -3) + 'ir';
    if (palavra.endsWith('ou')) return palavra.slice(0, -2) + 'ar';
    if (palavra.endsWith('eu')) return palavra.slice(0, -2) + 'er';
    if (palavra.endsWith('iu')) return palavra.slice(0, -2) + 'ir';
    if (palavra.endsWith('ava')) return palavra.slice(0, -3) + 'ar';
    if (palavra.endsWith('avam')) return palavra.slice(0, -4) + 'ar';
    if (palavra.endsWith('ia') && palavra.length > 3) return palavra.slice(0, -2) + 'er';
    if (palavra.endsWith('iam')) return palavra.slice(0, -3) + 'er';
    if (palavra.endsWith('o') && palavra.length > 2) return palavra.slice(0, -1) + 'ar';
  }
  
  if (pos === 'NOUN' || pos === 'ADJ') {
    if (palavra.endsWith('ões')) return palavra.slice(0, -3) + 'ão';
    if (palavra.endsWith('ães')) return palavra.slice(0, -3) + 'ão';
    if (palavra.endsWith('ãos')) return palavra.slice(0, -2);
    if (palavra.endsWith('ais')) return palavra.slice(0, -2) + 'al';
    if (palavra.endsWith('eis')) return palavra.slice(0, -2) + 'el';
    if (palavra.endsWith('óis')) return palavra.slice(0, -2) + 'ol';
    if (palavra.endsWith('is') && palavra.length > 3) return palavra.slice(0, -1);
    if (palavra.endsWith('es') && palavra.length > 3) return palavra.slice(0, -2);
    if (palavra.endsWith('s') && palavra.length > 2) return palavra.slice(0, -1);
  }
  
  if (pos === 'ADV' && palavra.endsWith('mente')) {
    const base = palavra.slice(0, -5);
    if (base.endsWith('a')) return base.slice(0, -1) + 'o';
    return base;
  }
  
  return palavra;
}

function inferFeatures(palavra: string, pos: string): Record<string, string> {
  const features: Record<string, string> = {};
  
  if (pos === 'VERB' || pos === 'AUX') {
    if (palavra.match(/(ando|endo|indo)$/)) features.VerbForm = 'Ger';
    else if (palavra.match(/(ado|ido)$/)) features.VerbForm = 'Part';
    else if (palavra.match(/(ei|ou|amos|aram|i|eu|iu)$/)) features.Tense = 'Past';
    else if (palavra.match(/(rei|rá|rão|remos)$/)) features.Tense = 'Fut';
    else if (palavra.match(/(va|vam|ia|iam)$/)) features.Tense = 'Imp';
    else features.Tense = 'Pres';
    
    if (palavra.endsWith('o') && !palavra.endsWith('ando')) {
      features.Person = '1';
      features.Number = 'Sing';
    } else if (palavra.match(/(amos|emos|imos)$/)) {
      features.Person = '1';
      features.Number = 'Plur';
    } else if (palavra.match(/(am|em)$/)) {
      features.Person = '3';
      features.Number = 'Plur';
    }
  }
  
  if (pos === 'NOUN' || pos === 'ADJ') {
    features.Number = palavra.endsWith('s') ? 'Plur' : 'Sing';
    if (palavra.match(/[ao]s?$/)) {
      features.Gender = palavra.match(/[a]s?$/) ? 'Fem' : 'Masc';
    }
  }
  
  return features;
}

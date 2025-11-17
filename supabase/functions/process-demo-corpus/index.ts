/**
 * 🎯 PROCESS DEMO CORPUS - MVP REFATORADO
 * 
 * Processa a música "Quando o Verso Vem pras Casa" e gera:
 * - Análises estatísticas (LL/MI scores)
 * - 6 Domínios semânticos centralizados
 * - Prosódia como string ("Positiva", "Negativa", "Neutra")
 * - Dados para visualizações consistentes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🎨 SISTEMA CENTRALIZADO DE CORES (inline para edge function)
const SEMANTIC_DOMAIN_COLORS = {
  "Cultura e Lida Gaúcha": "#24A65B",
  "Natureza e Paisagem": "#268BC8",
  "Sentimentos e Abstrações": "#8B5CF6",
  "Ações e Processos": "#FF9500",
  "Qualidades e Estados": "#EC4899",
  "Partes do Corpo e Seres Vivos": "#DC2626"
} as const;

// Corpus da música "Quando o Verso Vem pras Casa"
const DEMO_CORPUS = [
  { palavra: "verso", freq: 5 }, { palavra: "campo", freq: 2 }, { palavra: "coxilha", freq: 2 },
  { palavra: "saudade", freq: 2 }, { palavra: "tarumã", freq: 2 }, { palavra: "várzea", freq: 2 },
  { palavra: "sombra", freq: 2 }, { palavra: "galpão", freq: 2 }, { palavra: "sol", freq: 2 },
  { palavra: "gateado", freq: 2 }, { palavra: "casa", freq: 1 }, { palavra: "calma", freq: 1 },
  { palavra: "pañuelo", freq: 1 }, { palavra: "maragato", freq: 1 }, { palavra: "horizonte", freq: 1 },
  { palavra: "campereada", freq: 1 }, { palavra: "lombo", freq: 1 }, { palavra: "mate", freq: 1 }, 
  { palavra: "maçanilha", freq: 1 }, { palavra: "coplas", freq: 1 }, { palavra: "querência", freq: 1 }, 
  { palavra: "galponeira", freq: 1 }, { palavra: "candeeiro", freq: 1 }, { palavra: "campanha", freq: 1 }, 
  { palavra: "açoite", freq: 1 }, { palavra: "tropa", freq: 1 }, { palavra: "encilha", freq: 1 }, 
  { palavra: "prenda", freq: 1 }, { palavra: "arreios", freq: 1 }, { palavra: "esporas", freq: 1 }, 
  { palavra: "bomba", freq: 1 }, { palavra: "cambona", freq: 1 }, { palavra: "redomona", freq: 1 }
];

const TOTAL_TOKENS_GAUCHO = 143;
const TOTAL_TOKENS_NORDESTINO = 50000; // Corpus de referência estimado

// Frequências estimadas no corpus nordestino
const NORDESTINO_FREQS: Record<string, number> = {
  "verso": 8, "campo": 15, "coxilha": 0, "saudade": 25, "tarumã": 0,
  "várzea": 2, "sombra": 18, "galpão": 0, "sol": 30, "gateado": 0,
  "casa": 45, "calma": 12, "pañuelo": 0, "maragato": 0, "horizonte": 8,
  "campereada": 0, "lombo": 3, "mate": 1, "maçanilha": 0, "coplas": 0,
  "querência": 0, "galponeira": 0, "candeeiro": 2, "campanha": 4, "açoite": 0,
  "tropa": 5, "encilha": 0, "prenda": 0, "arreios": 1, "esporas": 2,
  "bomba": 8, "cambona": 0, "redomona": 0
};

// 🗺️ MAPEAMENTO COMPLETO DE PALAVRAS PARA OS 6 DOMÍNIOS SEMÂNTICOS
const DOMAIN_MAPPING: Record<string, { domain: string; color: string; prosody: string }> = {
  // CULTURA E LIDA GAÚCHA (Verde) - 16 palavras
  "galpão": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "gateado": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "arreios": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "esporas": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "mate": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "bomba": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "prenda": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "galponeira": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "querência": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "maragato": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "pañuelo": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "tropa": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "encilha": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "campereada": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "redomona": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "casa": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Positiva" },
  "candeeiro": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  "cambona": { domain: "Cultura e Lida Gaúcha", color: "#24A65B", prosody: "Neutra" },
  
  // NATUREZA E PAISAGEM (Azul) - 9 palavras
  "campo": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Positiva" },
  "coxilha": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Positiva" },
  "horizonte": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Positiva" },
  "sol": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Positiva" },
  "sombra": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Neutra" },
  "várzea": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Neutra" },
  "tarumã": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Positiva" },
  "maçanilha": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Neutra" },
  "campanha": { domain: "Natureza e Paisagem", color: "#268BC8", prosody: "Neutra" },
  
  // SENTIMENTOS E ABSTRAÇÕES (Roxo) - 4 palavras
  "verso": { domain: "Sentimentos e Abstrações", color: "#8B5CF6", prosody: "Positiva" },
  "saudade": { domain: "Sentimentos e Abstrações", color: "#8B5CF6", prosody: "Negativa" },
  "calma": { domain: "Sentimentos e Abstrações", color: "#8B5CF6", prosody: "Positiva" },
  "coplas": { domain: "Sentimentos e Abstrações", color: "#8B5CF6", prosody: "Positiva" },
  
  // AÇÕES E PROCESSOS (Laranja) - 1 palavra
  "açoite": { domain: "Ações e Processos", color: "#FF9500", prosody: "Negativa" },
  
  // PARTES DO CORPO E SERES VIVOS (Vermelho) - 1 palavra
  "lombo": { domain: "Partes do Corpo e Seres Vivos", color: "#DC2626", prosody: "Neutra" }
};

// Descrições dos 6 domínios semânticos
const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  "Cultura e Lida Gaúcha": "Tradições, objetos e práticas culturais do gaúcho",
  "Natureza e Paisagem": "Elementos naturais, geografia e paisagem do pampa",
  "Sentimentos e Abstrações": "Emoções, expressões líricas e estados de espírito",
  "Ações e Processos": "Verbos e ações características da lida campeira",
  "Qualidades e Estados": "Adjetivos e características descritivas",
  "Partes do Corpo e Seres Vivos": "Anatomia humana e animal, fauna regional"
};

// Funções estatísticas
function calculateLL(o1: number, n1: number, o2: number, n2: number): number {
  const e1 = n1 * (o1 + o2) / (n1 + n2);
  const e2 = n2 * (o1 + o2) / (n1 + n2);
  
  let ll = 0;
  if (o1 > 0) ll += o1 * Math.log(o1 / e1);
  if (o2 > 0) ll += o2 * Math.log(o2 / e2);
  
  return 2 * ll;
}

function calculateMI(o1: number, n1: number, o2: number, n2: number): number {
  const e1 = n1 * (o1 + o2) / (n1 + n2);
  if (e1 === 0) return 0;
  return Math.log2(o1 / e1);
}

function processDemoCorpus() {
  console.log('🚀 Iniciando processamento do corpus demo...');

  // FASE 1: Processar keywords com LL/MI
  const processedKeywords = DEMO_CORPUS.map(item => {
    const freqNordestino = NORDESTINO_FREQS[item.palavra] || 0;
    
    const ll = calculateLL(
      item.freq,
      TOTAL_TOKENS_GAUCHO,
      freqNordestino,
      TOTAL_TOKENS_NORDESTINO
    );
    
    const mi = calculateMI(
      item.freq,
      TOTAL_TOKENS_GAUCHO,
      freqNordestino,
      TOTAL_TOKENS_NORDESTINO
    );

    const mapping = DOMAIN_MAPPING[item.palavra] || {
      domain: "Cultura e Lida Gaúcha",
      color: "#24A65B",
      prosody: "Neutra"
    };

    return {
      palavra: item.palavra,
      frequencia: item.freq,
      ll: parseFloat(ll.toFixed(2)),
      mi: parseFloat(mi.toFixed(2)),
      significancia: ll > 15.13 ? "Alta" : ll > 6.63 ? "Média" : "Baixa",
      dominio: mapping.domain,
      cor: mapping.color,
      prosody: mapping.prosody  // ✅ String: "Positiva", "Negativa", "Neutra"
    };
  }).sort((a, b) => b.ll - a.ll);

  console.log(`✅ ${processedKeywords.length} keywords processadas`);

  // FASE 2: Agregar domínios semânticos
  const dominioMap = new Map<string, {
    dominio: string;
    riquezaLexical: number;
    ocorrencias: number;
    percentual: number;
    palavras: string[];
    cor: string;
  }>();

  processedKeywords.forEach(k => {
    if (!dominioMap.has(k.dominio)) {
      dominioMap.set(k.dominio, {
        dominio: k.dominio,
        riquezaLexical: 0,
        ocorrencias: 0,
        percentual: 0,
        palavras: [],
        cor: k.cor
      });
    }
    
    const dom = dominioMap.get(k.dominio)!;
    dom.riquezaLexical += 1;
    dom.ocorrencias += k.frequencia;
    dom.palavras.push(k.palavra);
  });

  // Calcular percentuais
  const totalOcorrencias = Array.from(dominioMap.values())
    .reduce((sum, d) => sum + d.ocorrencias, 0);

  const dominios = Array.from(dominioMap.values()).map(d => ({
    ...d,
    percentual: parseFloat(((d.ocorrencias / totalOcorrencias) * 100).toFixed(1))
  })).sort((a, b) => b.percentual - a.percentual);

  console.log(`✅ ${dominios.length} domínios agregados`);

  // FASE 3: Dados para nuvem
  const cloudData = processedKeywords.slice(0, 20).map(k => ({
    palavra: k.palavra,
    valor: k.ll,
    cor: k.cor,
    dominio: k.dominio
  }));

  // FASE 4: Análise de prosódia
  const prosodyDistribution = {
    "Positiva": processedKeywords.filter(k => k.prosody === "Positiva").length,
    "Negativa": processedKeywords.filter(k => k.prosody === "Negativa").length,
    "Neutra": processedKeywords.filter(k => k.prosody === "Neutra").length
  };

  // FASE 5: Estatísticas gerais
  const stats = {
    totalPalavras: DEMO_CORPUS.length,
    totalTokens: TOTAL_TOKENS_GAUCHO,
    mediaLL: parseFloat((processedKeywords.reduce((sum, k) => sum + k.ll, 0) / processedKeywords.length).toFixed(2)),
    mediaMI: parseFloat((processedKeywords.reduce((sum, k) => sum + k.mi, 0) / processedKeywords.length).toFixed(2)),
    riquezaLexical: parseFloat(((DEMO_CORPUS.length / TOTAL_TOKENS_GAUCHO) * 100).toFixed(1)),
    significanciaAlta: processedKeywords.filter(k => k.significancia === "Alta").length,
    significanciaMedia: processedKeywords.filter(k => k.significancia === "Média").length,
    significanciaBaixa: processedKeywords.filter(k => k.significancia === "Baixa").length
  };

  console.log('✅ Processamento concluído com sucesso!');

  return {
    keywords: processedKeywords,
    dominios: dominios,
    cloudData: cloudData,
    prosodyDistribution: prosodyDistribution,
    stats: stats
  };
}

// Handler HTTP
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Recebida requisição para processar demo corpus');
    
    const result = processDemoCorpus();
    
    console.log('📤 Retornando resultado processado');
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Erro ao processar corpus:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Falha ao processar o corpus de demonstração'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});

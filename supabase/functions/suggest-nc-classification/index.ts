import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NCWord {
  palavra: string;
  contexto_kwic?: string;
  song_id?: string;
  hits_count?: number;
}

interface NCSuggestion {
  palavra: string;
  tagset_sugerido: string;
  tagset_nome: string;
  confianca: number;
  justificativa: string;
  fonte: 'dialectal_lexicon' | 'ai_gemini' | 'pattern_match';
}

// Padrões conhecidos para classificação automática
const PATTERN_RULES: { pattern: RegExp; tagset: string; nome: string; confianca: number }[] = [
  // Interjeições gaúchas
  { pattern: /^(iê|ité|tchê|bah|eita|uai|opa|oxe|vixe|arretado)$/i, tagset: 'MG.INT', nome: 'Interjeição', confianca: 0.88 },
  // Sufixos diminutivos típicos
  { pattern: /inho$|inha$|zinho$|zinha$/i, tagset: 'MG.SF', nome: 'Sufixo (Diminutivo)', confianca: 0.75 },
  // Verbos no gerúndio
  { pattern: /ando$|endo$|indo$/i, tagset: 'MG.VB', nome: 'Verbo (Gerúndio)', confianca: 0.70 },
  // Advérbios típicos
  { pattern: /mente$/i, tagset: 'MG.ADV', nome: 'Advérbio', confianca: 0.80 },
];

async function checkDialectalLexicon(
  supabaseUrl: string,
  supabaseKey: string,
  palavra: string
): Promise<NCSuggestion | null> {
  const normalizedWord = palavra.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Usar fetch direto para evitar problemas de tipagem
  const response = await fetch(
    `${supabaseUrl}/rest/v1/dialectal_lexicon?or=(verbete_normalizado.eq.${encodeURIComponent(normalizedWord)},variantes.cs.{${encodeURIComponent(palavra)}})&limit=1`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const entry = data[0];

  if (entry) {
    // Mapear categoria temática para tagset
    const categorias = (entry.categorias_tematicas || []) as string[];
    let tagset = 'CC.RG'; // Default: Cultura Regional
    let tagsetNome = 'Cultura Regional (Gaúcho)';

    if (categorias.includes('fauna')) {
      tagset = 'NA.FA';
      tagsetNome = 'Fauna';
    } else if (categorias.includes('flora')) {
      tagset = 'NA.FL';
      tagsetNome = 'Flora';
    } else if (categorias.includes('alimentação')) {
      tagset = 'AP.AL';
      tagsetNome = 'Alimentação';
    } else if (categorias.includes('vestuário') || categorias.includes('indumentária')) {
      tagset = 'AP.VE';
      tagsetNome = 'Vestuário';
    } else if (categorias.includes('música') || categorias.includes('dança')) {
      tagset = 'CC.MU';
      tagsetNome = 'Música e Dança';
    }

    return {
      palavra,
      tagset_sugerido: tagset,
      tagset_nome: tagsetNome,
      confianca: 0.95,
      justificativa: `Encontrado no léxico dialetal gaúcho: "${entry.verbete}"`,
      fonte: 'dialectal_lexicon'
    };
  }

  return null;
}

function checkPatternMatch(palavra: string): NCSuggestion | null {
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(palavra)) {
      return {
        palavra,
        tagset_sugerido: rule.tagset,
        tagset_nome: rule.nome,
        confianca: rule.confianca,
        justificativa: `Padrão morfológico identificado: ${rule.pattern.toString()}`,
        fonte: 'pattern_match'
      };
    }
  }
  return null;
}

async function getAISuggestion(
  palavras: NCWord[],
  tagsetsDisponiveis: { codigo: string; nome: string; descricao: string | null }[]
): Promise<NCSuggestion[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return [];
  }

  const tagsetsStr = tagsetsDisponiveis
    .slice(0, 50) // Limitar para não exceder contexto
    .map(t => `${t.codigo}: ${t.nome}${t.descricao ? ` - ${t.descricao}` : ''}`)
    .join('\n');

  const palavrasStr = palavras
    .map(p => `- "${p.palavra}"${p.contexto_kwic ? ` (contexto: "${p.contexto_kwic}")` : ''}`)
    .join('\n');

  const prompt = `Você é um linguista especializado em português brasileiro e dialeto gaúcho.

Classifique as seguintes palavras não classificadas (NC) em domínios semânticos.

DOMÍNIOS DISPONÍVEIS:
${tagsetsStr}

PALAVRAS A CLASSIFICAR:
${palavrasStr}

Para cada palavra, retorne um JSON array com objetos contendo:
- palavra: string
- tagset_sugerido: código do domínio (ex: "NA.FL")
- tagset_nome: nome do domínio
- confianca: número entre 0 e 1
- justificativa: breve explicação da classificação

IMPORTANTE:
- Se não tiver certeza, use confiança baixa (< 0.6)
- Priorize domínios específicos (N2/N3/N4) sobre genéricos (N1)
- Considere o contexto KWIC quando disponível

Responda APENAS com o JSON array, sem markdown.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um linguista especializado em classificação semântica de palavras em português.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Tentar parsear JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions.map((s: any) => ({
        ...s,
        fonte: 'ai_gemini' as const
      }));
    }

    return [];
  } catch (error) {
    console.error('AI suggestion error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { palavras, limit = 20 } = await req.json() as { palavras?: NCWord[]; limit?: number };

    // Se não fornecer palavras, buscar do cache
    let ncWords: NCWord[] = palavras || [];
    
    if (!palavras || palavras.length === 0) {
      const { data: ncData } = await supabaseClient
        .from('semantic_disambiguation_cache')
        .select('palavra, song_id, hits_count')
        .eq('tagset_codigo', 'NC')
        .order('hits_count', { ascending: false })
        .limit(limit);

      ncWords = (ncData || []).map((w: any) => ({
        palavra: w.palavra,
        song_id: w.song_id,
        hits_count: w.hits_count
      }));
    }

    if (ncWords.length === 0) {
      return new Response(JSON.stringify({ suggestions: [], message: 'Nenhuma palavra NC encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar tagsets disponíveis para IA
    const { data: tagsets } = await supabaseClient
      .from('semantic_tagset')
      .select('codigo, nome, descricao')
      .eq('status', 'ativo')
      .order('codigo');

    const suggestions: NCSuggestion[] = [];
    const wordsNeedingAI: NCWord[] = [];

    // Fase 1: Verificar léxico dialetal e padrões
    for (const word of ncWords) {
      // Tentar léxico dialetal primeiro
      const dialectalSuggestion = await checkDialectalLexicon(supabaseUrl, supabaseKey, word.palavra);
      if (dialectalSuggestion) {
        suggestions.push(dialectalSuggestion);
        continue;
      }

      // Tentar pattern matching
      const patternSuggestion = checkPatternMatch(word.palavra);
      if (patternSuggestion) {
        suggestions.push(patternSuggestion);
        continue;
      }

      // Adicionar à lista para IA
      wordsNeedingAI.push(word);
    }

    // Fase 2: Usar IA para palavras restantes (em batch)
    if (wordsNeedingAI.length > 0 && tagsets) {
      const aiSuggestions = await getAISuggestion(wordsNeedingAI, tagsets as any);
      suggestions.push(...aiSuggestions);
    }

    // Ordenar por confiança
    suggestions.sort((a, b) => b.confianca - a.confianca);

    console.log(`[suggest-nc-classification] Processadas ${ncWords.length} palavras, ${suggestions.length} sugestões geradas`);

    return new Response(JSON.stringify({
      suggestions,
      stats: {
        total_palavras: ncWords.length,
        dialectal_lexicon: suggestions.filter(s => s.fonte === 'dialectal_lexicon').length,
        pattern_match: suggestions.filter(s => s.fonte === 'pattern_match').length,
        ai_gemini: suggestions.filter(s => s.fonte === 'ai_gemini').length,
        sem_sugestao: ncWords.length - suggestions.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[suggest-nc-classification] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

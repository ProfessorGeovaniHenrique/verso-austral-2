import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 1000;
const TIMEOUT_MS = 50000;

interface ProcessRequest {
  fileContent: string;
}

function validateRequest(data: any): ProcessRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Payload inválido');
  }
  
  const { fileContent } = data;
  
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('fileContent deve ser uma string válida');
  }
  
  if (fileContent.length > 10000000) {
    throw new Error('fileContent excede tamanho máximo de 10MB');
  }
  
  return { fileContent };
}

interface HouaissEntry {
  palavra: string;
  pos: string;
  acepcao_numero: number;
  acepcao_descricao: string;
  sinonimos: string[];
  antonimos: string[];
  contexto?: string;
}

function parseHouaissLine(line: string): HouaissEntry | null {
  try {
    // Formato esperado: palavra « pos » acepcao: descricao : sin1, sin2 > ant1, ant2
    // Exemplo: alegre « adj. » 1 feliz, contente: festivo, jovial > triste, melancólico
    
    const wordMatch = line.match(/^(\S+)\s+«\s*([^»]+)\s*»/);
    if (!wordMatch) return null;
    
    const palavra = wordMatch[1].toLowerCase();
    const pos = wordMatch[2].trim();
    
    // Extrair número da acepção
    const acepcaoMatch = line.match(/»\s*(\d+)\s+([^:]+):/);
    if (!acepcaoMatch) return null;
    
    const acepcao_numero = parseInt(acepcaoMatch[1]);
    const acepcao_descricao = acepcaoMatch[2].trim();
    
    // Extrair sinônimos (antes do ">")
    const sinonimosMatch = line.match(/:\s*([^>]+)/);
    const sinonimos = sinonimosMatch 
      ? sinonimosMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    
    // Extrair antônimos (depois do ">")
    const antonimosMatch = line.match(/>\s*(.+)$/);
    const antonimos = antonimosMatch
      ? antonimosMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    
    // Detectar contexto de uso (fig., infrm., coloq., etc.)
    const contextoMatch = acepcao_descricao.match(/\b(fig\.|infrm\.|coloq\.|pop\.|fam\.)\b/);
    const contexto = contextoMatch ? contextoMatch[1] : undefined;
    
    return {
      palavra,
      pos,
      acepcao_numero,
      acepcao_descricao,
      sinonimos,
      antonimos,
      contexto
    };
  } catch (error) {
    console.error('Erro ao parsear linha:', line, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fileContent } = await req.json();
    
    if (!fileContent) {
      throw new Error('fileContent is required');
    }

    const lines = fileContent.split('\n');
    let processed = 0;
    let errors = 0;
    const errorLog: string[] = [];

    console.log(`Processando ${lines.length} linhas do Dicionário Houaiss...`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      try {
        const entry = parseHouaissLine(line);
        if (!entry) {
          errors++;
          continue;
        }

        // Inserir na tabela lexical_synonyms
        const { error: insertError } = await supabaseClient
          .from('lexical_synonyms')
          .insert({
            palavra: entry.palavra,
            pos: entry.pos,
            acepcao_numero: entry.acepcao_numero,
            acepcao_descricao: entry.acepcao_descricao,
            sinonimos: entry.sinonimos,
            antonimos: entry.antonimos,
            contexto_uso: entry.contexto,
            fonte: 'houaiss'
          });

        if (insertError) {
          console.error('Erro ao inserir sinônimos:', insertError);
          errors++;
          errorLog.push(`Linha ${i}: ${insertError.message}`);
          continue;
        }

        // Criar relações na semantic_networks (sinônimos)
        for (const sinonimo of entry.sinonimos) {
          await supabaseClient
            .from('semantic_networks')
            .upsert({
              palavra_origem: entry.palavra,
              palavra_destino: sinonimo.toLowerCase(),
              tipo_relacao: 'sinonimo',
              contexto: entry.acepcao_descricao,
              fonte: 'houaiss'
            }, {
              onConflict: 'palavra_origem,palavra_destino,tipo_relacao'
            });
        }

        // Criar relações na semantic_networks (antônimos)
        for (const antonimo of entry.antonimos) {
          await supabaseClient
            .from('semantic_networks')
            .upsert({
              palavra_origem: entry.palavra,
              palavra_destino: antonimo.toLowerCase(),
              tipo_relacao: 'antonimo',
              contexto: entry.acepcao_descricao,
              fonte: 'houaiss'
            }, {
              onConflict: 'palavra_origem,palavra_destino,tipo_relacao'
            });
        }

        processed++;
        
        if (processed % 100 === 0) {
          console.log(`Processadas ${processed} entradas...`);
        }
      } catch (err) {
        console.error(`Erro processando linha ${i}:`, err);
        errors++;
        errorLog.push(`Linha ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`Processamento concluído: ${processed} entradas, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        errorLog: errorLog.slice(0, 10) // Apenas primeiros 10 erros
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro no processamento do Houaiss:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

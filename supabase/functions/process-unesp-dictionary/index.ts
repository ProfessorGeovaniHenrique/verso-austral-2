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

interface UNESPEntry {
  palavra: string;
  pos: string;
  definicao: string;
  exemplos: string[];
  registro: string;
}

function parseUNESPEntry(text: string): UNESPEntry | null {
  try {
    // Formato esperado (simplificado):
    // palavra s.m./s.f./adj./v. definição [exemplo1; exemplo2] (Registro)
    
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;
    
    const firstLine = lines[0];
    
    // Extrair palavra e POS
    const wordPosMatch = firstLine.match(/^(\S+)\s+(s\.m\.|s\.f\.|adj\.|v\.|adv\.|prep\.|conj\.)/i);
    if (!wordPosMatch) return null;
    
    const palavra = wordPosMatch[1].toLowerCase();
    const pos = wordPosMatch[2];
    
    // Extrair definição (depois do POS até exemplos ou fim)
    const definicaoMatch = firstLine.match(/(?:s\.m\.|s\.f\.|adj\.|v\.|adv\.|prep\.|conj\.)\s+(.+?)(?:\[|$)/i);
    const definicao = definicaoMatch ? definicaoMatch[1].trim() : '';
    
    // Extrair exemplos (entre colchetes)
    const exemplosMatch = firstLine.match(/\[([^\]]+)\]/);
    const exemplos = exemplosMatch
      ? exemplosMatch[1].split(';').map(e => e.trim()).filter(e => e.length > 0)
      : [];
    
    // Extrair registro de uso (entre parênteses)
    const registroMatch = firstLine.match(/\(([^)]+)\)/);
    const registro = registroMatch ? registroMatch[1].trim() : '';
    
    return {
      palavra,
      pos,
      definicao,
      exemplos,
      registro
    };
  } catch (error) {
    console.error('Erro ao parsear entrada UNESP:', error);
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

    // Dividir por entradas (assumindo linha dupla como separador)
    const entries = fileContent.split('\n\n').filter((e: string) => e.trim());
    let processed = 0;
    let errors = 0;
    const errorLog: string[] = [];

    console.log(`Processando ${entries.length} entradas do Dicionário UNESP...`);

    for (let i = 0; i < entries.length; i++) {
      const entryText = entries[i];
      
      try {
        const entry = parseUNESPEntry(entryText);
        if (!entry) {
          errors++;
          continue;
        }

        // Inserir na tabela lexical_definitions
        const { error: insertError } = await supabaseClient
          .from('lexical_definitions')
          .insert({
            palavra: entry.palavra,
            pos: entry.pos,
            definicao: entry.definicao,
            exemplos: entry.exemplos,
            registro_uso: entry.registro || null,
            fonte: 'unesp'
          });

        if (insertError) {
          console.error('Erro ao inserir definição:', insertError);
          errors++;
          errorLog.push(`Entrada ${i}: ${insertError.message}`);
          continue;
        }

        processed++;
        
        if (processed % 50 === 0) {
          console.log(`Processadas ${processed} definições...`);
        }
      } catch (err) {
        console.error(`Erro processando entrada ${i}:`, err);
        errors++;
        errorLog.push(`Entrada ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`Processamento concluído: ${processed} definições, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        errorLog: errorLog.slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro no processamento do UNESP:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

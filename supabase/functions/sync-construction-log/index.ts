import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== CONFIGURAÇÃO ====================
// URL do GitHub Raw - Ajustar com nome do seu repositório
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main';
const DATA_SOURCES = {
  'construction-log': `${GITHUB_RAW_BASE}/src/data/developer-logs/construction-log.ts`,
};

// ==================== PARSER DE TYPESCRIPT ====================
/**
 * Extrai dados de um arquivo TypeScript exportado
 * Exemplo: export const constructionLog: ConstructionPhase[] = [...]
 */
function parseTypeScriptExport(content: string, exportName: string): any {
  try {
    // Remover comentários
    const withoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
      .replace(/\/\/.*/g, ''); // Line comments

    // Encontrar export const [exportName] = ...
    const exportRegex = new RegExp(
      `export\\s+const\\s+${exportName}\\s*[:]?\\s*[^=]*=\\s*([\\s\\S]+?)(?=\\n\\nexport|\\n\\n\\/\\/|$)`,
      'm'
    );
    
    const match = withoutComments.match(exportRegex);
    if (!match) {
      throw new Error(`Export '${exportName}' não encontrado`);
    }

    let jsonString = match[1].trim();
    
    // Remover trailing semicolon
    if (jsonString.endsWith(';')) {
      jsonString = jsonString.slice(0, -1);
    }

    // Converter de TypeScript-like para JSON válido
    jsonString = jsonString
      .replace(/(\w+):/g, '"$1":') // Keys sem aspas → com aspas
      .replace(/'/g, '"') // Single quotes → double quotes
      .replace(/,(\s*[}\]])/g, '$1'); // Trailing commas

    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`❌ Erro ao parsear ${exportName}:`, error);
    throw error;
  }
}

// ==================== SINCRONIZAÇÃO ====================
async function syncConstructionLog(supabase: any): Promise<SyncResult> {
  console.log('📋 Sincronizando construction-log...');
  
  try {
    // Tentar buscar do GitHub Raw
    let constructionLog;
    try {
      const response = await fetch(DATA_SOURCES['construction-log'], {
        headers: { 'Accept': 'text/plain' }
      });

      if (response.ok) {
        const tsContent = await response.text();
        constructionLog = parseTypeScriptExport(tsContent, 'constructionLog');
        console.log('✅ Dados carregados do GitHub Raw');
      } else {
        throw new Error(`GitHub fetch failed: ${response.status}`);
      }
    } catch (fetchError) {
      // Fallback: usar dados estáticos embutidos (simplificado)
      console.warn('⚠️ Falha ao buscar do GitHub, usando fallback estático');
      constructionLog = getFallbackData();
    }

    // Calcular hash dos dados
    const dataHash = await generateHash(JSON.stringify(constructionLog));

    // Verificar se precisa sincronizar
    const { data: lastSync } = await supabase
      .from('sync_metadata')
      .select('data_hash')
      .eq('source', 'construction-log')
      .single();

    if (lastSync?.data_hash === dataHash) {
      console.log('✅ Dados já sincronizados (hash igual)');
      return { status: 'up-to-date', itemsSynced: 0 };
    }

    // Upsert fases na tabela construction_phases
    let itemsSynced = 0;
    for (const phase of constructionLog) {
      const phaseNumber = constructionLog.indexOf(phase) + 1;
      const { error } = await supabase
        .from('construction_phases')
        .upsert({
          phase_name: phase.phase,
          phase_number: phaseNumber,
          objective: phase.objective,
          status: phase.status,
          date_start: phase.dateStart,
          date_end: phase.dateEnd || null,
          decisions: phase.decisions,
          artifacts: phase.artifacts,
          metrics: phase.metrics,
          scientific_basis: phase.scientificBasis,
          challenges: phase.challenges || [],
          next_steps: phase.nextSteps || [],
          is_synced_to_static: true
        }, { 
          onConflict: 'phase_number',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Erro ao upsert fase ${phase.phase}:`, error);
      } else {
        itemsSynced++;
      }
    }

    return { status: 'success', itemsSynced, dataHash };

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}

// ==================== FALLBACK DATA ====================
function getFallbackData() {
  // Dados simplificados para fallback
  return [
    {
      phase: "Fase 0: Concepção e Protótipo Visual",
      dateStart: "2025-01-15",
      dateEnd: "2025-02-28",
      status: "completed",
      objective: "Criar interface de visualização espacial 3D para domínios semânticos",
      decisions: [],
      artifacts: [],
      metrics: {},
      scientificBasis: [],
      challenges: [],
      nextSteps: []
    }
  ];
}

// ==================== HANDLER PRINCIPAL ====================
interface SyncResult {
  status: 'success' | 'up-to-date' | 'error';
  itemsSynced: number;
  dataHash?: string;
}

serve(withInstrumentation('sync-construction-log', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('sync-construction-log', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const startTime = Date.now();
    const { trigger } = await req.json();

    console.log(`🔄 Iniciando sincronização (trigger: ${trigger})`);

    const result = await syncConstructionLog(supabase);

    // Atualizar metadata
    const syncDurationMs = Date.now() - startTime;
    
    if (result.status === 'success') {
      await supabase
        .from('sync_metadata')
        .upsert({
          source: 'construction-log',
          data_hash: result.dataHash,
          last_sync_at: new Date().toISOString(),
          items_synced: result.itemsSynced,
          sync_duration_ms: syncDurationMs,
        }, { onConflict: 'source' });
    }

    console.log(`✅ Sincronização concluída: ${result.itemsSynced} itens em ${syncDurationMs}ms`);

    return new Response(
      JSON.stringify({
        status: result.status,
        trigger,
        itemsSynced: result.itemsSynced,
        syncDurationMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

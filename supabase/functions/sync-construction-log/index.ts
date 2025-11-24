import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";
import { createEdgeLogger } from "../_shared/unified-logger.ts";

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
function parseTypeScriptExport(content: string, exportName: string, log?: any): any {
  try {
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
    if (log) {
      log.error(`Parse error for ${exportName}`, error as Error);
    } else {
      console.error(`Parse error for ${exportName}:`, error);
    }
    throw error;
  }
}

// ==================== SINCRONIZAÇÃO ====================
async function syncConstructionLog(supabase: any, log: any): Promise<SyncResult> {
  log.info('Syncing construction log');
  
  try {
    // Tentar buscar do GitHub Raw
    let constructionLog;
    try {
      const response = await fetch(DATA_SOURCES['construction-log'], {
        headers: { 'Accept': 'text/plain' }
      });

      if (response.ok) {
        const tsContent = await response.text();
        constructionLog = parseTypeScriptExport(tsContent, 'constructionLog', log);
        log.info('Data loaded from GitHub');
      } else {
        throw new Error(`GitHub fetch failed: ${response.status}`);
      }
    } catch (fetchError) {
      // Fallback: usar dados estáticos embutidos (simplificado)
      log.warn('GitHub fetch failed, using fallback');
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
      log.info('Data already up-to-date');
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
        log.error('Phase upsert failed', error, { phaseName: phase.phase });
      } else {
        itemsSynced++;
      }
    }

    return { status: 'success', itemsSynced, dataHash };

  } catch (error) {
    log.error('Sync failed', error as Error);
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
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('sync-construction-log', requestId);

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

    log.info('Starting sync', { trigger });

    const result = await syncConstructionLog(supabase, log);

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

    log.info('Sync complete', { itemsSynced: result.itemsSynced, durationMs: syncDurationMs });

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
    log.error('Sync failed', error as Error);
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

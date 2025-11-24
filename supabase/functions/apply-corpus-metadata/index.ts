import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyMetadataRequest {
  corpusType: 'gaucho' | 'nordestino';
  validatedSongs: Array<{
    artista: string;
    musica: string;
    compositor?: string;
    album?: string;
    ano?: string;
    letra?: string;
  }>;
  createBackup: boolean;
}

Deno.serve(withInstrumentation('apply-corpus-metadata', async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    const health = await createHealthCheck('apply-corpus-metadata', '1.0.0');
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can apply corpus metadata');
    }

    const { corpusType, validatedSongs, createBackup }: ApplyMetadataRequest = await req.json();

    // Validar se corpus está disponível
    const availableCorpora = ['gaucho'];
    if (!availableCorpora.includes(corpusType)) {
      throw new Error(`Corpus '${corpusType}' ainda não está disponível. O corpus nordestino está fragmentado em 3 partes e precisa ser consolidado primeiro. Disponíveis: ${availableCorpora.join(', ')}`);
    }

    // Applying metadata to corpus

    // 1. Carregar corpus original
    // Loading corpus
    
    // Tentar Storage primeiro
    const storagePath = `corpus/full-text/${corpusType}-completo.txt`;
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${storagePath}`;
    let storageResponse = await fetch(storageUrl);
    
    let originalContent: string;
    
    if (storageResponse.ok) {
      originalContent = await storageResponse.text();
      // Corpus loaded from Storage
    } else {
      // Fallback: buscar do URL público do projeto (arquivos em public/)
      const publicPath = `/corpus/full-text/${corpusType}-completo.txt`;
      // Storage unavailable, trying public URL
      
      // Obter a URL base do referer (origem da requisição)
      const referer = req.headers.get('referer');
      if (!referer) {
        throw new Error(`Corpus não encontrado no Storage e não foi possível determinar URL pública. Storage URL: ${storageUrl}`);
      }
      
      const baseUrl = new URL(referer).origin;
      const publicUrl = `${baseUrl}${publicPath}`;
      // Fetching from public URL
      
      const publicResponse = await fetch(publicUrl);
      
      if (!publicResponse.ok) {
        throw new Error(`Corpus file not found. Tried Storage: ${storageUrl} (${storageResponse.status}) and Public URL: ${publicUrl} (${publicResponse.status})`);
      }
      
      originalContent = await publicResponse.text();
      // Corpus loaded from public URL
    }

    // 2. Criar backup se solicitado
    let backupVersionId: string | null = null;
    if (createBackup) {
      const { data: versionData, error: versionError } = await supabase
        .from('corpus_metadata_versions')
        .insert({
          corpus_type: corpusType,
          version_number: Date.now(),
          content_snapshot: originalContent,
          applied_by: user.id,
          metadata_count: validatedSongs.length,
        })
        .select('id')
        .single();

      if (versionError) {
        // Error creating backup
      } else {
        backupVersionId = versionData.id;
      }
    }

    // 3. Gerar corpus atualizado
    const updatedContent = generateUpdatedCorpus(originalContent, validatedSongs);

    // 4. Salvar no Supabase Storage (opcional - pode ser implementado depois)
    // Por enquanto, vamos apenas retornar o conteúdo atualizado
    
    // 5. Registrar no histórico
    const { error: historyError } = await supabase
      .from('metadata_application_history')
      .insert({
        corpus_type: corpusType,
        songs_updated: validatedSongs.length,
        applied_by: user.id,
        application_source: 'metadata-enrichment-interface',
        backup_version_id: backupVersionId,
      });

    // Metadata applied successfully

    return new Response(
      JSON.stringify({
        success: true,
        songsUpdated: validatedSongs.length,
        backupCreated: !!backupVersionId,
        backupVersionId,
        updatedContent, // Retornar o corpus atualizado para download
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

/**
 * Gera corpus atualizado com os metadados validados
 */
function generateUpdatedCorpus(
  originalContent: string,
  validatedSongs: ApplyMetadataRequest['validatedSongs']
): string {
  const lines = originalContent.split('\n');
  const updatedLines: string[] = [];

  // Criar mapa de músicas validadas para lookup rápido
  const songMap = new Map(
    validatedSongs.map(s => [
      `${s.artista.trim().toLowerCase()}|||${s.musica.trim().toLowerCase()}`,
      s
    ])
  );

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Detectar header de música: ### Artista - Música (compositor, ano, album)
    if (line.startsWith('### ')) {
      const headerMatch = line.match(/^### (.+?) - (.+?) \((.+?)\)$/);
      
      if (headerMatch) {
        const [, artista, musica] = headerMatch;
        const key = `${artista.trim().toLowerCase()}|||${musica.trim().toLowerCase()}`;
        const validatedSong = songMap.get(key);

        if (validatedSong) {
          // Atualizar header com metadados validados
          const metadataParts: string[] = [];
          if (validatedSong.compositor) metadataParts.push(validatedSong.compositor);
          if (validatedSong.ano) metadataParts.push(validatedSong.ano);
          if (validatedSong.album) metadataParts.push(validatedSong.album);
          
          const newHeader = `### ${artista} - ${musica} (${metadataParts.join(', ')})`;
          updatedLines.push(newHeader);
          // Header updated
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }

    i++;
  }

  return updatedLines.join('\n');
}

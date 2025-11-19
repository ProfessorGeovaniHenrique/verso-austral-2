import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
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

    console.log(`🎯 Aplicando metadados ao corpus ${corpusType}: ${validatedSongs.length} músicas`);

    // 1. Carregar corpus original
    const corpusPath = `corpus/full-text/${corpusType}-completo.txt`;
    const corpusResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${corpusPath}`);
    
    let originalContent: string;
    if (!corpusResponse.ok) {
      // Fallback para arquivo local se não estiver no storage
      const localPath = `../../public/data/${corpusType}/full-text/${corpusType}-completo.txt`;
      try {
        originalContent = await Deno.readTextFile(localPath);
      } catch (e) {
        throw new Error(`Corpus file not found: ${corpusPath}`);
      }
    } else {
      originalContent = await corpusResponse.text();
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
        console.error('❌ Erro ao criar backup:', versionError);
      } else {
        backupVersionId = versionData.id;
        console.log('✅ Backup criado:', backupVersionId);
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

    if (historyError) {
      console.error('⚠️ Erro ao registrar histórico:', historyError);
    }

    console.log('✅ Metadados aplicados com sucesso!');

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
    console.error('❌ Erro em apply-corpus-metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
          console.log(`📝 Atualizado: ${newHeader}`);
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

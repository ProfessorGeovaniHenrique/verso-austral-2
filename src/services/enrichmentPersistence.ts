import { supabase } from '@/integrations/supabase/client';
import LZString from 'lz-string';
import { EnrichmentSession, validateEnrichmentSession } from '@/lib/enrichmentSchemas';
import { retryWithBackoff } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

/**
 * Serviço de persistência cloud (Supabase)
 * Com retry logic e resolução de conflitos
 */

export interface CloudSession {
  id: string;
  user_id: string;
  corpus_type: string;
  session_name?: string;
  compressed_data: string;
  total_songs: number;
  processed_songs: number;
  validated_songs: number;
  rejected_songs: number;
  progress_percentage: number;
  started_at: string;
  last_saved_at: string;
  completed_at?: string;
  schema_version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Salva sessão no Supabase com retry logic
 */
export async function saveSessionToCloud(
  session: EnrichmentSession,
  sessionId?: string
): Promise<string | null> {
  try {
    // Obter user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ User not authenticated, skipping cloud save');
      return null;
    }

    // Comprimir dados
    const json = JSON.stringify(session);
    const compressed = LZString.compress(json);

    // Preparar dados para Supabase
    const cloudData = {
      user_id: user.id,
      corpus_type: session.corpusType,
      session_name: session.sessionName,
      compressed_data: compressed,
      total_songs: session.metrics.totalSongs,
      processed_songs: session.metrics.enrichedSongs + session.metrics.validatedSongs + session.metrics.rejectedSongs,
      validated_songs: session.metrics.validatedSongs,
      rejected_songs: session.metrics.rejectedSongs,
      progress_percentage: ((session.metrics.enrichedSongs + session.metrics.validatedSongs + session.metrics.rejectedSongs) / session.metrics.totalSongs) * 100,
      started_at: session.startedAt,
      last_saved_at: new Date().toISOString(),
      completed_at: session.completedAt,
      schema_version: session.schemaVersion,
    };

    // Salvar com retry
    const result = await retryWithBackoff(async () => {
      if (sessionId) {
        // Update existente
        const { data, error } = await supabase
          .from('enrichment_sessions')
          .update(cloudData)
          .eq('id', sessionId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert novo
        const { data, error } = await supabase
          .from('enrichment_sessions')
          .insert(cloudData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    }, {
      maxRetries: 3,
      baseDelay: 1000,
      onRetry: (attempt, err: any) => {
        console.log(`☁️ Retry cloud save (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
      }
    });

    console.log(`☁️ Session saved to cloud (${json.length} bytes, compressed to ${compressed.length} bytes)`);
    return result.id;
  } catch (error) {
    console.error('❌ Failed to save session to cloud:', error);
    notifications.error('Erro ao salvar na nuvem', 'Continuando com salvamento local');
    return null;
  }
}

/**
 * Carrega sessão do Supabase
 */
export async function loadSessionFromCloud(sessionId?: string): Promise<EnrichmentSession | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let query = supabase
      .from('enrichment_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (sessionId) {
      query = query.eq('id', sessionId);
    } else {
      // Buscar sessão mais recente
      query = query.order('last_saved_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // Descomprimir
    const json = LZString.decompress(data.compressed_data);
    if (!json) {
      console.error('❌ Failed to decompress cloud data');
      return null;
    }

    const parsed = JSON.parse(json);
    const validated = validateEnrichmentSession(parsed);

    console.log(`☁️ Session loaded from cloud (session_id: ${data.id})`);
    return validated;
  } catch (error) {
    console.error('❌ Failed to load session from cloud:', error);
    return null;
  }
}

/**
 * Lista todas as sessões do usuário
 */
export async function listUserSessions(): Promise<CloudSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('enrichment_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_saved_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Failed to list sessions:', error);
    return [];
  }
}

/**
 * Deleta sessão do Supabase
 */
export async function deleteCloudSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('enrichment_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;

    console.log(`☁️ Session deleted from cloud (${sessionId})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete session:', error);
    return false;
  }
}

/**
 * Resolve conflitos entre localStorage e cloud
 * Estratégia: última modificação ganha (Last-Write-Wins)
 */
export function resolveConflict(
  localSession: EnrichmentSession,
  cloudSession: EnrichmentSession
): EnrichmentSession {
  const localTime = new Date(localSession.lastSavedAt).getTime();
  const cloudTime = new Date(cloudSession.lastSavedAt).getTime();

  if (localTime > cloudTime) {
    console.log('🔀 Conflict resolved: local session is newer');
    return localSession;
  } else {
    console.log('🔀 Conflict resolved: cloud session is newer');
    return cloudSession;
  }
}

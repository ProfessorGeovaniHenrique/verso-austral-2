/**
 * 🎯 TAGSET LOADER - Carregamento Dinâmico de Domínios Semânticos
 * 
 * Helper para carregar tagsets ativos do banco de dados
 * e formatar prompts de IA com taxonomia atualizada
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

interface TagsetEntry {
  codigo: string;
  nome: string;
  descricao: string | null;
  nivel_profundidade: number;
  exemplos: string[] | null;
  categoria_pai: string | null;
}

interface FormattedTagset {
  codigo: string;
  nome: string;
  exemplos: string;
}

// Cache em memória para evitar queries repetidas
let tagsetsCache: TagsetEntry[] | null = null;
let cacheLoadedAt: number | null = null;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos - permite atualizações rápidas

/**
 * Carrega todos os tagsets ativos do banco
 */
export async function loadActiveTagsets(): Promise<TagsetEntry[]> {
  // Verificar cache válido
  if (tagsetsCache && cacheLoadedAt && (Date.now() - cacheLoadedAt < CACHE_TTL_MS)) {
    return tagsetsCache;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not configured');
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('semantic_tagset')
    .select('codigo, nome, descricao, nivel_profundidade, exemplos, categoria_pai')
    .eq('status', 'ativo')
    .order('codigo');

  if (error) {
    console.error('❌ Error loading tagsets:', error);
    return tagsetsCache || []; // Fallback para cache antigo se existir
  }

  tagsetsCache = data || [];
  cacheLoadedAt = Date.now();
  
  console.log(`✅ Tagsets loaded: ${tagsetsCache.length} ativos`);
  
  return tagsetsCache;
}

/**
 * Filtra tagsets por nível de profundidade
 */
export async function getTagsetsByLevel(nivel: number): Promise<TagsetEntry[]> {
  const all = await loadActiveTagsets();
  return all.filter(t => t.nivel_profundidade === nivel);
}

/**
 * Obtém tagsets N1 (domínios principais)
 */
export async function getN1Tagsets(): Promise<TagsetEntry[]> {
  return getTagsetsByLevel(1);
}

/**
 * Obtém tagsets N2 (subdomínios)
 */
export async function getN2Tagsets(): Promise<TagsetEntry[]> {
  return getTagsetsByLevel(2);
}

/**
 * Obtém tagsets N3 (sub-subdomínios)
 */
export async function getN3Tagsets(): Promise<TagsetEntry[]> {
  return getTagsetsByLevel(3);
}

/**
 * Obtém tagsets N4 (nível mais específico)
 */
export async function getN4Tagsets(): Promise<TagsetEntry[]> {
  return getTagsetsByLevel(4);
}

/**
 * Formata tagsets para uso em prompts de IA
 * @param tagsets Lista de tagsets
 * @param includeExamples Se deve incluir exemplos
 * @returns String formatada para prompt
 */
export function formatTagsetsForPrompt(
  tagsets: TagsetEntry[], 
  includeExamples: boolean = true
): string {
  return tagsets.map(t => {
    const exemplos = includeExamples && t.exemplos?.length 
      ? `: ${t.exemplos.slice(0, 5).join(', ')}`
      : '';
    return `- ${t.codigo} (${t.nome})${exemplos}`;
  }).join('\n');
}

/**
 * Gera prompt completo com N1 e N2
 */
export async function generateDomainPromptSection(): Promise<string> {
  const n1Tagsets = await getN1Tagsets();
  const n2Tagsets = await getN2Tagsets();

  const n1Section = n1Tagsets.map(t => {
    const desc = t.descricao ? `: ${t.descricao}` : '';
    return `- ${t.codigo} (${t.nome})${desc}`;
  }).join('\n');

  const n2Section = n2Tagsets.map(t => {
    const exemplos = t.exemplos?.length 
      ? `: ${t.exemplos.slice(0, 4).join(', ')}`
      : '';
    return `- ${t.codigo} (${t.nome})${exemplos}`;
  }).join('\n');

  return `**DOMÍNIOS SEMÂNTICOS N1:**
${n1Section}

**SUBDOMÍNIOS N2 (USE PREFERENCIALMENTE):**
${n2Section}`;
}

/**
 * Gera prompt completo com N1, N2, N3 e N4
 */
export async function generateFullDomainPromptSection(options: {
  includeN3?: boolean;
  includeN4?: boolean;
  maxExamples?: number;
} = {}): Promise<string> {
  const { includeN3 = true, includeN4 = false, maxExamples = 4 } = options;
  
  const n1Tagsets = await getN1Tagsets();
  const n2Tagsets = await getN2Tagsets();

  const n1Section = n1Tagsets.map(t => {
    const desc = t.descricao ? `: ${t.descricao}` : '';
    return `- ${t.codigo} (${t.nome})${desc}`;
  }).join('\n');

  const n2Section = n2Tagsets.map(t => {
    const exemplos = t.exemplos?.length 
      ? `: ${t.exemplos.slice(0, maxExamples).join(', ')}`
      : '';
    return `- ${t.codigo} (${t.nome})${exemplos}`;
  }).join('\n');

  let prompt = `**DOMÍNIOS SEMÂNTICOS N1:**
${n1Section}

**SUBDOMÍNIOS N2 (USE PREFERENCIALMENTE):**
${n2Section}`;

  if (includeN3) {
    const n3Tagsets = await getN3Tagsets();
    const n3Section = n3Tagsets.map(t => {
      const exemplos = t.exemplos?.length 
        ? `: ${t.exemplos.slice(0, maxExamples).join(', ')}`
        : '';
      return `- ${t.codigo} (${t.nome})${exemplos}`;
    }).join('\n');
    
    prompt += `\n\n**SUBCATEGORIAS N3 (PARA MAIOR PRECISÃO):**
${n3Section}`;
  }

  if (includeN4) {
    const n4Tagsets = await getN4Tagsets();
    const n4Section = n4Tagsets.map(t => {
      const exemplos = t.exemplos?.length 
        ? `: ${t.exemplos.slice(0, maxExamples).join(', ')}`
        : '';
      return `- ${t.codigo} (${t.nome})${exemplos}`;
    }).join('\n');
    
    prompt += `\n\n**CATEGORIAS ESPECÍFICAS N4 (MÁXIMA PRECISÃO):**
${n4Section}`;
  }

  return prompt;
}

/**
 * Gera prompt otimizado para classificação em batch
 * Inclui apenas N1 e N2 para manter prompt conciso
 */
export async function generateBatchClassificationPrompt(): Promise<string> {
  const n1Tagsets = await getN1Tagsets();
  const n2Tagsets = await getN2Tagsets();
  
  // Agrupa N2 por domínio N1
  const n2ByN1: Record<string, TagsetEntry[]> = {};
  for (const t of n2Tagsets) {
    const n1Code = t.codigo.split('.')[0];
    if (!n2ByN1[n1Code]) n2ByN1[n1Code] = [];
    n2ByN1[n1Code].push(t);
  }

  // Gera seção compacta por domínio
  const sections = n1Tagsets.map(n1 => {
    const subdomains = n2ByN1[n1.codigo] || [];
    const subdomainList = subdomains.map(s => {
      const ex = s.exemplos?.slice(0, 3).join(', ') || '';
      return `  - ${s.codigo} (${s.nome})${ex ? `: ${ex}` : ''}`;
    }).join('\n');
    
    return `- **${n1.codigo} (${n1.nome})**: ${n1.descricao || ''}
${subdomainList}`;
  }).join('\n\n');

  return sections;
}

/**
 * Obtém mapeamento de códigos N2 por domínio N1
 */
export async function getN2ByN1Domain(): Promise<Record<string, TagsetEntry[]>> {
  const n2Tagsets = await getN2Tagsets();
  const grouped: Record<string, TagsetEntry[]> = {};

  for (const t of n2Tagsets) {
    // Extrair código N1 do código N2 (ex: "SE.ALE" → "SE")
    const n1Code = t.codigo.split('.')[0];
    if (!grouped[n1Code]) {
      grouped[n1Code] = [];
    }
    grouped[n1Code].push(t);
  }

  return grouped;
}

/**
 * Valida se um código de tagset existe e está ativo
 */
export async function isValidTagset(codigo: string): Promise<boolean> {
  const all = await loadActiveTagsets();
  return all.some(t => t.codigo === codigo);
}

/**
 * Obtém tagset por código
 */
export async function getTagsetByCode(codigo: string): Promise<TagsetEntry | null> {
  const all = await loadActiveTagsets();
  return all.find(t => t.codigo === codigo) || null;
}

/**
 * Força recarga do cache
 */
export function invalidateTagsetsCache(): void {
  tagsetsCache = null;
  cacheLoadedAt = null;
  console.log('🔄 Tagsets cache invalidated');
}

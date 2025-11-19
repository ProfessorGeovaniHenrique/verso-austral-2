/**
 * Utilitários de Validação Pré-Importação
 * FASE 3 - BLOCO 2: Observabilidade
 * SPRINT 2: Adicionado Zod schemas e middleware de validação
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sampleValidationRate?: number;
  metadata?: Record<string, any>;
}

/**
 * Valida arquivo do Dicionário Dialectal antes de processar
 */
export function validateDialectalFile(content: string, volumeNum: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar tamanho mínimo
  if (content.length < 1000) {
    errors.push('Arquivo muito pequeno (< 1KB)');
  }
  
  // Verificar presença de marcadores de origem esperados
  const origemRegex = /\((BRAS|PLAT|CAST|QUER|PORT)\)/g;
  const origemMatches = content.match(origemRegex);
  
  if (!origemMatches || origemMatches.length === 0) {
    errors.push('Arquivo não contém marcadores de origem (BRAS/PLAT/CAST/QUER/PORT)');
  }
  
  // Verificar formato de verbetes (amostragem nas primeiras 100 linhas)
  const lines = content.split('\n').slice(0, 100).filter(l => l.trim());
  let validEntries = 0;
  
  for (const line of lines) {
    // Formato esperado: PALAVRA (ORIGEM) POS - Definição
    if (/^[A-ZÁÀÃÉÊÍÓÔÚÇ].*\((BRAS|PLAT|CAST|QUER|PORT)\)/.test(line)) {
      validEntries++;
    }
  }
  
  const sampleValidationRate = lines.length > 0 ? (validEntries / lines.length) * 100 : 0;
  
  if (sampleValidationRate < 20) {
    warnings.push(`Taxa de validação baixa: ${sampleValidationRate.toFixed(1)}% nas primeiras 100 linhas`);
  }
  
  // Verificar volume
  if (!['I', 'II'].includes(volumeNum)) {
    errors.push(`Volume inválido: "${volumeNum}". Deve ser "I" ou "II"`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sampleValidationRate,
    metadata: {
      fileSize: content.length,
      origemMarkersFound: origemMatches?.length || 0,
      linesInSample: lines.length,
      validEntriesInSample: validEntries
    }
  };
}

/**
 * Valida arquivo do Dicionário Gutenberg antes de processar
 */
export function validateGutenbergFile(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar tamanho mínimo
  if (content.length < 5000) {
    errors.push('Arquivo muito pequeno (< 5KB)');
  }
  
  // Verificar presença de marcadores de verbete (*palavra*)
  const verbeteRegex = /\n\*[A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+\*/g;
  const verbeteMatches = content.match(verbeteRegex);
  
  if (!verbeteMatches || verbeteMatches.length === 0) {
    errors.push('Arquivo não contém marcadores de verbete (*palavra*)');
  }
  
  // Verificar presença de classes gramaticais (_classe_)
  const classeRegex = /_[a-z\s\.]+_/gi;
  const classeMatches = content.match(classeRegex);
  
  if (!classeMatches || classeMatches.length === 0) {
    warnings.push('Poucas classes gramaticais encontradas (formato: _classe_)');
  }
  
  // Amostragem de qualidade
  const entries = content.split(/(?=\n\*[A-Za-záàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇ\-]+\*)/).slice(0, 50);
  let validEntries = 0;
  
  for (const entry of entries) {
    // Formato mínimo esperado: *palavra* seguido de algum conteúdo
    if (/\*[A-Za-z]+\*.*\n.{10,}/.test(entry)) {
      validEntries++;
    }
  }
  
  const sampleValidationRate = entries.length > 0 ? (validEntries / entries.length) * 100 : 0;
  
  if (sampleValidationRate < 50) {
    warnings.push(`Taxa de validação moderada: ${sampleValidationRate.toFixed(1)}% nas primeiras 50 entradas`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sampleValidationRate,
    metadata: {
      fileSize: content.length,
      verbeteMarkersFound: verbeteMatches?.length || 0,
      classeMarkersFound: classeMatches?.length || 0,
      entriesInSample: entries.length,
      validEntriesInSample: validEntries
    }
  };
}

/**
 * Valida arquivo do Dicionário Houaiss antes de processar
 */
export function validateHouaissFile(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar tamanho mínimo
  if (content.length < 5000) {
    errors.push('Arquivo muito pequeno (< 5KB)');
  }
  
  // Verificar presença de marcadores Houaiss (« »)
  const hasOpenMarker = content.includes('«');
  const hasCloseMarker = content.includes('»');
  
  if (!hasOpenMarker && !hasCloseMarker) {
    errors.push('Arquivo não contém marcadores Houaiss (« »)');
  }
  
  // Verificar presença de separadores (: para sinônimos, > para antônimos)
  const hasSeparators = content.includes(':') || content.includes('>');
  if (!hasSeparators) {
    warnings.push('Poucas estruturas de sinônimos/antônimos encontradas (: >)');
  }
  
  // Amostragem de qualidade
  const lines = content.split('\n').slice(0, 100).filter(l => l.trim() && !l.startsWith('#'));
  let validEntries = 0;
  
  for (const line of lines) {
    // Formato esperado: palavra « pos » conteúdo
    if (/\S+\s*=?\s*«/.test(line)) {
      validEntries++;
    }
  }
  
  const sampleValidationRate = lines.length > 0 ? (validEntries / lines.length) * 100 : 0;
  
  if (sampleValidationRate < 40) {
    warnings.push(`Taxa de validação baixa: ${sampleValidationRate.toFixed(1)}% nas primeiras 100 linhas`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sampleValidationRate,
    metadata: {
      fileSize: content.length,
      hasMarkers: hasOpenMarker && hasCloseMarker,
      hasSeparators,
      linesInSample: lines.length,
      validEntriesInSample: validEntries
    }
  };
}

/**
 * Valida arquivo do Dicionário UNESP antes de processar
 */
export function validateUNESPFile(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar tamanho mínimo
  if (content.length < 5000) {
    errors.push('Arquivo muito pequeno (< 5KB)');
  }
  
  // Verificar presença de classes gramaticais (s.m., s.f., adj., etc.)
  const posRegex = /(s\.m\.|s\.f\.|adj\.|v\.|adv\.|prep\.|conj\.|interj\.)/gi;
  const posMatches = content.match(posRegex);
  
  if (!posMatches || posMatches.length < 10) {
    errors.push('Arquivo não contém classes gramaticais suficientes (s.m., s.f., adj., etc.)');
  }
  
  // Verificar excesso de metadados (sinal de arquivo não limpo)
  const metadataIndicators = [
    /Notice/gi,
    /Page \d+/gi,
    /Project Gutenberg/gi,
    /This eBook/gi
  ];
  
  let metadataCount = 0;
  for (const indicator of metadataIndicators) {
    const matches = content.match(indicator);
    if (matches) metadataCount += matches.length;
  }
  
  if (metadataCount > 50) {
    warnings.push(`Arquivo contém muitos metadados (${metadataCount} ocorrências). Pré-processamento será aplicado.`);
  }
  
  // Amostragem de qualidade
  const lines = content.split('\n')
    .filter(l => l.trim() && !/^(Notice|Page|===|\*\*\*)/.test(l))
    .slice(0, 100);
  
  let validEntries = 0;
  
  for (const line of lines) {
    // Formato esperado: Palavra s.m./s.f./adj./etc. definição
    if (/^[A-ZÁÀÃÉÊÍÓÔÚÇ][a-záàãéêíóôúç\-]+\s+(s\.m\.|s\.f\.|adj\.|v\.|adv\.)/i.test(line)) {
      validEntries++;
    }
  }
  
  const sampleValidationRate = lines.length > 0 ? (validEntries / lines.length) * 100 : 0;
  
  if (sampleValidationRate < 30) {
    warnings.push(`Taxa de validação baixa: ${sampleValidationRate.toFixed(1)}% nas primeiras 100 linhas limpas`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sampleValidationRate,
    metadata: {
      fileSize: content.length,
      posMarkersFound: posMatches?.length || 0,
      metadataIndicatorsFound: metadataCount,
      linesInSample: lines.length,
      validEntriesInSample: validEntries
    }
  };
}

/**
 * Helper para logar resultados de validação
 */
export function logValidationResult(fonte: string, result: ValidationResult): void {
  if (!result.valid) {
    console.error(`
❌ [${fonte}] Validação FALHOU:
${result.errors.map(e => `   • ${e}`).join('\n')}
`);
    return;
  }
  
  console.log(`
✅ [${fonte}] Validação APROVADA
   📊 Taxa de validação: ${result.sampleValidationRate?.toFixed(1)}%
   📦 Tamanho do arquivo: ${(result.metadata?.fileSize / 1024).toFixed(1)}KB
`);
  
  if (result.warnings.length > 0) {
    console.warn(`
⚠️  [${fonte}] Avisos:
${result.warnings.map(w => `   • ${w}`).join('\n')}
`);
  }
}

// ==================== SPRINT 2: ZOD SCHEMAS ====================

// Schema para cancelamento de job
export const cancelJobSchema = z.object({
  jobId: z.string().uuid({ message: "jobId deve ser um UUID válido" }),
  reason: z.string()
    .trim()
    .min(5, { message: "Motivo deve ter no mínimo 5 caracteres" })
    .max(500, { message: "Motivo não pode exceder 500 caracteres" }),
});

// Schema para importação de dicionário
export const dictionaryImportSchema = z.object({
  fileContent: z.string()
    .min(1, { message: "Conteúdo do arquivo não pode estar vazio" })
    .max(10_000_000, { message: "Arquivo muito grande (máx: 10MB)" }),
  tipoDicionario: z.enum(
    ["Nunes e Nunes", "Gutenberg", "Houaiss", "UNESP"],
    { errorMap: () => ({ message: "Tipo de dicionário inválido" }) }
  ),
  offsetInicial: z.number()
    .int()
    .min(0, { message: "Offset deve ser >= 0" })
    .optional()
    .default(0),
});

// Schema para anotação de corpus
export const annotationSchema = z.object({
  corpusType: z.enum(["study", "reference"], {
    errorMap: () => ({ message: "corpusType deve ser 'study' ou 'reference'" })
  }),
  artistFilter: z.string().trim().max(200).optional(),
  demoMode: z.boolean().optional().default(false),
});

// ==================== FUNÇÕES DE VALIDAÇÃO ZOD ====================

export type ZodValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodError };

/**
 * Valida dados usando um schema Zod
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ZodValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message,
        details: error,
      };
    }
    return {
      success: false,
      error: "Erro de validação desconhecido",
    };
  }
}

/**
 * Valida tamanho de payload completo
 */
export function validatePayloadSize(
  payload: unknown,
  maxSizeBytes: number = 10_000_000
): ZodValidationResult<unknown> {
  const size = JSON.stringify(payload).length;
  
  if (size > maxSizeBytes) {
    return {
      success: false,
      error: `Payload muito grande: ${(size / 1_000_000).toFixed(2)}MB (máx: ${(maxSizeBytes / 1_000_000).toFixed(2)}MB)`,
    };
  }
  
  return { success: true, data: payload };
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove tags HTML
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limita tamanho
}

/**
 * Middleware de validação HTTP
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (req: Request): Promise<ZodValidationResult<T>> => {
    try {
      const body = await req.json();
      
      // Validar tamanho do payload
      const sizeValidation = validatePayloadSize(body);
      if (!sizeValidation.success) {
        return sizeValidation as ZodValidationResult<T>;
      }
      
      // Validar com schema Zod
      return validate(schema, body);
    } catch (error) {
      return {
        success: false,
        error: "Corpo da requisição inválido (JSON mal formado)",
      };
    }
  };
}

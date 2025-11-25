/**
 * Validação centralizada de hierarquia de tagsets
 * Previne inconsistências entre nivel_profundidade e categoria_pai
 */

export interface TagsetValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida consistência entre nível hierárquico e categoria pai
 */
export function validateNivelAndPai(
  nivel: number,
  categoriaPai: string | null | undefined
): TagsetValidationResult {
  // Nível 1 (raiz) não pode ter pai
  if (nivel === 1 && categoriaPai) {
    return {
      valid: false,
      error: 'Domínios de nível 1 (raiz) não podem ter categoria pai'
    };
  }

  // Níveis 2-4 devem ter pai
  if (nivel > 1 && !categoriaPai) {
    return {
      valid: false,
      error: `Domínios de nível ${nivel} devem ter uma categoria pai`
    };
  }

  return { valid: true };
}

/**
 * Sincroniza tagset_pai com categoria_pai para garantir consistência
 */
export function syncTagsetPaiFields(data: {
  tagset_pai?: string | null;
  categoria_pai?: string | null;
}): { tagset_pai: string | null; categoria_pai: string | null } {
  const pai = data.tagset_pai ?? data.categoria_pai ?? null;
  return {
    tagset_pai: pai,
    categoria_pai: pai
  };
}

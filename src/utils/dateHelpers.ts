/**
 * Retorna a data atual do sistema para uso em relatórios
 * @returns Data no formato ISO (YYYY-MM-DD)
 */
export function getCurrentReportDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formata data para exibição em português
 * @param dateString - Data no formato ISO
 * @returns Data formatada (ex: "18 de Novembro de 2025")
 */
export function formatDateBR(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Retorna o quarter atual baseado na data
 * @returns String no formato "Q1 2025"
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
}

/**
 * Valida se uma data não é anterior a 2025
 * @param dateString - Data no formato ISO ou Quarter (ex: "Q1 2025")
 * @returns true se a data é válida (2025 ou posterior)
 */
export function isValidProjectDate(dateString: string): boolean {
  if (dateString.includes('Q')) {
    const year = parseInt(dateString.split(' ')[1]);
    return year >= 2025;
  }
  const year = parseInt(dateString.split('-')[0]);
  return year >= 2025;
}

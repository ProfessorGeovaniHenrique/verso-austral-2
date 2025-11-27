/**
 * KWIC (Key Word In Context) Utilities
 * Extrai contexto ao redor de palavras-alvo em textos
 */

export interface KWICResult {
  leftContext: string;
  keyword: string;
  rightContext: string;
  position: number;
  lineNumber?: number;
}

/**
 * Extrai contexto KWIC para todas as ocorrências de uma palavra
 * @param text Texto completo (letra da música)
 * @param palavra Palavra a buscar
 * @param windowSize Tamanho da janela de contexto (caracteres)
 */
export function extractKWICContext(
  text: string,
  palavra: string,
  windowSize: number = 50
): KWICResult[] {
  if (!text || !palavra) return [];

  const results: KWICResult[] = [];
  const normalizedText = text.toLowerCase();
  const normalizedPalavra = palavra.toLowerCase();

  let position = 0;
  while ((position = normalizedText.indexOf(normalizedPalavra, position)) !== -1) {
    // Calcular limites do contexto
    const startPos = Math.max(0, position - windowSize);
    const endPos = Math.min(text.length, position + palavra.length + windowSize);

    // Extrair contextos
    let leftContext = text.substring(startPos, position);
    const keyword = text.substring(position, position + palavra.length);
    let rightContext = text.substring(position + palavra.length, endPos);

    // Adicionar reticências se truncado
    if (startPos > 0) leftContext = '...' + leftContext;
    if (endPos < text.length) rightContext = rightContext + '...';

    // Calcular número da linha
    const lineNumber = text.substring(0, position).split('\n').length;

    results.push({
      leftContext: leftContext.trim(),
      keyword,
      rightContext: rightContext.trim(),
      position,
      lineNumber
    });

    position += palavra.length;
  }

  return results;
}

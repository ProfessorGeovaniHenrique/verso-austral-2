/**
 * Preprocessamento do Dicionário do Nordeste - Fred Navarro (2014)
 * 
 * Limpa o arquivo bruto para facilitar o parsing:
 * - Remove linhas de introdução/metadados
 * - Remove numeração de linhas (formato "123: texto")
 * - Normaliza espaços e quebras de linha
 * - Reúne definições multi-linha
 */

export function preprocessNordestinoNavarro(rawContent: string): string {
  const lines = rawContent.split('\n');
  const processedLines: string[] = [];
  let inContent = false;
  let currentEntry = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Ignorar linhas vazias
    if (!line) {
      if (currentEntry) {
        processedLines.push(currentEntry);
        currentEntry = '';
      }
      continue;
    }

    // Pular metadados iniciais até encontrar primeira entrada real
    if (!inContent) {
      if (line.includes('•') && !line.startsWith('TÍTULO:') && !line.startsWith('AUTOR:')) {
        inContent = true;
      } else {
        continue;
      }
    }

    // Remover numeração de linha (formato "1234: texto")
    line = line.replace(/^\d+:\s*/, '');

    // Detectar nova entrada (linha com bullet point •)
    if (line.includes('•')) {
      // Salvar entrada anterior se existir
      if (currentEntry) {
        processedLines.push(currentEntry);
      }
      // Iniciar nova entrada
      currentEntry = line;
    } else if (currentEntry) {
      // Continuar definição multi-linha
      currentEntry += ' ' + line;
    }
  }

  // Adicionar última entrada
  if (currentEntry) {
    processedLines.push(currentEntry);
  }

  // Normalizar espaços múltiplos
  return processedLines
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n');
}

export function getPreprocessingStats(processedText: string) {
  const lines = processedText.split('\n');
  const entries = lines.filter(line => line.includes('•'));
  
  return {
    totalLines: lines.length,
    totalEntries: entries.length,
    avgLineLength: Math.round(processedText.length / lines.length),
    firstEntries: entries.slice(0, 5),
    sampleText: processedText.slice(0, 500)
  };
}

/**
 * 🎯 VALIDAÇÃO DE KWIC
 * 
 * Script para validar que todas as palavras-chave têm entradas KWIC
 */

import { palavrasChaveData } from '@/data/mockup/palavras-chave';
import { kwicDataMap } from '@/data/mockup/kwic';
import { getProsodiaByLema } from '@/data/mockup/prosodias-lemas';

export interface KWICValidationResult {
  totalWords: number;
  wordsWithKWIC: number;
  wordsWithoutKWIC: string[];
  coverage: number;
}

/**
 * Valida todas as palavras-chave e retorna relatório
 */
export function validateAllKWIC(): KWICValidationResult {
  const missingKWIC: string[] = [];
  let foundCount = 0;

  palavrasChaveData.forEach(palavra => {
    // Tentar palavra exata
    const kwicKey = palavra.palavra.toLowerCase();
    const lemaKey = palavra.lema?.toLowerCase();
    
    const hasKWIC = 
      kwicDataMap[kwicKey] || 
      kwicDataMap[palavra.palavra] ||
      (lemaKey && kwicDataMap[lemaKey]) ||
      (palavra.lema && kwicDataMap[palavra.lema]);

    if (hasKWIC) {
      foundCount++;
    } else {
      missingKWIC.push(palavra.palavra);
    }
  });

  const coverage = (foundCount / palavrasChaveData.length) * 100;

  return {
    totalWords: palavrasChaveData.length,
    wordsWithKWIC: foundCount,
    wordsWithoutKWIC: missingKWIC,
    coverage
  };
}

/**
 * Imprime relatório de validação no console
 */
export function printKWICValidationReport(): void {
  const result = validateAllKWIC();
  
  console.log('\n🔍 RELATÓRIO DE VALIDAÇÃO KWIC\n');
  console.log(`Total de palavras-chave: ${result.totalWords}`);
  console.log(`Palavras COM KWIC: ${result.wordsWithKWIC}`);
  console.log(`Palavras SEM KWIC: ${result.wordsWithoutKWIC.length}`);
  console.log(`Cobertura: ${result.coverage.toFixed(2)}%\n`);

  if (result.wordsWithoutKWIC.length > 0) {
    console.log('❌ Palavras SEM KWIC:');
    result.wordsWithoutKWIC.forEach(palavra => {
      console.log(`  - ${palavra}`);
    });
  } else {
    console.log('✅ Todas as palavras-chave têm entradas KWIC!');
  }
}

/**
 * Busca KWIC para uma palavra (com fallbacks inteligentes)
 */
export function getKWICForWord(palavra: string): any[] {
  // Tentar palavra exata
  if (kwicDataMap[palavra]) return kwicDataMap[palavra];
  
  // Tentar lowercase
  const lowerKey = palavra.toLowerCase();
  if (kwicDataMap[lowerKey]) return kwicDataMap[lowerKey];
  
  // Tentar buscar lema da palavra
  const wordData = palavrasChaveData.find(p => 
    p.palavra.toLowerCase() === lowerKey
  );
  
  if (wordData?.lema) {
    const lemaKey = wordData.lema.toLowerCase();
    if (kwicDataMap[lemaKey]) return kwicDataMap[lemaKey];
    if (kwicDataMap[wordData.lema]) return kwicDataMap[wordData.lema];
  }
  
  return [];
}

/**
 * 🔍 VALIDAÇÃO DE CONSISTÊNCIA COMPLETA DO CORPUS DEMO
 */
export function validateDemoConsistency() {
  console.group('🔍 VALIDAÇÃO DE CONSISTÊNCIA - CORPUS DEMO');
  
  // 1. Verificar cobertura KWIC
  const kwicResult = validateAllKWIC();
  console.log(`\n📊 Cobertura KWIC: ${kwicResult.coverage.toFixed(2)}%`);
  
  if (kwicResult.wordsWithoutKWIC.length > 0) {
    console.error('❌ Palavras sem KWIC:', kwicResult.wordsWithoutKWIC);
  } else {
    console.log('✅ Todas as palavras-chave têm entradas KWIC!');
  }
  
  // 2. Verificar palavras-chave têm prosódia
  const palavrasSemProsodia = palavrasChaveData.filter(p => {
    const prosody = getProsodiaByLema(p.lema);
    return !prosody || prosody === 'Neutra';
  });
  
  console.log(`\n📊 Palavras sem prosódia explícita: ${palavrasSemProsodia.length}`);
  if (palavrasSemProsodia.length > 0) {
    console.warn('⚠️ Palavras sem prosódia:', palavrasSemProsodia.map(p => p.palavra));
  }
  
  // 3. Verificar duplicatas
  const palavrasUnicas = new Set(palavrasChaveData.map(p => p.palavra));
  const duplicatas = palavrasChaveData.length - palavrasUnicas.size;
  
  if (duplicatas > 0) {
    console.warn(`⚠️ ${duplicatas} palavras duplicadas encontradas`);
    
    // Listar palavras duplicadas
    const palavrasVistas = new Map<string, number>();
    palavrasChaveData.forEach(p => {
      const count = palavrasVistas.get(p.palavra) || 0;
      palavrasVistas.set(p.palavra, count + 1);
    });
    
    const duplicadasList = Array.from(palavrasVistas.entries())
      .filter(([_, count]) => count > 1)
      .map(([palavra, count]) => `${palavra} (${count}x)`);
      
    console.warn('Palavras duplicadas:', duplicadasList);
  } else {
    console.log('✅ Sem duplicatas detectadas');
  }
  
  // 4. Verificar consistência de lemas
  const palavrasSemLema = palavrasChaveData.filter(p => !p.lema);
  console.log(`\n📊 Palavras sem lema: ${palavrasSemLema.length}`);
  if (palavrasSemLema.length > 0) {
    console.warn('⚠️ Palavras sem lema:', palavrasSemLema.map(p => p.palavra));
  }
  
  // 5. Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(50));
  console.log(`Total de palavras: ${palavrasChaveData.length}`);
  console.log(`Cobertura KWIC: ${kwicResult.coverage.toFixed(2)}%`);
  console.log(`Duplicatas: ${duplicatas}`);
  console.log(`Sem prosódia: ${palavrasSemProsodia.length}`);
  console.log(`Sem lema: ${palavrasSemLema.length}`);
  
  const allGood = kwicResult.coverage === 100 && duplicatas === 0 && palavrasSemProsodia.length === 0;
  if (allGood) {
    console.log('\n✅ CORPUS DEMO: VALIDAÇÃO COMPLETA APROVADA!');
  } else {
    console.log('\n⚠️ CORPUS DEMO: VALIDAÇÃO COM AVISOS - REVISAR ACIMA');
  }
  
  console.groupEnd();
  
  return {
    kwicCoverage: kwicResult.coverage,
    missingKWIC: kwicResult.wordsWithoutKWIC,
    duplicates: duplicatas,
    withoutProsody: palavrasSemProsodia.length,
    withoutLemma: palavrasSemLema.length,
    isValid: allGood
  };
}

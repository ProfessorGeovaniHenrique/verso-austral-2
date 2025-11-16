/**
 * 🧪 SISTEMA DE TESTES AUTOMATIZADOS DO CORPUS MASTER
 * 
 * Valida a integridade dos dados e detecta regressões automaticamente
 */

import { 
  corpusMaster, 
  getPalavrasTematicas,
  getPalavrasByDominio,
  getDominiosAgregados,
  getProsodiaStats
} from '../corpus-master';
import { prosodiasLemasMap } from '../prosodias-lemas';
import { dominiosNormalizados } from '../dominios-normalized';
import { frequenciaNormalizadaData } from '../frequencia-normalizada';

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Executa todos os testes e retorna o relatório completo
 */
export function runAllTests(): TestSuite[] {
  const suites: TestSuite[] = [
    testDataIntegrity(),
    testDomainConsistency(),
    testProsodyIntegrity(),
    testStatisticalData(),
    testCorpusMetrics()
  ];

  // Log resumo geral
  console.group('🧪 RESUMO GERAL DOS TESTES');
  suites.forEach(suite => {
    const emoji = suite.summary.failed > 0 ? '❌' : suite.summary.warnings > 0 ? '⚠️' : '✅';
    console.log(`${emoji} ${suite.name}: ${suite.summary.passed}/${suite.summary.total} passaram`);
  });
  console.groupEnd();

  return suites;
}

/**
 * 1️⃣ Testes de Integridade de Dados Básicos
 */
function testDataIntegrity(): TestSuite {
  const tests: TestResult[] = [];

  // Teste 1: Total de palavras é 142
  tests.push({
    id: 'total-words',
    name: 'Total de palavras no corpus',
    status: corpusMaster.length === 142 ? 'passed' : 'failed',
    message: corpusMaster.length === 142 
      ? `✓ Corpus contém exatamente 142 palavras` 
      : `✗ Esperado 142 palavras, encontrado ${corpusMaster.length}`,
    details: { expected: 142, actual: corpusMaster.length },
    timestamp: new Date()
  });

  // Teste 2: Todas as palavras têm lema
  const semLema = corpusMaster.filter(p => !p.lema || p.lema.trim() === '');
  tests.push({
    id: 'all-have-lemma',
    name: 'Todas as palavras têm lema',
    status: semLema.length === 0 ? 'passed' : 'failed',
    message: semLema.length === 0 
      ? '✓ Todos os lemas estão definidos' 
      : `✗ ${semLema.length} palavras sem lema`,
    details: semLema.map(p => p.palavra),
    timestamp: new Date()
  });

  // Teste 3: Não há palavras duplicadas
  const palavras = corpusMaster.map(p => p.palavra);
  const duplicadas = palavras.filter((p, i) => palavras.indexOf(p) !== i);
  tests.push({
    id: 'no-duplicates',
    name: 'Não há palavras duplicadas',
    status: duplicadas.length === 0 ? 'passed' : 'failed',
    message: duplicadas.length === 0 
      ? '✓ Nenhuma palavra duplicada' 
      : `✗ ${duplicadas.length} palavras duplicadas`,
    details: duplicadas,
    timestamp: new Date()
  });

  // Teste 4: Frequências são válidas
  const frequenciasInvalidas = corpusMaster.filter(p => 
    p.frequenciaBruta <= 0 || p.frequenciaNormalizada <= 0 || isNaN(p.frequenciaBruta)
  );
  tests.push({
    id: 'valid-frequencies',
    name: 'Todas as frequências são válidas',
    status: frequenciasInvalidas.length === 0 ? 'passed' : 'failed',
    message: frequenciasInvalidas.length === 0 
      ? '✓ Todas as frequências são positivas' 
      : `✗ ${frequenciasInvalidas.length} palavras com frequência inválida`,
    details: frequenciasInvalidas.map(p => ({ palavra: p.palavra, freq: p.frequenciaBruta })),
    timestamp: new Date()
  });

  // Teste 5: Consistência com frequenciaNormalizadaData
  const totalFreq = frequenciaNormalizadaData.length;
  tests.push({
    id: 'frequency-data-match',
    name: 'Consistência com frequenciaNormalizadaData',
    status: corpusMaster.length === totalFreq ? 'passed' : 'failed',
    message: corpusMaster.length === totalFreq 
      ? `✓ Corpus master contém todas as ${totalFreq} palavras de frequenciaNormalizadaData` 
      : `✗ Discrepância: corpus master tem ${corpusMaster.length}, frequenciaNormalizadaData tem ${totalFreq}`,
    details: { corpusMaster: corpusMaster.length, frequenciaNormalizada: totalFreq },
    timestamp: new Date()
  });

  return createSuite('Integridade de Dados Básicos', tests);
}

/**
 * 2️⃣ Testes de Consistência de Domínios
 */
function testDomainConsistency(): TestSuite {
  const tests: TestResult[] = [];
  const tematicas = getPalavrasTematicas();

  // Teste 1: Todas as palavras temáticas têm domínio
  const semDominio = tematicas.filter(p => 
    !p.dominio || p.dominio === 'Sem Classificação'
  );
  tests.push({
    id: 'all-have-domain',
    name: 'Palavras temáticas têm domínio',
    status: semDominio.length === 0 ? 'passed' : 'failed',
    message: semDominio.length === 0 
      ? `✓ Todas as ${tematicas.length} palavras temáticas classificadas` 
      : `✗ ${semDominio.length} palavras temáticas sem domínio`,
    details: semDominio.map(p => p.palavra),
    timestamp: new Date()
  });

  // Teste 2: Domínios têm pelo menos 1 palavra
  const dominios = getDominiosAgregados().filter(d => 
    d.dominio !== 'Sem Classificação' && d.dominio !== 'Palavras Funcionais'
  );
  const dominiosVazios = dominios.filter(d => d.ocorrencias === 0);
  tests.push({
    id: 'domains-not-empty',
    name: 'Todos os domínios têm palavras',
    status: dominiosVazios.length === 0 ? 'passed' : 'failed',
    message: dominiosVazios.length === 0 
      ? `✓ Todos os ${dominios.length} domínios têm palavras` 
      : `✗ ${dominiosVazios.length} domínios vazios`,
    details: dominiosVazios,
    timestamp: new Date()
  });

  // Teste 3: Riqueza lexical corresponde ao número de lemas
  const inconsistentes = dominios.filter(d => d.riquezaLexical !== d.lemas.length);
  tests.push({
    id: 'lexical-richness-match',
    name: 'Riqueza lexical consistente',
    status: inconsistentes.length === 0 ? 'passed' : 'failed',
    message: inconsistentes.length === 0 
      ? '✓ Riqueza lexical corresponde ao número de lemas' 
      : `✗ ${inconsistentes.length} domínios com inconsistência`,
    details: inconsistentes.map(d => ({ 
      dominio: d.dominio, 
      riqueza: d.riquezaLexical, 
      lemas: d.lemas.length 
    })),
    timestamp: new Date()
  });

  // Teste 4: Palavras de domínios existem no corpus
  let palavrasInvalidas = 0;
  const corpusPalavras = new Set(corpusMaster.map(p => p.palavra));
  dominios.forEach(d => {
    d.palavras.forEach(p => {
      if (!corpusPalavras.has(p)) palavrasInvalidas++;
    });
  });
  tests.push({
    id: 'domain-words-exist',
    name: 'Palavras de domínios existem no corpus',
    status: palavrasInvalidas === 0 ? 'passed' : 'failed',
    message: palavrasInvalidas === 0 
      ? '✓ Todas as palavras dos domínios estão no corpus' 
      : `✗ ${palavrasInvalidas} palavras de domínios não encontradas no corpus`,
    timestamp: new Date()
  });

  return createSuite('Consistência de Domínios', tests);
}

/**
 * 3️⃣ Testes de Integridade de Prosódia
 */
function testProsodyIntegrity(): TestSuite {
  const tests: TestResult[] = [];
  const tematicas = getPalavrasTematicas();

  // Teste 1: Todas as palavras temáticas têm prosódia
  const semProsodia = tematicas.filter(p => !p.prosodia);
  tests.push({
    id: 'all-have-prosody',
    name: 'Palavras temáticas têm prosódia',
    status: semProsodia.length === 0 ? 'passed' : 'failed',
    message: semProsodia.length === 0 
      ? `✓ Todas as ${tematicas.length} palavras têm prosódia` 
      : `✗ ${semProsodia.length} palavras sem prosódia`,
    details: semProsodia.map(p => p.palavra),
    timestamp: new Date()
  });

  // Teste 2: Prosódia é válida (Positiva/Negativa/Neutra)
  const prosodiaInvalida = tematicas.filter(p => 
    !['Positiva', 'Negativa', 'Neutra'].includes(p.prosodia)
  );
  tests.push({
    id: 'valid-prosody-values',
    name: 'Valores de prosódia são válidos',
    status: prosodiaInvalida.length === 0 ? 'passed' : 'failed',
    message: prosodiaInvalida.length === 0 
      ? '✓ Todas as prosódias são Positiva/Negativa/Neutra' 
      : `✗ ${prosodiaInvalida.length} palavras com prosódia inválida`,
    details: prosodiaInvalida.map(p => ({ palavra: p.palavra, prosodia: p.prosodia })),
    timestamp: new Date()
  });

  // Teste 3: Lemas têm prosódia definida em prosodiasLemasMap
  const lemasUnicos = Array.from(new Set(tematicas.map(p => p.lema)));
  const lemasSemProsodia = lemasUnicos.filter(lema => !prosodiasLemasMap[lema]);
  tests.push({
    id: 'lemmas-in-prosody-map',
    name: 'Lemas estão em prosodiasLemasMap',
    status: lemasSemProsodia.length === 0 ? 'passed' : 'failed',
    message: lemasSemProsodia.length === 0 
      ? `✓ Todos os ${lemasUnicos.length} lemas têm prosódia definida` 
      : `✗ ${lemasSemProsodia.length} lemas sem prosódia no mapa`,
    details: lemasSemProsodia,
    timestamp: new Date()
  });

  // Teste 4: Estatísticas de prosódia somam 100%
  const stats = getProsodiaStats();
  const somaPercentuais = parseFloat(stats.positivas.percent) + 
                          parseFloat(stats.negativas.percent) + 
                          parseFloat(stats.neutras.percent);
  const diff = Math.abs(somaPercentuais - 100);
  tests.push({
    id: 'prosody-stats-sum',
    name: 'Estatísticas de prosódia somam 100%',
    status: diff < 0.5 ? 'passed' : 'warning',
    message: diff < 0.5 
      ? `✓ Soma dos percentuais: ${somaPercentuais.toFixed(1)}%` 
      : `⚠ Soma dos percentuais: ${somaPercentuais.toFixed(1)}% (esperado ~100%)`,
    details: { soma: somaPercentuais, diferenca: diff },
    timestamp: new Date()
  });

  return createSuite('Integridade de Prosódia', tests);
}

/**
 * 4️⃣ Testes de Dados Estatísticos
 */
function testStatisticalData(): TestSuite {
  const tests: TestResult[] = [];

  // Teste 1: Palavras com alta significância têm LL > 0
  const altaSignificancia = corpusMaster.filter(p => 
    p.significancia === 'Alta' || p.significancia === 'Média'
  );
  const llInvalido = altaSignificancia.filter(p => p.ll <= 0);
  tests.push({
    id: 'high-significance-ll',
    name: 'Alta significância tem LL positivo',
    status: llInvalido.length === 0 ? 'passed' : 'failed',
    message: llInvalido.length === 0 
      ? `✓ Todas as ${altaSignificancia.length} palavras de alta significância têm LL > 0` 
      : `✗ ${llInvalido.length} palavras com LL inválido`,
    details: llInvalido.map(p => ({ palavra: p.palavra, ll: p.ll })),
    timestamp: new Date()
  });

  // Teste 2: Palavras funcionais têm LL = 0
  const funcionais = corpusMaster.filter(p => p.significancia === 'Funcional');
  const funcionaisComLL = funcionais.filter(p => p.ll !== 0 || p.mi !== 0);
  tests.push({
    id: 'functional-zero-ll',
    name: 'Palavras funcionais têm LL = 0',
    status: funcionaisComLL.length === 0 ? 'passed' : 'failed',
    message: funcionaisComLL.length === 0 
      ? `✓ Todas as ${funcionais.length} palavras funcionais têm LL = 0` 
      : `✗ ${funcionaisComLL.length} funcionais com LL ≠ 0`,
    details: funcionaisComLL.map(p => ({ palavra: p.palavra, ll: p.ll, mi: p.mi })),
    timestamp: new Date()
  });

  // Teste 3: Significância é válida
  const significanciaInvalida = corpusMaster.filter(p => 
    !['Alta', 'Média', 'Baixa', 'Funcional'].includes(p.significancia)
  );
  tests.push({
    id: 'valid-significance',
    name: 'Significância é válida',
    status: significanciaInvalida.length === 0 ? 'passed' : 'failed',
    message: significanciaInvalida.length === 0 
      ? '✓ Todas as significâncias são válidas' 
      : `✗ ${significanciaInvalida.length} palavras com significância inválida`,
    details: significanciaInvalida.map(p => ({ palavra: p.palavra, sig: p.significancia })),
    timestamp: new Date()
  });

  return createSuite('Dados Estatísticos', tests);
}

/**
 * 5️⃣ Testes de Métricas do Corpus
 */
function testCorpusMetrics(): TestSuite {
  const tests: TestResult[] = [];
  const tematicas = getPalavrasTematicas();

  // Teste 1: Proporção temáticas/funcionais é razoável (50-90% temáticas)
  const percentualTematico = (tematicas.length / corpusMaster.length) * 100;
  tests.push({
    id: 'thematic-proportion',
    name: 'Proporção de palavras temáticas',
    status: percentualTematico >= 50 && percentualTematico <= 90 ? 'passed' : 'warning',
    message: percentualTematico >= 50 && percentualTematico <= 90 
      ? `✓ ${percentualTematico.toFixed(1)}% são temáticas (esperado 50-90%)` 
      : `⚠ ${percentualTematico.toFixed(1)}% são temáticas (esperado 50-90%)`,
    details: { tematicas: tematicas.length, total: corpusMaster.length, percentual: percentualTematico },
    timestamp: new Date()
  });

  // Teste 2: Distribuição de prosódia é equilibrada (não > 80% de uma só)
  const stats = getProsodiaStats();
  const maxProsodia = Math.max(
    parseFloat(stats.positivas.percent),
    parseFloat(stats.negativas.percent),
    parseFloat(stats.neutras.percent)
  );
  tests.push({
    id: 'prosody-distribution',
    name: 'Distribuição de prosódia equilibrada',
    status: maxProsodia < 80 ? 'passed' : 'warning',
    message: maxProsodia < 80 
      ? `✓ Maior prosódia: ${maxProsodia}% (esperado < 80%)` 
      : `⚠ Maior prosódia: ${maxProsodia}% (esperado < 80%)`,
    details: stats,
    timestamp: new Date()
  });

  // Teste 3: Número de domínios é razoável (5-15)
  const dominios = getDominiosAgregados().filter(d => 
    d.dominio !== 'Sem Classificação' && d.dominio !== 'Palavras Funcionais'
  );
  tests.push({
    id: 'domain-count',
    name: 'Número de domínios é razoável',
    status: dominios.length >= 5 && dominios.length <= 15 ? 'passed' : 'warning',
    message: dominios.length >= 5 && dominios.length <= 15 
      ? `✓ ${dominios.length} domínios identificados (esperado 5-15)` 
      : `⚠ ${dominios.length} domínios identificados (esperado 5-15)`,
    details: { count: dominios.length },
    timestamp: new Date()
  });

  return createSuite('Métricas do Corpus', tests);
}

/**
 * Função auxiliar para criar suite de testes
 */
function createSuite(name: string, tests: TestResult[]): TestSuite {
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const warnings = tests.filter(t => t.status === 'warning').length;

  return {
    name,
    tests,
    summary: {
      total: tests.length,
      passed,
      failed,
      warnings
    }
  };
}

/**
 * Exporta função para executar testes automaticamente
 */
export function runTestsWithConsoleOutput() {
  console.group('🧪 EXECUTANDO TESTES AUTOMATIZADOS DO CORPUS MASTER');
  const suites = runAllTests();
  
  suites.forEach(suite => {
    console.group(`📦 ${suite.name} (${suite.summary.passed}/${suite.summary.total})`);
    suite.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      console.log(`${icon} ${test.name}: ${test.message}`);
      if (test.details && (test.status === 'failed' || test.status === 'warning')) {
        console.log('   Detalhes:', test.details);
      }
    });
    console.groupEnd();
  });
  
  console.groupEnd();
  return suites;
}

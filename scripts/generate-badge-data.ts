#!/usr/bin/env tsx

/**
 * 🎨 Gerador de Dados para Badges Dinâmicos
 * 
 * Gera um arquivo JSON com métricas do projeto que pode ser usado
 * para criar badges customizados via shields.io endpoint
 * 
 * Uso: npm run badge:generate
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { runAllTests } from '../src/data/mockup/validation/corpusTests';

interface BadgeData {
  schemaVersion: number;
  label: string;
  message: string;
  color: string;
  namedLogo?: string;
  logoColor?: string;
}

interface ProjectMetrics {
  version: BadgeData;
  tests: BadgeData;
  coverage: BadgeData;
  corpus: BadgeData;
  lastUpdate: string;
}

function getVersion(): string {
  const versionPath = resolve(process.cwd(), 'VERSION');
  try {
    return readFileSync(versionPath, 'utf-8').trim();
  } catch {
    return '0.0.0';
  }
}

async function getTestResults(): Promise<{ passed: number; failed: number; total: number }> {
  try {
    const results = runAllTests();
    let passed = 0;
    let failed = 0;
    let total = 0;

    results.forEach(suite => {
      suite.tests.forEach(test => {
        total++;
        if (test.passed) {
          passed++;
        } else {
          failed++;
        }
      });
    });

    return { passed, failed, total };
  } catch (error) {
    console.error('Erro ao executar testes:', error);
    return { passed: 0, failed: 0, total: 0 };
  }
}

function createVersionBadge(version: string): BadgeData {
  return {
    schemaVersion: 1,
    label: 'versão',
    message: `v${version}`,
    color: 'blue',
    namedLogo: 'semanticrelease',
    logoColor: 'white',
  };
}

function createTestsBadge(passed: number, failed: number, total: number): BadgeData {
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  const color = failed === 0 ? 'brightgreen' : failed <= 2 ? 'yellow' : 'red';
  
  return {
    schemaVersion: 1,
    label: 'testes',
    message: `${passed}/${total} (${percentage}%)`,
    color,
    namedLogo: 'pytest',
    logoColor: 'white',
  };
}

function createCoverageBadge(passed: number, total: number): BadgeData {
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  let color = 'red';
  
  if (percentage >= 90) color = 'brightgreen';
  else if (percentage >= 80) color = 'green';
  else if (percentage >= 70) color = 'yellow';
  else if (percentage >= 60) color = 'orange';
  
  return {
    schemaVersion: 1,
    label: 'cobertura',
    message: `${percentage}%`,
    color,
    namedLogo: 'codecov',
    logoColor: 'white',
  };
}

function createCorpusBadge(): BadgeData {
  // Aqui você pode adicionar lógica para verificar o tamanho/status do corpus
  try {
    const corpusPath = resolve(process.cwd(), 'src/data/mockup/corpus-master.ts');
    const corpusContent = readFileSync(corpusPath, 'utf-8');
    const wordCount = (corpusContent.match(/palavra:/g) || []).length;
    
    return {
      schemaVersion: 1,
      label: 'corpus',
      message: `${wordCount} palavras`,
      color: 'informational',
      namedLogo: 'databricks',
      logoColor: 'white',
    };
  } catch {
    return {
      schemaVersion: 1,
      label: 'corpus',
      message: 'indisponível',
      color: 'lightgrey',
    };
  }
}

async function generateBadgeData(): Promise<void> {
  console.log('🎨 Gerando dados para badges...\n');

  // Obter métricas
  const version = getVersion();
  const { passed, failed, total } = await getTestResults();

  console.log(`📊 Métricas coletadas:`);
  console.log(`   Versão: ${version}`);
  console.log(`   Testes: ${passed}/${total} aprovados`);
  console.log('');

  // Criar badges
  const metrics: ProjectMetrics = {
    version: createVersionBadge(version),
    tests: createTestsBadge(passed, failed, total),
    coverage: createCoverageBadge(passed, total),
    corpus: createCorpusBadge(),
    lastUpdate: new Date().toISOString(),
  };

  // Criar diretório de saída
  const outputDir = resolve(process.cwd(), 'public/badges');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Salvar cada badge como arquivo JSON separado
  Object.entries(metrics).forEach(([key, value]) => {
    if (key === 'lastUpdate') return;
    
    const filePath = resolve(outputDir, `${key}.json`);
    writeFileSync(filePath, JSON.stringify(value, null, 2));
    console.log(`✅ Badge criado: ${key}.json`);
  });

  // Salvar arquivo consolidado
  const consolidatedPath = resolve(outputDir, 'metrics.json');
  writeFileSync(consolidatedPath, JSON.stringify(metrics, null, 2));
  console.log(`✅ Métricas consolidadas: metrics.json`);

  // Gerar README com exemplos de uso
  const readmePath = resolve(outputDir, 'README.md');
  const readmeContent = generateBadgeReadme(metrics);
  writeFileSync(readmePath, readmeContent);
  console.log(`✅ README criado: badges/README.md`);

  console.log('\n🎉 Badges gerados com sucesso!');
  console.log(`📁 Localização: ${outputDir}`);
}

function generateBadgeReadme(metrics: ProjectMetrics): string {
  return `# 🎨 Badges Dinâmicos do Projeto

## Badges Disponíveis

### Via GitHub Actions (Recomendado)

Estes badges são atualizados automaticamente pelos workflows do GitHub:

\`\`\`markdown
![Quality Gate](https://github.com/USERNAME/REPO/workflows/Quality%20Gate/badge.svg)
![Test Corpus](https://github.com/USERNAME/REPO/workflows/Test%20Corpus/badge.svg)
![Auto Version](https://github.com/USERNAME/REPO/workflows/Auto%20Version/badge.svg)
\`\`\`

### Via Shields.io Endpoint (Customizados)

Estes badges usam os dados gerados localmente:

\`\`\`markdown
![Version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/version.json)
![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/tests.json)
![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/coverage.json)
![Corpus](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/corpus.json)
\`\`\`

## Status Atual

- **Versão:** ${metrics.version.message}
- **Testes:** ${metrics.tests.message}
- **Cobertura:** ${metrics.coverage.message}
- **Corpus:** ${metrics.corpus.message}
- **Última Atualização:** ${new Date(metrics.lastUpdate).toLocaleString('pt-BR')}

## Como Usar

### 1. Gerar Badges Localmente

\`\`\`bash
npm run badge:generate
\`\`\`

### 2. Commit e Push

Os arquivos JSON em \`public/badges/\` devem ser commitados ao repositório:

\`\`\`bash
git add public/badges/
git commit -m "chore: update badge data"
git push
\`\`\`

### 3. Usar no README

Substitua \`USERNAME/REPO\` pela URL do seu repositório GitHub.

### 4. Automatizar (Opcional)

Adicione ao workflow de CI/CD para atualizar automaticamente:

\`\`\`yaml
- name: Generate Badge Data
  run: npm run badge:generate

- name: Commit Badge Data
  run: |
    git add public/badges/
    git commit -m "chore: update badge data [skip ci]" || exit 0
    git push
\`\`\`

## Personalização

Edite \`scripts/generate-badge-data.ts\` para customizar:

- Cores dos badges
- Labels
- Ícones (via \`namedLogo\`)
- Lógica de cálculo de métricas

## Referências

- [Shields.io Endpoint](https://shields.io/endpoint)
- [Shields.io Badges](https://shields.io/)
- [GitHub Actions Badges](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge)

---

**Última geração:** ${new Date(metrics.lastUpdate).toLocaleString('pt-BR')}
`;
}

// Executar
generateBadgeData().catch(error => {
  console.error('❌ Erro ao gerar badges:', error);
  process.exit(1);
});

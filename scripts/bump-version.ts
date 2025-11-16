#!/usr/bin/env tsx

/**
 * 🔢 Script de Versionamento Semântico Automático
 * 
 * Analisa mensagens de commit desde a última tag e determina o próximo
 * número de versão seguindo Semantic Versioning 2.0.0
 * 
 * Regras:
 * - BREAKING CHANGE ou feat!: Major version (x.0.0)
 * - feat: Minor version (0.x.0)
 * - fix: Patch version (0.0.x)
 * - Outros tipos: Não geram bump
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface Version {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(versionString: string): Version {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Formato de versão inválido: ${versionString}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function getCurrentVersion(): string {
  const versionPath = resolve(process.cwd(), 'VERSION');
  try {
    return readFileSync(versionPath, 'utf-8').trim();
  } catch {
    return '0.0.0';
  }
}

function getCommitsSinceLastTag(): string[] {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s"`, {
      encoding: 'utf-8',
    });
    
    return commits.split('\n').filter(Boolean);
  } catch {
    // Se não há tags, pega todos os commits
    try {
      const commits = execSync('git log --pretty=format:"%s"', {
        encoding: 'utf-8',
      });
      return commits.split('\n').filter(Boolean);
    } catch {
      console.log('⚠️  Nenhum commit encontrado');
      return [];
    }
  }
}

function analyzeCommits(commits: string[]): 'major' | 'minor' | 'patch' | 'none' {
  let hasMajor = false;
  let hasMinor = false;
  let hasPatch = false;

  for (const commit of commits) {
    // BREAKING CHANGE ou feat! = Major
    if (commit.includes('BREAKING CHANGE') || /^feat!/.test(commit)) {
      hasMajor = true;
    }
    // feat = Minor
    else if (/^feat(\(.+\))?:/.test(commit)) {
      hasMinor = true;
    }
    // fix = Patch
    else if (/^fix(\(.+\))?:/.test(commit)) {
      hasPatch = true;
    }
  }

  if (hasMajor) return 'major';
  if (hasMinor) return 'minor';
  if (hasPatch) return 'patch';
  return 'none';
}

function bumpVersion(currentVersion: Version, bumpType: 'major' | 'minor' | 'patch'): Version {
  const newVersion = { ...currentVersion };

  switch (bumpType) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
  }

  return newVersion;
}

function updateVersionFile(version: string): void {
  const versionPath = resolve(process.cwd(), 'VERSION');
  writeFileSync(versionPath, version + '\n', 'utf-8');
}

function createGitTag(version: string): void {
  try {
    execSync(`git tag -a v${version} -m "chore: release v${version}"`, {
      stdio: 'inherit',
    });
    console.log(`✅ Tag v${version} criada localmente`);
    console.log(`💡 Execute 'git push --tags' para enviar ao GitHub`);
  } catch (error) {
    console.error('❌ Erro ao criar tag Git:', error);
  }
}

// Função principal
function main() {
  console.log('🔢 Sistema de Versionamento Semântico\n');

  // 1. Obter versão atual
  const currentVersionString = getCurrentVersion();
  const currentVersion = parseVersion(currentVersionString);
  console.log(`📌 Versão atual: ${currentVersionString}`);

  // 2. Analisar commits
  const commits = getCommitsSinceLastTag();
  console.log(`📝 Commits analisados: ${commits.length}\n`);

  if (commits.length === 0) {
    console.log('⚠️  Nenhum commit novo encontrado');
    process.exit(0);
  }

  // 3. Determinar tipo de bump
  const bumpType = analyzeCommits(commits);

  if (bumpType === 'none') {
    console.log('ℹ️  Nenhuma mudança que justifique bump de versão');
    console.log('   (apenas commits de docs, style, refactor, test, chore, etc.)\n');
    process.exit(0);
  }

  // 4. Calcular nova versão
  const newVersion = bumpVersion(currentVersion, bumpType);
  const newVersionString = formatVersion(newVersion);

  console.log(`🎯 Tipo de bump: ${bumpType.toUpperCase()}`);
  console.log(`✨ Nova versão: ${newVersionString}\n`);

  // 5. Mostrar resumo de commits por tipo
  const featCommits = commits.filter(c => /^feat/.test(c));
  const fixCommits = commits.filter(c => /^fix/.test(c));
  const breakingCommits = commits.filter(c => c.includes('BREAKING') || /^feat!/.test(c));

  if (breakingCommits.length > 0) {
    console.log('💥 BREAKING CHANGES:');
    breakingCommits.forEach(c => console.log(`   - ${c}`));
    console.log('');
  }

  if (featCommits.length > 0) {
    console.log('✨ Features:');
    featCommits.forEach(c => console.log(`   - ${c}`));
    console.log('');
  }

  if (fixCommits.length > 0) {
    console.log('🐛 Fixes:');
    fixCommits.forEach(c => console.log(`   - ${c}`));
    console.log('');
  }

  // 6. Verificar se é execução em CI ou modo dry-run
  const isDryRun = process.argv.includes('--dry-run');
  const isCI = process.env.CI === 'true';

  if (isDryRun) {
    console.log('🔍 Modo dry-run: Nenhuma alteração será feita');
    process.exit(0);
  }

  // 7. Atualizar arquivo VERSION
  updateVersionFile(newVersionString);
  console.log(`✅ Arquivo VERSION atualizado para ${newVersionString}`);

  // 8. Criar tag Git (apenas local ou CI)
  if (isCI || process.argv.includes('--tag')) {
    createGitTag(newVersionString);
  }

  // 9. Output para GitHub Actions
  if (isCI) {
    console.log(`\n::set-output name=version::${newVersionString}`);
    console.log(`::set-output name=previous_version::${currentVersionString}`);
    console.log(`::set-output name=bump_type::${bumpType}`);
  }

  console.log('\n✅ Versionamento concluído com sucesso!');
}

main();

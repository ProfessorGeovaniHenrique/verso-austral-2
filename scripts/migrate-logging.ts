#!/usr/bin/env tsx
/**
 * Script de Migração Automática de Logging
 * 
 * Converte console.log → logger estruturado em arquivos TypeScript/TSX
 * 
 * Uso:
 *   npm run migrate-logs -- src/pages/MusicCatalog.tsx
 *   npm run migrate-logs -- supabase/functions/enrich-music-data
 *   npm run migrate-logs -- src/pages --dry-run
 * 
 * Flags:
 *   --dry-run: Mostra mudanças sem aplicar
 *   --verbose: Mostra detalhes de cada conversão
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationStats {
  filesProcessed: number;
  filesModified: number;
  logsConverted: number;
  errors: Array<{ file: string; error: string }>;
}

const stats: MigrationStats = {
  filesProcessed: 0,
  filesModified: 0,
  logsConverted: 0,
  errors: [],
};

// Flags de linha de comando
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const targetPath = args.find((arg) => !arg.startsWith('--')) || 'src';

console.log('🚀 Iniciando migração de logging...');
console.log(`📂 Diretório: ${targetPath}`);
console.log(`🔍 Modo: ${isDryRun ? 'DRY RUN' : 'APLICAR MUDANÇAS'}\n`);

/**
 * Detecta o tipo de arquivo (frontend ou backend)
 */
function detectFileType(filePath: string): 'frontend' | 'backend' | 'script' {
  if (filePath.includes('supabase/functions')) return 'backend';
  if (filePath.includes('scripts/')) return 'script';
  return 'frontend';
}

/**
 * Extrai o nome do componente/função do caminho do arquivo
 */
function extractComponentName(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  // Remove sufixos comuns
  return basename
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\.test$/, '')
    .replace(/\.spec$/, '');
}

/**
 * Gera import statement baseado no tipo de arquivo
 */
function generateImportStatement(fileType: 'frontend' | 'backend' | 'script'): string {
  if (fileType === 'backend') {
    return `import { createEdgeLogger } from '../_shared/unified-logger.ts';`;
  }
  if (fileType === 'frontend') {
    return `import { createLogger } from '@/lib/loggerFactory';`;
  }
  return `// Script logging não implementado automaticamente`;
}

/**
 * Gera logger initialization baseado no tipo e nome do arquivo
 */
function generateLoggerInit(
  componentName: string,
  fileType: 'frontend' | 'backend' | 'script'
): string {
  if (fileType === 'backend') {
    return `const log = createEdgeLogger('${componentName}', requestId);`;
  }
  if (fileType === 'frontend') {
    return `const log = createLogger('${componentName}');`;
  }
  return `// Logger init não implementado`;
}

/**
 * Converte console.log → logger estruturado
 */
function convertConsoleLogs(content: string, fileType: 'frontend' | 'backend'): {
  modified: string;
  conversions: number;
} {
  let modified = content;
  let conversions = 0;

  // Padrões de console.log a converter
  const patterns = [
    // console.log(...)
    {
      regex: /console\.log\((.*?)\);?/g,
      replacement: (match: string, args: string) => {
        conversions++;
        // Tentar determinar o nível de log baseado no conteúdo
        const argsLower = args.toLowerCase();
        if (argsLower.includes('error') || argsLower.includes('❌')) {
          return `log.error(${args});`;
        }
        if (argsLower.includes('warn') || argsLower.includes('⚠️')) {
          return `log.warn(${args});`;
        }
        if (argsLower.includes('success') || argsLower.includes('✅')) {
          return `log.success(${args});`;
        }
        return `log.info(${args});`;
      },
    },
    // console.error(...)
    {
      regex: /console\.error\((.*?)\);?/g,
      replacement: (match: string, args: string) => {
        conversions++;
        return `log.error(${args});`;
      },
    },
    // console.warn(...)
    {
      regex: /console\.warn\((.*?)\);?/g,
      replacement: (match: string, args: string) => {
        conversions++;
        return `log.warn(${args});`;
      },
    },
    // console.debug(...)
    {
      regex: /console\.debug\((.*?)\);?/g,
      replacement: (match: string, args: string) => {
        conversions++;
        return `log.debug(${args});`;
      },
    },
  ];

  for (const pattern of patterns) {
    modified = modified.replace(pattern.regex, pattern.replacement);
  }

  return { modified, conversions };
}

/**
 * Adiciona import e inicialização do logger no arquivo
 */
function injectLoggerSetup(
  content: string,
  componentName: string,
  fileType: 'frontend' | 'backend' | 'script'
): string {
  // Verificar se já tem import de logger
  if (content.includes('createLogger') || content.includes('createEdgeLogger')) {
    return content;
  }

  const importStatement = generateImportStatement(fileType);
  const loggerInit = generateLoggerInit(componentName, fileType);

  // Adicionar import no topo (após outros imports)
  const importRegex = /(import .* from .*;\n)+/;
  const match = content.match(importRegex);

  if (match) {
    const lastImportIndex = match[0].length;
    content =
      content.slice(0, lastImportIndex) +
      `${importStatement}\n` +
      content.slice(lastImportIndex);
  } else {
    // Se não encontrou imports, adicionar no início
    content = `${importStatement}\n\n${content}`;
  }

  // Adicionar logger init no início da função principal
  // (isso é simplificado - pode precisar ajuste manual)
  if (fileType === 'frontend') {
    // Tentar encontrar o component/function
    const componentRegex = new RegExp(
      `(export (?:default )?(?:function|const) ${componentName}.*?{)`,
      's'
    );
    content = content.replace(componentRegex, `$1\n  ${loggerInit}\n`);
  } else if (fileType === 'backend') {
    // Para Edge Functions, adicionar após Deno.serve
    const serveRegex = /(Deno\.serve\(.*?\{)/s;
    content = content.replace(serveRegex, `$1\n  ${loggerInit}\n`);
  }

  return content;
}

/**
 * Processa um único arquivo
 */
function processFile(filePath: string): void {
  stats.filesProcessed++;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileType = detectFileType(filePath);
    const componentName = extractComponentName(filePath);

    // Converter console.logs
    const { modified: contentWithLogs, conversions } = convertConsoleLogs(
      content,
      fileType
    );

    if (conversions === 0) {
      if (isVerbose) {
        console.log(`⏭️  Skip: ${filePath} (sem console.log)`);
      }
      return;
    }

    // Adicionar import e init de logger
    const finalContent = injectLoggerSetup(
      contentWithLogs,
      componentName,
      fileType
    );

    if (finalContent === content) {
      if (isVerbose) {
        console.log(`⏭️  Skip: ${filePath} (sem mudanças)`);
      }
      return;
    }

    stats.filesModified++;
    stats.logsConverted += conversions;

    if (isDryRun) {
      console.log(`✏️  [DRY RUN] ${filePath} (${conversions} conversões)`);
    } else {
      fs.writeFileSync(filePath, finalContent, 'utf-8');
      console.log(`✅ ${filePath} (${conversions} conversões)`);
    }
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ Erro em ${filePath}:`, error);
  }
}

/**
 * Processa diretório ou arquivo
 */
async function main() {
  const isDirectory = fs.statSync(targetPath).isDirectory();

  if (isDirectory) {
    // Processar todos os arquivos .ts/.tsx no diretório
    const pattern = path.join(targetPath, '**/*.{ts,tsx}');
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    });

    console.log(`📁 Encontrados ${files.length} arquivos TypeScript\n`);

    for (const file of files) {
      processFile(file);
    }
  } else {
    // Processar arquivo único
    processFile(targetPath);
  }

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`Arquivos processados: ${stats.filesProcessed}`);
  console.log(`Arquivos modificados: ${stats.filesModified}`);
  console.log(`Console.logs convertidos: ${stats.logsConverted}`);
  console.log(`Erros: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERROS:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN: Nenhuma mudança foi aplicada.');
    console.log('Execute sem --dry-run para aplicar as mudanças.');
  } else {
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n⚠️  ATENÇÃO: Revise as mudanças antes de commitar.');
    console.log('Algumas conversões podem precisar de ajuste manual.');
  }
}

// Executar
main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

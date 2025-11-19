#!/usr/bin/env node
/**
 * 🔧 SCRIPT: Aplicar Metadados Enriquecidos
 * 
 * Lê o CSV exportado pela MetadataEnrichmentInterface e atualiza
 * os arquivos .txt do corpus com os novos metadados.
 * 
 * USO:
 * bun run scripts/apply-enriched-metadata.ts <caminho-do-csv> <corpus-type>
 * 
 * EXEMPLO:
 * bun run scripts/apply-enriched-metadata.ts ./metadata-enriched-gaucho-2025-01-19.csv gaucho
 */

import * as fs from 'fs';
import * as path from 'path';

interface EnrichedMetadata {
  artista: string;
  compositor: string;
  album: string;
  musica: string;
  ano: string;
  fonte: string;
  confianca: string;
}

function parseCSV(csvContent: string): EnrichedMetadata[] {
  const lines = csvContent.split('\n').filter(l => l.trim());
  const [header, ...rows] = lines;
  
  return rows.map(row => {
    const values = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
    return {
      artista: values[0] || '',
      compositor: values[1] || '',
      album: values[2] || '',
      musica: values[3] || '',
      ano: values[4] || '',
      fonte: values[5] || '',
      confianca: values[6] || ''
    };
  });
}

function updateCorpusFile(
  filePath: string, 
  enrichedData: EnrichedMetadata[]
): void {
  console.log(`\n📂 Processando: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = content.split(/[-]{10,}/).map(b => b.trim()).filter(b => b.length > 0);
  
  let updatedBlocks: string[] = [];
  let updatedCount = 0;

  blocks.forEach((block, index) => {
    const lines = block.split('\n').filter(l => l.trim());
    
    if (lines.length < 3) {
      updatedBlocks.push(block);
      return;
    }

    // Parse existing metadata
    const [artistaAlbum, tituloAno, ...letras] = lines;
    const artistaParts = artistaAlbum.split(' - ');
    const artista = artistaParts[0]?.trim() || '';
    const album = artistaParts[1]?.trim() || '';
    
    const tituloAnoParts = tituloAno.split('_');
    const musica = tituloAnoParts[0]?.trim() || '';
    const ano = tituloAnoParts[1]?.trim() || '';

    // Find matching enriched data
    const enriched = enrichedData.find(
      e => e.artista.toLowerCase() === artista.toLowerCase() &&
           e.musica.toLowerCase() === musica.toLowerCase()
    );

    if (enriched && enriched.compositor) {
      // Update format: Artista (Compositor: Nome) - Album
      const newArtistaLine = enriched.compositor === artista
        ? `${artista} - ${enriched.album || album}`
        : `${artista} (Compositor: ${enriched.compositor}) - ${enriched.album || album}`;
      
      const newTituloLine = enriched.ano 
        ? `${musica}_${enriched.ano}`
        : tituloAno;

      const newBlock = [
        newArtistaLine,
        newTituloLine,
        ...letras
      ].join('\n');

      updatedBlocks.push(newBlock);
      updatedCount++;
      
      if (index < 5) {
        console.log(`✅ Atualizado: ${musica} -> Compositor: ${enriched.compositor}`);
      }
    } else {
      updatedBlocks.push(block);
    }
  });

  // Write updated content
  const newContent = updatedBlocks.join('\n---------------\n');
  fs.writeFileSync(filePath, newContent, 'utf-8');
  
  console.log(`✅ ${updatedCount} músicas atualizadas em ${path.basename(filePath)}`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Uso: bun run apply-enriched-metadata.ts <csv-path> <corpus-type>');
    console.error('Exemplo: bun run apply-enriched-metadata.ts ./metadata.csv gaucho');
    process.exit(1);
  }

  const [csvPath, corpusType] = args;

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log('🚀 Iniciando aplicação de metadados enriquecidos...\n');
  console.log(`📊 CSV: ${csvPath}`);
  console.log(`🎵 Corpus: ${corpusType}\n`);

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const enrichedData = parseCSV(csvContent);
  
  console.log(`✅ ${enrichedData.length} registros carregados do CSV\n`);

  // Determine corpus files
  const corpusPaths: string[] = [];
  
  if (corpusType === 'gaucho') {
    corpusPaths.push(path.join(process.cwd(), 'src/data/corpus/full-text/gaucho-completo.txt'));
  } else if (corpusType === 'nordestino') {
    corpusPaths.push(
      path.join(process.cwd(), 'src/data/corpus/full-text/nordestino-parte-01.txt'),
      path.join(process.cwd(), 'src/data/corpus/full-text/nordestino-parte-02.txt'),
      path.join(process.cwd(), 'src/data/corpus/full-text/nordestino-parte-03.txt')
    );
  } else {
    console.error(`❌ Tipo de corpus inválido: ${corpusType}`);
    process.exit(1);
  }

  // Process each file
  corpusPaths.forEach(filePath => {
    updateCorpusFile(filePath, enrichedData);
  });

  console.log('\n🎉 Processamento concluído!');
  console.log('⚠️ IMPORTANTE: Revise as mudanças antes de fazer commit.');
  console.log('📝 Próximos passos:');
  console.log('  1. git diff para revisar as mudanças');
  console.log('  2. Testar o carregamento do corpus');
  console.log('  3. Fazer commit das atualizações');
}

if (require.main === module) {
  main();
}

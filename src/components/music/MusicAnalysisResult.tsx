import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, FileSpreadsheet, Music2, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CorpusSelector } from './CorpusSelector';
import { DuplicatePreviewDialog } from './DuplicatePreviewDialog';
import type { ParsedMusic } from '@/lib/excelParser';

export type ImportMode = 'import' | 'update';

interface MusicAnalysisResultProps {
  fileName: string;
  totalSongs: number;
  uniqueSongs: number;
  duplicatesRemoved: number;
  duplicateGroups: Map<string, ParsedMusic[]>;
  previewData: Array<{ musica?: string; artista?: string; [key: string]: any }>;
  onCancel: () => void;
  onImport: (corpusId: string | null, mode: ImportMode) => void;
}

export function MusicAnalysisResult({
  fileName,
  totalSongs,
  uniqueSongs,
  duplicatesRemoved,
  duplicateGroups,
  previewData,
  onCancel,
  onImport
}: MusicAnalysisResultProps) {
  const [selectedCorpusId, setSelectedCorpusId] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('import');
  
  const uniqueArtists = new Set(previewData.map(row => row.artista).filter(Boolean)).size;
  const diversity = uniqueSongs > 0 ? Math.round((uniqueArtists / uniqueSongs) * 100) : 0;
  const columns = Object.keys(previewData[0] || {});

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-4xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Análise Concluída</CardTitle>
          <CardDescription className="text-lg">
            {fileName} | Total de {totalSongs} linhas processadas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Statistics Grid */}
          <div className={`grid gap-4 ${duplicatesRemoved > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <FileSpreadsheet className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{totalSongs}</div>
              <div className="text-xs text-muted-foreground">Linhas Processadas</div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <Music2 className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{uniqueSongs}</div>
              <div className="text-xs text-muted-foreground">Títulos Únicos</div>
            </div>

            {/* Card de Duplicatas - só aparece se houver duplicatas */}
            {duplicatesRemoved > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center space-y-2">
                <Copy className="h-5 w-5 mx-auto text-amber-600 dark:text-amber-400" />
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {duplicatesRemoved}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500">
                  Duplicatas Removidas
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-1 h-7 text-xs border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={() => setShowDuplicates(true)}
                >
                  Ver Detalhes
                </Button>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{diversity}%</div>
              <div className="text-xs text-muted-foreground">
                Diversidade {diversity >= 80 ? '(Excelente)' : diversity >= 50 ? '(Bom)' : '(Regular)'}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <FileSpreadsheet className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{columns.length}</div>
              <div className="text-xs text-muted-foreground">Colunas</div>
            </div>
          </div>

          {/* Alerta de Duplicatas */}
          {duplicatesRemoved > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{duplicatesRemoved} duplicatas</strong> foram identificadas e serão automaticamente removidas. 
                A versão mais completa de cada música será mantida.
              </p>
            </div>
          )}

          {/* Corpus Selector */}
          <CorpusSelector
            selectedCorpusId={selectedCorpusId}
            onCorpusChange={setSelectedCorpusId}
          />

          {/* Preview Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Preview dos dados (primeiras {Math.min(6, previewData.length)} linhas)
            </h3>
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="capitalize">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 6).map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((col) => (
                        <TableCell key={col}>
                          {row[col] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-6">
          {/* Import Mode Selection */}
          <div className="w-full flex gap-2">
            <Button
              variant={importMode === 'import' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setImportMode('import')}
            >
              <Music2 className="h-4 w-4 mr-2" />
              Importar como novas
            </Button>
            <Button
              variant={importMode === 'update' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setImportMode('update')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar existentes
            </Button>
          </div>
          
          {importMode === 'update' && (
            <div className="w-full p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <strong>Modo Atualização:</strong> Busca músicas existentes por título/artista e atualiza compositor, URL e letra.
            </div>
          )}
          
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={() => onImport(selectedCorpusId, importMode)} size="lg">
              {importMode === 'import' 
                ? `Importar para Catálogo (${uniqueSongs} músicas)`
                : `Atualizar Metadados (${uniqueSongs} músicas)`
              }
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Modal de Duplicatas */}
      <DuplicatePreviewDialog
        open={showDuplicates}
        onOpenChange={setShowDuplicates}
        duplicateGroups={duplicateGroups}
        totalRemoved={duplicatesRemoved}
      />
    </div>
  );
}

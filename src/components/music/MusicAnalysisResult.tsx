import { CheckCircle2, FileSpreadsheet, Music2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MusicAnalysisResultProps {
  fileName: string;
  totalSongs: number;
  previewData: Array<{ musica?: string; artista?: string; [key: string]: any }>;
  onCancel: () => void;
  onImport: () => void;
}

export function MusicAnalysisResult({
  fileName,
  totalSongs,
  previewData,
  onCancel,
  onImport
}: MusicAnalysisResultProps) {
  const uniqueArtists = new Set(previewData.map(row => row.artista).filter(Boolean)).size;
  const diversity = totalSongs > 0 ? Math.round((uniqueArtists / totalSongs) * 100) : 0;
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
            {fileName} | Total de {totalSongs} músicas detectadas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <FileSpreadsheet className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{totalSongs}</div>
              <div className="text-xs text-muted-foreground">Linhas Processadas</div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <Music2 className="h-5 w-5 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{totalSongs}</div>
              <div className="text-xs text-muted-foreground">Títulos Únicos</div>
            </div>

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

        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onImport} size="lg">
            Importar para Catálogo ({totalSongs} músicas)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

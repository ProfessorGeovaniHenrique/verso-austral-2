import { useState } from 'react';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';
import { useDialectalLexicon } from '@/hooks/useDialectalLexicon';
import { ValidationInterface } from '@/components/advanced/ValidationInterface';
import { BatchValidationDialog } from '@/components/advanced/lexicon-status/BatchValidationDialog';

export default function AdminNavarroDictValidation() {
  const [posFilter, setPosFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  // Buscar apenas verbetes do Navarro 2014
  const { entries, stats, isLoading, refetch } = useDialectalLexicon({
    searchTerm: searchTerm || undefined,
  });

  // Filtrar apenas Navarro 2014
  const navarrEntries = entries.filter(e => e.volume_fonte === 'Navarro 2014');

  // Aplicar filtros adicionais
  const filteredEntries = navarrEntries.filter(entry => {
    if (posFilter !== 'all' && entry.classe_gramatical !== posFilter) return false;
    if (validationFilter === 'validated' && !entry.validado_humanamente) return false;
    if (validationFilter === 'pending' && entry.validado_humanamente) return false;
    return true;
  });

  const validatedCount = navarrEntries.filter(e => e.validado_humanamente).length;
  const pendingCount = navarrEntries.length - validatedCount;
  const validationRate = navarrEntries.length > 0 
    ? ((validatedCount / navarrEntries.length) * 100).toFixed(2) 
    : '0.00';

  const handleValidate = (entry: any) => {
    // Adaptar formato para ValidationInterface
    const adaptedEntry = {
      id: entry.id,
      palavra: entry.verbete,
      lema: entry.verbete_normalizado,
      pos: entry.classe_gramatical || 'unknown',
      tagset: null,
      tagset_codigo: null,
      prosody: 0,
      confianca: entry.confianca_extracao,
      validado: entry.validado_humanamente
    };
    setSelectedEntry(adaptedEntry);
    setValidationOpen(true);
  };

  const handleValidationSuccess = () => {
    refetch();
    setValidationOpen(false);
    setSelectedEntry(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto py-8 px-4">
        <AdminBreadcrumb currentPage="Validação Navarro 2014" />

        <div className="space-y-6 mt-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Verbetes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{navarrEntries.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Validados
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{validatedCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Pendentes
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Validação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validationRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Busca</CardTitle>
              <CardDescription>Refine a lista de verbetes para validação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classe Gramatical</label>
                  <Select value={posFilter} onValueChange={setPosFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="s.m.">s.m.</SelectItem>
                      <SelectItem value="s.f.">s.f.</SelectItem>
                      <SelectItem value="fraseol.">fraseol.</SelectItem>
                      <SelectItem value="v.t.d.">v.t.d.</SelectItem>
                      <SelectItem value="adj.">adj.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Validação</label>
                  <Select value={validationFilter} onValueChange={setValidationFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="validated">Validados</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Verbete</label>
                  <Input
                    placeholder="Digite para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Validação Automática em Lote */}
              <div className="pt-4 border-t mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <h4 className="font-medium">Validação Automática</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Confiança ≥ 90%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Valide múltiplas entradas automaticamente com alta confiança
                </p>
                <div className="flex gap-2">
                  <BatchValidationDialog 
                    batchSize={100} 
                    dictionaryType="navarro"
                    onSuccess={handleValidationSuccess}
                  />
                  <BatchValidationDialog 
                    batchSize={1000} 
                    dictionaryType="navarro"
                    onSuccess={handleValidationSuccess}
                  />
                  <BatchValidationDialog 
                    batchSize={10000} 
                    dictionaryType="navarro"
                    onSuccess={handleValidationSuccess}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Verbetes */}
          <Card>
            <CardHeader>
              <CardTitle>Verbetes para Validação</CardTitle>
              <CardDescription>
                {filteredEntries.length} verbete(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum verbete encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Verbete</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Definições</TableHead>
                        <TableHead>Variantes</TableHead>
                        <TableHead>Confiança</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.slice(0, 50).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.verbete}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.classe_gramatical}</Badge>
                          </TableCell>
                          <TableCell>{entry.definicoes?.length || 0}</TableCell>
                          <TableCell>{entry.variantes?.length || 0}</TableCell>
                          <TableCell>
                            <Badge variant={entry.confianca_extracao >= 0.9 ? 'default' : 'secondary'}>
                              {(entry.confianca_extracao * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.validado_humanamente ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Validado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleValidate(entry)}
                            >
                              Validar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Validação */}
      {selectedEntry && (
        <ValidationInterface
          entry={selectedEntry}
          open={validationOpen}
          onOpenChange={setValidationOpen}
          onSuccess={handleValidationSuccess}
        />
      )}

      <MVPFooter />
    </div>
  );
}

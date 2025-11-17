import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, ArrowUpDown, Search } from "lucide-react";
import { getDominiosAgregados } from "@/data/mockup/corpus-master";
import { dominiosNormalizados } from "@/data/mockup";
import { FilterInsigniaToolbar } from "@/components/FilterInsigniaToolbar";

export function TabDomains() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'dominio' | 'riqueza' | 'ocorrencias'>('dominio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedInsignias, setSelectedInsignias] = useState<string[]>([]);

  const dominiosCompletos = useMemo(() => {
    const agregados = getDominiosAgregados();
    return agregados.map(agg => {
      const norm = dominiosNormalizados.find(d => d.dominio === agg.dominio);
      return { ...agg, cor: norm?.cor || 'hsl(0, 0%, 50%)', percentualTematico: norm?.percentualTematico || 0, comparacaoCorpus: norm?.comparacaoCorpus || 'equilibrado' };
    }).filter(d => d.dominio !== 'Sem Classificação' && d.dominio !== 'Palavras Funcionais');
  }, []);

  const dominiosFiltrados = useMemo(() => {
    let filtered = dominiosCompletos.filter(d => d.dominio.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered.sort((a, b) => {
      const val = sortBy === 'dominio' ? a.dominio.localeCompare(b.dominio) : a[sortBy] - b[sortBy];
      return sortDirection === 'asc' ? val : -val;
    });
    return filtered;
  }, [dominiosCompletos, searchTerm, sortBy, sortDirection]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDirection('asc'); }
  };

  return (
    <div className="space-y-6">
      <Card className="card-academic">
        <CardHeader>
          <CardTitle className="section-header-academic flex items-center gap-2">
            <Database className="w-5 h-5" />
            Análise de Domínios Semânticos
          </CardTitle>
          <CardDescription className="section-description-academic">
            Distribuição temática consolidada do corpus master
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar domínio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
            </div>
            <FilterInsigniaToolbar
              selectedInsignias={selectedInsignias}
              onInsigniasChange={setSelectedInsignias}
            />
          </div>
          {selectedInsignias.length > 0 && (
            <div className="text-sm text-muted-foreground">
              💡 Filtro de insígnias ativo (funcionalidade em desenvolvimento - dados ainda não disponíveis no corpus mockup)
            </div>
          )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" size="sm" onClick={() => handleSort('dominio')}>Domínio <ArrowUpDown className="w-3 h-3 ml-1" /></Button></TableHead>
                  <TableHead className="text-center"><Button variant="ghost" size="sm" onClick={() => handleSort('riqueza')}>Riqueza <ArrowUpDown className="w-3 h-3 ml-1" /></Button></TableHead>
                  <TableHead className="text-center"><Button variant="ghost" size="sm" onClick={() => handleSort('ocorrencias')}>Ocorrências <ArrowUpDown className="w-3 h-3 ml-1" /></Button></TableHead>
                  <TableHead className="text-center">% Temático</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dominiosFiltrados.map((d) => (
                  <TableRow key={d.dominio}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor }} />{d.dominio}</div></TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{d.riquezaLexical} lemas</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{d.ocorrencias}</Badge></TableCell>
                    <TableCell className="text-center">{d.percentualTematico.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  FileText, 
  Layers, 
  Hash,
  Table as TableIcon,
  PieChart as PieChartIcon,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Smile,
  Frown
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { dominiosNormalizados } from "@/data/mockup/dominios-normalized";
import { frequenciaNormalizadaData } from "@/data/mockup/frequencia-normalizada";
import { getProsodiaByLema } from "@/data/mockup/prosodias-lemas";
import { kwicDataMap } from "@/data/mockup/kwic";
import { ACADEMIC_RS_COLORS } from "@/config/themeColors";
import { KWICModal } from "@/components/KWICModal";

type SortColumn = 'palavra' | 'lema' | 'frequenciaBruta' | 'frequenciaNormalizada' | 'prosodia' | null;
type SortDirection = 'asc' | 'desc' | null;
type ProsodiaType = 'Positiva' | 'Negativa' | 'Neutra';

interface EnrichedWord {
  palavra: string;
  lema: string;
  frequenciaBruta: number;
  frequenciaNormalizada: number;
  prosodia: ProsodiaType;
}

export function TabStatistics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>('frequenciaNormalizada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [kwicModalOpen, setKwicModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");

  const itemsPerPage = 100;

  const palavrasEnriquecidas: EnrichedWord[] = useMemo(() => {
    return frequenciaNormalizadaData.map(p => ({
      palavra: p.palavra,
      lema: p.lema,
      frequenciaBruta: p.frequenciaBruta,
      frequenciaNormalizada: p.frequenciaNormalizada,
      prosodia: getProsodiaByLema(p.lema)
    }));
  }, []);

  const filteredWords = useMemo(() => {
    if (!searchQuery) return palavrasEnriquecidas;
    const query = searchQuery.toLowerCase();
    return palavrasEnriquecidas.filter(p =>
      p.palavra.toLowerCase().includes(query) ||
      p.lema.toLowerCase().includes(query)
    );
  }, [palavrasEnriquecidas, searchQuery]);

  const sortedWords = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredWords;
    return [...filteredWords].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'palavra':
        case 'lema':
          comparison = a[sortColumn].localeCompare(b[sortColumn]);
          break;
        case 'frequenciaBruta':
        case 'frequenciaNormalizada':
          comparison = a[sortColumn] - b[sortColumn];
          break;
        case 'prosodia':
          const prosodiaOrder = { 'Positiva': 0, 'Neutra': 1, 'Negativa': 2 };
          comparison = prosodiaOrder[a.prosodia] - prosodiaOrder[b.prosodia];
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredWords, sortColumn, sortDirection]);

  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedWords.slice(start, start + itemsPerPage);
  }, [sortedWords, currentPage]);

  const totalPages = Math.ceil(sortedWords.length / itemsPerPage);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') setSortDirection('asc');
      else if (sortDirection === 'asc') { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const openKWIC = (palavra: string) => {
    setSelectedWord(palavra);
    setKwicModalOpen(true);
  };

  const prosodiaStyles = {
    "Positiva": "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30",
    "Negativa": "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30",
    "Neutra": "bg-muted/20 text-muted-foreground border-border"
  };

  const totalPalavras = 212;
  const totalDominios = dominiosNormalizados.length;
  const totalPalavrasTematicas = 117;
  const riquezaLexicalMedia = Math.round(
    dominiosNormalizados.reduce((acc, d) => acc + d.riquezaLexical, 0) / totalDominios
  );

  const dominiosChartData = dominiosNormalizados
    .map(d => ({
      dominio: d.dominio.length > 25 ? d.dominio.substring(0, 25) + "..." : d.dominio,
      percentual: d.percentualTematico,
      riquezaLexical: d.riquezaLexical,
      status: d.comparacaoCorpus
    }))
    .sort((a, b) => b.percentual - a.percentual);

  const palavrasFrequentesData = frequenciaNormalizadaData.slice(0, 15).map(p => ({
    palavra: p.palavra,
    frequencia: p.frequenciaNormalizada
  }));

  const prosodiaDistribution = useMemo(() => {
    const positivas = palavrasEnriquecidas.filter(p => p.prosodia === 'Positiva').length;
    const negativas = palavrasEnriquecidas.filter(p => p.prosodia === 'Negativa').length;
    const neutras = palavrasEnriquecidas.filter(p => p.prosodia === 'Neutra').length;
    return [
      { name: 'Positiva', value: positivas, fill: '#16A34A' },
      { name: 'Negativa', value: negativas, fill: '#DC2626' },
      { name: 'Neutra', value: neutras, fill: '#71717A' }
    ];
  }, [palavrasEnriquecidas]);

  const top10Positivas = useMemo(() => 
    palavrasEnriquecidas.filter(p => p.prosodia === 'Positiva')
      .sort((a, b) => b.frequenciaNormalizada - a.frequenciaNormalizada).slice(0, 10),
    [palavrasEnriquecidas]
  );

  const top10Negativas = useMemo(() => 
    palavrasEnriquecidas.filter(p => p.prosodia === 'Negativa')
      .sort((a, b) => b.frequenciaNormalizada - a.frequenciaNormalizada).slice(0, 10),
    [palavrasEnriquecidas]
  );

  const sentimentStats = useMemo(() => {
    const total = palavrasEnriquecidas.length;
    const positivas = palavrasEnriquecidas.filter(p => p.prosodia === 'Positiva').length;
    const negativas = palavrasEnriquecidas.filter(p => p.prosodia === 'Negativa').length;
    const neutras = palavrasEnriquecidas.filter(p => p.prosodia === 'Neutra').length;
    return {
      positivas: { count: positivas, percent: ((positivas / total) * 100).toFixed(1) },
      negativas: { count: negativas, percent: ((negativas / total) * 100).toFixed(1) },
      neutras: { count: neutras, percent: ((neutras / total) * 100).toFixed(1) },
      razao: (positivas / (negativas || 1)).toFixed(2)
    };
  }, [palavrasEnriquecidas]);

  const prosodiaByDomain = useMemo(() => {
    return dominiosNormalizados.filter(d => d.dominio !== "Palavras Funcionais").map(dominio => ({
      dominio: dominio.dominio.length > 30 ? dominio.dominio.substring(0, 30) + "..." : dominio.dominio,
      Positiva: dominio.palavras.filter(p => getProsodiaByLema(p) === 'Positiva').length,
      Negativa: dominio.palavras.filter(p => getProsodiaByLema(p) === 'Negativa').length,
      Neutra: dominio.palavras.filter(p => getProsodiaByLema(p) === 'Neutra').length
    })).sort((a, b) => (b.Positiva + b.Negativa + b.Neutra) - (a.Positiva + a.Negativa + a.Neutra));
  }, []);

  const getBarColor = (status: string) => {
    switch (status) {
      case 'super-representado': return ACADEMIC_RS_COLORS.verde.main;
      case 'equilibrado': return ACADEMIC_RS_COLORS.amarelo.main;
      case 'sub-representado': return ACADEMIC_RS_COLORS.vermelho.main;
      default: return ACADEMIC_RS_COLORS.verde.main;
    }
  };

  return (
    <>
      <Tabs defaultValue="tabela" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="tabela" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Tabela de Palavras
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Gráficos Estatísticos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabela" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por palavra ou lema..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Mostrando {sortedWords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, sortedWords.length)} de {sortedWords.length} palavras
            </p>
          </div>

          <Card className="card-academic">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(['palavra', 'lema', 'frequenciaBruta', 'frequenciaNormalizada', 'prosodia'] as const).map(col => (
                        <TableHead key={col} className={col.includes('frequencia') ? 'text-right' : ''}>
                          <Button variant="ghost" onClick={() => handleSort(col)}
                            className="w-full justify-between font-bold hover:bg-primary/5 px-3">
                            {col === 'palavra' ? 'Palavra' : col === 'lema' ? 'Lema' :
                             col === 'frequenciaBruta' ? 'Freq. Bruta' :
                             col === 'frequenciaNormalizada' ? 'Freq. Norm.' : 'Prosódia'}
                            {sortColumn === col ? (sortDirection === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) :
                              <ArrowUpDown className="h-4 w-4 opacity-50" />}
                          </Button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedWords.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma palavra encontrada para "{searchQuery}"
                      </TableCell></TableRow>
                    ) : paginatedWords.map((p) => (
                      <TableRow key={p.palavra} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <button onClick={() => openKWIC(p.palavra)}
                            className="font-mono font-semibold hover:underline hover:text-primary transition-colors text-left">
                            {p.palavra}
                          </button>
                        </TableCell>
                        <TableCell className="italic text-muted-foreground">{p.lema}</TableCell>
                        <TableCell className="text-right font-mono">{p.frequenciaBruta}</TableCell>
                        <TableCell className="text-right font-mono">{p.frequenciaNormalizada.toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={prosodiaStyles[p.prosodia]}>{p.prosodia}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}>Anterior</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm"
                  onClick={() => setCurrentPage(page)}>{page}</Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}>Próximo</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="graficos" className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Estatísticas-Chave do Corpus</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: FileText, label: 'Total de Palavras', value: totalPalavras },
                { icon: Layers, label: 'Domínios Semânticos', value: totalDominios },
                { icon: Hash, label: 'Palavras Temáticas', value: totalPalavrasTematicas },
                { icon: BarChart3, label: 'Riqueza Lexical Média', value: riquezaLexicalMedia }
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label} className="card-academic">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Distribuição Textual</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="card-academic">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição de Domínios Semânticos</CardTitle>
                  <CardDescription>Percentual temático por domínio</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dominiosChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="dominio" width={150} />
                      <Tooltip />
                      <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                        {dominiosChartData.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.status)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card-academic">
                <CardHeader>
                  <CardTitle className="text-base">Top 15 Palavras Mais Frequentes</CardTitle>
                  <CardDescription>Frequência normalizada (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={palavrasFrequentesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="palavra" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="frequencia" fill={ACADEMIC_RS_COLORS.verde.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Análise de Prosódia e Sentimento</h3>
            
            <Card className="card-academic">
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Prosódia Semântica</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={prosodiaDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={100} label={(e) => `${e.name}: ${e.value} (${((e.value / palavrasEnriquecidas.length) * 100).toFixed(1)}%)`}>
                      {prosodiaDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { data: top10Positivas, title: 'Top 10 Palavras Positivas', icon: Smile, color: '#16A34A' },
                { data: top10Negativas, title: 'Top 10 Palavras Negativas', icon: Frown, color: '#DC2626' }
              ].map(({ data, title, icon: Icon, color }) => (
                <Card key={title} className="card-academic">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5" style={{ color }} />
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {data.map((p, i) => (
                        <li key={p.palavra} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground w-6">{i + 1}.</span>
                            <span className="font-mono font-semibold">{p.palavra}</span>
                          </span>
                          <Badge variant="outline" style={{ 
                            backgroundColor: `${color}10`, 
                            color, 
                            borderColor: `${color}30` 
                          }}>
                            {p.frequenciaNormalizada.toFixed(2)}%
                          </Badge>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="card-academic">
              <CardHeader>
                <CardTitle className="text-base">Métricas de Sentimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Palavras Positivas', count: sentimentStats.positivas.count, 
                      percent: sentimentStats.positivas.percent, bg: '#16A34A', color: '#16A34A' },
                    { label: 'Palavras Negativas', count: sentimentStats.negativas.count, 
                      percent: sentimentStats.negativas.percent, bg: '#DC2626', color: '#DC2626' },
                    { label: 'Palavras Neutras', count: sentimentStats.neutras.count, 
                      percent: sentimentStats.neutras.percent, bg: 'muted', color: 'foreground' },
                    { label: 'Razão Pos/Neg', count: sentimentStats.razao, 
                      percent: `Tom ${Number(sentimentStats.razao) > 1 ? 'positivo' : 'negativo'}`, 
                      bg: 'primary', color: 'foreground' }
                  ].map(({ label, count, percent, bg, color }) => (
                    <div key={label} className="rounded-lg border p-4" 
                      style={{ backgroundColor: bg.includes('#') ? `${bg}0D` : undefined }}>
                      <p className="text-sm text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-bold" style={{ color: color.includes('#') ? color : undefined }}>
                        {count}
                      </p>
                      <p className="text-xs text-muted-foreground">{percent}{typeof percent === 'string' && !percent.includes('Tom') ? '% do total' : ''}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-academic">
              <CardHeader>
                <CardTitle className="text-base">Prosódia por Domínio Semântico</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={prosodiaByDomain} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="dominio" width={180} />
                    <Tooltip />
                    <Bar dataKey="Positiva" stackId="a" fill="#16A34A" />
                    <Bar dataKey="Negativa" stackId="a" fill="#DC2626" />
                    <Bar dataKey="Neutra" stackId="a" fill="#71717A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <KWICModal open={kwicModalOpen} onOpenChange={setKwicModalOpen} word={selectedWord}
        data={kwicDataMap[selectedWord] || []} />
    </>
  );
}

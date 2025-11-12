import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KWICModal } from "@/components/KWICModal";
import { Download, FileText, Network, Sparkles, BarChart3, FileBarChart, Cloud, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Mock data para a palavra "verso"
const kwicData = [
  {
    leftContext: "...Daí um",
    keyword: "verso",
    rightContext: "de campo se chegou...",
    source: "'Quando o verso vem pras casa'",
  },
  {
    leftContext: "...galponeira, onde o",
    keyword: "verso",
    rightContext: "é mais caseiro...",
    source: "'Quando o verso vem pras casa'",
  },
  {
    leftContext: "...E o",
    keyword: "verso",
    rightContext: "que tinha sonhos prá rondar...",
    source: "'Quando o verso vem pras casa'",
  },
  {
    leftContext: "...E o",
    keyword: "verso",
    rightContext: "sonhou ser várzea com sombra...",
    source: "'Quando o verso vem pras casa'",
  },
];

const dominiosData = [
  { 
    dominio: "Natureza e Paisagem Campeira", 
    ocorrencias: 48, 
    percentual: 28.2,
    palavras: ["tarumã", "várzea", "coxilha", "campo", "campanha", "horizonte", "sombra", "sol"],
    cor: "hsl(142, 71%, 45%)"
  },
  { 
    dominio: "Cavalo e Aperos", 
    ocorrencias: 38, 
    percentual: 22.4,
    palavras: ["gateada", "encilha", "arreios", "esporas", "tropa", "lombo", "ramada", "cambona"],
    cor: "hsl(221, 83%, 53%)"
  },
  { 
    dominio: "Vida no Galpão", 
    ocorrencias: 32, 
    percentual: 18.8,
    palavras: ["galpão", "ramada", "candeeiro", "mate", "querência", "fogo", "chão", "cuia", "bomba"],
    cor: "hsl(45, 93%, 47%)"
  },
  { 
    dominio: "Sentimentos e Poesia", 
    ocorrencias: 28, 
    percentual: 16.5,
    palavras: ["verso", "saudade", "sonhos", "coplas", "mansidão", "calma", "silêncio"],
    cor: "hsl(291, 64%, 42%)"
  },
  { 
    dominio: "Tradição Gaúcha", 
    ocorrencias: 24, 
    percentual: 14.1,
    palavras: ["maragato", "pañuelo", "mate", "maçanilha", "prenda", "campereada"],
    cor: "hsl(0, 72%, 51%)"
  },
];

const lematizacaoData = [
  { original: "sonhos", lema: "sonho", classe: "NOUN" },
  { original: "adormecidos", lema: "adormecer", classe: "VERB" },
  { original: "coplas", lema: "copla", classe: "NOUN" },
  { original: "suados", lema: "suado", classe: "ADJ" },
  { original: "vestidos", lema: "vestir", classe: "VERB" },
  { original: "arreios", lema: "arreio", classe: "NOUN" },
];

const logLikelihoodData = [
  { palavra: "verso", valor: 52.8, cor: "hsl(0, 72%, 51%)" },
  { palavra: "tarumã", valor: 48.3, cor: "hsl(0, 72%, 51%)" },
  { palavra: "galpão", valor: 45.2, cor: "hsl(0, 72%, 51%)" },
  { palavra: "saudade", valor: 38.7, cor: "hsl(0, 72%, 51%)" },
  { palavra: "várzea", valor: 32.4, cor: "hsl(0, 72%, 51%)" },
  { palavra: "coxilha", valor: 28.9, cor: "hsl(45, 93%, 47%)" },
  { palavra: "gateada", valor: 24.1, cor: "hsl(45, 93%, 47%)" },
  { palavra: "campanha", valor: 18.5, cor: "hsl(45, 93%, 47%)" },
  { palavra: "horizonte", valor: 8.3, cor: "hsl(142, 71%, 45%)" },
];

const miScoreData = [
  { palavra: "verso", valor: 9.2, cor: "hsl(0, 72%, 51%)" },
  { palavra: "tarumã", valor: 8.8, cor: "hsl(0, 72%, 51%)" },
  { palavra: "saudade", valor: 8.5, cor: "hsl(0, 72%, 51%)" },
  { palavra: "galpão", valor: 7.9, cor: "hsl(0, 72%, 51%)" },
  { palavra: "várzea", valor: 7.2, cor: "hsl(0, 72%, 51%)" },
  { palavra: "sonhos", valor: 5.8, cor: "hsl(45, 93%, 47%)" },
  { palavra: "mate", valor: 4.9, cor: "hsl(45, 93%, 47%)" },
  { palavra: "horizonte", valor: 3.2, cor: "hsl(142, 71%, 45%)" },
];

const palavrasChaveData = [
  { palavra: "verso", ll: 52.8, mi: 9.2, significancia: "Alta", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "tarumã", ll: 48.3, mi: 8.8, significancia: "Alta", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "saudade", ll: 38.7, mi: 8.5, significancia: "Alta", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "galpão", ll: 45.2, mi: 7.9, significancia: "Alta", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "várzea", ll: 32.4, mi: 7.2, significancia: "Alta", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "coxilha", ll: 28.9, mi: 5.8, significancia: "Média", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "gateada", ll: 24.1, mi: 4.9, significancia: "Média", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "sonhos", ll: 18.5, mi: 3.8, significancia: "Média", efeito: "Sobre-uso", efeitoIcon: TrendingUp },
  { palavra: "campanha", ll: 15.2, mi: 3.2, significancia: "Baixa", efeito: "Normal", efeitoIcon: TrendingUp },
];

export default function Analise() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
    setModalOpen(true);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Resultados da Análise: 'Quando o verso vem pras casa'
          </h1>
          <p className="text-muted-foreground">
            Análise semântica completa do corpus
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Dados
        </Button>
      </div>

      <Tabs defaultValue="dominios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dominios" className="gap-2">
            <FileText className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="anotacao" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Anotação
          </TabsTrigger>
          <TabsTrigger value="rede" className="gap-2">
            <Network className="h-4 w-4" />
            Rede
          </TabsTrigger>
          <TabsTrigger value="clustering" className="gap-2" disabled>
            <Sparkles className="h-4 w-4" />
            Clustering
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Frequência
          </TabsTrigger>
          <TabsTrigger value="estatistica" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Estatística
          </TabsTrigger>
          <TabsTrigger value="nuvem" className="gap-2">
            <Cloud className="h-4 w-4" />
            Nuvem
          </TabsTrigger>
        </TabsList>

        {/* Tab: Domínios */}
        <TabsContent value="dominios" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success/10">
                      <FileText className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <CardTitle>Domínios Semânticos Identificados</CardTitle>
                      <CardDescription>
                        Análise baseada em IA - 5 domínios detectados em 170 palavras
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dominiosData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.cor }}
                          />
                          <h3 className="font-semibold">{item.dominio}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span># {item.ocorrencias} ocorrências</span>
                          <span className="text-foreground font-semibold">{item.percentual}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all" 
                          style={{ width: `${item.percentual}%`, backgroundColor: item.cor }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.palavras.map((palavra, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-success/20"
                            style={{ backgroundColor: `${item.cor}15` }}
                            onClick={() => handleWordClick(palavra)}
                          >
                            {palavra}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Frequências</CardTitle>
                  <CardDescription>Visualização comparativa dos domínios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dominiosData.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[140px]">{item.dominio}</span>
                          <span className="font-semibold">{item.ocorrencias}</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-8">
                          <div 
                            className="h-8 rounded-full transition-all" 
                            style={{ 
                              width: `${(item.ocorrencias / 170) * 100}%`, 
                              backgroundColor: item.cor 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Anotação */}
        <TabsContent value="anotacao" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Anotação Morfossintática e Lematização</CardTitle>
                  <CardDescription>
                    Análise automática de POS tagging e redução de palavras aos seus lemas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="lematizacao" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="texto">Texto Anotado</TabsTrigger>
                  <TabsTrigger value="estatisticas">Estatísticas POS</TabsTrigger>
                  <TabsTrigger value="lematizacao">Lematização</TabsTrigger>
                </TabsList>
                
                <TabsContent value="lematizacao" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Exemplos de Lematização
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Redução de palavras flexionadas aos seus lemas (forma canônica)
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Palavra Original</TableHead>
                          <TableHead>Lema</TableHead>
                          <TableHead>Classe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lematizacaoData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{item.original}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                {item.lema}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  item.classe === "NOUN" ? "bg-primary/10 text-primary" :
                                  item.classe === "VERB" ? "bg-destructive/10 text-destructive" :
                                  "bg-accent/10 text-accent"
                                }
                              >
                                {item.classe}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                    <h4 className="font-semibold text-success mb-2">Sobre Lematização</h4>
                    <p className="text-sm text-muted-foreground">
                      A lematização reduz palavras flexionadas à sua forma base (lema). Por exemplo: "empresas" → "empresa", "investem" → "investir". Isso é essencial para análises linguísticas precisas, pois agrupa diferentes formas da mesma palavra.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="rede" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Rede Semântica e Prosódia</CardTitle>
                    <CardDescription>
                      Conexões entre palavras-chave e análise de prosódia semântica
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Network className="h-3 w-3" />
                  6 conexões mapeadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex items-center justify-center bg-muted/20 rounded-lg p-8 min-h-[400px]">
                  <div className="relative w-full h-full flex items-center justify-center">
                    <button
                      onClick={() => handleWordClick("verso")}
                      className="absolute top-1/4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:scale-110 transition-transform cursor-pointer"
                    >
                      verso
                    </button>
                    <button
                      onClick={() => handleWordClick("tarumã")}
                      className="absolute top-1/2 left-1/4 px-4 py-2 rounded-full border-2 border-primary/60 text-foreground hover:scale-110 transition-transform cursor-pointer"
                    >
                      tarumã
                    </button>
                    <button
                      onClick={() => handleWordClick("saudade")}
                      className="absolute top-1/2 right-1/4 px-4 py-2 rounded-full border-2 border-primary/60 text-foreground hover:scale-110 transition-transform cursor-pointer"
                    >
                      saudade
                    </button>
                    <button
                      onClick={() => handleWordClick("galpão")}
                      className="absolute bottom-1/4 left-1/3 px-4 py-2 rounded-full border-2 border-primary/40 text-muted-foreground hover:scale-110 transition-transform cursor-pointer"
                    >
                      galpão
                    </button>
                    <button
                      onClick={() => handleWordClick("várzea")}
                      className="absolute bottom-1/4 right-1/3 px-4 py-2 rounded-full border-2 border-primary/40 text-muted-foreground hover:scale-110 transition-transform cursor-pointer"
                    >
                      várzea
                    </button>
                    <button
                      onClick={() => handleWordClick("sonhos")}
                      className="absolute top-1/3 left-1/5 px-3 py-2 rounded-full border border-primary/30 text-muted-foreground hover:scale-110 transition-transform cursor-pointer text-sm"
                    >
                      sonhos
                    </button>
                    <button
                      onClick={() => handleWordClick("gateada")}
                      className="absolute top-2/3 right-1/5 px-3 py-2 rounded-full border border-primary/30 text-muted-foreground hover:scale-110 transition-transform cursor-pointer text-sm"
                    >
                      gateada
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Análise de Prosódia Semântica</h3>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-500/10 text-green-500">Positiva</Badge>
                          <span className="font-semibold">calma</span>
                          <span className="text-sm text-muted-foreground ml-auto">Força: 88%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs bg-green-500/5">copada</Badge>
                          <Badge variant="outline" className="text-xs bg-green-500/5">lindo</Badge>
                          <Badge variant="outline" className="text-xs bg-green-500/5">primavera</Badge>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-500/10 text-blue-500">Neutro</Badge>
                          <span className="font-semibold">tarumã</span>
                          <span className="text-sm text-muted-foreground ml-auto">Força: 72%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs bg-blue-500/5">várzea</Badge>
                          <Badge variant="outline" className="text-xs bg-blue-500/5">galpão</Badge>
                          <Badge variant="outline" className="text-xs bg-blue-500/5">mate</Badge>
                          <Badge variant="outline" className="text-xs bg-blue-500/5">arreios</Badge>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-amber-500/10 text-amber-500">Melancólico</Badge>
                          <span className="font-semibold">saudade</span>
                          <span className="text-sm text-muted-foreground ml-auto">Força: 92%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs bg-amber-500/5">cansado</Badge>
                          <Badge variant="outline" className="text-xs bg-amber-500/5">silêncio</Badge>
                          <Badge variant="outline" className="text-xs bg-amber-500/5">redomona</Badge>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-500/10 text-purple-500">Contemplativo</Badge>
                          <span className="font-semibold">sonhos</span>
                          <span className="text-sm text-muted-foreground ml-auto">Força: 85%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs bg-purple-500/5">mansidão</Badge>
                          <Badge variant="outline" className="text-xs bg-purple-500/5">querência</Badge>
                          <Badge variant="outline" className="text-xs bg-purple-500/5">adormecidos</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Frequência */}
        <TabsContent value="frequencia" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <FileBarChart className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Análise Log-Likelihood (LL)</CardTitle>
                    <button className="p-1 hover:bg-muted rounded-full transition-colors group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-xs text-sm">
                          <p className="font-semibold mb-1">O que é Log-Likelihood?</p>
                          <p>É um teste estatístico que mostra se uma palavra aparece muito mais (ou muito menos) no seu corpus de estudo do que esperado.</p>
                          <p className="mt-2 text-xs">Valores altos = a palavra é super característica das músicas gaúchas!</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Palavras-chave em comparação com o corpus de referência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={logLikelihoodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="palavra" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      label={{ value: 'Log-Likelihood', angle: -90, position: 'insideLeft' }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {logLikelihoodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 72%, 51%)" }} />
                    <span>LL {'>'} 15.13 = p {'<'} 0.0001 (extremamente significativo)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
                    <span>LL {'>'} 6.63 = p {'<'} 0.01 (significativo)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                    <span>LL {'>'} 3.84 = p {'<'} 0.05 (pouco significativo)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Mutual Information Score (MI)</CardTitle>
                    <button className="p-1 hover:bg-muted rounded-full transition-colors group relative">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg max-w-xs text-sm">
                          <p className="font-semibold mb-1">O que é MI Score?</p>
                          <p>Mede o quanto uma palavra está "ligada" ao seu corpus. É como medir a força da associação entre a palavra e o tipo de música.</p>
                          <p className="mt-2 text-xs">MI alto = essa palavra é típica das músicas gaúchas!</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Força da associação entre palavra e corpus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={miScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="palavra" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      label={{ value: 'MI Score', angle: -90, position: 'insideLeft' }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {miScoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 72%, 51%)" }} />
                    <span>MI {'>'} 6 = Associação forte</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
                    <span>MI 4-6 = Associação moderada</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                    <span>MI {'<'} 4 = Associação fraca</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Estatística */}
        <TabsContent value="estatistica" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabela de Palavras-Chave Estatísticas</CardTitle>
              <CardDescription>
                Análise combinada de Log-Likelihood e MI Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palavra</TableHead>
                    <TableHead className="text-right">Log-Likelihood</TableHead>
                    <TableHead className="text-right">MI Score</TableHead>
                    <TableHead>Significância</TableHead>
                    <TableHead>Efeito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {palavrasChaveData.map((item, index) => {
                    const EfeitoIcon = item.efeitoIcon;
                    return (
                      <TableRow 
                        key={index}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleWordClick(item.palavra)}
                      >
                        <TableCell className="font-mono font-semibold">{item.palavra}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.ll > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {item.ll.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{item.mi.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={
                              item.significancia === "Alta" ? "bg-destructive/10 text-destructive" :
                              item.significancia === "Média" ? "bg-accent/10 text-accent" :
                              "bg-success/10 text-success"
                            }
                          >
                            {item.significancia}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EfeitoIcon className={`h-4 w-4 ${item.efeito === 'Sobre-uso' ? 'text-destructive' : item.efeito === 'Sub-uso' ? 'text-primary' : 'text-success'}`} />
                            <span className="text-sm">{item.efeito}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Nuvem */}
        <TabsContent value="nuvem" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nuvem de Domínios Semânticos</CardTitle>
              <CardDescription>Domínios principais com suas palavras-chave satélites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[600px] bg-muted/20 rounded-lg p-8">
                {/* Natureza e Paisagem Campeira - Top Left */}
                <div className="absolute top-[10%] left-[15%]">
                  <div className="relative">
                    <button
                      onClick={() => handleWordClick("Natureza e Paisagem Campeira")}
                      className="text-3xl font-bold hover:scale-110 transition-all cursor-pointer"
                      style={{ color: "hsl(142, 71%, 45%)" }}
                    >
                      Natureza Campeira
                    </button>
                    <button onClick={() => handleWordClick("tarumã")} className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(142, 71%, 45%)" }}>tarumã</button>
                    <button onClick={() => handleWordClick("várzea")} className="absolute -right-12 top-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(142, 71%, 45%)" }}>várzea</button>
                    <button onClick={() => handleWordClick("coxilha")} className="absolute -right-10 bottom-2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(142, 71%, 45%)" }}>coxilha</button>
                    <button onClick={() => handleWordClick("sombra")} className="absolute -left-10 top-2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(142, 71%, 45%)" }}>sombra</button>
                  </div>
                </div>

                {/* Cavalo e Aperos - Top Right */}
                <div className="absolute top-[15%] right-[15%]">
                  <div className="relative">
                    <button
                      onClick={() => handleWordClick("Cavalo e Aperos")}
                      className="text-3xl font-bold hover:scale-110 transition-all cursor-pointer"
                      style={{ color: "hsl(221, 83%, 53%)" }}
                    >
                      Cavalo e Aperos
                    </button>
                    <button onClick={() => handleWordClick("gateada")} className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(221, 83%, 53%)" }}>gateada</button>
                    <button onClick={() => handleWordClick("encilha")} className="absolute -right-12 top-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(221, 83%, 53%)" }}>encilha</button>
                    <button onClick={() => handleWordClick("arreios")} className="absolute -left-10 bottom-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(221, 83%, 53%)" }}>arreios</button>
                    <button onClick={() => handleWordClick("esporas")} className="absolute -right-10 bottom-2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(221, 83%, 53%)" }}>esporas</button>
                  </div>
                </div>

                {/* Vida no Galpão - Center */}
                <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <button
                      onClick={() => handleWordClick("Vida no Galpão")}
                      className="text-4xl font-bold hover:scale-110 transition-all cursor-pointer"
                      style={{ color: "hsl(45, 93%, 47%)" }}
                    >
                      Vida no Galpão
                    </button>
                    <button onClick={() => handleWordClick("galpão")} className="absolute -top-10 left-1/2 -translate-x-1/2 text-base font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>galpão</button>
                    <button onClick={() => handleWordClick("mate")} className="absolute -right-12 top-2 text-base font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>mate</button>
                    <button onClick={() => handleWordClick("candeeiro")} className="absolute -right-16 bottom-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>candeeiro</button>
                    <button onClick={() => handleWordClick("querência")} className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>querência</button>
                    <button onClick={() => handleWordClick("cuia")} className="absolute -left-10 bottom-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>cuia</button>
                    <button onClick={() => handleWordClick("ramada")} className="absolute -left-12 top-2 text-base font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(45, 93%, 47%)" }}>ramada</button>
                  </div>
                </div>

                {/* Sentimentos e Poesia - Bottom Left */}
                <div className="absolute bottom-[12%] left-[18%]">
                  <div className="relative">
                    <button
                      onClick={() => handleWordClick("Sentimentos e Poesia")}
                      className="text-3xl font-bold hover:scale-110 transition-all cursor-pointer"
                      style={{ color: "hsl(291, 64%, 42%)" }}
                    >
                      Sentimentos
                    </button>
                    <button onClick={() => handleWordClick("verso")} className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(291, 64%, 42%)" }}>verso</button>
                    <button onClick={() => handleWordClick("saudade")} className="absolute -right-12 top-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(291, 64%, 42%)" }}>saudade</button>
                    <button onClick={() => handleWordClick("sonhos")} className="absolute -left-10 top-2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(291, 64%, 42%)" }}>sonhos</button>
                    <button onClick={() => handleWordClick("calma")} className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(291, 64%, 42%)" }}>calma</button>
                  </div>
                </div>

                {/* Tradição Gaúcha - Bottom Right */}
                <div className="absolute bottom-[15%] right-[20%]">
                  <div className="relative">
                    <button
                      onClick={() => handleWordClick("Tradição Gaúcha")}
                      className="text-3xl font-bold hover:scale-110 transition-all cursor-pointer"
                      style={{ color: "hsl(0, 72%, 51%)" }}
                    >
                      Tradição Gaúcha
                    </button>
                    <button onClick={() => handleWordClick("maragato")} className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(0, 72%, 51%)" }}>maragato</button>
                    <button onClick={() => handleWordClick("prenda")} className="absolute -right-10 top-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(0, 72%, 51%)" }}>prenda</button>
                    <button onClick={() => handleWordClick("campereada")} className="absolute -left-14 bottom-0 text-sm font-medium opacity-80 hover:opacity-100 hover:scale-110 transition-all" style={{ color: "hsl(0, 72%, 51%)" }}>campereada</button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal KWIC */}
      <KWICModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        word={selectedWord}
        data={selectedWord === "verso" ? kwicData : []}
      />
    </div>
  );
}

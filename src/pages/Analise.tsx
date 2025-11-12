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
import { InteractiveSemanticNetwork } from "@/components/InteractiveSemanticNetwork";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Network, Sparkles, BarChart3, FileBarChart, Cloud, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Mock data KWIC completo baseado na letra da música
const kwicDataMap: Record<string, Array<{leftContext: string, keyword: string, rightContext: string, source: string}>> = {
  "verso": [
    { leftContext: "...Daí um", keyword: "verso", rightContext: "de campo se chegou da campereada...", source: "Luiz Marenco" },
    { leftContext: "...Prá querência galponeira, onde o", keyword: "verso", rightContext: "é mais caseiro...", source: "Luiz Marenco" },
    { leftContext: "...E o", keyword: "verso", rightContext: "que tinha sonhos prá rondar na madrugada...", source: "Luiz Marenco" },
    { leftContext: "...E o", keyword: "verso", rightContext: "sonhou ser várzea com sombra de tarumã...", source: "Luiz Marenco" },
  ],
  "tarumã": [
    { leftContext: "A calma do", keyword: "tarumã", rightContext: ", ganhou sombra mais copada...", source: "Luiz Marenco" },
    { leftContext: "...E o verso sonhou ser várzea com sombra de", keyword: "tarumã", rightContext: "...", source: "Luiz Marenco" },
  ],
  "saudade": [
    { leftContext: "...A mansidão da campanha traz", keyword: "saudade", rightContext: "feito açoite...", source: "Luiz Marenco" },
    { leftContext: "...E uma", keyword: "saudade", rightContext: "redomona pelos cantos do galpão...", source: "Luiz Marenco" },
  ],
  "galpão": [
    { leftContext: "...E uma saudade redomona pelos cantos do", keyword: "galpão", rightContext: "...", source: "Luiz Marenco" },
    { leftContext: "...Prá querência galponeira, onde o verso é mais caseiro... Templado a luz de candeeiro e um 'quarto gordo nas brasa'... A mansidão da campanha traz saudades feito açoite... pelos cantos do", keyword: "galpão", rightContext: "...", source: "Luiz Marenco" },
  ],
  "várzea": [
    { leftContext: "Pela", keyword: "várzea", rightContext: "espichada com o sol da tarde caindo...", source: "Luiz Marenco" },
    { leftContext: "...E o verso sonhou ser", keyword: "várzea", rightContext: "com sombra de tarumã...", source: "Luiz Marenco" },
  ],
  "sonhos": [
    { leftContext: "...E o verso que tinha", keyword: "sonhos", rightContext: "prá rondar na madrugada...", source: "Luiz Marenco" },
    { leftContext: "...E o verso sonhou ser várzea... Sonhou com os olhos da prenda vestidos de primavera... Adormecidos na espera do sol pontear na coxilha", keyword: "sonhos", rightContext: "...", source: "Luiz Marenco" },
  ],
  "gateada": [
    { leftContext: "...No lombo de uma", keyword: "gateada", rightContext: "frente aberta de respeito...", source: "Luiz Marenco" },
    { leftContext: "...Ou um gateado prá", keyword: "encilha", rightContext: "...", source: "Luiz Marenco" },
  ],
  "mate": [
    { leftContext: "Cevou um", keyword: "mate", rightContext: "pura-folha, jujado de maçanilha...", source: "Luiz Marenco" },
  ],
  "coxilha": [
    { leftContext: "...E um ventito da", keyword: "coxilha", rightContext: "trouxe coplas entre as asas...", source: "Luiz Marenco" },
    { leftContext: "...Adormecidos na espera do sol pontear na", keyword: "coxilha", rightContext: "...", source: "Luiz Marenco" },
  ],
  "sombra": [
    { leftContext: "A calma do tarumã, ganhou", keyword: "sombra", rightContext: "mais copada...", source: "Luiz Marenco" },
    { leftContext: "...E o verso sonhou ser várzea com", keyword: "sombra", rightContext: "de tarumã...", source: "Luiz Marenco" },
  ],
  "arreios": [
    { leftContext: "Ficaram", keyword: "arreios", rightContext: "suados e o silencio de esporas...", source: "Luiz Marenco" },
  ],
  "esporas": [
    { leftContext: "...Ficaram arreios suados e o silencio de", keyword: "esporas", rightContext: "...", source: "Luiz Marenco" },
  ],
  "prenda": [
    { leftContext: "...Sonhou com os olhos da", keyword: "prenda", rightContext: "vestidos de primavera...", source: "Luiz Marenco" },
  ],
  "ramada": [
    { leftContext: "Desencilhou na", keyword: "ramada", rightContext: ", já cansado das lonjuras...", source: "Luiz Marenco" },
  ],
  "candeeiro": [
    { leftContext: "...Templado a luz de", keyword: "candeeiro", rightContext: "e um 'quarto gordo nas brasa'...", source: "Luiz Marenco" },
  ],
  "querência": [
    { leftContext: "Prá", keyword: "querência", rightContext: "galponeira, onde o verso é mais caseiro...", source: "Luiz Marenco" },
  ],
  "cuia": [
    { leftContext: "Uma", keyword: "cuia", rightContext: "e uma bomba recostada na cambona...", source: "Luiz Marenco" },
  ],
  "maragato": [
    { leftContext: "Um pañuelo", keyword: "maragato", rightContext: "se abriu no horizonte...", source: "Luiz Marenco" },
  ],
  "campereada": [
    { leftContext: "...Daí um verso de campo se chegou da", keyword: "campereada", rightContext: "...", source: "Luiz Marenco" },
  ],
  "calma": [
    { leftContext: "A", keyword: "calma", rightContext: "do tarumã, ganhou sombra mais copada...", source: "Luiz Marenco" },
  ],
  "encilha": [
    { leftContext: "...Ou um gateado prá", keyword: "encilha", rightContext: "...", source: "Luiz Marenco" },
  ],
};

const dominiosData = [
  { 
    dominio: "Natureza e Paisagem Campeira", 
    ocorrencias: 48, 
    percentual: 28.2,
    palavras: ["tarumã", "várzea", "coxilha", "campo", "campanha", "horizonte", "sombra", "sol"],
    cor: "hsl(142, 35%, 25%)",
    corTexto: "hsl(142, 80%, 75%)"
  },
  { 
    dominio: "Cavalo e Aperos", 
    ocorrencias: 38, 
    percentual: 22.4,
    palavras: ["gateada", "encilha", "arreios", "esporas", "tropa", "lombo", "ramada", "cambona"],
    cor: "hsl(221, 40%, 25%)",
    corTexto: "hsl(221, 85%, 75%)"
  },
  { 
    dominio: "Vida no Galpão", 
    ocorrencias: 32, 
    percentual: 18.8,
    palavras: ["galpão", "ramada", "candeeiro", "mate", "querência", "fogo", "chão", "cuia", "bomba"],
    cor: "hsl(45, 40%, 25%)",
    corTexto: "hsl(45, 95%, 75%)"
  },
  { 
    dominio: "Sentimentos e Poesia", 
    ocorrencias: 28, 
    percentual: 16.5,
    palavras: ["verso", "saudade", "sonhos", "coplas", "mansidão", "calma", "silêncio"],
    cor: "hsl(291, 35%, 25%)",
    corTexto: "hsl(291, 75%, 75%)"
  },
  { 
    dominio: "Tradição Gaúcha", 
    ocorrencias: 24, 
    percentual: 14.1,
    palavras: ["maragato", "pañuelo", "mate", "maçanilha", "prenda", "campereada"],
    cor: "hsl(0, 35%, 25%)",
    corTexto: "hsl(0, 80%, 75%)"
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
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<typeof dominiosData[0] | null>(null);

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
    setModalOpen(true);
  };

  const handleDomainClick = (domainName: string) => {
    const domain = dominiosData.find(d => d.dominio === domainName);
    if (domain) {
      setSelectedDomain(domain);
      setDomainModalOpen(true);
    }
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dominios" className="gap-2">
            <FileText className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="rede" className="gap-2">
            <Network className="h-4 w-4" />
            Rede
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
                            className="cursor-pointer hover:scale-105 transition-all border-0"
                            style={{ backgroundColor: item.cor, color: item.corTexto }}
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
                <div>
                  <InteractiveSemanticNetwork onWordClick={handleWordClick} />
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
              <CardDescription>Domínios principais com suas palavras-chave satélites. Tamanho proporcional à relevância estatística.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[750px] bg-muted/20 rounded-lg p-12">
                {/* Natureza e Paisagem Campeira - Centro (mais saliente: 28.2%) */}
                <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <Badge
                      onClick={() => handleDomainClick("Natureza e Paisagem Campeira")}
                      className="text-3xl font-bold px-8 py-4 hover:scale-110 transition-all cursor-pointer shadow-lg border-0"
                      style={{ backgroundColor: "hsl(142, 35%, 25%)", color: "hsl(142, 80%, 75%)" }}
                    >
                      Natureza e Paisagem Campeira
                    </Badge>
                    <Badge onClick={() => handleWordClick("tarumã")} className="absolute -top-20 left-1/4 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>tarumã</Badge>
                    <Badge onClick={() => handleWordClick("várzea")} className="absolute -right-24 top-4 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>várzea</Badge>
                    <Badge onClick={() => handleWordClick("coxilha")} className="absolute -right-24 bottom-6 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>coxilha</Badge>
                    <Badge onClick={() => handleWordClick("sombra")} className="absolute -left-20 top-6 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>sombra</Badge>
                    <Badge onClick={() => handleWordClick("campo")} className="absolute -bottom-20 left-1/3 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>campo</Badge>
                    <Badge onClick={() => handleWordClick("sol")} className="absolute -top-20 right-1/3 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(142, 35%, 25%, 0.7)", color: "hsl(142, 80%, 75%)" }}>sol</Badge>
                  </div>
                </div>

                {/* Cavalo e Aperos - Top Left (22.4%) */}
                <div className="absolute top-[8%] left-[12%]">
                  <div className="relative">
                    <Badge
                      onClick={() => handleDomainClick("Cavalo e Aperos")}
                      className="text-2xl font-bold px-6 py-3 hover:scale-110 transition-all cursor-pointer shadow-lg border-0"
                      style={{ backgroundColor: "hsl(221, 40%, 25%)", color: "hsl(221, 85%, 75%)" }}
                    >
                      Cavalo e Aperos
                    </Badge>
                    <Badge onClick={() => handleWordClick("gateada")} className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(221, 40%, 25%, 0.7)", color: "hsl(221, 85%, 75%)" }}>gateada</Badge>
                    <Badge onClick={() => handleWordClick("encilha")} className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(221, 40%, 25%, 0.7)", color: "hsl(221, 85%, 75%)" }}>encilha</Badge>
                    <Badge onClick={() => handleWordClick("arreios")} className="absolute -left-16 bottom-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(221, 40%, 25%, 0.7)", color: "hsl(221, 85%, 75%)" }}>arreios</Badge>
                    <Badge onClick={() => handleWordClick("esporas")} className="absolute -right-18 bottom-8 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(221, 40%, 25%, 0.7)", color: "hsl(221, 85%, 75%)" }}>esporas</Badge>
                  </div>
                </div>

                {/* Vida no Galpão - Top Right (18.8%) */}
                <div className="absolute top-[10%] right-[12%]">
                  <div className="relative">
                    <Badge
                      onClick={() => handleDomainClick("Vida no Galpão")}
                      className="text-xl font-bold px-5 py-3 hover:scale-110 transition-all cursor-pointer shadow-lg border-0"
                      style={{ backgroundColor: "hsl(45, 40%, 25%)", color: "hsl(45, 95%, 75%)" }}
                    >
                      Vida no Galpão
                    </Badge>
                    <Badge onClick={() => handleWordClick("galpão")} className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>galpão</Badge>
                    <Badge onClick={() => handleWordClick("mate")} className="absolute -right-16 top-4 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>mate</Badge>
                    <Badge onClick={() => handleWordClick("candeeiro")} className="absolute -right-22 bottom-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>candeeiro</Badge>
                    <Badge onClick={() => handleWordClick("querência")} className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>querência</Badge>
                    <Badge onClick={() => handleWordClick("cuia")} className="absolute -left-14 bottom-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>cuia</Badge>
                    <Badge onClick={() => handleWordClick("ramada")} className="absolute -left-16 top-4 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(45, 40%, 25%, 0.7)", color: "hsl(45, 95%, 75%)" }}>ramada</Badge>
                  </div>
                </div>

                {/* Sentimentos e Poesia - Bottom Left (16.5%) */}
                <div className="absolute bottom-[12%] left-[18%]">
                  <div className="relative">
                    <Badge
                      onClick={() => handleDomainClick("Sentimentos e Poesia")}
                      className="text-xl font-bold px-5 py-2.5 hover:scale-110 transition-all cursor-pointer shadow-lg border-0"
                      style={{ backgroundColor: "hsl(291, 35%, 25%)", color: "hsl(291, 75%, 75%)" }}
                    >
                      Sentimentos e Poesia
                    </Badge>
                    <Badge onClick={() => handleWordClick("verso")} className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(291, 35%, 25%, 0.7)", color: "hsl(291, 75%, 75%)" }}>verso</Badge>
                    <Badge onClick={() => handleWordClick("saudade")} className="absolute -right-18 top-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(291, 35%, 25%, 0.7)", color: "hsl(291, 75%, 75%)" }}>saudade</Badge>
                    <Badge onClick={() => handleWordClick("sonhos")} className="absolute -left-16 top-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(291, 35%, 25%, 0.7)", color: "hsl(291, 75%, 75%)" }}>sonhos</Badge>
                    <Badge onClick={() => handleWordClick("calma")} className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(291, 35%, 25%, 0.7)", color: "hsl(291, 75%, 75%)" }}>calma</Badge>
                  </div>
                </div>

                {/* Tradição Gaúcha - Bottom Right (14.1%) */}
                <div className="absolute bottom-[14%] right-[18%]">
                  <div className="relative">
                    <Badge
                      onClick={() => handleDomainClick("Tradição Gaúcha")}
                      className="text-lg font-bold px-4 py-2 hover:scale-110 transition-all cursor-pointer shadow-lg border-0"
                      style={{ backgroundColor: "hsl(0, 35%, 25%)", color: "hsl(0, 80%, 75%)" }}
                    >
                      Tradição Gaúcha
                    </Badge>
                    <Badge onClick={() => handleWordClick("maragato")} className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(0, 35%, 25%, 0.7)", color: "hsl(0, 80%, 75%)" }}>maragato</Badge>
                    <Badge onClick={() => handleWordClick("prenda")} className="absolute -right-16 top-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(0, 35%, 25%, 0.7)", color: "hsl(0, 80%, 75%)" }}>prenda</Badge>
                    <Badge onClick={() => handleWordClick("campereada")} className="absolute -left-24 bottom-2 px-3 py-1.5 shadow-md hover:scale-110 transition-all cursor-pointer border-0" style={{ backgroundColor: "hsl(0, 35%, 25%, 0.7)", color: "hsl(0, 80%, 75%)" }}>campereada</Badge>
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
        data={kwicDataMap[selectedWord] || []}
      />

      {/* Modal de Domínio Semântico */}
      <Dialog open={domainModalOpen} onOpenChange={setDomainModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDomain && (
                <>
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: selectedDomain.cor }}
                  />
                  {selectedDomain.dominio}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Dados estatísticos do domínio semântico
            </DialogDescription>
          </DialogHeader>
          {selectedDomain && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedDomain.ocorrencias}</div>
                    <p className="text-sm text-muted-foreground">Ocorrências</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedDomain.percentual}%</div>
                    <p className="text-sm text-muted-foreground">do corpus</p>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Palavras-chave do domínio</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDomain.palavras.map((palavra, idx) => (
                    <Badge 
                      key={idx} 
                      className="cursor-pointer hover:scale-105 transition-all text-base px-4 py-2 border-0"
                      style={{ backgroundColor: selectedDomain.cor, color: selectedDomain.corTexto }}
                      onClick={() => {
                        setDomainModalOpen(false);
                        handleWordClick(palavra);
                      }}
                    >
                      {palavra}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Distribuição no corpus</span>
                </div>
                <div className="w-full bg-background rounded-full h-4">
                  <div 
                    className="h-4 rounded-full transition-all" 
                    style={{ 
                      width: `${selectedDomain.percentual}%`, 
                      backgroundColor: selectedDomain.cor 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

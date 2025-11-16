import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { LexicalProfile } from "@/data/types/stylistic-analysis.types";
import { dominiosSeparated } from "@/data/mockup";
import { 
  calculateLexicalProfile, 
  compareProfiles, 
  calculateDiversityMetrics,
  exportLexicalProfileToCSV,
  identifyHapaxWithContext
} from "@/services/lexicalAnalysisService";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function TabLexicalProfile() {
  const [selectedCorpus, setSelectedCorpus] = useState<CorpusType>('gaucho');
  const [compareMode, setCompareMode] = useState(false);
  const [studyProfile, setStudyProfile] = useState<LexicalProfile | null>(null);
  const [referenceProfile, setReferenceProfile] = useState<LexicalProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { corpus: gauchoCorpus, isLoading: loadingGaucho } = useFullTextCorpus('gaucho');
  const { corpus: nordestinoCorpus, isLoading: loadingNordestino } = useFullTextCorpus('nordestino');

  useEffect(() => {
    if (selectedCorpus === 'gaucho' && gauchoCorpus) {
      analyzeCorpus(gauchoCorpus, 'study');
    } else if (selectedCorpus === 'nordestino' && nordestinoCorpus) {
      analyzeCorpus(nordestinoCorpus, 'study');
    }
  }, [selectedCorpus, gauchoCorpus, nordestinoCorpus]);

  const analyzeCorpus = (corpus: any, type: 'study' | 'reference') => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const profile = calculateLexicalProfile(corpus, dominiosSeparated);
      if (type === 'study') {
        setStudyProfile(profile);
      } else {
        setReferenceProfile(profile);
      }
      setIsAnalyzing(false);
    }, 500);
  };

  const handleCompareToggle = () => {
    if (!compareMode && studyProfile) {
      const refCorpusType = selectedCorpus === 'gaucho' ? 'nordestino' : 'gaucho';
      const refCorpus = refCorpusType === 'gaucho' ? gauchoCorpus : nordestinoCorpus;
      if (refCorpus) {
        analyzeCorpus(refCorpus, 'reference');
      }
    }
    setCompareMode(!compareMode);
  };

  const handleExport = () => {
    if (!studyProfile) return;
    const csv = exportLexicalProfileToCSV(studyProfile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `perfil-lexical-${studyProfile.corpusType}-${Date.now()}.csv`;
    link.click();
  };

  if (loadingGaucho || loadingNordestino || isAnalyzing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Analisando perfil léxico...</p>
        </div>
      </div>
    );
  }

  if (!studyProfile) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>Selecione um corpus para iniciar a análise léxica.</AlertDescription>
      </Alert>
    );
  }

  const diversityMetrics = calculateDiversityMetrics(studyProfile);
  const comparison = compareMode && referenceProfile 
    ? compareProfiles(studyProfile, referenceProfile) 
    : null;

  const semanticFieldsData = studyProfile.topSemanticFields.map(f => ({
    name: f.field,
    value: f.count,
    percentage: f.percentage
  }));

  const radarData = [
    { metric: 'TTR', value: studyProfile.ttr * 100, reference: referenceProfile ? referenceProfile.ttr * 100 : 0 },
    { metric: 'Densidade Lexical', value: studyProfile.lexicalDensity * 100, reference: referenceProfile ? referenceProfile.lexicalDensity * 100 : 0 },
    { metric: 'Hapax %', value: studyProfile.hapaxPercentage, reference: referenceProfile ? referenceProfile.hapaxPercentage : 0 },
    { metric: 'Razão N/V', value: Math.min(studyProfile.nounVerbRatio * 10, 100), reference: referenceProfile ? Math.min(referenceProfile.nounVerbRatio * 10, 100) : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Perfil Léxico</h2>
            <p className="text-sm text-muted-foreground">Análise de vocabulário e riqueza lexical</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedCorpus} onValueChange={(v) => setSelectedCorpus(v as CorpusType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gaucho">Corpus Gaúcho</SelectItem>
              <SelectItem value="nordestino">Corpus Nordestino</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleCompareToggle}>
            {compareMode ? 'Modo Simples' : 'Modo Comparação'}
          </Button>

          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O Perfil Léxico analisa a riqueza vocabular, densidade lexical e campos semânticos do corpus 
          seguindo as técnicas de Leech & Short (2007).
        </AlertDescription>
      </Alert>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Type-Token Ratio (TTR)</CardDescription>
            <CardTitle className="text-3xl">{studyProfile.ttr.toFixed(3)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={studyProfile.ttr > 0.6 ? 'default' : studyProfile.ttr > 0.4 ? 'secondary' : 'outline'}>
              {diversityMetrics.vocabularyRichness}
            </Badge>
            {comparison && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                {comparison.differences.ttrDiff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : comparison.differences.ttrDiff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={comparison.differences.ttrDiff > 0 ? 'text-green-500' : comparison.differences.ttrDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                  {comparison.differences.ttrDiff > 0 ? '+' : ''}{comparison.differences.ttrDiff.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Densidade Lexical</CardDescription>
            <CardTitle className="text-3xl">{(studyProfile.lexicalDensity * 100).toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={studyProfile.lexicalDensity > 0.6 ? 'default' : studyProfile.lexicalDensity > 0.4 ? 'secondary' : 'outline'}>
              {diversityMetrics.lexicalDensityLevel}
            </Badge>
            {comparison && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                {comparison.differences.lexicalDensityDiff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : comparison.differences.lexicalDensityDiff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={comparison.differences.lexicalDensityDiff > 0 ? 'text-green-500' : comparison.differences.lexicalDensityDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                  {comparison.differences.lexicalDensityDiff > 0 ? '+' : ''}{comparison.differences.lexicalDensityDiff.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Hapax Legomena</CardDescription>
            <CardTitle className="text-3xl">{studyProfile.hapaxCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{studyProfile.hapaxPercentage.toFixed(1)}% do vocabulário</p>
            {comparison && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                {comparison.differences.hapaxDiff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : comparison.differences.hapaxDiff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={comparison.differences.hapaxDiff > 0 ? 'text-green-500' : comparison.differences.hapaxDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                  {comparison.differences.hapaxDiff > 0 ? '+' : ''}{comparison.differences.hapaxDiff.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Razão Substantivo/Verbo</CardDescription>
            <CardTitle className="text-3xl">{studyProfile.nounVerbRatio.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{diversityMetrics.styleType}</Badge>
            {comparison && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                {comparison.differences.nounVerbRatioDiff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : comparison.differences.nounVerbRatioDiff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={comparison.differences.nounVerbRatioDiff > 0 ? 'text-green-500' : comparison.differences.nounVerbRatioDiff < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                  {comparison.differences.nounVerbRatioDiff > 0 ? '+' : ''}{comparison.differences.nounVerbRatioDiff.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <Tabs defaultValue="semantic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="semantic">Campos Semânticos</TabsTrigger>
          <TabsTrigger value="frequencies">Frequências</TabsTrigger>
          {compareMode && <TabsTrigger value="comparison">Comparação</TabsTrigger>}
        </TabsList>

        <TabsContent value="semantic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Campos Semânticos</CardTitle>
              <CardDescription>Distribuição dos domínios temáticos mais frequentes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={semanticFieldsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Ocorrências" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequências de Palavras</CardTitle>
              <CardDescription>Top 50 palavras mais frequentes com seus domínios semânticos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Palavra</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Domínio Semântico</TableHead>
                      <TableHead>Hapax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studyProfile.wordFrequencies.slice(0, 50).map((word, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{word.word}</TableCell>
                        <TableCell>{word.freq}</TableCell>
                        <TableCell>
                          {word.domain ? (
                            <Badge variant="secondary">{word.domain}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {word.isHapax && <Badge variant="outline">Sim</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {compareMode && comparison && (
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gráfico Radar - Comparação de Perfis</CardTitle>
                <CardDescription>
                  Comparação visual entre {studyProfile.corpusType} e {referenceProfile.corpusType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Estudo" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    <Radar name="Referência" dataKey="reference" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {comparison.significantFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Diferenças Significativas em Campos Semânticos</CardTitle>
                  <CardDescription>Campos com diferença maior que 2 pontos percentuais</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo Semântico</TableHead>
                        <TableHead>Estudo</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead>Diferença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.significantFields.map((field, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{field.field}</TableCell>
                          <TableCell>{field.studyPercentage.toFixed(2)}%</TableCell>
                          <TableCell>{field.referencePercentage.toFixed(2)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {field.difference > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className={field.difference > 0 ? 'text-green-500' : 'text-red-500'}>
                                {field.difference > 0 ? '+' : ''}{field.difference.toFixed(2)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

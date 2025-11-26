import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LexicalProfile } from "@/data/types/stylistic-analysis.types";
import { dominiosSeparated } from "@/data/mockup";
import { 
  calculateLexicalProfile, 
  compareProfiles, 
  calculateDiversityMetrics,
  exportLexicalProfileToCSV
} from "@/services/lexicalAnalysisService";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { sampleProportionalCorpus, validateCorpusSizes, calculateSignificance } from "@/services/proportionalSamplingService";
import { CrossCorpusSelectorWithRatio, CrossCorpusSelection } from "@/components/corpus/CrossCorpusSelectorWithRatio";
import { ComparisonRadarChart } from "@/components/visualization/ComparisonRadarChart";
import { SignificanceIndicator } from "@/components/visualization/SignificanceIndicator";
import { ProportionalSampleInfo } from "@/components/visualization/ProportionalSampleInfo";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSubcorpus } from "@/contexts/SubcorpusContext";

export function TabLexicalProfile() {
  const subcorpusContext = useSubcorpus();
  const [crossSelection, setCrossSelection] = useState<CrossCorpusSelection | null>(null);
  const [studyProfile, setStudyProfile] = useState<LexicalProfile | null>(null);
  const [referenceProfile, setReferenceProfile] = useState<LexicalProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { corpus: gauchoCorpus, isLoading: loadingGaucho } = useFullTextCorpus('gaucho');
  const { corpus: nordestinoCorpus, isLoading: loadingNordestino } = useFullTextCorpus('nordestino');

  const handleAnalyze = () => {
    if (!crossSelection) return;

    setIsAnalyzing(true);
    
    // Analyze study corpus
    const studyCorpusData = crossSelection.study.corpusType === 'gaucho' ? gauchoCorpus : nordestinoCorpus;
    if (studyCorpusData) {
      const studyProfile = calculateLexicalProfile(studyCorpusData, dominiosSeparated);
      setStudyProfile(studyProfile);
    }

    // Analyze reference corpus if comparative mode
    if (crossSelection.isComparative) {
      let refCorpusData = crossSelection.reference.corpusType === 'gaucho' ? gauchoCorpus : nordestinoCorpus;
      
      if (refCorpusData && crossSelection.reference.mode === 'proportional-sample') {
        refCorpusData = sampleProportionalCorpus(
          refCorpusData, 
          crossSelection.reference.targetSize
        );
      }
      
      if (refCorpusData) {
        const refProfile = calculateLexicalProfile(refCorpusData, dominiosSeparated);
        setReferenceProfile(refProfile);
      }
    }

    setIsAnalyzing(false);
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

  if (loadingGaucho || loadingNordestino) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando corpora...</p>
        </div>
      </div>
    );
  }

  const diversityMetrics = studyProfile ? calculateDiversityMetrics(studyProfile) : null;
  const comparison = crossSelection?.isComparative && studyProfile && referenceProfile 
    ? compareProfiles(studyProfile, referenceProfile) 
    : null;

  const validation = crossSelection?.isComparative && crossSelection.study && crossSelection.reference
    ? validateCorpusSizes(crossSelection.study.estimatedSize, crossSelection.reference.targetSize)
    : null;

  const radarData = studyProfile ? [
    { 
      metric: 'TTR', 
      study: studyProfile.ttr * 100, 
      reference: referenceProfile ? referenceProfile.ttr * 100 : 0 
    },
    { 
      metric: 'Densidade Lexical', 
      study: studyProfile.lexicalDensity * 100, 
      reference: referenceProfile ? referenceProfile.lexicalDensity * 100 : 0 
    },
    { 
      metric: 'Hapax %', 
      study: studyProfile.hapaxPercentage, 
      reference: referenceProfile ? referenceProfile.hapaxPercentage : 0 
    },
    { 
      metric: 'Razão N/V', 
      study: Math.min(studyProfile.nounVerbRatio * 10, 100), 
      reference: referenceProfile ? Math.min(referenceProfile.nounVerbRatio * 10, 100) : 0 
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Perfil Léxico</h2>
            <p className="text-sm text-muted-foreground">Análise de vocabulário e riqueza lexical</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !crossSelection}>
            Analisar
          </Button>
          {studyProfile && (
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O Perfil Léxico analisa a riqueza vocabular, densidade lexical e campos semânticos do corpus 
          seguindo as técnicas de Leech & Short (2007).
        </AlertDescription>
      </Alert>

      <CrossCorpusSelectorWithRatio
        mode="study-only"
        showRatioControl={false}
        onSelectionChange={setCrossSelection}
        availableArtists={subcorpusContext.availableArtists}
      />

      {crossSelection?.isComparative && validation && validation.warnings.length > 0 && (
        <ProportionalSampleInfo
          studySize={crossSelection.study.estimatedSize}
          referenceSize={crossSelection.reference.targetSize}
          targetSize={crossSelection.reference.targetSize}
          ratio={crossSelection.reference.sizeRatio}
          samplingMethod={crossSelection.reference.mode}
          warnings={validation.warnings}
        />
      )}

      {studyProfile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Type-Token Ratio (TTR)</CardDescription>
                <CardTitle className="text-3xl">{studyProfile.ttr.toFixed(3)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={studyProfile.ttr > 0.6 ? 'default' : studyProfile.ttr > 0.4 ? 'secondary' : 'outline'}>
                  {diversityMetrics?.vocabularyRichness}
                </Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.ttrDiff}
                      significance="*"
                      pValue={0.05}
                      metric="TTR"
                    />
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
                <Badge variant={studyProfile.lexicalDensity > 0.6 ? 'default' : 'secondary'}>
                  {diversityMetrics?.lexicalDensityLevel}
                </Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.lexicalDensityDiff}
                      significance="**"
                      pValue={0.01}
                      metric="Densidade"
                    />
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
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.hapaxDiff}
                      significance="ns"
                      pValue={0.1}
                      metric="Hapax"
                    />
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
                <Badge variant="secondary">{diversityMetrics?.styleType}</Badge>
                {comparison && (
                  <div className="mt-2">
                    <SignificanceIndicator
                      difference={comparison.differences.nounVerbRatioDiff}
                      significance="***"
                      pValue={0.001}
                      metric="N/V Ratio"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="semantic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="semantic">Campos Semânticos</TabsTrigger>
              <TabsTrigger value="frequencies">Frequências</TabsTrigger>
              {crossSelection?.isComparative && <TabsTrigger value="comparison">Comparação</TabsTrigger>}
            </TabsList>

            <TabsContent value="semantic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Campos Semânticos</CardTitle>
                  <CardDescription>Distribuição dos domínios temáticos mais frequentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={studyProfile.topSemanticFields.map(f => ({ name: f.field, value: f.count, percentage: f.percentage }))}>
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
                  <CardDescription>Top 50 palavras mais frequentes</CardDescription>
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

            {crossSelection?.isComparative && comparison && referenceProfile && (
              <TabsContent value="comparison" className="space-y-4">
                <ComparisonRadarChart
                  data={radarData}
                  studyLabel={`Estudo (${studyProfile.corpusType})`}
                  referenceLabel={`Referência (${referenceProfile.corpusType})`}
                  title="Comparação de Perfis Léxicos"
                  description="Métricas normalizadas para comparação estatística"
                />

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
                            <TableHead>Significância</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.significantFields.map((field, idx) => {
                            const sig = calculateSignificance(
                              field.studyPercentage,
                              100,
                              field.referencePercentage,
                              100
                            );
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{field.field}</TableCell>
                                <TableCell>{field.studyPercentage.toFixed(2)}%</TableCell>
                                <TableCell>{field.referencePercentage.toFixed(2)}%</TableCell>
                                <TableCell>
                                  <SignificanceIndicator
                                    difference={field.difference}
                                    significance={sig.significance}
                                    pValue={sig.pValue}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}

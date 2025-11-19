import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Search, BookOpen, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DialectalEntry {
  verbete: string;
  origem_primaria: string;
  classe_gramatical: string;
  definicoes: any;
  confianca_extracao: number;
  validado_humanamente: boolean;
  categorias_tematicas: string[];
  influencia_platina: boolean;
}

interface GutenbergEntry {
  verbete: string;
  classe_gramatical: string;
  definicoes: any;
  etimologia: string;
  confianca_extracao: number;
  validado: boolean;
  sinonimos: string[];
}

export function LexiconEntryViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialectalResults, setDialectalResults] = useState<DialectalEntry[]>([]);
  const [gutenbergResults, setGutenbergResults] = useState<GutenbergEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dialectal');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo para buscar');
      return;
    }

    setLoading(true);
    try {
      // Search Dialectal
      const { data: dialectalData, error: dialectalError } = await supabase
        .from('dialectal_lexicon')
        .select('*')
        .ilike('verbete', `%${searchTerm}%`)
        .limit(20);

      if (dialectalError) throw dialectalError;
      setDialectalResults(dialectalData || []);

      // Search Gutenberg
      const { data: gutenbergData, error: gutenbergError } = await supabase
        .from('gutenberg_lexicon')
        .select('*')
        .ilike('verbete', `%${searchTerm}%`)
        .limit(20);

      if (gutenbergError) throw gutenbergError;
      setGutenbergResults(gutenbergData || []);

      if (dialectalData?.length === 0 && gutenbergData?.length === 0) {
        toast.info('Nenhum verbete encontrado');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar verbetes');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'bg-green-500/20 text-green-500';
    if (confidence >= 0.70) return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-red-500/20 text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Explorar Verbetes
          </CardTitle>
          <CardDescription>
            Busque e visualize verbetes dos dicionários importados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite um verbete (ex: chimarrão, pampa, gaúcho)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dialectal">
            Dialectal
            <Badge variant="secondary" className="ml-2">
              {dialectalResults.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="gutenberg">
            Gutenberg
            <Badge variant="secondary" className="ml-2">
              {gutenbergResults.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dialectal" className="space-y-4 mt-4">
          {dialectalResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum verbete encontrado no Dicionário Dialectal</p>
              </CardContent>
            </Card>
          ) : (
            dialectalResults.map((entry, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{entry.verbete}</CardTitle>
                      <CardDescription className="flex gap-2 mt-2">
                        <Badge variant="outline">{entry.origem_primaria}</Badge>
                        {entry.classe_gramatical && (
                          <Badge variant="outline">{entry.classe_gramatical}</Badge>
                        )}
                        {entry.influencia_platina && (
                          <Badge className="bg-purple-500/20 text-purple-500">
                            Platinismo
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getConfidenceColor(entry.confianca_extracao)}>
                        {(entry.confianca_extracao * 100).toFixed(0)}% confiança
                      </Badge>
                      {entry.validado_humanamente && (
                        <Badge className="bg-green-500/20 text-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Validado
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entry.definicoes && entry.definicoes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Definições:</h4>
                      <ul className="space-y-2">
                        {entry.definicoes.map((def: any, defIdx: number) => (
                          <li key={defIdx} className="text-sm">
                            <span className="font-medium">{def.acepcao}.</span> {def.texto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.categorias_tematicas && entry.categorias_tematicas.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Categorias:</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.categorias_tematicas.map((cat, catIdx) => (
                          <Badge key={catIdx} variant="secondary">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="gutenberg" className="space-y-4 mt-4">
          {gutenbergResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum verbete encontrado no Dicionário Gutenberg</p>
              </CardContent>
            </Card>
          ) : (
            gutenbergResults.map((entry, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{entry.verbete}</CardTitle>
                      <CardDescription className="flex gap-2 mt-2">
                        {entry.classe_gramatical && (
                          <Badge variant="outline">{entry.classe_gramatical}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getConfidenceColor(entry.confianca_extracao)}>
                        {(entry.confianca_extracao * 100).toFixed(0)}% confiança
                      </Badge>
                      {entry.validado && (
                        <Badge className="bg-green-500/20 text-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Validado
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entry.definicoes && entry.definicoes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Definições:</h4>
                      <ul className="space-y-2">
                        {entry.definicoes.map((def: any, defIdx: number) => (
                          <li key={defIdx} className="text-sm">
                            <span className="font-medium">{def.numero}.</span> {def.texto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.etimologia && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Etimologia:</h4>
                      <p className="text-sm text-muted-foreground">{entry.etimologia}</p>
                    </div>
                  )}

                  {entry.sinonimos && entry.sinonimos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Sinônimos:</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.sinonimos.map((sin, sinIdx) => (
                          <Badge key={sinIdx} variant="secondary">
                            {sin}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

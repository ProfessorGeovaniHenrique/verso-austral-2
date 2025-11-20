import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Network, BookOpen, Lightbulb } from "lucide-react";

interface SynonymExplorerProps {
  palavra: string;
}

export function SynonymExplorer({ palavra }: SynonymExplorerProps) {
  const { data: synonyms, isLoading: loadingSynonyms } = useQuery({
    queryKey: ['synonyms', palavra],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lexical_synonyms')
        .select('*')
        .eq('palavra', palavra.toLowerCase());
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: definitions, isLoading: loadingDefinitions } = useQuery({
    queryKey: ['definitions', palavra],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lexical_definitions')
        .select('*')
        .eq('palavra', palavra.toLowerCase());
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: network, isLoading: loadingNetwork } = useQuery({
    queryKey: ['network', palavra],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semantic_networks')
        .select('*')
        .or(`palavra_origem.eq.${palavra.toLowerCase()},palavra_destino.eq.${palavra.toLowerCase()}`)
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });
  
  const isLoading = loadingSynonyms || loadingDefinitions || loadingNetwork;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Exploração Lexical: <span className="font-mono">{palavra}</span>
        </CardTitle>
        <CardDescription>
          Recursos lexicais dos dicionários integrados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="synonyms">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="synonyms">
              Sinônimos
              {synonyms && synonyms.length > 0 && (
                <Badge variant="secondary" className="ml-2">{synonyms.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="definitions">
              Definições
              {definitions && definitions.length > 0 && (
                <Badge variant="secondary" className="ml-2">{definitions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="network">
              Rede Semântica
              {network && network.length > 0 && (
                <Badge variant="secondary" className="ml-2">{network.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="synonyms" className="space-y-4 mt-4">
            {!synonyms || synonyms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum sinônimo encontrado no Dicionário Houaiss
              </p>
            ) : (
              synonyms.map(syn => (
                <div key={syn.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {syn.pos && <Badge variant="outline">{syn.pos}</Badge>}
                    {syn.acepcao_numero && (
                      <span className="text-sm font-semibold">
                        Acepção {syn.acepcao_numero}
                      </span>
                    )}
                  </div>
                  
                  {syn.acepcao_descricao && (
                    <p className="text-sm text-muted-foreground">
                      {syn.acepcao_descricao}
                    </p>
                  )}
                  
                  {syn.sinonimos && syn.sinonimos.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                        Sinônimos:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {syn.sinonimos.map((s, i) => (
                          <Badge key={i} variant="secondary" className="font-mono">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {syn.antonimos && syn.antonimos.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                        Antônimos:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {syn.antonimos.map((a, i) => (
                          <Badge key={i} variant="destructive" className="font-mono">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {syn.contexto_uso && (
                    <p className="text-xs text-muted-foreground">
                      Contexto: {syn.contexto_uso}
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="definitions" className="space-y-4 mt-4">
            {!definitions || definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma definição encontrada
              </p>
            ) : (
              definitions.map(def => (
                <div key={def.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {def.pos && <Badge variant="outline">{def.pos}</Badge>}
                    {def.area_conhecimento && (
                      <Badge variant="secondary">{def.area_conhecimento}</Badge>
                    )}
                    {def.registro_uso && (
                      <Badge>{def.registro_uso}</Badge>
                    )}
                  </div>
                  
                  {def.definicao && (
                    <p className="text-sm">{def.definicao}</p>
                  )}
                  
                  {def.exemplos && def.exemplos.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold">Exemplos:</span>
                      {def.exemplos.map((ex, i) => (
                        <p key={i} className="text-sm text-muted-foreground italic pl-3 border-l-2">
                          {ex}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {def.etimologia && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Etimologia:</strong> {def.etimologia}
                    </p>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4 mt-4">
            {!network || network.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma relação semântica encontrada
              </p>
            ) : (
              <div className="space-y-3">
                {['sinonimo', 'antonimo', 'hiponimo', 'hiperonimo'].map(tipo => {
                  const relacoes = network.filter(n => n.tipo_relacao === tipo);
                  if (relacoes.length === 0) return null;
                  
                  return (
                    <div key={tipo} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Network className="h-4 w-4" />
                        <span className="text-sm font-semibold capitalize">
                          {tipo === 'sinonimo' && 'Sinônimos'}
                          {tipo === 'antonimo' && 'Antônimos'}
                          {tipo === 'hiponimo' && 'Hipônimos (mais específico)'}
                          {tipo === 'hiperonimo' && 'Hiperônimos (mais geral)'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {relacoes.map((rel, i) => (
                          <Badge 
                            key={i} 
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {rel.palavra_origem === palavra.toLowerCase() 
                              ? rel.palavra_destino 
                              : rel.palavra_origem}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

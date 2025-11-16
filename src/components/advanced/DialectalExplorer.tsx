import { useDialectalEntry } from '@/hooks/useDialectalLexicon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, BookOpen, Users, Sparkles } from 'lucide-react';

interface DialectalExplorerProps {
  palavra: string;
}

export function DialectalExplorer({ palavra }: DialectalExplorerProps) {
  const { data: entry, isLoading, error } = useDialectalEntry(palavra);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Erro ao carregar dados: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!entry) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Nenhum dado regionalista encontrado para "{palavra}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              {entry.verbete}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              {entry.classe_gramatical && (
                <Badge variant="outline">{entry.classe_gramatical}</Badge>
              )}
              <span className="text-xs">
                Frequência: <strong>{entry.frequencia_uso}</strong>
              </span>
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="justify-center">
              <MapPin className="w-3 h-3 mr-1" />
              {entry.origem_primaria}
            </Badge>
            {entry.influencia_platina && (
              <Badge variant="outline" className="justify-center text-xs">
                Influência Platina
              </Badge>
            )}
            {entry.marcacao_temporal && (
              <Badge variant="destructive" className="justify-center text-xs">
                {entry.marcacao_temporal}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Definições */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Definições
          </h4>
          {entry.definicoes.map((def, i) => (
            <div key={i} className="mb-3 pl-4 border-l-2 border-primary/50">
              <p className="text-sm">
                <strong>{def.numero}.</strong> {def.texto}
                {def.contexto && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {def.contexto}
                  </Badge>
                )}
              </p>
              {def.exemplos && def.exemplos.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Ex: {def.exemplos.join('; ')}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Sinonimos */}
        {entry.sinonimos && entry.sinonimos.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Sinônimos Regionais:</h4>
            <div className="flex flex-wrap gap-2">
              {entry.sinonimos.map((sin, i) => (
                <Badge key={i} variant="secondary">
                  {sin}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Remissões */}
        {entry.remissoes && entry.remissoes.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Ver também:</h4>
            <div className="flex flex-wrap gap-2">
              {entry.remissoes.map((rem, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  → {rem}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contextos Culturais */}
        {entry.contextos_culturais && Object.keys(entry.contextos_culturais).length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contextos Culturais
            </h4>
            <Accordion type="single" collapsible className="border rounded-md">
              {entry.contextos_culturais.costumes && entry.contextos_culturais.costumes.length > 0 && (
                <AccordionItem value="costumes">
                  <AccordionTrigger className="px-4">Costumes</AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="list-disc list-inside space-y-1">
                      {entry.contextos_culturais.costumes.map((c, i) => (
                        <li key={i} className="text-sm">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {entry.contextos_culturais.crencas && entry.contextos_culturais.crencas.length > 0 && (
                <AccordionItem value="crencas">
                  <AccordionTrigger className="px-4">Crenças</AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="list-disc list-inside space-y-1">
                      {entry.contextos_culturais.crencas.map((c, i) => (
                        <li key={i} className="text-sm">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {entry.contextos_culturais.fraseologias && entry.contextos_culturais.fraseologias.length > 0 && (
                <AccordionItem value="fraseologias">
                  <AccordionTrigger className="px-4">Fraseologias</AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="list-disc list-inside space-y-1">
                      {entry.contextos_culturais.fraseologias.map((f, i) => (
                        <li key={i} className="text-sm font-mono text-xs">
                          "{f}"
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {entry.contextos_culturais.divertimentos && entry.contextos_culturais.divertimentos.length > 0 && (
                <AccordionItem value="divertimentos">
                  <AccordionTrigger className="px-4">Divertimentos</AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="list-disc list-inside space-y-1">
                      {entry.contextos_culturais.divertimentos.map((d, i) => (
                        <li key={i} className="text-sm">
                          {d}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {/* Categorias Temáticas */}
        {entry.categorias_tematicas && entry.categorias_tematicas.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Categorias Temáticas
            </h4>
            <div className="flex flex-wrap gap-2">
              {entry.categorias_tematicas.map((cat, i) => (
                <Badge key={i} className="capitalize">
                  {cat.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadados */}
        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          {entry.volume_fonte && (
            <p>📚 Fonte: Volume {entry.volume_fonte}</p>
          )}
          <p>
            🎯 Confiança de extração: {(entry.confianca_extracao * 100).toFixed(0)}%
          </p>
          {entry.validado_humanamente && (
            <p className="text-green-600 dark:text-green-400">✓ Validado por especialista</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

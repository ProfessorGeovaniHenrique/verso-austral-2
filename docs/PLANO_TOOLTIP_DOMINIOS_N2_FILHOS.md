# 📋 Plano: Tooltip com Domínios N2 Filhos na Aba Domínios Semânticos

## 🎯 Objetivo
Ao passar o mouse sobre um card de domínio semântico na aba "Domínios Semânticos", exibir uma tooltip mostrando os domínios N2 filhos que aparecem no corpus analisado.

---

## 📊 Contexto Técnico

### Onde está a Aba "Domínios Semânticos"?
A aba não é `TabVisualizacoes.tsx` (que mostra nuvens de palavras/domínios), mas sim uma **aba ainda não implementada** que deve exibir **cards individuais de cada domínio semântico** com suas estatísticas.

### Estrutura dos Dados
Os domínios estão em `processamentoData.analysisResults.cloudData`:
```typescript
interface CloudData {
  codigo: string;        // "SH", "NA", "AP", etc.
  nome: string;          // "Ser Humano", "Natureza", etc.
  color: string;         // cor HSL
  avgScore: number;      // peso textual (%)
  wordCount: number;     // quantidade de palavras
  descricao?: string;    // descrição do domínio
}
```

Para identificar **domínios filhos N2**, precisamos:
1. Consultar a tabela `semantic_tagset` para obter os N2 filhos de cada N1
2. Cruzar com os domínios que aparecem no corpus (`cloudData`)
3. Exibir apenas os N2 que realmente têm palavras no corpus

---

## 🛠️ Plano de Implementação

### **Fase 1: Criar Hook para Buscar Domínios Filhos** (45 min)

#### Arquivo: `src/hooks/useChildDomains.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChildDomain {
  codigo: string;
  nome: string;
  descricao: string | null;
}

export function useChildDomains(parentCode: string, availableDomains: string[]) {
  const [childDomains, setChildDomains] = useState<ChildDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!parentCode || availableDomains.length === 0) return;

    const fetchChildren = async () => {
      setIsLoading(true);
      try {
        // Buscar N2 filhos do domínio pai
        const { data, error } = await supabase
          .from('semantic_tagset')
          .select('codigo, nome, descricao')
          .eq('tagset_pai', parentCode)
          .eq('nivel_profundidade', 2)
          .eq('status', 'ativo')
          .order('codigo', { ascending: true });

        if (error) throw error;

        // Filtrar apenas os N2 que aparecem no corpus
        const filtered = (data || []).filter(d => 
          availableDomains.includes(d.codigo)
        );

        setChildDomains(filtered);
      } catch (error) {
        console.error('Erro ao buscar domínios filhos:', error);
        setChildDomains([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, [parentCode, availableDomains]);

  return { childDomains, isLoading };
}
```

**Funcionalidade:**
- Busca os N2 filhos de um domínio N1 pai
- Filtra apenas os que aparecem no corpus (`availableDomains`)
- Cache automático via `useEffect`

---

### **Fase 2: Criar Componente de Card de Domínio** (1h)

#### Arquivo: `src/components/analise/DomainCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChildDomains } from '@/hooks/useChildDomains';
import { Loader2 } from 'lucide-react';

interface DomainCardProps {
  codigo: string;
  nome: string;
  color: string;
  avgScore: number;
  wordCount: number;
  descricao?: string;
  availableDomains: string[]; // Códigos de domínios presentes no corpus
}

export function DomainCard({ 
  codigo, 
  nome, 
  color, 
  avgScore, 
  wordCount,
  descricao,
  availableDomains 
}: DomainCardProps) {
  const { childDomains, isLoading } = useChildDomains(codigo, availableDomains);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: color }}
                  >
                    {codigo}
                  </div>
                  <CardTitle className="text-lg">{nome}</CardTitle>
                </div>
                <Badge variant="secondary">{avgScore.toFixed(1)}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{wordCount} palavras</span>
                {childDomains.length > 0 && (
                  <span className="text-primary font-medium">
                    {childDomains.length} subcategorias
                  </span>
                )}
              </div>
              {descricao && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {descricao}
                </p>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-sm p-4"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <h4 className="font-semibold text-base">{nome}</h4>
            </div>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando subcategorias...
              </div>
            ) : childDomains.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Subcategorias (N2) encontradas no corpus:
                </p>
                <div className="space-y-1.5">
                  {childDomains.map(child => (
                    <div 
                      key={child.codigo}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Badge variant="outline" className="text-xs shrink-0">
                        {child.codigo}
                      </Badge>
                      <div>
                        <p className="font-medium leading-tight">{child.nome}</p>
                        {child.descricao && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {child.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma subcategoria N2 encontrada no corpus.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Funcionalidades:**
- Card visual com código, nome, cor, peso textual
- Tooltip lateral mostrando N2 filhos presentes no corpus
- Loading state durante busca
- Mensagem clara se não houver filhos

---

### **Fase 3: Criar Aba "Domínios Semânticos"** (45 min)

#### Arquivo: `src/components/analise/TabDominiosSemanticos.tsx`

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FolderTree } from 'lucide-react';
import { useDashboardAnaliseContext } from '@/contexts/DashboardAnaliseContext';
import { DomainCard } from './DomainCard';

export function TabDominiosSemanticos() {
  const { processamentoData } = useDashboardAnaliseContext();

  const cloudData = processamentoData.analysisResults?.cloudData || [];

  if (!processamentoData.isProcessed || cloudData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Domínios Semânticos
          </CardTitle>
          <CardDescription>
            Visualize os domínios semânticos identificados no corpus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Processe um corpus na aba <strong>Processamento</strong> para visualizar os domínios semânticos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Extrair todos os códigos de domínios presentes no corpus
  const availableDomains = cloudData.map(d => d.codigo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Domínios Semânticos Identificados
          </CardTitle>
          <CardDescription>
            {cloudData.length} domínios encontrados no corpus. 
            Passe o mouse sobre cada card para ver as subcategorias N2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cloudData.map((domain, idx) => (
              <DomainCard
                key={idx}
                codigo={domain.codigo}
                nome={domain.nome}
                color={domain.color}
                avgScore={domain.avgScore}
                wordCount={domain.wordCount}
                descricao={domain.descricao}
                availableDomains={availableDomains}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Funcionalidades:**
- Grid responsivo de cards de domínios
- Passa lista de domínios disponíveis para cada card
- Mensagem clara se não houver dados

---

### **Fase 4: Integrar Nova Aba no Dashboard** (15 min)

#### Modificar: `src/pages/DashboardAnalise.tsx`

Adicionar nova aba entre "Quiz" e "Estatísticas":

```typescript
<TabsList className="grid w-full grid-cols-5 lg:flex lg:w-auto">
  <TabsTrigger value="processamento">Processamento</TabsTrigger>
  <TabsTrigger value="quiz" disabled={!processamentoData.isProcessed}>
    Quiz
  </TabsTrigger>
  <TabsTrigger value="dominios" disabled={!quizCompleted}>
    Domínios
  </TabsTrigger>
  <TabsTrigger value="estatisticas" disabled={!quizCompleted}>
    Estatísticas
  </TabsTrigger>
  <TabsTrigger value="visualizacoes" disabled={!quizCompleted}>
    Visualizações
  </TabsTrigger>
</TabsList>

{/* Conteúdo das abas */}
<TabsContent value="processamento">
  <TabProcessamento />
</TabsContent>
<TabsContent value="quiz">
  <TabQuizInterpretacao onQuizComplete={handleQuizComplete} />
</TabsContent>
<TabsContent value="dominios">
  <TabDominiosSemanticos />
</TabsContent>
<TabsContent value="estatisticas">
  <TabEstatisticas />
</TabsContent>
<TabsContent value="visualizacoes">
  <TabVisualizacoes />
</TabsContent>
```

---

## ⏱️ Estimativa de Tempo Total: **2h 45min**

| Fase | Tempo |
|------|-------|
| Hook `useChildDomains` | 45 min |
| Componente `DomainCard` | 1h |
| Aba `TabDominiosSemanticos` | 45 min |
| Integração no Dashboard | 15 min |

---

## 🎯 Resultado Esperado

1. ✅ Nova aba "Domínios" entre "Quiz" e "Estatísticas"
2. ✅ Grid de cards visuais para cada domínio semântico
3. ✅ Tooltip lateral ao passar o mouse mostrando:
   - Nome e código do N2 filho
   - Descrição do N2 (se houver)
   - Apenas N2 que aparecem no corpus
4. ✅ Loading state durante busca de filhos
5. ✅ Mensagem clara se não houver N2 filhos
6. ✅ Design consistente com o design system (HSL, semantic tokens)

---

## 📝 Notas Técnicas

- **Performance**: O hook `useChildDomains` usa cache via `useEffect`, evitando queries repetidas
- **Filtro Inteligente**: Apenas N2 presentes no corpus são exibidos (não todos os N2 teóricos)
- **Escalabilidade**: Funciona para N1→N2, mas pode ser estendido para N2→N3 no futuro
- **UX**: Tooltip lateral (`side="right"`) evita cobrir o card principal

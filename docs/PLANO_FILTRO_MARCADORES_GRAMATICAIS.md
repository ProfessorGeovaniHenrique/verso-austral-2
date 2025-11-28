# Plano de Implementação: Filtro "Desconsiderar Marcadores Gramaticais"

## 🎯 Objetivo
Permitir que usuários visualizem **apenas domínios semânticos temáticos**, removendo o domínio **MG (Marcadores Gramaticais)** das análises, já que MG não apresenta conteúdo temático e tende a ser super-representado em qualquer corpus.

---

## 📊 Problema Identificado

### Contexto
- **MG** (Marcadores Gramaticais) inclui: artigos, preposições, conjunções, pronomes
- Em qualquer corpus linguístico, MG representa **40-60% das palavras** (fenômeno universal)
- MG não carrega conteúdo temático relevante para análise estilística/semântica
- Usuários precisam focar nos **domínios temáticos** para interpretação significativa

### Impacto Atual
1. **Aba Domínios**: MG domina as métricas de peso textual
2. **Aba Estatísticas**: Tabela de palavras poluída com artigos/preposições
3. **Aba Visualizações**: 
   - Nuvem de domínios: "MG" aparece gigante, ofuscando domínios temáticos
   - Palavras-chave: muitas são marcadores gramaticais
4. **Quiz**: Perguntas podem focar erroneamente em MG ao invés de temas relevantes

---

## 🛠️ Solução Proposta: Filtro de Exclusão de MG

### Fase 1: Backend - Edge Function `process-corpus-analysis`
**Duração**: 1 hora

#### 1.1 Modificar parâmetros da função (15 min)
```typescript
// Adicionar parâmetro opcional
interface ProcessCorpusRequest {
  studyMode: 'complete' | 'artist' | 'song';
  studyArtist?: string;
  studySong?: string;
  referenceCorpus: string;
  nivel?: number; // Já existe
  excludeGrammaticalMarkers?: boolean; // NOVO - default: false
}
```

#### 1.2 Implementar filtro na query (30 min)
```typescript
// No Edge Function, após buscar tagsets
let tagsetQuery = supabase
  .from('semantic_tagset')
  .select('codigo, nome, cor, nivel_profundidade')
  .eq('nivel_profundidade', nivel)
  .eq('status', 'ativo');

// NOVO: Filtrar MG se solicitado
if (excludeGrammaticalMarkers) {
  tagsetQuery = tagsetQuery.neq('codigo_nivel_1', 'MG');
}

const { data: tagsets } = await tagsetQuery;
```

#### 1.3 Recalcular percentuais após exclusão (15 min)
```typescript
// Após filtrar MG, recalcular percentuais temáticos
const totalPalavrasTemáticas = dominiosFiltrados
  .reduce((sum, d) => sum + d.ocorrencias, 0);

dominiosFiltrados = dominiosFiltrados.map(d => ({
  ...d,
  percentual: (d.ocorrencias / totalPalavrasTemáticas) * 100
}));
```

---

### Fase 2: Frontend - Componente de Controle do Filtro
**Duração**: 1 hora

#### 2.1 Adicionar estado no contexto (15 min)
```typescript
// src/contexts/DashboardAnaliseContext.tsx
interface ProcessamentoData {
  // ... campos existentes
  excludeGrammaticalMarkers: boolean; // NOVO
}

const initialData: ProcessamentoData = {
  // ... valores existentes
  excludeGrammaticalMarkers: false, // Default: incluir MG
};
```

#### 2.2 Criar componente Switch de filtro (30 min)
```tsx
// src/components/analise/GrammaticalMarkersFilter.tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function GrammaticalMarkersFilter({ 
  value, 
  onChange 
}: {
  value: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="exclude-mg" className="font-semibold">
            Desconsiderar Marcadores Gramaticais
          </Label>
          <p className="text-xs text-muted-foreground">
            Exclui artigos, preposições e conjunções da análise temática
          </p>
        </div>
        <Switch
          id="exclude-mg"
          checked={value}
          onCheckedChange={onChange}
        />
      </div>
    </Card>
  );
}
```

#### 2.3 Integrar na TabProcessamento (15 min)
```tsx
// src/components/mvp/TabProcessamento.tsx
import { GrammaticalMarkersFilter } from '@/components/analise/GrammaticalMarkersFilter';

// Adicionar antes do botão "Processar Corpus"
<GrammaticalMarkersFilter
  value={processamentoData.excludeGrammaticalMarkers}
  onChange={(checked) => 
    updateProcessamentoData({ excludeGrammaticalMarkers: checked })
  }
/>
```

---

### Fase 3: Atualizar Hook de Processamento
**Duração**: 30 min

```typescript
// src/hooks/useCorpusProcessing.ts
export function useCorpusProcessing() {
  const { processamentoData, updateProcessamentoData } = useDashboardAnaliseContext();

  const processCorpus = async (
    studySong: string,
    referenceCorpus: string,
    nivel: number = 1
  ) => {
    // ... código existente

    const { data, error } = await supabase.functions.invoke('process-corpus-analysis', {
      body: {
        studyMode: processamentoData.studyMode,
        studyArtist: processamentoData.studyArtist,
        studySong,
        referenceCorpus,
        nivel,
        excludeGrammaticalMarkers: processamentoData.excludeGrammaticalMarkers // NOVO
      }
    });

    // ... resto do código
  };
}
```

---

### Fase 4: Refinar Quiz para Ignorar MG
**Duração**: 45 min

#### 4.1 Filtrar domínios MG no gerador de perguntas (30 min)
```typescript
// src/data/quizQuestionsInterpretacao.ts
export function generateInterpretationQuestions(
  dominios: DomainData[],
  keywords: KeywordData[]
): QuizQuestion[] {
  // NOVO: Filtrar MG antes de gerar perguntas
  const dominiosTemáticos = dominios.filter(d => 
    !d.codigo.startsWith('MG')
  );

  const questions: QuizQuestion[] = [];

  // Q1: Domínio com maior peso textual (excluindo MG)
  if (dominiosTemáticos.length >= 3) {
    const sortedByPercentual = [...dominiosTemáticos]
      .sort((a, b) => b.percentual - a.percentual);
    // ... resto da lógica
  }

  // Q2: Log-Likelihood (apenas domínios temáticos)
  const highLL = dominiosTemáticos.find(d => d.avgLL > 10);
  // ... resto da lógica

  // Q3: Riqueza Lexical (apenas domínios temáticos)
  const highRiqueza = [...dominiosTemáticos]
    .sort((a, b) => b.riquezaLexical - a.riquezaLexical)[0];
  // ... resto da lógica

  return questions.slice(0, 3);
}
```

#### 4.2 Adicionar aviso no quiz sobre MG (15 min)
```tsx
// src/components/analise/TabQuizInterpretacao.tsx
<Alert className="mb-4">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    <strong>Nota:</strong> As perguntas focam em domínios temáticos. 
    Marcadores Gramaticais (artigos, preposições) são automaticamente 
    excluídos por não carregarem conteúdo semântico relevante.
  </AlertDescription>
</Alert>
```

---

### Fase 5: Indicadores Visuais de Filtro Ativo
**Duração**: 30 min

#### 5.1 Badge indicador quando filtro ativo (15 min)
```tsx
// Em cada aba (Domínios, Estatísticas, Visualizações)
{processamentoData.excludeGrammaticalMarkers && (
  <Badge variant="secondary" className="gap-2">
    <FilterX className="h-3 w-3" />
    MG Excluídos
  </Badge>
)}
```

#### 5.2 Atualizar descrições dos cards (15 min)
```tsx
// src/components/analise/TabDominios.tsx
<CardDescription>
  {processamentoData.excludeGrammaticalMarkers
    ? 'Distribuição temática sem marcadores gramaticais'
    : 'Distribuição de todos os domínios semânticos'
  }
</CardDescription>
```

---

## 📋 Checklist de Implementação

### Backend
- [ ] Adicionar parâmetro `excludeGrammaticalMarkers` ao edge function
- [ ] Implementar filtro `.neq('codigo_nivel_1', 'MG')` na query
- [ ] Recalcular percentuais após exclusão
- [ ] Testar com corpus real (Quando o Verso)

### Frontend - Controle
- [ ] Criar componente `GrammaticalMarkersFilter.tsx`
- [ ] Integrar switch na `TabProcessamento`
- [ ] Adicionar estado no `DashboardAnaliseContext`
- [ ] Persistir escolha no localStorage

### Frontend - Visualizações
- [ ] Adicionar badges indicadores em todas as abas
- [ ] Atualizar descrições dos cards
- [ ] Testar reprocessamento ao ativar/desativar filtro

### Quiz
- [ ] Filtrar `dominios.filter(d => !d.codigo.startsWith('MG'))`
- [ ] Adicionar aviso explicativo no quiz
- [ ] Validar perguntas geradas (devem focar em temas)

### Testes de Validação
- [ ] **Sem filtro**: MG deve aparecer com ~45% de peso textual
- [ ] **Com filtro**: MG completamente ausente, percentuais recalculados
- [ ] **Quiz**: perguntas sobre Natureza, Cultura, Sentimentos (não MG)
- [ ] **Nuvem**: domínios temáticos em destaque sem MG gigante

---

## 🎯 Resultado Esperado

### Antes (MG incluído)
- **Domínios visíveis**: MG (45%), Natureza (15%), Cultura (12%), ...
- **Nuvem**: "MG" ocupa 50% do espaço visual
- **Quiz**: "Qual domínio tem maior peso?" → MG (óbvio demais)

### Depois (MG excluído)
- **Domínios visíveis**: Natureza (27%), Cultura (22%), Sentimentos (18%), ...
- **Nuvem**: Domínios temáticos em destaque proporcional
- **Quiz**: "Qual domínio tem maior peso?" → Natureza vs Cultura (interpretativo)

---

## ⏱️ Estimativa Total de Tempo

| Fase | Duração |
|------|---------|
| 1. Backend (Edge Function) | 1h |
| 2. Frontend (Componente Filtro) | 1h |
| 3. Hook de Processamento | 30min |
| 4. Refinar Quiz | 45min |
| 5. Indicadores Visuais | 30min |
| **TOTAL** | **3h 45min** |

---

## 🔗 Dependências
- ✅ Sistema de níveis hierárquicos (N1-N4) já implementado
- ✅ Edge function `process-corpus-analysis` já existente
- ✅ DashboardAnaliseContext já gerencia estado
- 🆕 Componente Switch do Shadcn (já disponível)

---

## 📚 Referências Científicas

O filtro de Marcadores Gramaticais é prática comum em Linguística de Corpus:

1. **Scott, M. (2020).** *WordSmith Tools*. Stopword lists para filtrar função gramatical.
2. **Anthony, L. (2019).** *AntConc*. Exclusão de palavras gramaticais em keyword analysis.
3. **Baker, P. (2006).** *Using Corpora in Discourse Analysis*. Cap. 4: Semantic vs. Grammatical.

> **Justificativa Acadêmica**: Marcadores gramaticais (MG) são semanticamente vazios (Stubbs, 1996). Sua alta frequência é fenômeno universal, não característica estilística. Análises temáticas devem focar em conteúdo lexical (Scott & Tribble, 2006).

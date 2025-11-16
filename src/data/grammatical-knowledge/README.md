# Base de Conhecimento Gramatical

Estruturas de dados que consolidam regras morfossintáticas do **Português Brasileiro** para suporte ao sistema de anotação POS (Part-of-Speech) e análise linguística.

## 📚 Estrutura

### `verbal-morphology.ts`
- Padrões de conjugação regular (-ar, -er, -ir)
- 15+ verbos irregulares mais frequentes (ser, estar, ter, ir, fazer, etc.)
- Classes acionais (aspecto lexical)
- Verbos de ligação e auxiliares
- Mapa de lematização rápida

### `nominal-morphology.ts`
- Regras de formação de plural
- Marcadores de gênero
- Sufixos nominalizadores
- Substantivos coletivos
- Vocabulário regional gauchesco

### `adjectival-patterns.ts`
- Padrões de flexão de gênero
- Adjetivos uniformes (invariáveis)
- Graus comparativo e superlativo
- Sufixos adjetivais
- Adjetivos de cores

### `adverbial-patterns.ts`
- Formação com sufixo -mente
- Classificação semântica (tempo, lugar, modo, intensidade)
- Locuções adverbiais
- Graus do advérbio

### `pronoun-system.ts`
- Pronomes pessoais (retos, oblíquos, de tratamento)
- Pronomes possessivos
- Pronomes demonstrativos
- Pronomes indefinidos, relativos, interrogativos
- Variação regional (tu/você, a gente/nós)

### `semantic-categories.ts`
- Categorias semânticas (dêixis, predicação, verificação, modalização)
- Traços semânticos ([+animado], [+humano], [+concreto])
- Domínios temáticos (natureza, trabalho, cultura gaúcha)
- Relações semânticas (sinonímia, antonímia, hiponímia)
- Prosódia semântica (avaliação positiva/negativa)

## 🎯 Uso no Sistema

### 1. Anotação POS
```typescript
import { irregularVerbs, conjugatedToInfinitive } from '@/data/grammatical-knowledge';

// Lematização de verbo irregular
const lemma = conjugatedToInfinitive['fiz']; // → 'fazer'
```

### 2. Análise Morfológica
```typescript
import { pluralRules } from '@/data/grammatical-knowledge';

// Identificar padrão de plural
const word = 'canções';
const rule = pluralRules.find(r => word.match(r.pattern));
// → regra: ão → ões
```

### 3. Classificação Semântica
```typescript
import { thematicDomains } from '@/data/grammatical-knowledge';

// Identificar domínio temático
if (thematicDomains.cultura_gaucha.includes(palavra)) {
  domain = 'CULTURA_GAUCHA';
}
```

## 📊 Cobertura Atual

| Categoria | Cobertura | Status |
|-----------|-----------|--------|
| Verbos regulares | 100% | ✅ Completo |
| Verbos irregulares | 15+ formas | ✅ Essenciais |
| Substantivos | Regras principais | ✅ Completo |
| Adjetivos | Padrões gerais | ✅ Completo |
| Advérbios | Classificação completa | ✅ Completo |
| Pronomes | Sistema completo | ✅ Completo |
| Semântica | Categorias principais | ✅ Completo |

## 🚀 Próximas Expansões

- [ ] Adicionar mais verbos irregulares (30+)
- [ ] Regras de derivação morfológica
- [ ] Padrões de concordância nominal/verbal
- [ ] Regras de regência verbal e nominal
- [ ] Análise de colocações e expressões fixas

## 🔄 Integração com POS Tagger

Os arquivos desta pasta são usados por:
- `supabase/functions/annotate-pos/index.ts` - Anotação morfossintática
- `src/services/posAnnotationService.ts` - Serviço de anotação
- `src/components/advanced/TabGrammarRules.tsx` - Dashboard de regras (futuro)

## 📖 Referências

Esta base de conhecimento consolida regras linguísticas amplamente documentadas do português brasileiro, compiladas a partir de conhecimento linguístico geral e análise de corpora.

## 🤝 Como Contribuir

1. Identifique lacuna no POS tagging (palavra não reconhecida)
2. Adicione regra/padrão no arquivo apropriado
3. Teste com corpus gaúcho
4. Documente exemplos

---

**Última atualização**: 2025-11-16  
**Versão**: 1.0.0

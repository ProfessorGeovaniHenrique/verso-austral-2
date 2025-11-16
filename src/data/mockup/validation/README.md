# 🧪 Sistema de Testes Automatizados do Corpus Master

Este diretório contém o sistema completo de validação e testes automatizados para garantir a integridade dos dados do corpus gaúcho.

## 📋 Estrutura

```
validation/
├── README.md                 # Este arquivo
├── auditCorpusData.ts       # Script de auditoria de dados
└── corpusTests.ts           # Suite completa de testes automatizados
```

## 🎯 Objetivo

Garantir que os dados do corpus master estejam sempre:
- **Completos**: Todas as palavras têm lema, domínio e prosódia
- **Consistentes**: Dados entre diferentes arquivos estão sincronizados
- **Válidos**: Frequências, estatísticas e classificações estão corretas
- **Íntegros**: Não há duplicatas, valores inválidos ou dados faltantes

## 🚀 Como Usar

### 1. Interface Visual (Recomendado)

Acesse a aba **"Testes"** no Dashboard MVP em `/dashboard-mvp`:

1. Navegue até a aba "Testes" (ícone de frasco 🧪)
2. Clique em "Executar Testes" para rodar todos os testes
3. Visualize os resultados organizados por categorias
4. Expanda os testes falhados para ver detalhes

### 2. Console do Navegador

Execute manualmente via console:

```typescript
import { runTestsWithConsoleOutput } from '@/data/mockup/validation/corpusTests';

// Executar todos os testes com output formatado
runTestsWithConsoleOutput();
```

### 3. Auditoria de Dados

Para uma análise detalhada de inconsistências:

```typescript
import { auditCorpusData } from '@/data/mockup/validation/auditCorpusData';

// Executar auditoria completa
const report = auditCorpusData();
console.log(report);
```

## 📊 Suites de Testes

### 1️⃣ Integridade de Dados Básicos
- ✅ Total de 142 palavras no corpus
- ✅ Todas as palavras têm lema definido
- ✅ Não há palavras duplicadas
- ✅ Todas as frequências são válidas (> 0)
- ✅ Consistência com frequenciaNormalizadaData

### 2️⃣ Consistência de Domínios
- ✅ Todas as palavras temáticas têm domínio
- ✅ Todos os domínios têm pelo menos 1 palavra
- ✅ Riqueza lexical corresponde ao número de lemas
- ✅ Palavras de domínios existem no corpus

### 3️⃣ Integridade de Prosódia
- ✅ Todas as palavras temáticas têm prosódia
- ✅ Prosódia é Positiva/Negativa/Neutra
- ✅ Lemas estão em prosodiasLemasMap
- ✅ Estatísticas de prosódia somam ~100%

### 4️⃣ Dados Estatísticos
- ✅ Palavras de alta significância têm LL > 0
- ✅ Palavras funcionais têm LL = 0
- ✅ Significância é válida (Alta/Média/Baixa/Funcional)

### 5️⃣ Métricas do Corpus
- ✅ Proporção de palavras temáticas (50-90%)
- ✅ Distribuição de prosódia equilibrada (< 80% de uma só)
- ✅ Número de domínios razoável (5-15)

## 🔍 Tipos de Status

- **✅ Passou**: Teste passou com sucesso
- **❌ Falhou**: Teste falhou - requer correção imediata
- **⚠️ Aviso**: Teste passou mas há algo para revisar

## 🛠️ Adicionar Novos Testes

Para adicionar um novo teste:

1. Abra `corpusTests.ts`
2. Crie uma nova função de teste seguindo o padrão:

```typescript
function testMinhaNovaSuite(): TestSuite {
  const tests: TestResult[] = [];
  
  // Teste 1
  tests.push({
    id: 'meu-teste-id',
    name: 'Nome do meu teste',
    status: condicao ? 'passed' : 'failed',
    message: condicao ? '✓ Mensagem sucesso' : '✗ Mensagem falha',
    details: { dados: 'relevantes' },
    timestamp: new Date()
  });
  
  return createSuite('Minha Nova Suite', tests);
}
```

3. Adicione à função `runAllTests()`:

```typescript
export function runAllTests(): TestSuite[] {
  const suites: TestSuite[] = [
    testDataIntegrity(),
    testDomainConsistency(),
    testProsodyIntegrity(),
    testStatisticalData(),
    testCorpusMetrics(),
    testMinhaNovaSuite() // <- Adicionar aqui
  ];
  
  return suites;
}
```

## 📈 Boas Práticas

1. **Execute os testes antes de commits importantes**
2. **Corrija falhas imediatamente** - dados incorretos propagam erros
3. **Revise avisos periodicamente** - podem indicar problemas futuros
4. **Adicione testes** quando encontrar bugs novos
5. **Documente** testes complexos com comentários

## 🔄 Integração Contínua

Os testes são executados automaticamente:
- ✅ Ao carregar a aba "Testes" no Dashboard MVP
- ✅ Ao importar o corpus master (logs no console)
- ✅ Ao executar a auditoria de dados

## 🐛 Debugging

Se um teste falhar:

1. **Veja os detalhes** expandindo o teste na interface
2. **Verifique o console** para logs completos
3. **Execute a auditoria** para análise detalhada:
   ```typescript
   auditCorpusData()
   ```
4. **Corrija os dados** nos arquivos fonte apropriados
5. **Re-execute os testes** para confirmar a correção

## 📝 Notas Importantes

- Os testes **não modificam dados**, apenas validam
- Falhas indicam **inconsistências reais** que devem ser corrigidas
- Avisos são **sugestões** de melhoria, não erros críticos
- Todos os testes rodam em **< 1 segundo**

## 🎓 Arquitetura

```
corpusTests.ts
├── runAllTests()           # Executa todas as suites
├── testDataIntegrity()     # Suite 1
├── testDomainConsistency() # Suite 2
├── testProsodyIntegrity()  # Suite 3
├── testStatisticalData()   # Suite 4
└── testCorpusMetrics()     # Suite 5

auditCorpusData.ts
└── auditCorpusData()       # Análise detalhada de inconsistências
```

## 📚 Referências

- **Corpus Master**: `src/data/mockup/corpus-master.ts`
- **Tipos**: `src/data/types/corpus.types.ts`
- **Interface Visual**: `src/components/mvp/TabValidation.tsx`

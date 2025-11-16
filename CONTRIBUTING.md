# 🤝 Guia de Contribuição

Obrigado por contribuir com a Plataforma de Análise Cultural! Este guia ajudará você a começar.

## 📋 Índice

- [Configuração do Ambiente](#configuração-do-ambiente)
- [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Commits e PRs](#commits-e-prs)
- [Testes](#testes)
- [Documentação](#documentação)

## 🚀 Configuração do Ambiente

### 1. Fork e Clone

```bash
# Fork no GitHub primeiro

# Clone seu fork
git clone https://github.com/SEU-USUARIO/seu-repo.git
cd seu-repo

# Adicionar upstream
git remote add upstream https://github.com/ORIGINAL/seu-repo.git
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Husky (Git Hooks)

```bash
# Executar script de setup
chmod +x scripts/setup-husky.sh
./scripts/setup-husky.sh

# Ou manualmente
npx husky install
chmod +x .husky/*
```

**IMPORTANTE:** Os hooks do Husky executarão automaticamente:
- **Pre-commit:** Auditoria rápida (~5s)
- **Pre-push:** Testes completos (~30s)
- **Commit-msg:** Validação de formato

### 4. Verificar Setup

```bash
# Testar que tudo funciona
npm run dev           # Deve iniciar servidor
npm run test:corpus   # Deve executar testes
```

## 🔄 Fluxo de Desenvolvimento

### 1. Criar Branch

```bash
# Sempre parta de main atualizada
git checkout main
git pull upstream main

# Criar branch descritiva
git checkout -b feat/minha-nova-feature
# ou
git checkout -b fix/corrigir-bug-especifico
```

**Convenção de nomes de branches:**
- `feat/` - Nova funcionalidade
- `fix/` - Correção de bug
- `docs/` - Documentação
- `refactor/` - Refatoração
- `test/` - Adicionar/corrigir testes
- `chore/` - Manutenção

### 2. Desenvolver

```bash
# Fazer mudanças
# Testar localmente
npm run dev

# Executar testes (recomendado antes de commit)
npm run test:corpus:audit
```

### 3. Commit

```bash
# Stage mudanças
git add .

# Commit (hooks executam automaticamente)
git commit -m "feat: adicionar visualização de prosódia"

# Se hooks falharem, corrija e tente novamente
```

**Formato obrigatório (Conventional Commits):**
```
<tipo>(<escopo opcional>): <descrição>

Exemplos:
feat: adicionar análise de n-grams
fix(corpus): corrigir lema duplicado
docs: atualizar guia de instalação
refactor(stats): simplificar cálculo de frequência
```

### 4. Push

```bash
# Push para seu fork (hooks executam novamente)
git push origin feat/minha-nova-feature
```

### 5. Criar Pull Request

1. Vá ao repositório original no GitHub
2. Clique em "New Pull Request"
3. Selecione sua branch
4. Preencha o template (veja abaixo)
5. Aguarde review

## 📝 Template de Pull Request

```markdown
## 🎯 Objetivo

[Descreva o que este PR faz e por quê]

## 🔧 Mudanças

- [ ] Mudança 1
- [ ] Mudança 2
- [ ] Mudança 3

## 🧪 Testes

- [ ] Todos os testes passam localmente
- [ ] Adicionei testes para novas funcionalidades
- [ ] Testei manualmente no navegador

## 📸 Screenshots (se aplicável)

[Adicionar imagens ou GIFs das mudanças visuais]

## 📚 Documentação

- [ ] Documentação atualizada (se necessário)
- [ ] README atualizado (se necessário)
- [ ] Comentários no código para lógica complexa

## ✅ Checklist Final

- [ ] Código segue os padrões do projeto
- [ ] Commits seguem Conventional Commits
- [ ] Testes passam no CI/CD
- [ ] Sem conflitos com main
- [ ] Branch está atualizada com main
```

## 💻 Padrões de Código

### TypeScript

```typescript
// ✅ BOM: Tipos explícitos e descritivos
interface PalavraCorpus {
  palavra: string;
  lema: string;
  frequencia: number;
  dominio: string;
}

function processarPalavra(palavra: PalavraCorpus): string {
  return palavra.lema.toLowerCase();
}

// ❌ RUIM: Any e nomes genéricos
function process(data: any): any {
  return data.x;
}
```

### React Components

```typescript
// ✅ BOM: Componente funcional com tipos
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

// ❌ RUIM: Props sem tipo
export function Button(props) {
  return <button>{props.text}</button>;
}
```

### Estrutura de Arquivos

```
src/
├── components/       # Componentes reutilizáveis
│   ├── ui/          # Componentes base (shadcn)
│   └── mvp/         # Componentes específicos
├── data/            # Dados e tipos
│   ├── mockup/      # Dados de teste
│   └── types/       # Definições TypeScript
├── hooks/           # Custom hooks
├── lib/             # Funções utilitárias
└── pages/           # Páginas/rotas
```

### Nomenclatura

- **Componentes:** PascalCase (`TabStatistics.tsx`)
- **Hooks:** camelCase com prefixo "use" (`useCorpusData.ts`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_WORDS = 1000`)
- **Types/Interfaces:** PascalCase (`DominioSemantico`)

### Estilo (Tailwind + Shadcn)

```typescript
// ✅ BOM: Classes semânticas e responsivas
<div className="card-academic">
  <h2 className="section-header-academic">Título</h2>
  <p className="section-description-academic">Descrição</p>
</div>

// ❌ RUIM: Classes inline genéricas
<div className="bg-white p-4 rounded">
  <h2 className="text-xl font-bold">Título</h2>
</div>
```

## 🧪 Testes

### Executar Testes

```bash
# Auditoria rápida
npm run test:corpus:audit

# Suite completa
npm run test:corpus

# Gerar relatório HTML
npm run test:corpus:report
open test-reports/latest-report.html
```

### Adicionar Novos Testes

Edite `src/data/mockup/validation/corpusTests.ts`:

```typescript
function testMinhaNovaSuite(): TestSuite {
  const tests: TestResult[] = [];
  
  tests.push({
    id: 'meu-teste',
    name: 'Nome do Teste',
    status: condicao ? 'passed' : 'failed',
    message: condicao ? '✓ Sucesso' : '✗ Falha',
    details: { info: 'relevante' },
    timestamp: new Date()
  });
  
  return createSuite('Minha Suite', tests);
}
```

## 📚 Documentação

### Comentários no Código

```typescript
// ✅ BOM: Comentário útil
/**
 * Calcula a frequência normalizada por 1000 palavras
 * @param frequenciaBruta - Número bruto de ocorrências
 * @param totalPalavras - Total de palavras no corpus
 * @returns Frequência normalizada
 */
function calcularFrequenciaNormalizada(
  frequenciaBruta: number, 
  totalPalavras: number
): number {
  return (frequenciaBruta / totalPalavras) * 1000;
}

// ❌ RUIM: Comentário óbvio ou desnecessário
// Retorna o valor
function getValue() {
  return value; // retorna o valor
}
```

### README e Docs

Ao adicionar features importantes, atualize:
- `README.md` - Visão geral do projeto
- Documentação específica na pasta `.github/`
- Comentários JSDoc para funções públicas

## 🚨 Troubleshooting

### Hooks do Husky não executam

```bash
# Reinstalar
rm -rf .husky
npx husky install
chmod +x .husky/*
```

### Testes falhando localmente

```bash
# Ver detalhes completos
npm run test:corpus

# Ver apenas problemas
npm run test:corpus:audit
```

### Conflitos com main

```bash
# Atualizar sua branch
git checkout main
git pull upstream main
git checkout sua-branch
git rebase main

# Resolver conflitos
# Depois:
git rebase --continue
git push origin sua-branch --force-with-lease
```

### CI/CD falhando no GitHub

1. Ver logs detalhados no GitHub Actions
2. Reproduzir localmente: `npm run test:corpus`
3. Corrigir problemas
4. Push novamente

## 🎯 Boas Práticas

### DOs ✅

- ✅ Testar localmente antes de push
- ✅ Escrever mensagens de commit descritivas
- ✅ Manter PRs pequenos e focados
- ✅ Documentar mudanças complexas
- ✅ Pedir review quando necessário
- ✅ Responder feedback construtivamente
- ✅ Manter código limpo e legível

### DON'Ts ❌

- ❌ Fazer commits enormes com muitas mudanças
- ❌ Usar `--no-verify` sem necessidade real
- ❌ Ignorar falhas de testes
- ❌ Fazer push direto para main
- ❌ Deixar conflitos sem resolver
- ❌ Adicionar código comentado/debug
- ❌ Commitar arquivos de configuração pessoal

## 🏆 Reconhecimento

Contribuidores são reconhecidos:
- Na seção de créditos do README
- No histórico de commits do projeto
- Como co-autores em PRs colaborativos

## 📞 Suporte

Dúvidas ou problemas?

1. Verifique documentação em `.github/`
2. Procure issues similares no GitHub
3. Abra uma issue com detalhes
4. Entre em contato com mantenedores

## 🔗 Links Úteis

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Guia de Deploy](.github/DEPLOYMENT_GUIDE.md)
- [Setup do Husky](.husky/SETUP_GUIDE.md)
- [Testes](src/data/mockup/validation/README.md)

---

**Obrigado por contribuir!** 🙏

Juntos estamos construindo uma ferramenta incrível para análise linguística e cultural.

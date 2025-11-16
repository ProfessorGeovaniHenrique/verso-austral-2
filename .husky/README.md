# 🐶 Husky Git Hooks

Sistema de validação automática local que executa antes de commits e pushes.

## 🎯 Hooks Configurados

### 1. Pre-Commit Hook
**Arquivo:** `.husky/pre-commit`

**O que faz:**
- Executa auditoria rápida do corpus
- Valida integridade básica dos dados
- Bloqueia commit se houver problemas críticos

**Duração:** ~5 segundos

**Quando executa:**
```bash
git commit -m "sua mensagem"
```

### 2. Pre-Push Hook
**Arquivo:** `.husky/pre-push`

**O que faz:**
- Executa suite completa de testes
- Valida integridade total do corpus
- Bloqueia push se testes falharem

**Duração:** ~30 segundos

**Quando executa:**
```bash
git push origin sua-branch
```

### 3. Commit-Msg Hook
**Arquivo:** `.husky/commit-msg`

**O que faz:**
- Valida formato da mensagem de commit
- Garante uso de Conventional Commits
- Bloqueia commit com mensagem inválida

**Formato esperado:**
```
<tipo>(<escopo opcional>): <descrição>

Exemplos:
feat: adicionar visualização 3D
fix(corpus): corrigir lema duplicado
docs: atualizar guia de instalação
```

## ⚙️ Instalação

### Configuração Automática

```bash
# Executar script de setup
chmod +x scripts/setup-husky.sh
./scripts/setup-husky.sh
```

### Configuração Manual

```bash
# 1. Instalar Husky
npm install husky --save-dev

# 2. Inicializar
npx husky install

# 3. Tornar hooks executáveis
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
```

## 🚀 Como Usar

### Fluxo Normal

```bash
# 1. Fazer mudanças
vim src/data/mockup/corpus-master.ts

# 2. Adicionar ao stage
git add .

# 3. Commit (hook pre-commit executa automaticamente)
git commit -m "feat: adicionar novas palavras"

# 4. Push (hook pre-push executa automaticamente)
git push origin feature/minhas-mudancas
```

### Saída Esperada

#### Pre-Commit (Sucesso)
```
🔍 Executando validação pré-commit...

📊 Auditando integridade do corpus...
✓ Corpus contém 142 palavras
✓ Todos os lemas definidos
✓ Nenhuma duplicata
✓ Frequências válidas

✅ Auditoria passou! Commit permitido.
```

#### Pre-Commit (Falha)
```
🔍 Executando validação pré-commit...

📊 Auditando integridade do corpus...
✗ 3 palavras sem lema: palavra1, palavra2, palavra3

❌ Auditoria falhou! Commit bloqueado.

🔧 Para corrigir:
   1. Revise os erros acima
   2. Corrija os dados do corpus
   3. Execute: npm run test:corpus:audit
   4. Tente commitar novamente

⚠️  Para bypass (emergência): git commit --no-verify
```

## 🆘 Bypass (Emergências)

### Quando Usar Bypass

Use **APENAS** em situações de emergência:
- Commit urgente de hotfix
- Problema temporário nos testes
- Commit de work-in-progress em branch pessoal

### Como Fazer Bypass

```bash
# Bypass pre-commit e commit-msg
git commit --no-verify -m "hotfix: corrigir bug crítico"

# Bypass pre-push
git push --no-verify origin main
```

### ⚠️ ATENÇÃO
- Bypass **NÃO** desabilita CI/CD no GitHub
- Testes ainda serão executados remotamente
- Deploy pode ser bloqueado mesmo com bypass local

## 🔧 Configurações Avançadas

### Desabilitar Husky Globalmente

```bash
# Método 1: Variável de ambiente
export HUSKY=0
git commit -m "mensagem"

# Método 2: Adicionar ao ~/.bashrc ou ~/.zshrc
echo 'export HUSKY=0' >> ~/.bashrc
```

### Desabilitar Hook Específico

```bash
# Renomear arquivo do hook
mv .husky/pre-commit .husky/pre-commit.disabled

# Para reativar
mv .husky/pre-commit.disabled .husky/pre-commit
```

### Ajustar Timeout

Para projetos grandes, ajuste o timeout:

```bash
# Editar .husky/pre-push
# Adicionar timeout antes do comando
timeout 60 npm run test:corpus
```

### Debug Mode

```bash
# Ativar debug do Husky
export HUSKY_DEBUG=1
git commit -m "test"
```

## 📊 Tipos de Commit (Conventional Commits)

### Tipos Obrigatórios

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat: adicionar análise de sentimento` |
| `fix` | Correção de bug | `fix: corrigir cálculo de frequência` |
| `docs` | Documentação | `docs: atualizar README` |
| `style` | Formatação | `style: aplicar prettier` |
| `refactor` | Refatoração | `refactor: simplificar TabStatistics` |
| `test` | Testes | `test: adicionar teste de prosódia` |
| `chore` | Manutenção | `chore: atualizar dependências` |
| `perf` | Performance | `perf: otimizar renderização 3D` |
| `ci` | CI/CD | `ci: ajustar workflow do GitHub` |
| `build` | Build | `build: configurar Vite` |
| `revert` | Reverter | `revert: desfazer commit abc123` |

### Exemplos Válidos

```bash
# Com escopo
git commit -m "feat(corpus): adicionar 10 novas palavras"
git commit -m "fix(validation): corrigir teste de prosódia"
git commit -m "docs(api): documentar endpoints REST"

# Sem escopo
git commit -m "feat: implementar dashboard de métricas"
git commit -m "fix: resolver bug de renderização"
git commit -m "docs: adicionar guia de contribuição"

# Com breaking change
git commit -m "feat!: mudar estrutura de dados do corpus"
git commit -m "refactor!: renomear interface principal"
```

### Exemplos Inválidos

```bash
# ❌ Sem tipo
git commit -m "adicionar nova feature"

# ❌ Tipo inválido
git commit -m "feature: nova funcionalidade"

# ❌ Sem descrição
git commit -m "feat:"

# ❌ Descrição muito curta
git commit -m "feat: add"
```

## 🧪 Testar Hooks

### Testar Pre-Commit

```bash
# Fazer mudança de teste
echo "test" >> test.txt
git add test.txt

# Testar commit (sem realmente commitar)
git commit -m "test: validar hook" --dry-run

# Ou commitar de verdade
git commit -m "test: validar hook"

# Limpar
git reset HEAD~1
rm test.txt
```

### Testar Pre-Push

```bash
# Criar branch de teste
git checkout -b test-hooks

# Fazer commit
git commit --allow-empty -m "test: commit vazio"

# Testar push
git push origin test-hooks

# Limpar
git checkout main
git branch -D test-hooks
git push origin --delete test-hooks
```

### Testar Commit-Msg

```bash
# Mensagem inválida (deve falhar)
git commit --allow-empty -m "mensagem sem tipo"

# Mensagem válida (deve passar)
git commit --allow-empty -m "test: validar formato"
```

## 📈 Monitoramento

### Ver Execuções dos Hooks

Hooks são registrados no histórico do Git:

```bash
# Ver últimos commits com status
git log --oneline -10

# Ver detalhes de um commit
git show <commit-hash>
```

### Estatísticas

```bash
# Commits nos últimos 30 dias
git log --since="30 days ago" --oneline | wc -l

# Commits por tipo
git log --pretty=format:"%s" | grep -E "^(feat|fix|docs)" | sort | uniq -c
```

## 🐛 Troubleshooting

### Problema: "command not found: npm"

**Solução:**
```bash
# Adicionar npm ao PATH do hook
echo 'export PATH="$PATH:/usr/local/bin"' > .husky/_/env.sh
```

### Problema: Hooks não executam

**Verificar:**
```bash
# 1. Husky está inicializado?
ls -la .husky

# 2. Hooks têm permissão de execução?
ls -l .husky/pre-commit

# 3. Git core.hooksPath está configurado?
git config core.hooksPath
```

**Corrigir:**
```bash
npx husky install
chmod +x .husky/*
```

### Problema: Scripts npm não encontrados

**Adicionar ao package.json:**
```json
{
  "scripts": {
    "test:corpus:audit": "tsx scripts/audit-corpus.ts",
    "test:corpus": "tsx scripts/test-corpus-ci.ts"
  }
}
```

### Problema: Testes muito lentos

**Otimizar:**
```bash
# Usar apenas auditoria no pre-commit
# (já configurado por padrão)

# Ou desabilitar pre-push se necessário
mv .husky/pre-push .husky/pre-push.disabled
```

## 🔐 Segurança

### Hooks não executam em:
- ✅ Commits de merge automáticos
- ✅ Commits de rebase
- ✅ Commits com `--no-verify`

### Hooks sempre executam em:
- ✅ `git commit`
- ✅ `git push`
- ✅ `git commit --amend`

## 📚 Recursos

- [Husky Docs](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Hooks](https://git-scm.com/docs/githooks)

## 🆘 Suporte

Problemas com hooks?

1. Ver troubleshooting acima
2. Executar: `./scripts/setup-husky.sh`
3. Verificar logs com `HUSKY_DEBUG=1`
4. Consultar documentação

---

**Última atualização:** 2024
**Mantido por:** Equipe de Desenvolvimento

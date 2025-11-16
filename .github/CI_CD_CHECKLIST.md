# ✅ Checklist de Configuração CI/CD

Use este checklist para configurar completamente o sistema de CI/CD.

## 📋 Checklist Completo

### 1️⃣ Dependências (✅ Automático)
- [x] `tsx` instalado
- [x] `@types/node` instalado

### 2️⃣ Scripts NPM (⚠️ Manual Necessário)

Abra `package.json` e adicione na seção `"scripts"`:

```json
"typecheck": "tsc --noEmit",
"test:corpus": "tsx scripts/test-corpus-ci.ts",
"test:corpus:audit": "tsx scripts/audit-corpus.ts",
"test:corpus:report": "tsx scripts/generate-test-report.ts",
"test:corpus:report-html": "npm run test:corpus:report",
"version:bump": "tsx scripts/bump-version.ts",
"version:dry-run": "tsx scripts/bump-version.ts --dry-run",
"version:current": "cat VERSION",
"precommit": "npm run test:corpus:audit",
"predeploy": "npm run test:corpus"
```

**Testar:**
```bash
npm run test:corpus
# Deve executar os testes com sucesso
```

### 3️⃣ GitHub Integration (⚠️ Manual Necessário)

Se ainda não conectou ao GitHub:

1. **No Lovable:**
   - Clique em `GitHub` → `Connect to GitHub`
   - Autorize o Lovable GitHub App
   - Clique em `Create Repository`

2. **Aguardar Sync:**
   - Os arquivos `.github/workflows/` serão sincronizados automaticamente
   - Os workflows aparecerão na aba Actions do GitHub

**Verificar:**
- [ ] Repositório criado no GitHub
- [ ] Workflows visíveis em Actions
- [ ] Primeiro workflow executou com sucesso

### 4️⃣ Branch Protection (🔒 Recomendado)

No GitHub, vá em `Settings` → `Branches`:

1. **Add rule** para branch `main`
2. **Ativar:**
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
   - [x] Require branches to be up to date before merging
3. **Selecionar checks obrigatórios:**
   - [x] `quality-gate`
   - [x] `test-corpus`
4. **Salvar**

**Resultado:** Impossível fazer merge com testes falhando!

### 5️⃣ Testar Workflow (🧪 Verificação)

**Teste local primeiro:**
```bash
npm run test:corpus
npm run test:corpus:report
```

**Depois teste no GitHub:**
1. Criar nova branch: `git checkout -b test-ci`
2. Fazer pequena mudança
3. Commit e push
4. Ver workflow executar em Actions
5. Verificar que passou
6. Criar PR e ver comentário automático

### 6️⃣ Configurar Git Hooks Locais (🔒 Altamente Recomendado)

**Husky já está configurado!** Apenas execute:

```bash
chmod +x scripts/setup-husky.sh
./scripts/setup-husky.sh
```

**O que faz:**
- ✅ Executa testes antes de cada commit (~5s)
- ✅ Executa suite completa antes de push (~30s)
- ✅ Valida formato de mensagem de commit
- ✅ Bloqueia commit/push se houver falhas

[Ver documentação completa do Husky](../.husky/SETUP_GUIDE.md)

### 7️⃣ Configurações Adicionais (⚙️ Opcional)

#### Notificações por Email
- [ ] `Settings` → `Notifications` → Ativar para Actions

#### Secrets (se necessário)
- [ ] Adicionar secrets em `Settings` → `Secrets and variables` → `Actions`

#### Cache de Dependências (✅ Já Configurado)
- [x] Cache npm configurado nos workflows
- [x] Otimização de build ativa

## 🎯 Status Final

Após completar todos os itens:

- ✅ **Testes executam localmente**
- ✅ **Workflows no GitHub funcionam**
- ✅ **Branch protection ativo**
- ✅ **Deploy bloqueado em caso de falha**
- ✅ **Git hooks locais configurados (Husky)**
- ✅ **Validação em 3 camadas:** Local → CI → Deploy

## 📊 Verificação de Funcionamento

Execute este teste completo:

```bash
# 1. Testar localmente
npm run test:corpus

# 2. Fazer mudança intencional que quebre teste
# Editar src/data/mockup/corpus-master.ts
# Remover um lema de alguma palavra

# 3. Tentar commit
git add .
git commit -m "test: verificar bloqueio de CI"

# 4. Push
git push

# 5. Ver no GitHub Actions
# Workflow deve FALHAR ❌

# 6. Reverter mudança
git revert HEAD
git push

# 7. Ver no GitHub Actions
# Workflow deve PASSAR ✅
```

## 🆘 Problemas?

### Scripts não funcionam
1. Verificar se foram adicionados ao `package.json`
2. Rodar `npm install`
3. Verificar sintaxe JSON

### Workflows não executam
1. Verificar se repositório está conectado
2. Ver se arquivos `.github/workflows/` existem no GitHub
3. Verificar permissões do Lovable GitHub App

### Testes sempre falham
1. Executar localmente: `npm run test:corpus`
2. Ver detalhes do erro
3. Corrigir dados em `src/data/mockup/`
4. Re-executar testes

## 📚 Documentação Relacionada

- [Setup de Scripts](SETUP_SCRIPTS.md)
- [Guia de Deploy](DEPLOYMENT_GUIDE.md)
- [README de Validação](../src/data/mockup/validation/README.md)

---

**Última atualização:** 2024
**Tempo estimado de setup:** 15-20 minutos

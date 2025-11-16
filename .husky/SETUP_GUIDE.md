# 🚀 Guia Rápido de Setup - Husky

Configuração em **3 minutos**.

## ✅ Checklist de Setup

### Passo 1: Verificar Dependências (✅ Já Feito)

- [x] Husky instalado
- [x] tsx instalado
- [x] @types/node instalado

### Passo 2: Adicionar Scripts ao package.json (⚠️ Manual)

Abra `package.json` e adicione na seção `"scripts"` (se ainda não fez):

```json
{
  "scripts": {
    "test:corpus:audit": "tsx scripts/audit-corpus.ts",
    "test:corpus": "tsx scripts/test-corpus-ci.ts",
    "prepare": "husky install"
  }
}
```

**O script `prepare` é crucial!** Ele inicializa o Husky automaticamente quando alguém clona o repositório.

### Passo 3: Executar Setup Automático

```bash
# Tornar script executável
chmod +x scripts/setup-husky.sh

# Executar configuração
./scripts/setup-husky.sh
```

### Passo 4: Testar

```bash
# Teste 1: Pre-commit
git add .
git commit -m "test: validar hooks"

# Deve executar auditoria (~5s)
# Se passou, hook está funcionando!

# Teste 2: Commit-msg
git commit --allow-empty -m "mensagem sem tipo"
# Deve FALHAR (formato inválido)

git commit --allow-empty -m "test: validar formato"
# Deve PASSAR (formato válido)

# Teste 3: Pre-push (opcional, demora mais)
git push origin sua-branch
# Deve executar testes completos (~30s)
```

## 🎯 Resultado Esperado

Após setup completo:

```bash
$ git commit -m "feat: nova funcionalidade"

🔍 Executando validação pré-commit...

📊 Auditando integridade do corpus...
✓ Corpus contém 142 palavras
✓ Todos os lemas definidos
✓ Nenhuma duplicata
✓ Frequências válidas
✓ Integridade confirmada

✅ Auditoria passou! Commit permitido.

[main abc123] feat: nova funcionalidade
 1 file changed, 10 insertions(+)
```

## 🚨 Se Algo Der Errado

### Hooks não executam?

```bash
# Reinstalar Husky
rm -rf .husky
npx husky install

# Reconfigurar permissões
chmod +x .husky/*

# Verificar Git config
git config core.hooksPath
# Deve retornar: .husky
```

### Scripts npm não encontrados?

1. Verificar se foram adicionados ao `package.json`
2. Rodar `npm install`
3. Testar manualmente: `npm run test:corpus:audit`

### Hooks muito lentos?

```bash
# Desabilitar pre-push (opcional)
mv .husky/pre-push .husky/pre-push.disabled

# Ou ajustar para executar apenas em main
# Editar .husky/pre-push e adicionar:
# if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
#   npm run test:corpus
# fi
```

## 🎓 Comandos Úteis

```bash
# Bypass emergencial
git commit --no-verify -m "hotfix: urgente"
git push --no-verify

# Desabilitar temporariamente
export HUSKY=0

# Ver status dos hooks
ls -la .husky/

# Testar hook manualmente
.husky/pre-commit

# Remover Husky completamente
npm uninstall husky
rm -rf .husky
```

## 📚 Próximos Passos

Após configurar:

1. ✅ Compartilhar com equipe
2. ✅ Adicionar ao README principal
3. ✅ Documentar no guia de contribuição
4. ✅ Configurar em todos os ambientes de dev

## 🔗 Links Úteis

- [README Completo](.husky/README.md) - Documentação detalhada
- [GitHub Actions](../.github/README.md) - CI/CD setup
- [Scripts de Teste](../scripts/) - Scripts de validação

---

**Tempo total de setup:** 3 minutos
**Pronto para usar!** 🎉

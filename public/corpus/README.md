# Corpus Files - Git LFS Configuration

## 📦 Sobre o Armazenamento

Os arquivos de corpus neste diretório são rastreados usando **Git LFS (Large File Storage)** devido ao seu tamanho considerável (8-20 MB por arquivo).

### Arquivos Rastreados pelo LFS:
- `full-text/gaucho-completo.txt` (~16 MB)
- `full-text/nordestino-parte-01.txt` (~20 MB)
- `full-text/nordestino-parte-02.txt` (~20 MB)
- `full-text/nordestino-parte-03.txt` (~8 MB)
- `full-text/corpus-luiz-marenco-verso.txt` (~1.5 KB)

## 🚀 Como Usar Git LFS

### Pré-requisitos
Certifique-se de ter o Git LFS instalado:

```bash
git lfs version
```

Se não estiver instalado, instale seguindo as instruções em: https://git-lfs.github.com/

### Clonar o Repositório

Ao clonar o repositório, o Git LFS baixará automaticamente os arquivos grandes:

```bash
git clone https://github.com/ProfessorGeovaniHenrique/estilisticadecorpus.git
cd estilisticadecorpus
```

### Adicionar Novos Arquivos de Corpus

Se você precisar adicionar novos arquivos `.txt` grandes ao diretório `public/corpus/full-text/`:

1. Adicione o arquivo normalmente:
   ```bash
   git add public/corpus/full-text/novo-arquivo.txt
   ```

2. Commit e push:
   ```bash
   git commit -m "Adiciona novo arquivo de corpus"
   git push
   ```

O Git LFS cuidará automaticamente do upload, pois o padrão `public/corpus/full-text/*.txt` está configurado no arquivo `.gitattributes`.

### Verificar Arquivos LFS

Para ver quais arquivos estão sendo rastreados pelo LFS:

```bash
git lfs ls-files
```

## 📝 Configuração Atual

A configuração do Git LFS está definida no arquivo `.gitattributes` na raiz do repositório:

```
public/corpus/full-text/*.txt filter=lfs diff=lfs merge=lfs -text
```

Isso significa que todos os arquivos `.txt` no diretório `public/corpus/full-text/` são automaticamente rastreados pelo Git LFS.

## ⚠️ Notas Importantes

1. **Limites do GitHub**: O GitHub Free tem 1 GB de armazenamento LFS e 1 GB de largura de banda por mês. Monitore o uso em: https://github.com/settings/billing

2. **Colaboradores**: Todos os colaboradores devem ter Git LFS instalado para trabalhar com estes arquivos.

3. **Upload de Arquivos Grandes**: Com Git LFS configurado, você pode agora fazer upload de arquivos grandes sem problemas!

## 🔧 Solução de Problemas

### Erro ao fazer push
Se você receber erros ao fazer push, certifique-se de que:
- Git LFS está instalado: `git lfs install`
- Você tem permissão para escrever no repositório
- Você não excedeu os limites de armazenamento/banda do GitHub

### Arquivos não baixados
Se após o clone os arquivos aparecem muito pequenos ou como ponteiros:
```bash
git lfs pull
```

## 📚 Recursos Adicionais

- [Documentação Git LFS](https://git-lfs.github.com/)
- [GitHub LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
- [Tutorial Git LFS](https://www.atlassian.com/git/tutorials/git-lfs)

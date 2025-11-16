# Utilitários da Aplicação

## 📢 Notifications (`notifications.ts`)

Sistema centralizado de notificações usando Sonner para padronizar toasts em toda a aplicação.

### Uso Básico

```typescript
import { notifications } from '@/lib/notifications';

// Sucesso
notifications.success('Dados salvos!', 'Suas alterações foram aplicadas.');

// Erro
try {
  await saveData();
} catch (error) {
  notifications.error('Falha ao salvar', error);
}

// Info
notifications.info('Nova versão disponível', 'Atualize para obter novos recursos.');

// Warning
notifications.warning('Atenção', 'Esta ação não pode ser desfeita.');

// Promise (loading automático)
notifications.promise(
  fetchData(),
  {
    loading: 'Carregando dados...',
    success: 'Dados carregados!',
    error: 'Erro ao carregar dados'
  }
);

// Com ação
notifications.withAction(
  'Job concluído',
  'Clique para ver os resultados',
  {
    label: 'Ver',
    onClick: () => navigate('/results')
  }
);
```

---

## 🔄 Retry Utils (`retryUtils.ts`)

Implementa retry com exponential backoff para aumentar a resiliência de operações de rede.

### Uso Básico

```typescript
import { retryWithBackoff, retrySupabaseOperation } from '@/lib/retryUtils';

// Retry genérico
const data = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10000
  }
);

// Retry específico para Supabase (recomendado)
const jobs = await retrySupabaseOperation(async () => {
  const { data, error } = await supabase
    .from('annotation_jobs')
    .select('*');
  
  if (error) throw error;
  return data;
});
```

### Opções Avançadas

```typescript
await retryWithBackoff(
  fetchData,
  {
    maxRetries: 3,              // Máximo de tentativas (padrão: 3)
    baseDelay: 1000,            // Delay inicial em ms (padrão: 1000)
    backoffMultiplier: 2,       // Multiplicador (padrão: 2)
    maxDelay: 30000,            // Delay máximo em ms (padrão: 30000)
    
    // Custom: determinar se deve fazer retry
    shouldRetry: (error, attempt) => {
      // Não retry em erros de autenticação
      if (error.message.includes('401')) return false;
      return true;
    },
    
    // Callback antes de cada retry
    onRetry: (error, attempt, delay) => {
      console.log(`Retry ${attempt} em ${delay}ms`);
      notifications.warning(`Tentando novamente... (${attempt}/3)`);
    }
  }
);
```

### Exemplo em React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { retrySupabaseOperation } from '@/lib/retryUtils';
import { notifications } from '@/lib/notifications';

export function useAnnotationJobs() {
  return useQuery({
    queryKey: ['annotation-jobs'],
    queryFn: async () => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('annotation_jobs')
          .select('*');
        
        if (error) throw error;
        return data;
      });
    },
    // React Query já tem retry interno, mas você pode combinar
    retry: false, // Desabilitar retry do React Query
    onError: (error) => {
      notifications.error('Erro ao carregar jobs', error as Error);
    }
  });
}
```

---

## 🎯 Padrões de Uso

### Combinando Notifications + Retry

```typescript
async function saveUserData(data: UserData) {
  try {
    const result = await retrySupabaseOperation(async () => {
      const { data: savedData, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return savedData;
    });

    notifications.success('Dados salvos com sucesso!');
    return result;
  } catch (error) {
    notifications.error('Falha ao salvar dados', error as Error);
    throw error;
  }
}
```

### Em Hooks Customizados

```typescript
export function useTagsets() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newTagset: NewTagset) => {
      return retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('semantic_tagset')
          .insert(newTagset)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      });
    },
    onSuccess: (data) => {
      notifications.success(
        'Tagset criado!',
        `O tagset "${data.nome}" foi adicionado.`
      );
      queryClient.invalidateQueries({ queryKey: ['tagsets'] });
    },
    onError: (error) => {
      notifications.error('Erro ao criar tagset', error as Error);
    }
  });

  return mutation;
}
```

---

## 📊 Economia de Créditos

### Retry Utils
- **Economia estimada**: ~200-1.000 créditos/mês
- **Benefício**: Evita falhas desnecessárias por problemas temporários de rede
- **Casos de uso**: Todos os requests ao Supabase e APIs externas

### Notifications
- **Economia estimada**: ~0 créditos/mês (impacto em UX)
- **Benefício**: Consistência na experiência do usuário e debugging facilitado
- **Casos de uso**: Feedback de todas as operações (sucesso, erro, loading)

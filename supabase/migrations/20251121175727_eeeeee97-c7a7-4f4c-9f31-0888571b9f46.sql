-- Adicionar coluna 'labels' na tabela edge_function_metrics para suportar métricas customizadas
ALTER TABLE public.edge_function_metrics 
ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '{}'::jsonb;

-- Criar índice GIN para buscas eficientes em labels
CREATE INDEX IF NOT EXISTS idx_edge_function_metrics_labels 
ON public.edge_function_metrics USING GIN (labels);

-- Comentário para documentação
COMMENT ON COLUMN public.edge_function_metrics.labels IS 'Labels customizados para métricas adicionais (formato: {"key": "value"})';
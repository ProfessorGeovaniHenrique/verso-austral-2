export const ngramsTourSteps = [
  {
    id: 'ngrams-intro',
    title: '🔤 N-grams - Sequências Frequentes',
    text: 'Encontre sequências de palavras que aparecem juntas com frequência no corpus.',
  },
  {
    id: 'ngrams-menu',
    title: '📍 Menu Lateral',
    text: 'O menu lateral mantém suas configurações salvas. Experimente trocar entre "N-grams" e outras ferramentas.',
    attachTo: { element: '[data-tour="tool-menu-ngrams"]', on: 'right' as const },
  },
  {
    id: 'ngrams-size',
    title: 'Tamanho do N-gram',
    text: 'Escolha o tamanho: 2-grams (bigramas), 3-grams (trigramas), etc.',
    attachTo: { element: '[data-tour="ngrams-size"]', on: 'bottom' as const },
  },
  {
    id: 'ngrams-generate',
    title: 'Gerar Análise',
    text: 'Clique em "Gerar N-grams" para processar as sequências.',
    attachTo: { element: '[data-tour="ngrams-generate"]', on: 'bottom' as const },
  },
  {
    id: 'ngrams-results',
    title: 'Resultados',
    text: 'Veja as sequências mais frequentes com suas estatísticas.',
    attachTo: { element: '[data-tour="ngrams-results"]', on: 'top' as const },
  },
];

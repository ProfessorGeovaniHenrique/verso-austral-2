export const wordlistTourSteps = [
  {
    id: 'wordlist-intro',
    title: '📊 Wordlist - Lista de Palavras',
    text: 'Veja todas as palavras do corpus com frequências absolutas e normalizadas.',
  },
  {
    id: 'wordlist-menu',
    title: '📍 Navegação Lateral',
    text: 'Clique em "Wordlist" no menu para ativar esta ferramenta.',
    attachTo: { element: '[data-tour="tool-menu-wordlist"]', on: 'right' as const },
  },
  {
    id: 'wordlist-generate',
    title: 'Gerar Lista',
    text: 'Clique aqui para processar o corpus e gerar a lista de palavras.',
    attachTo: { element: '[data-tour="wordlist-generate"]', on: 'bottom' as const },
  },
  {
    id: 'wordlist-search',
    title: 'Buscar Palavra',
    text: 'Use o campo de busca para filtrar a lista.',
    attachTo: { element: '[data-tour="wordlist-search"]', on: 'bottom' as const },
  },
  {
    id: 'wordlist-results',
    title: 'Resultados',
    text: 'Clique em qualquer palavra para ver suas concordâncias em KWIC.',
    attachTo: { element: '[data-tour="wordlist-results"]', on: 'top' as const },
  },
];

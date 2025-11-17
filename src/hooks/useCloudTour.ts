import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

export function useCloudTour(enabled: boolean = false) {
  useEffect(() => {
    if (!enabled) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-theme-academic',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true
        }
      }
    });

    // Passo 1: Introdução
    tour.addStep({
      id: 'intro',
      title: '☁️ Nuvem de Domínios Semânticos',
      text: `Bem-vindo à visualização espacial interativa! Esta nuvem de palavras representa 
             graficamente a importância relativa de cada domínio semântico ou palavra-chave 
             através do tamanho e da cor dos elementos.`,
      buttons: [
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 2: Toggle Domínios vs Palavras
    tour.addStep({
      id: 'toggle',
      title: '🔀 Domínios vs Palavras-chave',
      text: `Alterne entre duas visualizações:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Domínios</strong>: Visualize os campos semânticos (temas gerais)</li>
               <li><strong>Palavras-chave</strong>: Explore termos específicos estatisticamente relevantes</li>
             </ul>
             <p style="margin-top: 8px;">O tamanho de cada elemento reflete sua importância estatística no corpus.</p>`,
      attachTo: {
        element: '[data-tour="cloud-toggle"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 3: Slider de Espaçamento
    tour.addStep({
      id: 'spacing',
      title: '🎚️ Controle de Espaçamento',
      text: `<strong>NOVIDADE!</strong> Use o slider para ajustar manualmente o espaçamento entre as palavras:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Menos espaçamento (1-4px)</strong>: Nuvem mais compacta</li>
               <li><strong>Mais espaçamento (5-15px)</strong>: Facilita cliques em palavras sobrepostas</li>
             </ul>
             <p style="margin-top: 8px;"><em>Experimente diferentes valores para encontrar a visualização ideal!</em></p>`,
      attachTo: {
        element: '[data-tour="cloud-spacing-slider"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 4: Tooltips Interativas
    tour.addStep({
      id: 'tooltips',
      title: '💬 Tooltips Informativas',
      text: `Passe o mouse sobre qualquer palavra ou domínio para ver informações detalhadas:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Domínios</strong>: Percentual, ocorrências, riqueza lexical e LL médio</li>
               <li><strong>Palavras</strong>: Frequência, Log-Likelihood, Mutual Information e prosódia semântica</li>
             </ul>
             <p style="margin-top: 8px;"><strong>Clique</strong> em uma palavra para ver o KWIC (concordância)!</p>`,
      attachTo: {
        element: '[data-tour="cloud-canvas"]',
        on: 'top'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 5: Filtros Avançados
    tour.addStep({
      id: 'filters',
      title: '🔍 Filtros Avançados',
      text: `Refine sua visualização com filtros poderosos:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Busca textual</strong>: Encontre termos específicos</li>
               <li><strong>Domínio</strong>: Filtre palavras de um campo semântico</li>
               <li><strong>Prosódia</strong>: Selecione palavras por sentimento (Positiva/Negativa/Neutra)</li>
               <li><strong>Significância</strong>: Filtre por relevância estatística (Alta/Média/Baixa)</li>
             </ul>`,
      attachTo: {
        element: '[data-tour="cloud-filters"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 6: Modo Comparação
    tour.addStep({
      id: 'comparison',
      title: '⚖️ Modo Comparação',
      text: `Ative o modo comparação para visualizar dois domínios lado a lado:
             <ol style="margin-top: 8px; padding-left: 20px;">
               <li>Ative o switch "Modo Comparação"</li>
               <li>Selecione dois domínios nos dropdowns</li>
               <li>Compare as nuvens de palavras-chave simultaneamente</li>
             </ol>
             <p style="margin-top: 8px;"><em>Ideal para análise contrastiva entre campos semânticos!</em></p>`,
      attachTo: {
        element: '[data-tour="cloud-comparison"]',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 7: Conclusão
    tour.addStep({
      id: 'conclusion',
      title: 'Explore a Nuvem! ✅',
      text: `Você agora domina todas as funcionalidades da Nuvem de Palavras!
             <p style="margin-top: 8px;">Use esta visualização para identificar rapidamente 
             os temas mais relevantes e explorar a riqueza lexical do corpus gaúcho.</p>
             <p style="margin-top: 8px;"><strong>Dicas:</strong></p>
             <ul style="margin-top: 4px; padding-left: 20px;">
               <li>Combine filtros para análises específicas</li>
               <li>Ajuste o espaçamento para facilitar a navegação</li>
               <li>Clique nas palavras para ver contextos de uso (KWIC)</li>
             </ul>`,
      buttons: [
        {
          text: 'Voltar',
          action: tour.back
        },
        {
          text: 'Concluir Tour',
          action: tour.complete
        }
      ]
    });

    tour.start();
    return () => {
      tour.complete();
    };
  }, [enabled]);

  return { startTour: () => {} };
}

import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

export function useDomainsTour(enabled: boolean = false) {
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
      title: '🗂️ Análise de Domínios Semânticos',
      text: `Bem-vindo à análise comparativa de domínios semânticos! Esta aba apresenta a distribuição 
             temática do corpus gaúcho em comparação com o corpus de referência nordestino, 
             revelando os campos semânticos mais representativos da música tradicionalista.`,
      buttons: [
        {
          text: 'Próximo',
          action: tour.next
        }
      ]
    });

    // Passo 2: Insights Cards
    tour.addStep({
      id: 'insights',
      title: '💡 Insights da Análise',
      text: `Estes cartões apresentam as informações mais relevantes da análise:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Domínio Dominante</strong>: Campo semântico mais representativo</li>
               <li><strong>Densidade Lexical</strong>: Riqueza vocabular por domínio</li>
               <li><strong>Distribuição Temática</strong>: Equilíbrio entre os campos</li>
             </ul>`,
      attachTo: {
        element: '[data-tour="domains-insights"]',
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

    // Passo 3: Busca e Filtros
    tour.addStep({
      id: 'search',
      title: '🔍 Busca de Domínios',
      text: `Use o campo de busca para encontrar domínios específicos. A busca é instantânea 
             e filtra tanto o nome quanto a descrição dos domínios semânticos.`,
      attachTo: {
        element: '[data-tour="domains-search"]',
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

    // Passo 4: Exportação
    tour.addStep({
      id: 'export',
      title: '📥 Exportação de Dados',
      text: `Exporte a análise completa dos domínios semânticos em formato CSV para análise 
             externa ou integração com outras ferramentas. O arquivo inclui todos os dados 
             estatísticos e as palavras associadas a cada domínio.`,
      attachTo: {
        element: '[data-tour="domains-export"]',
        on: 'left'
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

    // Passo 5: Tabela de Domínios
    tour.addStep({
      id: 'table',
      title: '📊 Tabela de Domínios',
      text: `Cada cartão representa um domínio semântico com suas métricas:
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Percentual</strong>: Representatividade no corpus (barra de progresso)</li>
               <li><strong>Ocorrências</strong>: Frequência absoluta de palavras do domínio</li>
               <li><strong>Riqueza Lexical</strong>: Variedade de termos diferentes</li>
               <li><strong>Palavras-chave</strong>: Termos mais característicos do domínio</li>
             </ul>
             <p style="margin-top: 8px;"><em>Passe o mouse sobre os badges para ver mais informações!</em></p>`,
      attachTo: {
        element: '[data-tour="domains-table"]',
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

    // Passo 6: Tooltips Interativos
    tour.addStep({
      id: 'tooltips',
      title: '🔍 Tooltips Interativos',
      text: `<p>Passe o mouse sobre <strong>qualquer palavra-chave</strong> nos cards de domínios para ver estatísticas detalhadas:</p>
             <ul style="margin-top: 8px; padding-left: 20px;">
               <li><strong>Frequência Normalizada</strong>: Percentual de uso no corpus</li>
               <li><strong>Prosódia Semântica</strong>: Conotação (Positiva/Negativa/Neutra)</li>
               <li><strong>Log-Likelihood (LL)</strong>: Medida estatística de keyness</li>
               <li><strong>Mutual Information (MI)</strong>: Força de associação com o domínio</li>
             </ul>
             <p style="margin-top: 8px;"><em>Experimente agora: passe o mouse sobre a palavra "pampa" ou "gateada"!</em></p>`,
      attachTo: {
        element: '[data-tour="domains-table"]',
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

    // Passo 7: Conclusão
    tour.addStep({
      id: 'conclusion',
      title: 'Pronto para Explorar! ✅',
      text: `Você agora conhece todas as ferramentas da aba de Domínios Semânticos.
             <p style="margin-top: 8px;">Use a análise comparativa para entender quais temas 
             são mais representativos da música gaúcha em relação ao corpus de referência.</p>
             <p style="margin-top: 8px;"><strong>Dica:</strong> Combine a visualização desta aba 
             com a <strong>Nuvem de Palavras</strong> para uma análise multidimensional!</p>`,
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

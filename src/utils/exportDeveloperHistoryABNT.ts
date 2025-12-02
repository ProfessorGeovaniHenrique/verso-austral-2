/**
 * 📄 EXPORTADOR DOCX COM NORMAS ABNT NBR 14724
 * Relatório acadêmico completo do desenvolvimento do Verso Austral
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  NumberFormat,
  TableOfContents,
  Header,
  Footer,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from 'docx';
import { constructionLog } from '@/data/developer-logs/construction-log';
import { 
  productVision, 
  personas, 
  mvpEpics, 
  postMvpEpics, 
  v2Epics,
  mvpMetrics,
  milestones,
  immediatePriorities
} from '@/data/developer-logs/product-roadmap';

// ABNT NBR 14724 Configuration
const ABNT_CONFIG = {
  font: 'Times New Roman',
  fontSize: 24, // 12pt in half-points
  titleFontSize: 28, // 14pt
  lineSpacing: 360, // 1.5 line spacing (240 = single)
  margins: {
    top: convertInchesToTwip(1.18), // 3cm
    bottom: convertInchesToTwip(0.79), // 2cm
    left: convertInchesToTwip(1.18), // 3cm
    right: convertInchesToTwip(0.79), // 2cm
  }
};

// Helper to create styled paragraph
const createParagraph = (text: string, options: {
  heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
  bold?: boolean;
  italic?: boolean;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacing?: { before?: number; after?: number };
} = {}) => {
  return new Paragraph({
    heading: options.heading,
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: {
      line: ABNT_CONFIG.lineSpacing,
      before: options.spacing?.before || 0,
      after: options.spacing?.after || 200,
    },
    children: [
      new TextRun({
        text,
        font: ABNT_CONFIG.font,
        size: options.heading ? ABNT_CONFIG.titleFontSize : ABNT_CONFIG.fontSize,
        bold: options.bold || !!options.heading,
        italics: options.italic,
      }),
    ],
  });
};

// Helper to create bullet point
const createBulletPoint = (text: string) => {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: ABNT_CONFIG.lineSpacing, after: 100 },
    children: [
      new TextRun({
        text,
        font: ABNT_CONFIG.font,
        size: ABNT_CONFIG.fontSize,
      }),
    ],
  });
};

export interface ABNTExportOptions {
  includeIntroduction?: boolean;
  includeMethodology?: boolean;
  includeDevelopment?: boolean;
  includeFunctionalities?: boolean;
  includeResults?: boolean;
  includeRoadmap?: boolean;
  includeReferences?: boolean;
  authorName?: string;
  institutionName?: string;
}

export async function exportDeveloperHistoryABNT(options: ABNTExportOptions = {}) {
  const {
    includeIntroduction = true,
    includeMethodology = true,
    includeDevelopment = true,
    includeFunctionalities = true,
    includeResults = true,
    includeRoadmap = true,
    includeReferences = true,
    authorName = 'Equipe Verso Austral',
    institutionName = 'Verso Austral - Plataforma de Análise Cultural'
  } = options;

  const sections: Paragraph[] = [];

  // ==========================================
  // CAPA
  // ==========================================
  sections.push(
    new Paragraph({ spacing: { after: 2000 } }),
    createParagraph(institutionName.toUpperCase(), {
      alignment: AlignmentType.CENTER,
      bold: true,
      spacing: { after: 1000 }
    }),
    new Paragraph({ spacing: { after: 4000 } }),
    createParagraph('VERSO AUSTRAL', {
      alignment: AlignmentType.CENTER,
      bold: true,
      spacing: { after: 400 }
    }),
    createParagraph('Plataforma de Análise Linguística e Cultural do Rio Grande do Sul', {
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    createParagraph('Relatório Técnico de Desenvolvimento', {
      alignment: AlignmentType.CENTER,
      italic: true,
      spacing: { after: 4000 }
    }),
    new Paragraph({ spacing: { after: 6000 } }),
    createParagraph(authorName, {
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 }
    }),
    createParagraph(new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' }), {
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ pageBreakBefore: true })
  );

  // ==========================================
  // SUMÁRIO (Table of Contents placeholder)
  // ==========================================
  sections.push(
    createParagraph('SUMÁRIO', {
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '(Sumário gerado automaticamente - atualize os campos no Word)',
          font: ABNT_CONFIG.font,
          size: ABNT_CONFIG.fontSize,
          italics: true,
        }),
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({ pageBreakBefore: true })
  );

  // ==========================================
  // 1. INTRODUÇÃO
  // ==========================================
  if (includeIntroduction) {
    sections.push(
      createParagraph('1 INTRODUÇÃO', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      }),
      createParagraph('1.1 Contexto e Problema', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph(productVision.problem),
      createParagraph('1.2 Solução Proposta', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph(productVision.solution),
      createParagraph('1.3 Proposta de Valor', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph(productVision.valueProposition),
      createParagraph('1.4 Público-Alvo', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );

    personas.forEach(persona => {
      sections.push(
        createBulletPoint(`${persona.name} (${persona.role}): ${persona.description}`)
      );
    });

    sections.push(new Paragraph({ pageBreakBefore: true }));
  }

  // ==========================================
  // 2. METODOLOGIA
  // ==========================================
  if (includeMethodology) {
    sections.push(
      createParagraph('2 METODOLOGIA E ARQUITETURA TÉCNICA', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      }),
      createParagraph('2.1 Stack Tecnológico', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createBulletPoint('Frontend: React 18, TypeScript, Tailwind CSS, shadcn/ui'),
      createBulletPoint('Backend: Supabase (PostgreSQL, Edge Functions, Auth)'),
      createBulletPoint('Visualização: Three.js, D3.js, Recharts'),
      createBulletPoint('IA: Gemini 2.5 Flash/Pro, GPT-5 via Lovable AI Gateway'),
      createBulletPoint('Análise Linguística: spaCy, regras gramaticais customizadas'),
      createParagraph('2.2 Arquitetura de Processamento Semântico', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph('O sistema implementa uma arquitetura de 6 camadas hierárquicas para classificação semântica:'),
      createBulletPoint('Camada 1 (Cache): semantic_disambiguation_cache com 5.000+ palavras pré-classificadas'),
      createBulletPoint('Camada 2 (Léxico Dialectal): 500+ entradas do dialectal_lexicon com domínios regionais'),
      createBulletPoint('Camada 3 (Sinônimos): Propagação via lexical_synonyms (Rocha Pombo)'),
      createBulletPoint('Camada 4 (Gutenberg): 64.000 verbetes do dicionário histórico'),
      createBulletPoint('Camada 5 (Regras Morfológicas): Padrões de sufixos, prefixos e composição'),
      createBulletPoint('Camada 6 (IA): Gemini Flash/Pro para palavras genuinamente desconhecidas'),
      createParagraph('2.3 Fundamentação Científica', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph('A classificação semântica baseia-se no framework USAS (UCREL Semantic Analysis System), adaptado para o português brasileiro com extensões para o léxico gauchesco. A taxonomia hierárquica utiliza 13 domínios N1 (nível superior), expandindo-se para N2, N3 e N4 conforme a especificidade semântica.'),
      new Paragraph({ pageBreakBefore: true })
    );
  }

  // ==========================================
  // 3. DESENVOLVIMENTO
  // ==========================================
  if (includeDevelopment) {
    sections.push(
      createParagraph('3 FASES DE DESENVOLVIMENTO', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      })
    );

    constructionLog.forEach((phase, index) => {
      sections.push(
        createParagraph(`3.${index + 1} ${phase.phase}`, {
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        createParagraph(`Período: ${phase.dateStart} a ${phase.dateEnd || 'em andamento'}`, {
          italic: true,
          spacing: { after: 100 }
        }),
        createParagraph(`Status: ${phase.status === 'completed' ? 'Concluído' : phase.status === 'in-progress' ? 'Em Andamento' : 'Planejado'}`, {
          italic: true,
          spacing: { after: 200 }
        }),
        createParagraph(`Objetivo: ${phase.objective}`),
        createParagraph('Decisões Técnicas:', { bold: true, spacing: { before: 200, after: 100 } })
      );

      phase.decisions.slice(0, 3).forEach(decision => {
        sections.push(createBulletPoint(`${decision.decision}: ${decision.rationale}`));
      });

      if (phase.artifacts.length > 0) {
        sections.push(createParagraph('Artefatos Produzidos:', { bold: true, spacing: { before: 200, after: 100 } }));
        phase.artifacts.slice(0, 5).forEach(artifact => {
          sections.push(createBulletPoint(`${artifact.file} (${artifact.linesOfCode} linhas)`));
        });
      }

      if (phase.challenges && phase.challenges.length > 0) {
        sections.push(createParagraph('Desafios Enfrentados:', { bold: true, spacing: { before: 200, after: 100 } }));
        phase.challenges.forEach(challenge => {
          sections.push(createBulletPoint(challenge));
        });
      }
    });

    sections.push(new Paragraph({ pageBreakBefore: true }));
  }

  // ==========================================
  // 4. FUNCIONALIDADES
  // ==========================================
  if (includeFunctionalities) {
    sections.push(
      createParagraph('4 FUNCIONALIDADES IMPLEMENTADAS', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      }),
      createParagraph('4.1 MVP - Produto Mínimo Viável', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );

    mvpEpics.forEach(epic => {
      sections.push(
        createParagraph(`Épico ${epic.number}: ${epic.name}`, { bold: true, spacing: { before: 200, after: 100 } }),
        createParagraph(`Status: ${epic.completionPercentage}% concluído`, { italic: true, spacing: { after: 100 } })
      );
      epic.stories.forEach(story => {
        const status = story.implemented ? '✓' : '○';
        sections.push(createBulletPoint(`${status} ${story.title}`));
      });
    });

    sections.push(
      createParagraph('4.2 Funcionalidades Pós-MVP', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    postMvpEpics.forEach(epic => {
      sections.push(
        createParagraph(`Épico ${epic.number}: ${epic.name}`, { bold: true, spacing: { before: 200, after: 100 } }),
        createParagraph(`Status: ${epic.completionPercentage}% concluído | Prioridade: ${epic.priority}`, { italic: true, spacing: { after: 100 } })
      );
    });

    sections.push(new Paragraph({ pageBreakBefore: true }));
  }

  // ==========================================
  // 5. RESULTADOS
  // ==========================================
  if (includeResults) {
    sections.push(
      createParagraph('5 RESULTADOS E MÉTRICAS', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      }),
      createParagraph('5.1 Métricas do MVP', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createBulletPoint(`Progresso geral: ${mvpMetrics.overallCompletion}%`),
      createBulletPoint(`Histórias implementadas: ${mvpMetrics.implementedStories} de ${mvpMetrics.totalStories}`),
      createBulletPoint(`Épicos concluídos: ${mvpMetrics.completedEpics} de ${mvpMetrics.totalEpics}`),
      createBulletPoint(`Próximo milestone: ${mvpMetrics.nextMilestone}`),
      createParagraph('5.2 Métricas do Corpus', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createBulletPoint('Total de músicas: 52.050 (após deduplicação)'),
      createBulletPoint('Total de artistas: 412'),
      createBulletPoint('Palavras no cache semântico: 5.000+'),
      createBulletPoint('Domínios semânticos N1: 13'),
      createBulletPoint('Cobertura do léxico dialectal: 500+ verbetes'),
      createParagraph('5.3 Milestones Alcançados', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );

    milestones.filter(m => m.status === 'completed').forEach(milestone => {
      sections.push(
        createBulletPoint(`${milestone.date}: ${milestone.title}`),
        createParagraph(milestone.description || '', { italic: true, spacing: { after: 100 } })
      );
    });

    sections.push(new Paragraph({ pageBreakBefore: true }));
  }

  // ==========================================
  // 6. ROADMAP
  // ==========================================
  if (includeRoadmap) {
    sections.push(
      createParagraph('6 ROADMAP E PRÓXIMOS PASSOS', {
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 }
      }),
      createParagraph('6.1 Prioridades Imediatas', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );

    immediatePriorities.forEach(priority => {
      sections.push(
        createBulletPoint(`${priority.epic} - ${priority.story}`),
        createParagraph(`Justificativa: ${priority.rationale}`, { italic: true, spacing: { after: 100 } })
      );
    });

    sections.push(
      createParagraph('6.2 Visão V2.0 - Módulo de Aprendizagem Guiada', {
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      }),
      createParagraph('A versão 2.0 focará em transformar a plataforma em uma ferramenta de ensino ativa, com funcionalidades para professores criarem atividades guiadas e acompanharem o progresso dos alunos.')
    );

    v2Epics.forEach(epic => {
      sections.push(
        createParagraph(`Épico ${epic.number}: ${epic.name}`, { bold: true, spacing: { before: 200, after: 100 } })
      );
      epic.stories.forEach(story => {
        sections.push(createBulletPoint(story.title));
      });
    });

    sections.push(new Paragraph({ pageBreakBefore: true }));
  }

  // ==========================================
  // 7. REFERÊNCIAS BIBLIOGRÁFICAS
  // ==========================================
  if (includeReferences) {
    sections.push(
      createParagraph('REFERÊNCIAS', {
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      createParagraph('CASTILHO, Ataliba Teixeira de. Nova gramática do português brasileiro. São Paulo: Contexto, 2010.', {
        spacing: { after: 200 }
      }),
      createParagraph('STUBBS, Michael. Words and Phrases: Corpus Studies of Lexical Semantics. Oxford: Blackwell Publishing, 2001.', {
        spacing: { after: 200 }
      }),
      createParagraph('RAYSON, Paul et al. The UCREL Semantic Analysis System. Lancaster University, 2004. Disponível em: https://ucrel.lancs.ac.uk/usas/', {
        spacing: { after: 200 }
      }),
      createParagraph('SINCLAIR, John. Corpus, Concordance, Collocation. Oxford: Oxford University Press, 1991.', {
        spacing: { after: 200 }
      }),
      createParagraph('BIBER, Douglas; CONRAD, Susan; REPPEN, Randi. Corpus Linguistics: Investigating Language Structure and Use. Cambridge: Cambridge University Press, 1998.', {
        spacing: { after: 200 }
      }),
      createParagraph('NUNES, Zeno Cardoso; NUNES, Rui Cardoso. Dicionário de Regionalismos do Rio Grande do Sul. 12. ed. Porto Alegre: Martins Livreiro, 2010.', {
        spacing: { after: 200 }
      })
    );
  }

  // ==========================================
  // CREATE DOCUMENT
  // ==========================================
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: ABNT_CONFIG.margins,
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'Verso Austral - Relatório Técnico',
                  font: ABNT_CONFIG.font,
                  size: 20,
                  italics: true,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: ABNT_CONFIG.font,
                  size: ABNT_CONFIG.fontSize,
                }),
              ],
            }),
          ],
        }),
      },
      children: sections,
    }],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `VersoAustral_RelatorioTecnico_${new Date().toISOString().split('T')[0]}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

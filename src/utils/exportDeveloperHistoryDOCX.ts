import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import {
  productVision,
  personas,
  mvpEpics,
  postMvpEpics,
  v2Epics,
  immediatePriorities,
  mvpMetrics,
  type Epic
} from '@/data/developer-logs/product-roadmap';
import { getCurrentReportDate, formatDateBR } from './dateHelpers';

interface ExportOptions {
  includeTimeline?: boolean;
  includeRoadmap?: boolean;
}

export async function exportDeveloperHistoryToDOCX(options: ExportOptions = {}) {
  const sections = [];

  // ========== CAPA ==========
  sections.push(
    new Paragraph({
      text: "Developer History Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "Plataforma de Análise Cultural",
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: `Gerado em: ${formatDateBR(getCurrentReportDate())}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // ========== VISÃO DO PRODUTO ==========
  sections.push(
    new Paragraph({
      text: "1. Visão do Produto",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Problema: ", bold: true }),
        new TextRun(productVision.problem)
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Solução: ", bold: true }),
        new TextRun(productVision.solution)
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Proposta de Valor: ", bold: true }),
        new TextRun(productVision.valueProposition)
      ],
      spacing: { after: 400 }
    })
  );

  // ========== PERSONAS ==========
  sections.push(
    new Paragraph({
      text: "2. Personas",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 }
    })
  );

  personas.forEach(persona => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${persona.name} - ${persona.role}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${persona.type === 'primary' ? 'Primária' : 'Secundária'})`, italics: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: persona.description,
        spacing: { after: 200 }
      })
    );
  });

  // ========== STATUS DO MVP ==========
  sections.push(
    new Paragraph({
      text: "3. Status do MVP",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      text: "Progresso Geral",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 100 }
    })
  );

  // Tabela de métricas
  const metricsTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Conclusão Geral")] }),
          new TableCell({ children: [new Paragraph(`${mvpMetrics.overallCompletion}%`)] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Stories Implementadas")] }),
          new TableCell({ children: [new Paragraph(`${mvpMetrics.implementedStories} / ${mvpMetrics.totalMvpStories}`)] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Épicos Concluídos")] }),
          new TableCell({ children: [new Paragraph(`${mvpMetrics.completedEpics} / ${mvpMetrics.totalEpics}`)] })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  sections.push(metricsTable);

  // Helper para adicionar épicos
  const addEpicsToDocument = (epics: Epic[], title: string) => {
    sections.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    epics.forEach(epic => {
      const statusEmoji = epic.status === 'completed' ? '✓' : 
                         epic.status === 'in-progress' ? '⏱' : '○';
      const statusText = epic.status === 'completed' ? 'Concluído' :
                        epic.status === 'in-progress' ? 'Em Progresso' : 'Planejado';

      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${statusEmoji} Épico ${epic.number}: `, bold: true }),
            new TextRun({ text: epic.name, bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Status: ${statusText} | `, italics: true }),
            new TextRun({ text: `Progresso: ${epic.completionPercentage}%`, italics: true })
          ],
          spacing: { after: 100 }
        })
      );

      // Stories
      epic.stories.forEach(story => {
        const storyIcon = story.implemented ? '✓' : '○';
        sections.push(
          new Paragraph({
            text: `${storyIcon} ${story.title}`,
            bullet: { level: 0 },
            spacing: { after: 50 }
          })
        );
        if (story.notes) {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: `   ${story.notes}`, italics: true })],
              spacing: { after: 50 }
            })
          );
        }
      });

      sections.push(
        new Paragraph({ text: "", spacing: { after: 200 } })
      );
    });
  };

  // Adicionar épicos
  addEpicsToDocument(mvpEpics, "Épicos MVP");
  
  if (options.includeRoadmap) {
    addEpicsToDocument(postMvpEpics, "Épicos Pós-MVP");
    addEpicsToDocument(v2Epics, "Épicos V2.0");
  }

  // ========== PRIORIDADES IMEDIATAS ==========
  sections.push(
    new Paragraph({
      text: "5. Prioridades Imediatas",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    })
  );

  immediatePriorities.forEach((priority, index) => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true }),
          new TextRun({ text: priority.story, bold: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Épico: ${priority.epic}`,
        spacing: { after: 50 }
      }),
      new Paragraph({
        text: `Esforço: ${priority.effort} | Impacto: ${priority.impact}`,
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Justificativa: ", bold: true }),
          new TextRun(priority.rationale)
        ],
        spacing: { after: 200 }
      })
    );
  });

  // ========== CRIAR E EXPORTAR DOCUMENTO ==========
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `developer-history-${Date.now()}.docx`;
  link.click();
  
  URL.revokeObjectURL(url);
}

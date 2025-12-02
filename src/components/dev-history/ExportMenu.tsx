import { Download, FileText, FileType, Code, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { exportDeveloperHistoryToPDF } from "@/utils/exportDeveloperHistoryPDF";
import { exportDeveloperHistoryToDOCX } from "@/utils/exportDeveloperHistoryDOCX";
import { exportDeveloperHistoryABNT } from "@/utils/exportDeveloperHistoryABNT";
import { toast } from "sonner";
import {
  productVision,
  personas,
  mvpEpics,
  postMvpEpics,
  v2Epics,
  futureProspects,
  mvpMetrics,
  immediatePriorities
} from "@/data/developer-logs/product-roadmap";

export function ExportMenu() {
  const handleExportFullPDF = async () => {
    try {
      toast.loading("Gerando PDF completo...");
      await exportDeveloperHistoryToPDF({
        includeTimeline: true,
        includeRoadmap: true,
        includeScientific: true,
        includeCorrections: true
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const handleExportRoadmapPDF = async () => {
    try {
      toast.loading("Gerando PDF do Roadmap...");
      await exportDeveloperHistoryToPDF({
        includeTimeline: true,
        includeRoadmap: true,
        includeScientific: false,
        includeCorrections: false
      });
      toast.success("PDF do Roadmap exportado!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const handleExportFullDOCX = async () => {
    try {
      toast.loading("Gerando DOCX completo...");
      await exportDeveloperHistoryToDOCX({
        includeTimeline: true,
        includeRoadmap: true
      });
      toast.success("DOCX exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar DOCX:", error);
      toast.error("Erro ao exportar DOCX");
    }
  };

  const handleExportABNT = async () => {
    try {
      toast.loading("Gerando Relatório Acadêmico ABNT...");
      await exportDeveloperHistoryABNT({
        includeIntroduction: true,
        includeMethodology: true,
        includeDevelopment: true,
        includeFunctionalities: true,
        includeResults: true,
        includeRoadmap: true,
        includeReferences: true,
        authorName: 'Equipe Verso Austral',
        institutionName: 'Verso Austral - Plataforma de Análise Cultural'
      });
      toast.success("Relatório ABNT exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar ABNT:", error);
      toast.error("Erro ao exportar Relatório ABNT");
    }
  };

  const handleExportDataJSON = () => {
    try {
      const data = {
        productVision,
        personas,
        mvpEpics,
        postMvpEpics,
        v2Epics,
        futureProspects,
        mvpMetrics,
        immediatePriorities,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `developer-history-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("JSON exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar JSON:", error);
      toast.error("Erro ao exportar JSON");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Exportar Documentos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportFullPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Relatório Completo (PDF)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportRoadmapPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Apenas Roadmap (PDF)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportFullDOCX}>
          <FileType className="mr-2 h-4 w-4" />
          Relatório Completo (DOCX)
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Formato Acadêmico
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={handleExportABNT} className="font-medium">
          <GraduationCap className="mr-2 h-4 w-4" />
          📄 Relatório ABNT NBR 14724
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportDataJSON}>
          <Code className="mr-2 h-4 w-4" />
          Dados Brutos (JSON)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

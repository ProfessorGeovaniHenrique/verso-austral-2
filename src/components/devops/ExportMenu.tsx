import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table } from 'lucide-react';
import { DevOpsMetrics } from '@/types/devops.types';
import { exportDashboardToPdf } from '@/utils/devops/exportToPdf';
import { exportMetricsToCSV, exportWorkflowsToCSV, exportTestHistoryToCSV, exportCorpusMetricsToCSV } from '@/utils/devops/exportToExcel';
import { toast } from 'sonner';

interface ExportMenuProps {
  metrics: DevOpsMetrics;
}

export function ExportMenu({ metrics }: ExportMenuProps) {
  const handleExportPDF = async () => {
    try {
      await exportDashboardToPdf(metrics);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
      console.error('PDF export error:', error);
    }
  };

  const handleExportFullCSV = () => {
    try {
      exportMetricsToCSV(metrics);
      toast.success('Dados exportados para CSV com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error('CSV export error:', error);
    }
  };

  const handleExportWorkflows = () => {
    try {
      exportWorkflowsToCSV(metrics);
      toast.success('Workflows exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar workflows');
    }
  };

  const handleExportTestHistory = () => {
    try {
      exportTestHistoryToCSV(metrics);
      toast.success('Histórico de testes exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar histórico de testes');
    }
  };

  const handleExportCorpus = () => {
    try {
      exportCorpusMetricsToCSV(metrics);
      toast.success('Métricas do corpus exportadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar métricas do corpus');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Exportar Dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Relatório Completo (PDF)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportFullCSV} className="gap-2">
          <Table className="h-4 w-4" />
          Todos os Dados (CSV)
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Exportar Seções
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={handleExportWorkflows} className="gap-2">
          <Table className="h-4 w-4" />
          Workflows (CSV)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportTestHistory} className="gap-2">
          <Table className="h-4 w-4" />
          Histórico de Testes (CSV)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleExportCorpus} className="gap-2">
          <Table className="h-4 w-4" />
          Métricas do Corpus (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

export type ExportFormat = 'xlsx' | 'json' | 'csv';

interface AdvancedExportMenuProps {
  onExport: (format: ExportFormat, options: ExportOptions) => void;
}

export interface ExportOptions {
  includeFields: string[];
  minConfidence?: number;
  fileName?: string;
}

export function AdvancedExportMenu({ onExport }: AdvancedExportMenuProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');

  const handleQuickExport = (format: ExportFormat) => {
    const defaultOptions: ExportOptions = {
      includeFields: ['title', 'artist', 'composer', 'year', 'genre', 'confidence'],
      fileName: `export-${Date.now()}`,
    };
    onExport(format, defaultOptions);
  };

  const handleAdvancedExport = (format: ExportFormat) => {
    setSelectedFormat(format);
    setShowDialog(true);
  };

  const handleConfirmExport = (options: ExportOptions) => {
    onExport(selectedFormat, options);
    setShowDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Exportação Rápida</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleQuickExport('xlsx')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('json')}>
            <FileJson className="mr-2 h-4 w-4" />
            JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileText className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Exportação Avançada</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleAdvancedExport('xlsx')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel (personalizado)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAdvancedExport('json')}>
            <FileJson className="mr-2 h-4 w-4" />
            JSON (personalizado)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAdvancedExport('csv')}>
            <FileText className="mr-2 h-4 w-4" />
            CSV (personalizado)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog
        open={showDialog}
        format={selectedFormat}
        onClose={() => setShowDialog(false)}
        onConfirm={handleConfirmExport}
      />
    </>
  );
}

import { useState } from "react";
import { ChevronUp, ChartBar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DomainStats } from "@/lib/linguisticStats";
import { cn } from "@/lib/utils";

interface StatisticalFooterProps {
  stats: DomainStats[];
}

export function StatisticalFooter({ stats }: StatisticalFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 bg-slate-950/98 border-t border-cyan-500/30",
        "backdrop-blur-lg transition-all duration-300 ease-in-out",
        isExpanded ? "h-[400px]" : "h-14"
      )}
    >
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-14 flex items-center justify-center gap-2 
                   hover:bg-slate-900/50 transition-colors group"
      >
        <ChartBar className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
        <span className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
          {isExpanded ? 'Ocultar' : 'Mostrar'} Estatísticas dos Domínios
        </span>
        <ChevronUp
          className={cn(
            "w-4 h-4 text-cyan-400 transition-transform group-hover:text-cyan-300",
            isExpanded && "rotate-180"
          )}
        />
      </button>
      
      {/* Tabela Estatística */}
      {isExpanded && (
        <div className="h-[calc(100%-56px)] overflow-auto px-6 pb-4 bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/80 bg-slate-900">
                <TableHead className="text-cyan-300 font-bold">Domínio</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">Freq. Bruta</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">Freq. Norm.</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">Riqueza Lex.</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">LL</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">MI</TableHead>
                <TableHead className="text-right text-cyan-300 font-bold">Palavras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat, index) => (
                <TableRow 
                  key={stat.domain}
                  className={cn(
                    "border-slate-800 hover:bg-slate-800/60 transition-colors",
                    index % 2 === 0 ? "bg-slate-900/40" : "bg-slate-950/60"
                  )}
                >
                  <TableCell className="font-medium">
                    <Badge 
                      className="font-semibold shadow-lg"
                      style={{ 
                        backgroundColor: stat.color,
                        color: 'white'
                      }}
                    >
                      {stat.domain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-100 font-semibold">
                    {stat.totalFrequency.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-100 font-semibold">
                    {stat.normalizedFrequency.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-100 font-semibold">
                    {stat.lexicalRichness.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={cn(
                      "font-bold",
                      stat.logLikelihood > 15.13 
                        ? "text-green-300" 
                        : stat.logLikelihood > 6.63 
                        ? "text-yellow-300" 
                        : "text-slate-300"
                    )}>
                      {stat.logLikelihood.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={cn(
                      "font-bold",
                      stat.miScore > 3 
                        ? "text-green-300" 
                        : stat.miScore > 2 
                        ? "text-yellow-300" 
                        : "text-slate-300"
                    )}>
                      {stat.miScore.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-100 font-semibold">
                    {stat.wordCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

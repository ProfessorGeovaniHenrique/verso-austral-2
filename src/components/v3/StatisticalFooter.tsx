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
        <div className="h-[calc(100%-56px)] overflow-auto px-6 pb-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-cyan-400 font-semibold">
                  Domínio Semântico
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  Freq. Bruta
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  Freq. Norm.
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  Riqueza Lex.
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  LL
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  MI
                </TableHead>
                <TableHead className="text-right text-cyan-400 font-semibold">
                  N° Palavras
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map(stat => (
                <TableRow
                  key={stat.domain}
                  className="border-slate-800 hover:bg-slate-900/30"
                >
                  <TableCell className="font-medium">
                    <Badge
                      className="px-3 py-1 font-semibold text-white border-0"
                      style={{
                        backgroundColor: stat.color,
                        boxShadow: `0 0 20px ${stat.color}40`
                      }}
                    >
                      {stat.domain}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    {stat.totalFrequency.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    {stat.normalizedFrequency.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    {stat.lexicalRichness.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    <span
                      className={cn(
                        stat.logLikelihood > 15.13 && "text-green-400 font-bold",
                        stat.logLikelihood > 10.83 && stat.logLikelihood <= 15.13 && "text-yellow-400",
                        stat.logLikelihood > 6.63 && stat.logLikelihood <= 10.83 && "text-orange-400"
                      )}
                    >
                      {stat.logLikelihood.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    <span
                      className={cn(
                        stat.miScore > 3.0 && "text-green-400 font-bold",
                        stat.miScore > 1.0 && stat.miScore <= 3.0 && "text-yellow-400"
                      )}
                    >
                      {stat.miScore.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-300">
                    {stat.wordCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Legenda de Significância */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-semibold">
              Legenda de Significância Estatística:
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-400">
                  <span className="font-bold text-green-400">LL {'>'} 15.13</span> = 
                  Significância extrema (p {'<'} 0.0001)
                </p>
                <p className="text-slate-400">
                  <span className="font-bold text-yellow-400">LL {'>'} 10.83</span> = 
                  Significância alta (p {'<'} 0.001)
                </p>
                <p className="text-slate-400">
                  <span className="font-bold text-orange-400">LL {'>'} 6.63</span> = 
                  Significância média (p {'<'} 0.01)
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">
                  <span className="font-bold text-green-400">MI {'>'} 3.0</span> = 
                  Colocação forte
                </p>
                <p className="text-slate-400">
                  <span className="font-bold text-yellow-400">MI {'>'} 1.0</span> = 
                  Colocação moderada
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold">Riqueza Lex.</span> = 
                  Type-Token Ratio (diversidade lexical)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

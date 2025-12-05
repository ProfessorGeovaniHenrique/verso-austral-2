/**
 * 💡 ANALYSIS SUGGESTIONS CARD
 * 
 * Card com checklist de sugestões do que observar na análise.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle2, Circle } from "lucide-react";
import { TheoreticalFramework } from "@/data/theoretical/stylistic-theory";

interface AnalysisSuggestionsCardProps {
  framework: TheoreticalFramework;
  compact?: boolean;
}

export function AnalysisSuggestionsCard({ framework, compact = false }: AnalysisSuggestionsCardProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const suggestions = framework.analysisGuide.whatToLookFor;
  const checkedCount = checkedItems.size;
  const totalCount = suggestions.length;

  return (
    <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                O Que Observar na Análise
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {checkedCount}/{totalCount}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2">
            <ul className="space-y-2">
              {suggestions.map((item, i) => (
                <li 
                  key={i} 
                  className="flex items-start gap-2 cursor-pointer group"
                  onClick={() => toggleItem(i)}
                >
                  {checkedItems.has(i) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-amber-500" />
                  )}
                  <span className={`text-sm ${checkedItems.has(i) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            {checkedCount === totalCount && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <span className="text-sm text-green-700 dark:text-green-400">
                  ✅ Todos os pontos verificados!
                </span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

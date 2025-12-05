/**
 * 📖 THEORY BRIEF CARD
 * 
 * Card compacto com descrição teórica breve e link para modal detalhado.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";
import { TheoreticalFramework } from "@/data/theoretical/stylistic-theory";

interface TheoryBriefCardProps {
  framework: TheoreticalFramework;
  onOpenDetail: () => void;
}

export function TheoryBriefCard({ framework, onOpenDetail }: TheoryBriefCardProps) {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {framework.shortDescription}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground italic">
                {framework.bibliographicReference.split('.')[0]}...
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onOpenDetail}
                className="text-primary hover:text-primary/80 gap-1"
              >
                Saiba mais
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

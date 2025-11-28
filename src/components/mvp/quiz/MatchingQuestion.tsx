import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuizQuestion } from "@/types/quiz.types";
import { useState, useEffect, useMemo } from "react";

interface MatchingQuestionProps {
  question: QuizQuestion;
  selectedMatches: string[];
  onMatchChange: (matches: string[]) => void;
}

export function MatchingQuestion({ question, selectedMatches, onMatchChange }: MatchingQuestionProps) {
  const [matches, setMatches] = useState<Record<string, string>>({});

  // Shuffle right options using Fisher-Yates algorithm
  const shuffledRightOptions = useMemo(() => {
    const options = question.matchingPairs?.map(pair => pair.right) || [];
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [question.id]);

  useEffect(() => {
    const matchesObj: Record<string, string> = {};
    selectedMatches.forEach(match => {
      const [left, right] = match.split(':');
      if (left && right) {
        matchesObj[left] = right;
      }
    });
    setMatches(matchesObj);
  }, [selectedMatches]);

  const handleMatchChange = (left: string, right: string) => {
    const newMatches = { ...matches, [left]: right };
    setMatches(newMatches);
    
    const matchArray = Object.entries(newMatches).map(([l, r]) => `${l}:${r}`);
    onMatchChange(matchArray);
  };

  const usedRightOptions = new Set(Object.values(matches));

  return (
    <div className="space-y-4">
      {question.matchingPairs?.map((pair, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg border border-border bg-muted/20">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{pair.left}</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[250px]">
            <Select
              value={matches[pair.left] || ""}
              onValueChange={(value) => handleMatchChange(pair.left, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {shuffledRightOptions.map((option, optIndex) => (
                  <SelectItem
                    key={optIndex}
                    value={option}
                    disabled={usedRightOptions.has(option) && matches[pair.left] !== option}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

import { Trophy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAchievements } from "@/hooks/useAchievements";
import { RARITY_COLORS, RARITY_BG } from "@/data/achievements";
import { cn } from "@/lib/utils";

export function AchievementsBadge() {
  const { achievements, totalUnlocked, totalAchievements, isLoading } = useAchievements();

  // Não renderizar se não há conquistas desbloqueadas
  if (totalUnlocked === 0 && !isLoading) {
    return null;
  }

  const overallProgress = (totalUnlocked / totalAchievements) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-9"
          title="Conquistas desbloqueadas"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">
            {totalUnlocked}/{totalAchievements}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Conquistas
            </h3>
            <Badge variant="secondary" className="text-xs">
              {totalUnlocked}/{totalAchievements}
            </Badge>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {Math.round(overallProgress)}% completo
          </p>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-3">
            {achievements.map(({ achievement, isUnlocked, progress, maxProgress }) => {
              const Icon = achievement.icon;
              const progressPercent = (progress / maxProgress) * 100;

              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isUnlocked 
                      ? RARITY_BG[achievement.rarity] 
                      : "bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg",
                        isUnlocked
                          ? RARITY_BG[achievement.rarity]
                          : "bg-muted"
                      )}
                    >
                      {isUnlocked ? (
                        <span>{achievement.emoji}</span>
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={cn(
                            "font-semibold text-sm",
                            isUnlocked
                              ? RARITY_COLORS[achievement.rarity]
                              : "text-muted-foreground"
                          )}
                        >
                          {achievement.name}
                        </h4>
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isUnlocked
                              ? RARITY_COLORS[achievement.rarity]
                              : "text-muted-foreground"
                          )}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {achievement.description}
                      </p>

                      {!isUnlocked && maxProgress > 1 && (
                        <>
                          <Progress value={progressPercent} className="h-1.5 mb-1" />
                          <p className="text-xs text-muted-foreground">
                            {progress}/{maxProgress}
                          </p>
                        </>
                      )}

                      {isUnlocked && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            RARITY_COLORS[achievement.rarity]
                          )}
                        >
                          Desbloqueado ✓
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

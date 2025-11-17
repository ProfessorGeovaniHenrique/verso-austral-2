import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FilterInsigniaDropdown } from "@/components/FilterInsigniaDropdown";
import { INSIGNIAS_OPTIONS } from "@/data/types/cultural-insignia.types";

interface FilterInsigniaToolbarProps {
  selectedInsignias: string[];
  onInsigniasChange: (insignias: string[]) => void;
}

export function FilterInsigniaToolbar({
  selectedInsignias,
  onInsigniasChange,
}: FilterInsigniaToolbarProps) {
  const removeInsignia = (insignia: string) => {
    onInsigniasChange(selectedInsignias.filter(i => i !== insignia));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FilterInsigniaDropdown
        selectedInsignias={selectedInsignias}
        onInsigniasChange={onInsigniasChange}
      />
      
      {selectedInsignias.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedInsignias.map(insignia => {
            const option = INSIGNIAS_OPTIONS.find(o => o.value === insignia);
            return option ? (
              <Badge
                key={insignia}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => removeInsignia(insignia)}
              >
                {option.label}
                <X className="h-3 w-3" />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

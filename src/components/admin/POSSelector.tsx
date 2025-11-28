import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

export const POS_TAGS = [
  { code: 'NOUN', label: 'Substantivo', examples: ['casa', 'cavalo', 'saudade'], description: 'Nomes de seres, objetos, conceitos' },
  { code: 'VERB', label: 'Verbo', examples: ['correr', 'amar', 'partir'], description: 'Ações, processos, estados' },
  { code: 'ADJ', label: 'Adjetivo', examples: ['bonito', 'gateado', 'azul'], description: 'Qualidades, características' },
  { code: 'ADV', label: 'Advérbio', examples: ['aqui', 'sempre', 'bem'], description: 'Circunstâncias (tempo, lugar, modo)' },
  { code: 'PRON', label: 'Pronome', examples: ['eu', 'este', 'que'], description: 'Substitutos de nomes' },
  { code: 'DET', label: 'Determinante', examples: ['o', 'uma', 'meu'], description: 'Artigos, possessivos, demonstrativos' },
  { code: 'ADP', label: 'Preposição', examples: ['de', 'em', 'para'], description: 'Conecta palavras indicando relações' },
  { code: 'CCONJ', label: 'Conjunção Coord.', examples: ['e', 'mas', 'ou'], description: 'Liga orações coordenadas' },
  { code: 'SCONJ', label: 'Conjunção Sub.', examples: ['que', 'se', 'porque'], description: 'Liga orações subordinadas' },
  { code: 'NUM', label: 'Numeral', examples: ['um', 'dois', 'primeiro'], description: 'Números e quantidades' },
  { code: 'INTJ', label: 'Interjeição', examples: ['olá', 'tchê', 'bueno'], description: 'Expressões emotivas' },
  { code: 'PROPN', label: 'Nome Próprio', examples: ['Brasil', 'Pampa', 'João'], description: 'Nomes específicos de entidades' },
  { code: 'PART', label: 'Partícula', examples: ['não', 'eis'], description: 'Palavras invariáveis com função específica' },
  { code: 'MWE', label: 'Expressão Composta', examples: ['mate amargo', 'cavalo gateado'], description: 'Multi-Word Expression (várias palavras)' },
] as const;

interface POSSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function POSSelector({ value, onChange, disabled }: POSSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="pos-select" className="text-sm font-medium">
          Classe Gramatical (POS)
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                Selecione a classe gramatical (Part-of-Speech) da palavra no contexto.
                Use as tags Universal Dependencies (UD).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="pos-select" className="w-full">
          <SelectValue placeholder="Selecione a classe gramatical..." />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {POS_TAGS.map((tag) => (
            <SelectItem key={tag.code} value={tag.code}>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{tag.code}</span>
                  <span className="text-sm">{tag.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tag.description} • Ex: {tag.examples.join(', ')}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
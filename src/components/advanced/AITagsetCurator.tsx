import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, RotateCcw, CheckCircle2, Sparkles } from "lucide-react";
import { INSIGNIAS_OPTIONS, type InsigniaCultural } from "@/data/types/cultural-insignia.types";
import { toast } from "sonner";
import { MultiSelectInsignias } from "@/components/ui/multi-select-insignias";

interface Tagset {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  exemplos?: string[];
  nivel_profundidade?: number;
  tagset_pai?: string;
}

interface AIRefinedSuggestion {
  paiRecomendado: string;
  nivelSugerido: number;
  confianca: number;
  justificativa: string;
  melhorias?: {
    descricao?: string;
    exemplosAdicionais?: string[];
    nomeSugerido?: string;
    codigoSugerido?: string;
    justificativaNome?: string;
  };
  alertas?: string[];
  alternativas?: Array<{
    codigo: string;
    nome: string;
    razao: string;
  }>;
}

interface AITagsetCuratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagsetOriginal: Tagset;
  aiSuggestion: AIRefinedSuggestion;
  onApply: (editedTagset: Partial<Tagset> & { tagset_pai: string }) => void;
}

export function AITagsetCurator({
  open,
  onOpenChange,
  tagsetOriginal,
  aiSuggestion,
  onApply,
}: AITagsetCuratorProps) {
  const [editedNome, setEditedNome] = useState(tagsetOriginal.nome);
  const [editedCodigo, setEditedCodigo] = useState(tagsetOriginal.codigo);
  const [editedDescricao, setEditedDescricao] = useState(tagsetOriginal.descricao || "");
  const [editedExemplos, setEditedExemplos] = useState(
    tagsetOriginal.exemplos?.join(", ") || ""
  );
  const [editedPai, setEditedPai] = useState(aiSuggestion.paiRecomendado);
  const [editedNivel, setEditedNivel] = useState(aiSuggestion.nivelSugerido);
  const [selectedInsignias, setSelectedInsignias] = useState<string[]>([]);

  const copiarSugestaoIA = () => {
    setEditedNome(aiSuggestion.melhorias?.nomeSugerido || tagsetOriginal.nome);
    setEditedCodigo(aiSuggestion.melhorias?.codigoSugerido || tagsetOriginal.codigo);
    setEditedDescricao(aiSuggestion.melhorias?.descricao || tagsetOriginal.descricao || "");
    
    const exemplosAI = [
      ...(tagsetOriginal.exemplos || []),
      ...(aiSuggestion.melhorias?.exemplosAdicionais || [])
    ];
    setEditedExemplos(exemplosAI.join(", "));
    
    setEditedPai(aiSuggestion.paiRecomendado);
    setEditedNivel(aiSuggestion.nivelSugerido);
    
    toast.success("Sugestão algorítmica aplicada", {
      description: "Campos preenchidos com sugestões do sistema"
    });
  };

  const restaurarOriginal = () => {
    setEditedNome(tagsetOriginal.nome);
    setEditedCodigo(tagsetOriginal.codigo);
    setEditedDescricao(tagsetOriginal.descricao || "");
    setEditedExemplos(tagsetOriginal.exemplos?.join(", ") || "");
    setEditedPai(tagsetOriginal.tagset_pai || aiSuggestion.paiRecomendado);
    setEditedNivel(tagsetOriginal.nivel_profundidade || aiSuggestion.nivelSugerido);
    
    toast.info("Restaurado ao original", {
      description: "Campos resetados para valores originais"
    });
  };

  const aplicarEdicao = () => {
    // Validação frontend: consistência nivel/pai
    if (editedNivel === 1 && editedPai) {
      toast.error("Erro de Consistência", {
        description: "Nível 1 não pode ter pai. Remova o pai ou altere o nível."
      });
      return;
    }
    
    if (editedNivel > 1 && !editedPai) {
      toast.error("Erro de Consistência", {
        description: "Níveis 2-4 precisam de um tagset pai."
      });
      return;
    }

    const exemplosArray = editedExemplos
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0);

    onApply({
      nome: editedNome,
      codigo: editedCodigo,
      descricao: editedDescricao,
      exemplos: exemplosArray,
      tagset_pai: editedPai,
      nivel_profundidade: editedNivel,
    });

    toast.success("Edição aplicada", {
      description: "Tagset curado com sucesso"
    });
    
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Curadoria Manual com Suporte Computacional
          </SheetTitle>
          <SheetDescription>
            Edite e refine as sugestões algorítmicas antes de aplicar ao tagset
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copiarSugestaoIA}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Sugestão do Sistema
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={restaurarOriginal}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Original
            </Button>
          </div>

          <Separator />

          {/* Insígnias Culturais */}
          <div className="space-y-2">
            <MultiSelectInsignias
              value={selectedInsignias}
              onChange={setSelectedInsignias}
            />
            <p className="text-xs text-muted-foreground italic">
              💡 As insígnias culturais são marcadores opcionais que indicam a identidade regional/étnica dos exemplos.
              Exemplo: "xergão" está em DS "Equipamentos de Montaria" + Insígnia "Gaúcho"
            </p>
          </div>

          <Separator />

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Tagset</Label>
            <Input
              id="nome"
              value={editedNome}
              onChange={(e) => setEditedNome(e.target.value)}
              placeholder="Nome descritivo"
            />
            {aiSuggestion.melhorias?.nomeSugerido && 
             aiSuggestion.melhorias.nomeSugerido !== tagsetOriginal.nome && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                <strong>💡 Sistema sugere:</strong> "{aiSuggestion.melhorias.nomeSugerido}"
                <br />
                {aiSuggestion.melhorias.justificativaNome}
              </div>
            )}
          </div>

          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="codigo">Código do Tagset</Label>
            <Input
              id="codigo"
              value={editedCodigo}
              onChange={(e) => setEditedCodigo(e.target.value.toUpperCase())}
              placeholder="DS_CONCEITO"
            />
            {aiSuggestion.melhorias?.codigoSugerido && 
             aiSuggestion.melhorias.codigoSugerido !== tagsetOriginal.codigo && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                <strong>💡 Sistema sugere:</strong> {aiSuggestion.melhorias.codigoSugerido}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={editedDescricao}
              onChange={(e) => setEditedDescricao(e.target.value)}
              placeholder="Descrição detalhada do conceito"
              rows={4}
            />
            {aiSuggestion.melhorias?.descricao && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                <strong>💡 Sistema propõe:</strong> {aiSuggestion.melhorias.descricao}
              </div>
            )}
          </div>

          {/* Exemplos */}
          <div className="space-y-2">
            <Label htmlFor="exemplos">Exemplos (separados por vírgula)</Label>
            <Textarea
              id="exemplos"
              value={editedExemplos}
              onChange={(e) => setEditedExemplos(e.target.value)}
              placeholder="exemplo1, exemplo2, exemplo3"
              rows={3}
            />
            {aiSuggestion.melhorias?.exemplosAdicionais && 
             aiSuggestion.melhorias.exemplosAdicionais.length > 0 && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                <strong>💡 Sistema adiciona:</strong> {aiSuggestion.melhorias.exemplosAdicionais.join(", ")}
              </div>
            )}
          </div>

          {/* Hierarquia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pai">Tagset Pai</Label>
              <Input
                id="pai"
                value={editedPai}
                onChange={(e) => setEditedPai(e.target.value)}
                placeholder="Código do pai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivel">Nível</Label>
              <Input
                id="nivel"
                type="number"
                min={1}
                max={4}
                value={editedNivel}
                onChange={(e) => setEditedNivel(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* AI Confidence */}
          <div className="bg-muted/30 p-3 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confiança Algorítmica</span>
              <Badge variant={aiSuggestion.confianca >= 75 ? "default" : "secondary"}>
                {aiSuggestion.confianca}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{aiSuggestion.justificativa}</p>
          </div>

          {/* Alertas */}
          {aiSuggestion.alertas && aiSuggestion.alertas.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 rounded">
              <strong className="text-sm text-destructive">⚠️ Alertas:</strong>
              <ul className="text-xs text-destructive/90 mt-2 space-y-1 list-disc list-inside">
                {aiSuggestion.alertas.map((alerta, i) => (
                  <li key={i}>{alerta}</li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Apply Button */}
          <Button
            onClick={aplicarEdicao}
            className="w-full"
            size="lg"
            disabled={!editedNome || !editedCodigo || !editedPai}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Aplicar Edição Curada
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

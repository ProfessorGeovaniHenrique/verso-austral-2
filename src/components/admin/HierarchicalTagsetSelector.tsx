import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTagsetsByLevel, useTagsetChildren } from '@/hooks/useHierarchicalTagsets';
import { Loader2 } from 'lucide-react';

interface HierarchicalTagsetSelectorProps {
  value: string | null;
  onChange: (codigo: string, nome: string) => void;
}

export function HierarchicalTagsetSelector({ value, onChange }: HierarchicalTagsetSelectorProps) {
  const [selectedN1, setSelectedN1] = useState<string | null>(null);
  const [selectedN2, setSelectedN2] = useState<string | null>(null);
  const [selectedN3, setSelectedN3] = useState<string | null>(null);
  const [selectedN4, setSelectedN4] = useState<string | null>(null);

  // Carregar N1 (raiz)
  const { data: n1Tagsets, isLoading: loadingN1 } = useTagsetsByLevel(1);

  // Carregar filhos conforme seleção
  const { data: n2Tagsets } = useTagsetChildren(selectedN1 || '');
  const { data: n3Tagsets } = useTagsetChildren(selectedN2 || '');
  const { data: n4Tagsets } = useTagsetChildren(selectedN3 || '');

  // Sincronizar seleção inicial com prop value
  useEffect(() => {
    if (value && n1Tagsets) {
      const parts = value.split('.');
      if (parts.length >= 1) setSelectedN1(parts[0]);
      if (parts.length >= 2) setSelectedN2(parts.slice(0, 2).join('.'));
      if (parts.length >= 3) setSelectedN3(parts.slice(0, 3).join('.'));
      if (parts.length >= 4) setSelectedN4(value);
    }
  }, [value, n1Tagsets]);

  const handleN1Change = (codigo: string) => {
    const tagset = n1Tagsets?.find(t => t.codigo === codigo);
    setSelectedN1(codigo);
    setSelectedN2(null);
    setSelectedN3(null);
    setSelectedN4(null);
    if (tagset) onChange(codigo, tagset.nome);
  };

  const handleN2Change = (codigo: string) => {
    const tagset = n2Tagsets?.find(t => t.codigo === codigo);
    setSelectedN2(codigo);
    setSelectedN3(null);
    setSelectedN4(null);
    if (tagset) onChange(codigo, tagset.nome);
  };

  const handleN3Change = (codigo: string) => {
    const tagset = n3Tagsets?.find(t => t.codigo === codigo);
    setSelectedN3(codigo);
    setSelectedN4(null);
    if (tagset) onChange(codigo, tagset.nome);
  };

  const handleN4Change = (codigo: string) => {
    const tagset = n4Tagsets?.find(t => t.codigo === codigo);
    if (tagset) onChange(codigo, tagset.nome);
    setSelectedN4(codigo);
  };

  if (loadingN1) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* N1 - Nível Raiz */}
      <div className="space-y-2">
        <Label>N1 - Domínio Principal</Label>
        <Select value={selectedN1 || undefined} onValueChange={handleN1Change}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o domínio principal..." />
          </SelectTrigger>
          <SelectContent>
            {n1Tagsets?.map(tagset => (
              <SelectItem key={tagset.codigo} value={tagset.codigo}>
                {tagset.codigo} - {tagset.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* N2 - Subdomínio */}
      {selectedN1 && n2Tagsets && n2Tagsets.length > 0 && (
        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
          <Label>N2 - Subdomínio</Label>
          <Select value={selectedN2 || undefined} onValueChange={handleN2Change}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o subdomínio..." />
            </SelectTrigger>
            <SelectContent>
              {n2Tagsets.map(tagset => (
                <SelectItem key={tagset.codigo} value={tagset.codigo}>
                  {tagset.codigo} - {tagset.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* N3 - Categoria */}
      {selectedN2 && n3Tagsets && n3Tagsets.length > 0 && (
        <div className="space-y-2 pl-8 border-l-2 border-primary/20">
          <Label>N3 - Categoria</Label>
          <Select value={selectedN3 || undefined} onValueChange={handleN3Change}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria..." />
            </SelectTrigger>
            <SelectContent>
              {n3Tagsets.map(tagset => (
                <SelectItem key={tagset.codigo} value={tagset.codigo}>
                  {tagset.codigo} - {tagset.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* N4 - Subcategoria */}
      {selectedN3 && n4Tagsets && n4Tagsets.length > 0 && (
        <div className="space-y-2 pl-12 border-l-2 border-primary/20">
          <Label>N4 - Subcategoria</Label>
          <Select value={selectedN4 || undefined} onValueChange={handleN4Change}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a subcategoria..." />
            </SelectTrigger>
            <SelectContent>
              {n4Tagsets.map(tagset => (
                <SelectItem key={tagset.codigo} value={tagset.codigo}>
                  {tagset.codigo} - {tagset.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

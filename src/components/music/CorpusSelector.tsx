import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Folder } from 'lucide-react';
import { toast } from 'sonner';

interface Corpus {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface CorpusSelectorProps {
  selectedCorpusId: string | null;
  onCorpusChange: (corpusId: string | null) => void;
}

export function CorpusSelector({ selectedCorpusId, onCorpusChange }: CorpusSelectorProps) {
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCorpusName, setNewCorpusName] = useState('');
  const [newCorpusDesc, setNewCorpusDesc] = useState('');

  useEffect(() => {
    loadCorpora();
  }, []);

  const loadCorpora = async () => {
    try {
      const { data, error } = await supabase
        .from('corpora')
        .select('id, name, description, color')
        .order('name');

      if (error) throw error;
      setCorpora(data || []);
    } catch (error) {
      console.error('Erro ao carregar corpora:', error);
      toast.error('Erro ao carregar pastas de corpus');
    } finally {
      setLoading(false);
    }
  };

  const createCorpus = async () => {
    if (!newCorpusName.trim()) {
      toast.error('Nome do corpus é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('corpora')
        .insert({
          name: newCorpusName,
          normalized_name: newCorpusName.toLowerCase().replace(/\s+/g, '-'),
          description: newCorpusDesc || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Corpus criado com sucesso!');
      setCorpora([...corpora, data]);
      onCorpusChange(data.id);
      setDialogOpen(false);
      setNewCorpusName('');
      setNewCorpusDesc('');
    } catch (error: any) {
      console.error('Erro ao criar corpus:', error);
      if (error.code === '23505') {
        toast.error('Já existe um corpus com esse nome');
      } else {
        toast.error('Erro ao criar corpus');
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="corpus-select" className="text-sm font-medium">
        Selecionar Pasta de Corpus *
      </Label>
      <div className="flex gap-2">
        <Select
          value={selectedCorpusId || 'none'}
          onValueChange={(value) => onCorpusChange(value === 'none' ? null : value)}
          disabled={loading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Escolha uma pasta ou deixe sem classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Sem classificação</span>
            </SelectItem>
            {corpora.map((corpus) => (
              <SelectItem key={corpus.id} value={corpus.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: corpus.color }}
                  />
                  <span>{corpus.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Corpus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="corpus-name">Nome do Corpus</Label>
                <Input
                  id="corpus-name"
                  placeholder="Ex: Corpus Gaúcho"
                  value={newCorpusName}
                  onChange={(e) => setNewCorpusName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corpus-desc">Descrição (opcional)</Label>
                <Input
                  id="corpus-desc"
                  placeholder="Breve descrição do corpus"
                  value={newCorpusDesc}
                  onChange={(e) => setNewCorpusDesc(e.target.value)}
                />
              </div>
              <Button onClick={createCorpus} className="w-full">
                <Folder className="w-4 h-4 mr-2" />
                Criar Corpus
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-xs text-muted-foreground">
        Organize suas músicas por origem cultural ou projeto de pesquisa
      </p>
    </div>
  );
}
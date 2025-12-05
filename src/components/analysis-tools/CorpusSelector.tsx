/**
 * 🎯 CORPUS SELECTOR
 * 
 * Seletor unificado para escolha de corpus (plataforma ou usuário)
 * com opções de balanceamento
 */

import React from 'react';
import { Database, Upload, Scale, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnalysisTools, CorpusSelection } from '@/contexts/AnalysisToolsContext';
import { CorpusUploader } from './CorpusUploader';

interface CorpusSelectorProps {
  label: string;
  description?: string;
  value: CorpusSelection | null;
  onChange: (selection: CorpusSelection | null) => void;
  showBalancing?: boolean;
  showReference?: boolean;
}

export function CorpusSelector({ 
  label, 
  description,
  value, 
  onChange,
  showBalancing = false,
  showReference = false
}: CorpusSelectorProps) {
  const { userCorpora, balancing, setBalancing } = useAnalysisTools();
  
  const corpusType = value?.type || 'platform';
  
  const handleTypeChange = (type: 'platform' | 'user') => {
    if (type === 'platform') {
      onChange({ type: 'platform' });
    } else if (userCorpora.length > 0) {
      onChange({ type: 'user', userCorpus: userCorpora[0] });
    } else {
      onChange({ type: 'user' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          {label}
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de Corpus */}
        <RadioGroup
          value={corpusType}
          onValueChange={(v) => handleTypeChange(v as 'platform' | 'user')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="platform" id={`${label}-platform`} />
            <Label htmlFor={`${label}-platform`} className="text-sm cursor-pointer">
              <Database className="h-3 w-3 inline mr-1" />
              Corpus da Plataforma
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="user" id={`${label}-user`} />
            <Label htmlFor={`${label}-user`} className="text-sm cursor-pointer">
              <Upload className="h-3 w-3 inline mr-1" />
              Corpus do Usuário
            </Label>
          </div>
        </RadioGroup>

        {/* Seleção de Corpus da Plataforma */}
        {corpusType === 'platform' && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Corpus Base</Label>
              <Select
                value={value?.platformCorpus || ''}
                onValueChange={(v) => onChange({ 
                  type: 'platform', 
                  platformCorpus: v as any,
                  platformArtist: undefined 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um corpus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaucho">Corpus Gaúcho</SelectItem>
                  <SelectItem value="nordestino">Corpus Nordestino</SelectItem>
                  <SelectItem value="sertanejo">Corpus Sertanejo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {value?.platformCorpus && (
              <div>
                <Label className="text-xs text-muted-foreground">Filtro por Artista (opcional)</Label>
                <Select
                  value={value?.platformArtist || 'all'}
                  onValueChange={(v) => onChange({ 
                    ...value, 
                    platformArtist: v === 'all' ? undefined : v 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os artistas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Corpus Completo</SelectItem>
                    {/* Artistas serão carregados dinamicamente */}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Seleção de Corpus do Usuário */}
        {corpusType === 'user' && (
          <div className="space-y-3">
            {userCorpora.length > 0 ? (
              <div>
                <Label className="text-xs text-muted-foreground">Selecione o Corpus</Label>
                <Select
                  value={value?.userCorpus?.id || ''}
                  onValueChange={(id) => {
                    const corpus = userCorpora.find(c => c.id === id);
                    if (corpus) onChange({ type: 'user', userCorpus: corpus });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um corpus carregado" />
                  </SelectTrigger>
                  <SelectContent>
                    {userCorpora.map(corpus => (
                      <SelectItem key={corpus.id} value={corpus.id}>
                        {corpus.name} ({corpus.wordCount.toLocaleString()} palavras)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum corpus carregado ainda
                </p>
                <CorpusUploader compact />
              </div>
            )}
          </div>
        )}

        {/* Opções de Balanceamento */}
        {showBalancing && (
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Balanceamento de Corpus
              </Label>
              <Switch
                checked={balancing.enabled}
                onCheckedChange={(enabled) => setBalancing({ ...balancing, enabled })}
              />
            </div>
            
            {balancing.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Proporção</Label>
                  <Select
                    value={String(balancing.ratio)}
                    onValueChange={(v) => setBalancing({ ...balancing, ratio: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1:1</SelectItem>
                      <SelectItem value="2">1:2</SelectItem>
                      <SelectItem value="3">1:3</SelectItem>
                      <SelectItem value="5">1:5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Método</Label>
                  <Select
                    value={balancing.method}
                    onValueChange={(v) => setBalancing({ ...balancing, method: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Aleatório</SelectItem>
                      <SelectItem value="proportional">Proporcional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect } from 'react';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, Search, Filter, RefreshCw, TreePine, Edit, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { EditTagsetDialog } from '@/components/admin/EditTagsetDialog';
import { CurationResultDialog } from '@/components/admin/CurationResultDialog';
import { useTagsetCuration, CurationSuggestion } from '@/hooks/useTagsetCuration';
import { useTagsets } from '@/hooks/useTagsets';

interface SemanticTagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: string;
  nivel_profundidade: number | null;
  categoria_pai: string | null;
  exemplos: string[] | null;
  validacoes_humanas: number | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  hierarquia_completa: string | null;
  created_at?: string;
}

export default function AdminSemanticTagsetValidation() {
  const queryClient = useQueryClient();
  const { updateTagset } = useTagsets();
  const { curateTagset, isLoading: isCurating, rateLimitRemaining } = useTagsetCuration();
  
  const [tagsets, setTagsets] = useState<SemanticTagset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nivelFilter, setNivelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTagset, setSelectedTagset] = useState<SemanticTagset | null>(null);
  
  // Estados para dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCurationDialogOpen, setIsCurationDialogOpen] = useState(false);
  const [currentCuration, setCurrentCuration] = useState<CurationSuggestion | null>(null);
  const [editingTagset, setEditingTagset] = useState<SemanticTagset | null>(null);

  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetchTagsets();
  }, []);

  const fetchTagsets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('semantic_tagset')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) throw error;
      setTagsets(data || []);
      toast.success(`${data?.length || 0} domínios semânticos carregados`);
    } catch (error) {
      console.error('Erro ao buscar tagsets:', error);
      toast.error('Erro ao carregar domínios semânticos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (tagsetId: string) => {
    try {
      // Primeiro pegar o valor atual
      const { data: current } = await supabase
        .from('semantic_tagset')
        .select('validacoes_humanas')
        .eq('id', tagsetId)
        .single();
      
      const { error } = await supabase
        .from('semantic_tagset')
        .update({
          status: 'ativo', // ✅ CORRIGIDO: usar 'ativo' ao invés de 'approved'
          aprovado_em: new Date().toISOString(),
          validacoes_humanas: (current?.validacoes_humanas || 0) + 1
        })
        .eq('id', tagsetId);

      if (error) throw error;
      
      toast.success('Domínio semântico aprovado!');
      fetchTagsets();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar domínio semântico');
    }
  };

  const handleReject = async (tagsetId: string) => {
    try {
      const { data: current } = await supabase
        .from('semantic_tagset')
        .select('validacoes_humanas')
        .eq('id', tagsetId)
        .single();
      
      const { error } = await supabase
        .from('semantic_tagset')
        .update({
          status: 'rejeitado', // ✅ CORRIGIDO: usar 'rejeitado' ao invés de 'rejected'
          validacoes_humanas: (current?.validacoes_humanas || 0) + 1
        })
        .eq('id', tagsetId);

      if (error) throw error;
      
      toast.success('Domínio semântico rejeitado');
      fetchTagsets();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast.error('Erro ao rejeitar domínio semântico');
    }
  };

  const handleEditClick = (tagset: SemanticTagset) => {
    setEditingTagset(tagset);
    setIsEditDialogOpen(true);
  };

  const handleCurateClick = async (tagset: SemanticTagset) => {
    const suggestion = await curateTagset(tagset, tagsets);
    if (suggestion) {
      setEditingTagset(tagset);
      setCurrentCuration(suggestion);
      setIsCurationDialogOpen(true);
    }
  };

  const handleLevelChange = async (tagsetId: string, newLevel: number) => {
    try {
      const tagset = tagsets.find(t => t.id === tagsetId);
      if (!tagset) return;

      // ✅ VALIDAÇÃO: Níveis 2-4 precisam ter pai definido
      if (newLevel > 1 && !tagset.categoria_pai) {
        toast.error('Tagsets de nível 2-4 precisam ter um pai definido. Edite o tagset para selecionar um pai.');
        return;
      }

      const updates: any = { nivel_profundidade: newLevel };
      
      // Se mudou para nível 1, remover pai
      if (newLevel === 1) {
        updates.categoria_pai = null;
        if (tagset.categoria_pai) {
          toast.info('Removendo pai para tagset de nível 1...');
        }
      }
      
      await updateTagset(tagsetId, updates);
      toast.success('Nível alterado com sucesso!');
      fetchTagsets();
    } catch (error) {
      console.error('Erro ao alterar nível:', error);
      toast.error('Erro ao alterar nível do domínio');
    }
  };

  // Pais disponíveis para o dialog de edição
  const availableParents = tagsets
    .filter(t => t.nivel_profundidade && t.nivel_profundidade < 4)
    .map(t => ({ codigo: t.codigo, nome: t.nome }));

  // ✅ MAPEAMENTO CORRETO: Frontend → Backend
  const STATUS_MAP = {
    'all': null,
    'approved': 'ativo',
    'pending': 'proposto',
    'rejected': 'rejeitado'
  } as const;

  // Filtros
  const filteredTagsets = tagsets.filter((tagset) => {
    if (statusFilter !== 'all' && tagset.status !== STATUS_MAP[statusFilter as keyof typeof STATUS_MAP]) return false;
    if (nivelFilter !== 'all' && tagset.nivel_profundidade?.toString() !== nivelFilter) return false;
    if (searchTerm && !tagset.nome.toLowerCase().includes(searchTerm.toLowerCase()) 
        && !tagset.codigo.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredTagsets.length / ITEMS_PER_PAGE);
  const paginatedTagsets = filteredTagsets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Estatísticas (usando status corretos do backend)
  const approvedCount = tagsets.filter(t => t.status === 'ativo').length;
  const pendingCount = tagsets.filter(t => t.status === 'proposto' || !t.status).length;
  const validationRate = tagsets.length > 0 ? ((approvedCount / tagsets.length) * 100).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <AdminBreadcrumb currentPage="Validação de Domínios Semânticos" />
        
        {/* Header com Estatísticas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Taxa de Validação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {validationRate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {approvedCount.toLocaleString('pt-BR')} aprovados
              </p>
              <Progress value={parseFloat(validationRate)} className="h-2 mt-2 bg-green-500/20" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {(100 - parseFloat(validationRate)).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingCount.toLocaleString('pt-BR')} aguardando
              </p>
              <Progress value={100 - parseFloat(validationRate)} className="h-2 mt-2 bg-yellow-500/20" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TreePine className="h-4 w-4 text-blue-500" />
                Total de Domínios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tagsets.length.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Domínios semânticos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Domínios Semânticos
                </CardTitle>
                <CardDescription>
                  Validação e aprovação de tagsets semânticos
                </CardDescription>
              </div>
              <Button onClick={fetchTagsets} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  <SelectItem value="1">Nível 1</SelectItem>
                  <SelectItem value="2">Nível 2</SelectItem>
                  <SelectItem value="3">Nível 3</SelectItem>
                  <SelectItem value="4">Nível 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Carregando domínios...</span>
              </div>
            ) : filteredTagsets.length === 0 ? (
              <Alert>
                <AlertTitle>Nenhum domínio encontrado</AlertTitle>
                <AlertDescription>
                  Tente ajustar os filtros de busca
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedTagsets.map((tagset) => (
                    <Card key={tagset.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {tagset.codigo}
                            </Badge>
                            <CardTitle className="text-base">{tagset.nome}</CardTitle>
                          </div>
                          <Badge variant={
                            tagset.status === 'ativo' ? 'default' :
                            tagset.status === 'rejeitado' ? 'destructive' :
                            'secondary'
                          }>
                            {tagset.status === 'ativo' ? 'Aprovado' :
                             tagset.status === 'rejeitado' ? 'Rejeitado' :
                             'Pendente'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {tagset.descricao && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {tagset.descricao}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tagset.nivel_profundidade && (
                            <Badge variant="outline" className="text-xs">
                              Nível {tagset.nivel_profundidade}
                            </Badge>
                          )}
                          {tagset.validacoes_humanas && tagset.validacoes_humanas > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {tagset.validacoes_humanas} validações
                            </Badge>
                          )}
                        </div>

                        {tagset.exemplos && tagset.exemplos.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium mb-1">Exemplos:</p>
                            <div className="flex flex-wrap gap-1">
                              {tagset.exemplos.slice(0, 3).map((exemplo, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {exemplo}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Seletor de Nível */}
                        <div className="mt-3">
                          <Select
                            value={tagset.nivel_profundidade?.toString() || '1'}
                            onValueChange={(value) => handleLevelChange(tagset.id, parseInt(value))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Nível 1</SelectItem>
                              <SelectItem value="2">Nível 2</SelectItem>
                              <SelectItem value="3">Nível 3</SelectItem>
                              <SelectItem value="4">Nível 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(tagset)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCurateClick(tagset)}
                            disabled={isCurating}
                          >
                            {isCurating ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            IA
                          </Button>
                        </div>

                        <div className="flex gap-2 mt-2">
                          {tagset.status !== 'ativo' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => handleApprove(tagset.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {tagset.status !== 'rejeitado' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleReject(tagset.id)}
                            >
                              Rejeitar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages} ({filteredTagsets.length} domínios)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <MVPFooter />

      {/* Dialogs */}
      <EditTagsetDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingTagset(null);
          fetchTagsets();
        }}
        tagset={editingTagset}
        availableParents={availableParents}
      />

      <CurationResultDialog
        isOpen={isCurationDialogOpen}
        onClose={() => {
          setIsCurationDialogOpen(false);
          setCurrentCuration(null);
          setEditingTagset(null);
          fetchTagsets();
        }}
        tagset={editingTagset}
        suggestion={currentCuration}
      />
    </div>
  );
}

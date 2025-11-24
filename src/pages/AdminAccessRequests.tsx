import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('AdminAccessRequests');
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  institution: string | null;
  role_requested: string | null;
  reason: string | null;
  status: string;
  created_at: string;
}

export default function AdminAccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  useEffect(() => {
    fetchRequests();
  }, []);
  
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      log.error('Erro ao buscar solicitações', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (request: AccessRequest) => {
    setProcessing(request.id);
    try {
      const { data: keyData, error: keyError } = await supabase.rpc('generate_invite_key');
      if (keyError) throw keyError;
      
      const inviteCode = keyData;
      
      const { error: insertError } = await supabase
        .from('invite_keys')
        .insert({ 
          key_code: inviteCode, 
          role: 'user',
          notes: `Solicitação aprovada para ${request.full_name}`
        });
      
      if (insertError) throw insertError;
      
      const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
        body: {
          recipientEmail: request.email,
          recipientName: request.full_name,
          inviteCode,
          role: request.role_requested || 'Usuário',
        }
      });
      
      if (emailError) throw emailError;
      
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ 
          status: 'approved', 
          invited_at: new Date().toISOString() 
        })
        .eq('id', request.id);
      
      if (updateError) throw updateError;
      
      toast.success('Convite enviado com sucesso!');
      fetchRequests();
    } catch (error: any) {
      log.error('Erro ao aprovar solicitação', error, { requestId: request.id, email: request.email });
      toast.error('Erro ao enviar convite: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };
  
  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success('Solicitação rejeitada');
      fetchRequests();
    } catch (error) {
      log.error('Erro ao rejeitar solicitação', error instanceof Error ? error : new Error(String(error)), { requestId });
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setProcessing(null);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <AdminBreadcrumb currentPage="Solicitações de Acesso" />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Solicitações de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação pendente
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.full_name}</TableCell>
                    <TableCell>{req.email}</TableCell>
                    <TableCell>{req.institution || '-'}</TableCell>
                    <TableCell>{req.role_requested || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          req.status === 'pending' ? 'default' :
                          req.status === 'approved' ? 'outline' : 'secondary'
                        }
                      >
                        {req.status === 'pending' && 'Pendente'}
                        {req.status === 'approved' && 'Aprovado'}
                        {req.status === 'rejected' && 'Rejeitado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(req.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req)}
                            disabled={processing === req.id}
                          >
                            {processing === req.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Aprovar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            disabled={processing === req.id}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  StopCircle,
  Lightbulb,
  TreePine,
  Search
} from 'lucide-react';
import { useSemanticConsultant } from '@/hooks/useSemanticConsultant';
import { cn } from '@/lib/utils';

interface SemanticConsultantChatProps {
  totalDomains: number;
}

export function SemanticConsultantChat({ totalDomains }: SemanticConsultantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isStreaming, sendMessage, stopStreaming, clearConversation } = useSemanticConsultant();

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const quickActions = [
    {
      icon: Search,
      label: 'Analisar Estrutura',
      prompt: 'Analise a estrutura atual da taxonomia e identifique possíveis sobreposições ou lacunas.',
    },
    {
      icon: TreePine,
      label: 'Sugerir Melhorias',
      prompt: 'Sugira melhorias na hierarquia considerando coerência semântica e profundidade dos níveis.',
    },
    {
      icon: Lightbulb,
      label: 'Validar Mudança',
      prompt: 'Quero propor uma mudança na estrutura. Me ajude a validar o impacto antes de executar.',
    },
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Consultor Semântico IA</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {totalDomains} domínios ativos
          </Badge>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-xs h-6 px-2"
            >
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Faça perguntas sobre a taxonomia, peça análises ou valide mudanças estruturais.
            </p>
            
            <div className="space-y-2 w-full">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isStreaming}
                >
                  <action.icon className="h-4 w-4 mr-3 shrink-0" />
                  <span className="text-left text-sm">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="border-t p-4 shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua pergunta..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                size="icon"
                variant="destructive"
                onClick={stopStreaming}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

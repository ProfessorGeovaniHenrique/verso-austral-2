import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useSemanticConsultant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;

    // Adicionar mensagem do usuário
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      const conversationHistory = [...messages, newUserMessage];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: conversationHistory,
            sessionId,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
          setIsStreaming(false);
          return;
        }
        throw new Error('Erro ao processar mensagem');
      }

      // Processar stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Criar mensagem do assistente vazia
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  assistantMessage += content;
                  // Atualizar última mensagem (do assistente)
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage,
                    };
                    return updated;
                  });
                }
              } catch {
                // Ignorar erros de parse de chunks parciais
              }
            }
          }
        }
      }

      // Salvar resposta completa do assistente no banco
      if (assistantMessage) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('semantic_consultant_conversations').insert({
            user_id: user.id,
            session_id: sessionId,
            message_role: 'assistant',
            message_content: assistantMessage,
          });
        }
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao enviar mensagem:', error);
        toast.error('Erro ao processar sua mensagem');
        // Remover mensagem do assistente incompleta
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, sessionId, isStreaming]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearConversation,
  };
}

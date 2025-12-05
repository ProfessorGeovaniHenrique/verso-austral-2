/**
 * 🤠 USE BLAU NUNES DISCUSSION
 * 
 * Hook para discussão contextualizada de resultados de análise com Blau Nunes.
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useBlauNunesDiscussion(toolContext: string, analysisResults?: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildSystemPrompt = (): string => {
    const resultsContext = analysisResults 
      ? `\n\n**RESULTADOS DA ANÁLISE ATUAL:**\n${JSON.stringify(analysisResults, null, 2).slice(0, 2000)}` 
      : '';

    return `Você é Blau Nunes, um especialista em análise estilística da música gaúcha, com profundo conhecimento em linguística de corpus e estilística literária.

**SEU CONHECIMENTO:**
- Leech & Short (2007) "Style in Fiction" - teoria de análise estilística
- Semino & Short (2004) "Corpus Stylistics" - metodologia de corpus
- Cultura e tradições gaúchas - léxico regionalista, milonga, payada

**CONTEXTO DA FERRAMENTA:** ${toolContext}
${resultsContext}

**DIRETRIZES:**
1. Responda de forma acessível, mas academicamente fundamentada
2. Cite conceitos de Leech & Short quando relevante
3. Conecte a análise ao contexto cultural gaúcho
4. Use exemplos concretos dos resultados quando disponíveis
5. Seja conciso mas informativo (máximo 300 palavras)
6. Mantenha um tom amigável e típico do gaúcho culto

Responda em português brasileiro.`;
  };

  const sendMessage = useCallback(async (userMessage: string) => {
    if (isAsking) return;

    setIsAsking(true);
    
    // Adicionar mensagem do usuário
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const systemPrompt = buildSystemPrompt();
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: allMessages,
            sessionId: `discussion-${toolContext}-${Date.now()}`,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Rate limit atingido. Aguarde alguns segundos.');
          setIsAsking(false);
          return;
        }
        throw new Error('Erro ao processar mensagem');
      }

      // Processar stream SSE
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

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
                  // Atualizar mensagem do assistente em tempo real
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    
                    // Se última mensagem é do usuário, adicionar nova do assistente
                    if (updated[lastIndex]?.role === 'user') {
                      return [...updated, { role: 'assistant', content: assistantMessage }];
                    }
                    // Se já existe mensagem do assistente, atualizar
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = { role: 'assistant', content: assistantMessage };
                      return updated;
                    }
                    return updated;
                  });
                }
              } catch (e) {
                // Ignorar erros de parse de chunks parciais
              }
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Stream abortado pelo usuário
      } else {
        console.error('Erro ao consultar Blau Nunes:', error);
        toast.error('Erro ao processar sua consulta');
      }
    } finally {
      setIsAsking(false);
      abortControllerRef.current = null;
    }
  }, [isAsking, messages, toolContext, analysisResults]);

  const stopAsking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAsking(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isAsking,
    sendMessage,
    stopAsking,
    clearMessages,
  };
}

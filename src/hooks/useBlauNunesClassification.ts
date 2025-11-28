import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KWICResult } from '@/lib/kwicUtils';

interface ClassificationContext {
  palavra: string;
  kwicResults: KWICResult[];
  selectedPOS: string | null;
  currentTagset: string | null;
  isSpellingDeviation: boolean;
  formaPadrao?: string;
  isMWE: boolean;
  mweText?: string;
}

interface ClassificationSuggestion {
  tagsetCode: string;
  tagsetNome: string;
  pos: string;
  lema: string;
  justificativa: string;
}

export function useBlauNunesClassification() {
  const [isAsking, setIsAsking] = useState(false);
  const [response, setResponse] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildPrompt = (context: ClassificationContext): string => {
    const kwicLines = context.kwicResults
      .map(k => `- "${k.leftContext} [${k.keyword.toUpperCase()}] ${k.rightContext}"`)
      .join('\n');

    return `Tchê, preciso de ajuda para classificar esta palavra no contexto da música gaúcha:

**PALAVRA:** "${context.palavra}"

**CONTEXTO (KWIC):**
${kwicLines || '(Sem contexto disponível)'}

**POS SELECIONADO:** ${context.selectedPOS || 'Não selecionado'}
**DESVIO ORTOGRÁFICO:** ${context.isSpellingDeviation ? `Sim (forma padrão: ${context.formaPadrao})` : 'Não'}
**EXPRESSÃO COMPOSTA (MWE):** ${context.isMWE ? `Sim (${context.mweText})` : 'Não'}

Com base no contexto de uso e na hierarquia de domínios semânticos disponível, sugira a classificação mais adequada.

**IMPORTANTE: Responda EXATAMENTE neste formato estruturado:**

DOMÍNIO: [código] - [nome completo do domínio]
POS: [classe gramatical sugerida]
LEMA: [forma canônica da palavra]
JUSTIFICATIVA: [explicação técnica breve considerando o contexto gaúcho]

Exemplo de formato de resposta:
DOMÍNIO: NA.02.01 - Flora
POS: ADJ
LEMA: copado
JUSTIFICATIVA: No contexto "sombra copada do tarumã", refere-se à copa frondosa de uma árvore, característica natural da vegetação.`;
  };

  const parseResponse = (text: string): ClassificationSuggestion | null => {
    try {
      const dominioMatch = text.match(/DOMÍNIO:\s*([A-Z]{2}(?:\.\d{2})*)\s*-\s*(.+)/i);
      const posMatch = text.match(/POS:\s*([A-Z]+)/i);
      const lemaMatch = text.match(/LEMA:\s*(\S+)/i);
      const justificativaMatch = text.match(/JUSTIFICATIVA:\s*(.+?)(?=\n\n|\n[A-Z]+:|$)/is);

      if (dominioMatch && posMatch && lemaMatch) {
        return {
          tagsetCode: dominioMatch[1].trim(),
          tagsetNome: dominioMatch[2].trim(),
          pos: posMatch[1].trim(),
          lema: lemaMatch[1].trim(),
          justificativa: justificativaMatch?.[1]?.trim() || 'Classificação sugerida pelo Blau Nunes',
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao parsear resposta:', error);
      return null;
    }
  };

  const askForClassification = useCallback(async (context: ClassificationContext) => {
    if (isAsking) return;

    setIsAsking(true);
    setResponse('');

    try {
      abortControllerRef.current = new AbortController();

      const prompt = buildPrompt(context);
      const userMessage = { role: 'user', content: prompt };

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [userMessage],
            sessionId: crypto.randomUUID(),
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
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
                  setResponse(assistantMessage);
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
        console.log('Stream abortado pelo usuário');
      } else {
        console.error('Erro ao consultar Blau Nunes:', error);
        toast.error('Erro ao processar sua consulta');
      }
    } finally {
      setIsAsking(false);
      abortControllerRef.current = null;
    }
  }, [isAsking]);

  const stopAsking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAsking(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setResponse('');
  }, []);

  return {
    isAsking,
    response,
    askForClassification,
    stopAsking,
    clearResponse,
    parseResponse,
  };
}

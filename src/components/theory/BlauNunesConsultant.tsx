/**
 * 🤠 BLAU NUNES CONSULTANT
 * 
 * Chat integrado para discussão de resultados de análise com o assistente Blau Nunes.
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  StopCircle
} from "lucide-react";
import { TheoreticalFramework } from "@/data/theoretical/stylistic-theory";
import { useBlauNunesDiscussion } from "@/hooks/useBlauNunesDiscussion";

interface BlauNunesConsultantProps {
  framework: TheoreticalFramework;
  analysisResults?: any;
  compact?: boolean;
}

export function BlauNunesConsultant({ 
  framework, 
  analysisResults,
  compact = false 
}: BlauNunesConsultantProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isAsking, 
    sendMessage, 
    stopAsking,
    clearMessages 
  } = useBlauNunesDiscussion(framework.toolId, analysisResults);

  // Auto-scroll quando novas mensagens chegam
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim() || isAsking) return;
    sendMessage(inputMessage.trim());
    setInputMessage("");
  };

  const handleSuggestedQuestion = (question: string) => {
    if (isAsking) return;
    sendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border-primary/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Pergunte ao Blau Nunes
              </CardTitle>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {messages.length} msg
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-3">
            {/* Perguntas sugeridas */}
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Perguntas sugeridas:</p>
                <div className="flex flex-wrap gap-2">
                  {framework.exampleQuestions.slice(0, 3).map((question, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-2 whitespace-normal text-left justify-start"
                      onClick={() => handleSuggestedQuestion(question)}
                      disabled={isAsking}
                    >
                      <Sparkles className="h-3 w-3 mr-1 shrink-0" />
                      <span className="line-clamp-2">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Área de mensagens */}
            {messages.length > 0 && (
              <ScrollArea className="h-[200px] pr-3" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] p-3 rounded-lg text-sm ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <p className="text-xs font-medium text-primary mb-1">🤠 Blau Nunes</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Blau Nunes está pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Input de mensagem */}
            <div className="flex gap-2">
              <Input
                placeholder="Pergunte sobre os resultados..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isAsking}
                className="text-sm"
              />
              {isAsking ? (
                <Button size="icon" variant="destructive" onClick={stopAsking}>
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="icon" onClick={handleSend} disabled={!inputMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Botão limpar conversa */}
            {messages.length > 0 && !isAsking && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground"
                onClick={clearMessages}
              >
                Limpar conversa
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

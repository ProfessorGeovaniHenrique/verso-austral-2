import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAIAnalysisHistory, useSuggestionStatus } from '@/hooks/useAIAnalysisHistory';
import { useAIAnalysisFeedback } from '@/hooks/useAIAnalysisFeedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function AIAnalysisReview() {
  const { analyses } = useAIAnalysisHistory();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    analyses.length > 0 ? analyses[0].id : null
  );
  const [reviewingSuggestionId, setReviewingSuggestionId] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const { suggestions, stats: suggestionStats } = useSuggestionStatus(selectedAnalysisId || undefined);
  const { feedback, stats: feedbackStats, submitFeedback, isSubmitting } = useAIAnalysisFeedback(
    selectedAnalysisId || undefined
  );

  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId);
  const reviewingSuggestion = suggestions.find(s => s.suggestion_id === reviewingSuggestionId);

  const handleSubmitFeedback = (verdict: 'valid' | 'false_positive' | 'already_fixed') => {
    if (!reviewingSuggestionId) return;

    submitFeedback(
      {
        suggestionId: reviewingSuggestionId,
        verdict,
        notes: feedbackNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReviewingSuggestionId(null);
          setFeedbackNotes('');
        },
      }
    );
  };

  const getVerificationBadge = (suggestion: typeof suggestions[0]) => {
    const feedbackItem = feedback.find(f => f.suggestion_id === suggestion.suggestion_id);
    
    if (feedbackItem) {
      if (feedbackItem.human_verdict === 'valid') {
        return <Badge variant="default" className="gap-1"><ThumbsUp className="w-3 h-3" /> Válido</Badge>;
      }
      if (feedbackItem.human_verdict === 'false_positive') {
        return <Badge variant="destructive" className="gap-1"><ThumbsDown className="w-3 h-3" /> Falso Positivo</Badge>;
      }
      return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Já Corrigido</Badge>;
    }

    if (suggestion.verification_status === 'human-verified') {
      return <Badge variant="default" className="gap-1"><ThumbsUp className="w-3 h-3" /> Verificado</Badge>;
    }
    if (suggestion.verification_status === 'auto-verified') {
      return <Badge variant="outline" className="gap-1"><AlertTriangle className="w-3 h-3" /> Auto-Verificado</Badge>;
    }
    if (suggestion.verification_status === 'false-positive') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Falso Positivo</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const getConfidenceBadge = (score: number | null) => {
    if (score === null || score === undefined) return null;
    
    let variant: 'default' | 'secondary' | 'destructive' = 'default';
    if (score < 60) variant = 'destructive';
    else if (score < 80) variant = 'secondary';

    return (
      <Badge variant={variant} className="gap-1">
        {score}% confiança
      </Badge>
    );
  };

  if (!selectedAnalysisId || !selectedAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Review de Análises da IA</CardTitle>
          <CardDescription>Nenhuma análise disponível para review</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Review de Análise da IA
          </CardTitle>
          <CardDescription>
            Validação humana das sugestões geradas pela IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Sugestões</p>
              <p className="text-2xl font-bold">{suggestionStats.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Validadas</p>
              <p className="text-2xl font-bold text-green-600">{feedbackStats.valid}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Falsos Positivos</p>
              <p className="text-2xl font-bold text-red-600">{feedbackStats.falsePositives}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Já Corrigidas</p>
              <p className="text-2xl font-bold text-blue-600">{feedbackStats.alreadyFixed}</p>
            </div>
          </div>

          {suggestionStats.total > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso do Review</span>
                <span>{Math.round((feedbackStats.total / suggestionStats.total) * 100)}%</span>
              </div>
              <Progress value={(feedbackStats.total / suggestionStats.total) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de sugestões para review */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => {
          const hasFeedback = feedback.some(f => f.suggestion_id === suggestion.suggestion_id);

          return (
            <Card key={suggestion.id} className={hasFeedback ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={suggestion.severity === 'Crítico' ? 'destructive' : 'outline'}>
                        {suggestion.severity}
                      </Badge>
                      <Badge variant="secondary">{suggestion.category}</Badge>
                      {getConfidenceBadge(suggestion.confidence_score)}
                      {getVerificationBadge(suggestion)}
                    </div>
                  </div>
                  {!hasFeedback && (
                    <Button
                      size="sm"
                      onClick={() => setReviewingSuggestionId(suggestion.suggestion_id)}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Modal de Review */}
      <Dialog open={!!reviewingSuggestionId} onOpenChange={() => setReviewingSuggestionId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review da Sugestão</DialogTitle>
            <DialogDescription>
              Valide se esta sugestão da IA é precisa e relevante
            </DialogDescription>
          </DialogHeader>

          {reviewingSuggestion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{reviewingSuggestion.title}</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={reviewingSuggestion.severity === 'Crítico' ? 'destructive' : 'outline'}>
                    {reviewingSuggestion.severity}
                  </Badge>
                  <Badge variant="secondary">{reviewingSuggestion.category}</Badge>
                  {getConfidenceBadge(reviewingSuggestion.confidence_score)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notas (opcional)
                </label>
                <Textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Adicione observações sobre esta sugestão..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmitFeedback('already_fixed')}
              disabled={isSubmitting}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Já Corrigido
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmitFeedback('false_positive')}
              disabled={isSubmitting}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Falso Positivo
            </Button>
            <Button
              onClick={() => handleSubmitFeedback('valid')}
              disabled={isSubmitting}
              className="gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              Válido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

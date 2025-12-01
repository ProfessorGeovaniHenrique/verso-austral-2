import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestion } from "@/types/quiz.types";
import { useToast } from "@/hooks/use-toast";

export interface QuizQuestionInput {
  question_id: string;
  type: 'objective' | 'checkbox' | 'matching';
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'introducao' | 'aprendizado' | 'origens' | 'instrumentos';
  question: string;
  options?: string[];
  correct_answers: string[];
  matching_pairs?: { left: string; right: string }[];
  explanation?: string;
}

export function useQuizQuestions() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQuestions = async (filters?: { 
    category?: string; 
    difficulty?: string; 
    active?: boolean;
    searchText?: string;
  }) => {
    try {
      setLoading(true);
      let query = supabase
        .from('quiz_questions')
        .select('*')
        .order('category', { ascending: true })
        .order('difficulty', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters?.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }
      if (filters?.searchText) {
        query = query.ilike('question', `%${filters.searchText}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transformar para formato QuizQuestion
      const transformed = data.map(q => ({
        id: q.question_id,
        type: q.type as 'objective' | 'checkbox' | 'matching',
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        category: q.category as 'introducao' | 'aprendizado' | 'origens' | 'instrumentos',
        question: q.question,
        options: q.options as string[] | undefined,
        correctAnswers: q.correct_answers as string[],
        matchingPairs: q.matching_pairs as { left: string; right: string }[] | undefined,
        explanation: q.explanation,
        isActive: q.is_active,
        lastAiRefinement: q.last_ai_refinement,
        dbId: q.id,
      }));

      setQuestions(transformed);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar perguntas:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar perguntas",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (input: QuizQuestionInput) => {
    try {
      const { data, error: insertError } = await supabase
        .from('quiz_questions')
        .insert({
          question_id: input.question_id,
          type: input.type,
          difficulty: input.difficulty,
          category: input.category,
          question: input.question,
          options: input.options || null,
          correct_answers: input.correct_answers,
          matching_pairs: input.matching_pairs || null,
          explanation: input.explanation,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Pergunta criada",
        description: "Nova pergunta adicionada com sucesso",
      });

      await fetchQuestions();
      return { success: true, data };
    } catch (err: any) {
      console.error('Erro ao criar pergunta:', err);
      toast({
        title: "Erro ao criar pergunta",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  const updateQuestion = async (id: string, updates: Partial<QuizQuestionInput>) => {
    try {
      const { error: updateError } = await supabase
        .from('quiz_questions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('question_id', id);

      if (updateError) throw updateError;

      toast({
        title: "Pergunta atualizada",
        description: "Alterações salvas com sucesso",
      });

      await fetchQuestions();
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao atualizar pergunta:', err);
      toast({
        title: "Erro ao atualizar pergunta",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('question_id', id);

      if (deleteError) throw deleteError;

      toast({
        title: "Pergunta excluída",
        description: "Pergunta removida com sucesso",
      });

      await fetchQuestions();
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao excluir pergunta:', err);
      toast({
        title: "Erro ao excluir pergunta",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('quiz_questions')
        .update({ is_active: active })
        .eq('question_id', id);

      if (updateError) throw updateError;

      toast({
        title: active ? "Pergunta ativada" : "Pergunta desativada",
        description: `Pergunta ${active ? 'disponível' : 'indisponível'} no quiz`,
      });

      await fetchQuestions();
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao alterar status:', err);
      toast({
        title: "Erro ao alterar status",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  const refineWithAI = async (id: string) => {
    try {
      const question = questions.find(q => q.id === id);
      if (!question) throw new Error('Pergunta não encontrada');

      const { data, error: refineError } = await supabase.functions.invoke('refine-quiz-question', {
        body: {
          questionId: id,
          currentQuestion: {
            type: question.type,
            difficulty: question.difficulty,
            category: question.category,
            question: question.question,
            options: question.options,
            correctAnswers: question.correctAnswers,
            matchingPairs: question.matchingPairs,
            explanation: question.explanation,
          }
        }
      });

      if (refineError) throw refineError;

      return { success: true, data: data.refinedQuestion, original: data.original };
    } catch (err: any) {
      console.error('Erro ao refinar com IA:', err);
      toast({
        title: "Erro ao refinar pergunta",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    toggleActive,
    refineWithAI,
  };
}

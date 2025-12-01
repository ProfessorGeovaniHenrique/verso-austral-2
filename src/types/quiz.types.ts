export type QuestionType = 'objective' | 'checkbox' | 'matching';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionCategory = 'introducao' | 'aprendizado' | 'origens' | 'instrumentos';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  category: QuestionCategory;
  question: string;
  options?: string[];
  correctAnswers: string[];
  matchingPairs?: { left: string; right: string }[];
  explanation?: string;
  isActive?: boolean;
  lastAiRefinement?: string;
  dbId?: string;
}

export interface QuizAnswer {
  questionId: string;
  userAnswers: string[];
  isCorrect: boolean;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: QuizAnswer[];
  isComplete: boolean;
  score: number;
}

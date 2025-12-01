import { useState } from "react";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, RefreshCw } from "lucide-react";
import { QuizQuestion } from "@/types/quiz.types";
import { QuizQuestionInput } from "@/hooks/useQuizQuestions";

const CATEGORIES = [
  { value: 'introducao', label: 'Introdução' },
  { value: 'aprendizado', label: 'Aprendizado' },
  { value: 'origens', label: 'Origens' },
  { value: 'instrumentos', label: 'Instrumentos' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil', color: 'bg-green-500' },
  { value: 'medium', label: 'Médio', color: 'bg-yellow-500' },
  { value: 'hard', label: 'Difícil', color: 'bg-red-500' },
];

const TYPES = [
  { value: 'objective', label: 'Múltipla Escolha' },
  { value: 'checkbox', label: 'Múltiplas Respostas' },
  { value: 'matching', label: 'Relacionar' },
];

export default function AdminQuizCuration() {
  const { questions, loading, fetchQuestions, createQuestion, updateQuestion, deleteQuestion, toggleActive, refineWithAI } = useQuizQuestions();
  
  const [filters, setFilters] = useState({
    category: [] as string[],
    difficulty: [] as string[],
    active: true,
    searchText: '',
  });

  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [refinementData, setRefinementData] = useState<{ original: any; refined: any } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [refining, setRefining] = useState(false);

  // Novo estado da pergunta
  const [formData, setFormData] = useState<Partial<QuizQuestionInput>>({
    question_id: '',
    type: 'objective',
    difficulty: 'easy',
    category: 'introducao',
    question: '',
    options: ['', '', '', ''],
    correct_answers: [],
    matching_pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
    explanation: '',
  });

  const filteredQuestions = questions.filter(q => {
    if (filters.category.length > 0 && !filters.category.includes(q.category)) return false;
    if (filters.difficulty.length > 0 && !filters.difficulty.includes(q.difficulty)) return false;
    if (filters.active !== undefined && q.isActive !== filters.active) return false;
    if (filters.searchText && !q.question.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    return true;
  });

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_id: question.id,
      type: question.type,
      difficulty: question.difficulty,
      category: question.category,
      question: question.question,
      options: question.options || ['', '', '', ''],
      correct_answers: question.correctAnswers,
      matching_pairs: question.matchingPairs || [
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
      ],
      explanation: question.explanation,
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setFormData({
      question_id: `custom-${Date.now()}`,
      type: 'objective',
      difficulty: 'easy',
      category: 'introducao',
      question: '',
      options: ['', '', '', ''],
      correct_answers: [],
      matching_pairs: [
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' },
      ],
      explanation: '',
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.question || !formData.question_id) return;

    const input: QuizQuestionInput = {
      question_id: formData.question_id!,
      type: formData.type!,
      difficulty: formData.difficulty!,
      category: formData.category!,
      question: formData.question,
      options: formData.type === 'matching' ? undefined : formData.options,
      correct_answers: formData.correct_answers!,
      matching_pairs: formData.type === 'matching' ? formData.matching_pairs : undefined,
      explanation: formData.explanation,
    };

    if (isCreating) {
      await createQuestion(input);
    } else if (editingQuestion) {
      await updateQuestion(editingQuestion.id, input);
    }

    setEditingQuestion(null);
    setIsCreating(false);
  };

  const handleRefine = async (questionId: string) => {
    setRefining(true);
    const result = await refineWithAI(questionId);
    setRefining(false);
    
    if (result.success) {
      setRefinementData({
        original: result.original,
        refined: result.data,
      });
    }
  };

  const handleAcceptRefinement = async () => {
    if (!refinementData || !editingQuestion) return;

    await updateQuestion(editingQuestion.id, {
      question: refinementData.refined.question,
      options: refinementData.refined.options,
      correct_answers: refinementData.refined.correctAnswers,
      matching_pairs: refinementData.refined.matchingPairs,
      explanation: refinementData.refined.explanation,
    });

    setRefinementData(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Curadoria do Quiz</h1>
          <p className="text-muted-foreground">Gerencie as perguntas do quiz educacional</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pergunta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isCreating ? 'Nova Pergunta' : 'Editar Pergunta'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dificuldade</Label>
                  <Select value={formData.difficulty} onValueChange={(v: any) => setFormData({ ...formData, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Pergunta</Label>
                <Textarea 
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                />
              </div>

              {formData.type !== 'matching' && (
                <div>
                  <Label>Opções</Label>
                  {formData.options?.map((opt, i) => (
                    <div key={i} className="flex gap-2 mt-2">
                      <Input 
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(formData.options || [])];
                          newOpts[i] = e.target.value;
                          setFormData({ ...formData, options: newOpts });
                        }}
                        placeholder={`Opção ${i + 1}`}
                      />
                      <Checkbox 
                        checked={formData.correct_answers?.includes(opt)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, correct_answers: [...(formData.correct_answers || []), opt] });
                          } else {
                            setFormData({ ...formData, correct_answers: formData.correct_answers?.filter(a => a !== opt) });
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {formData.type === 'matching' && (
                <div>
                  <Label>Pares de Relacionamento</Label>
                  {formData.matching_pairs?.map((pair, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 mt-2">
                      <Input 
                        value={pair.left}
                        onChange={(e) => {
                          const newPairs = [...(formData.matching_pairs || [])];
                          newPairs[i] = { ...newPairs[i], left: e.target.value };
                          setFormData({ ...formData, matching_pairs: newPairs });
                        }}
                        placeholder="Esquerda"
                      />
                      <Input 
                        value={pair.right}
                        onChange={(e) => {
                          const newPairs = [...(formData.matching_pairs || [])];
                          newPairs[i] = { ...newPairs[i], right: e.target.value };
                          setFormData({ ...formData, matching_pairs: newPairs });
                        }}
                        placeholder="Direita"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Explicação</Label>
                <Textarea 
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                {!isCreating && editingQuestion && (
                  <Button variant="outline" onClick={() => handleRefine(editingQuestion.id)} disabled={refining}>
                    {refining ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Refinar com IA
                  </Button>
                )}
                <Button onClick={handleSave}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input 
                placeholder="Buscar por texto..."
                value={filters.searchText}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <div key={cat.value} className="flex items-center gap-2">
                  <Checkbox 
                    id={`cat-${cat.value}`}
                    checked={filters.category.includes(cat.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({ ...filters, category: [...filters.category, cat.value] });
                      } else {
                        setFilters({ ...filters, category: filters.category.filter(c => c !== cat.value) });
                      }
                    }}
                  />
                  <Label htmlFor={`cat-${cat.value}`}>{cat.label}</Label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {DIFFICULTIES.map(diff => (
                <div key={diff.value} className="flex items-center gap-2">
                  <Checkbox 
                    id={`diff-${diff.value}`}
                    checked={filters.difficulty.includes(diff.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({ ...filters, difficulty: [...filters.difficulty, diff.value] });
                      } else {
                        setFilters({ ...filters, difficulty: filters.difficulty.filter(d => d !== diff.value) });
                      }
                    }}
                  />
                  <Label htmlFor={`diff-${diff.value}`}>{diff.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perguntas */}
      <div className="space-y-2">
        {loading ? (
          <p>Carregando perguntas...</p>
        ) : (
          filteredQuestions.map(q => (
            <Card key={q.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline">{q.id}</Badge>
                    <Badge className={DIFFICULTIES.find(d => d.value === q.difficulty)?.color}>
                      {DIFFICULTIES.find(d => d.value === q.difficulty)?.label}
                    </Badge>
                    <Badge variant="secondary">
                      {CATEGORIES.find(c => c.value === q.category)?.label}
                    </Badge>
                    <Badge variant={q.isActive ? "default" : "secondary"}>
                      {q.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{q.question}</p>
                </div>
                
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handleEdit(q)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => toggleActive(q.id, !q.isActive)}
                  >
                    {q.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteQuestion(q.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sheet de Refinamento IA */}
      <Sheet open={!!refinementData} onOpenChange={() => setRefinementData(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Comparar: Original vs Refinada por IA</SheetTitle>
          </SheetHeader>
          
          {refinementData && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <h3 className="font-bold mb-2">Original</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Pergunta:</strong> {refinementData.original.question}</p>
                  {refinementData.original.options && (
                    <p><strong>Opções:</strong> {refinementData.original.options.join(', ')}</p>
                  )}
                  <p><strong>Explicação:</strong> {refinementData.original.explanation}</p>
                </div>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Refinada por IA ✨</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Pergunta:</strong> {refinementData.refined.question}</p>
                  {refinementData.refined.options && (
                    <p><strong>Opções:</strong> {refinementData.refined.options.join(', ')}</p>
                  )}
                  <p><strong>Explicação:</strong> {refinementData.refined.explanation}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-6">
            <Button onClick={handleAcceptRefinement} className="flex-1">
              Aceitar Refinamento
            </Button>
            <Button variant="outline" onClick={() => setRefinementData(null)} className="flex-1">
              Rejeitar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

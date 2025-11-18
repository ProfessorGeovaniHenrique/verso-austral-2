import { useMemo, useState } from 'react';
import { mvpEpics, postMvpEpics, v2Epics } from '@/data/developer-logs/product-roadmap';
import { constructionLog } from '@/data/developer-logs/construction-log';

export interface SearchResult {
  type: 'epic' | 'story' | 'decision' | 'phase';
  id: string;
  title: string;
  description: string;
  match: string;
  contextPath: string;
  relevance: number;
}

export function useDevHistorySearch(query: string) {
  const [isSearching, setIsSearching] = useState(false);
  
  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    
    setIsSearching(true);
    const searchTerm = query.toLowerCase();
    const foundResults: SearchResult[] = [];
    
    // Buscar em épicos
    [...mvpEpics, ...postMvpEpics, ...v2Epics].forEach(epic => {
      if (epic.name.toLowerCase().includes(searchTerm)) {
        foundResults.push({
          type: 'epic',
          id: epic.id,
          title: epic.name,
          description: `${epic.stories.length} histórias • ${epic.completionPercentage}% completo`,
          match: epic.name,
          contextPath: `${epic.phase} > Épico ${epic.number}`,
          relevance: 90
        });
      }
      
      // Buscar em stories do épico
      epic.stories.forEach(story => {
        if (story.title.toLowerCase().includes(searchTerm)) {
          foundResults.push({
            type: 'story',
            id: story.id,
            title: story.title,
            description: story.implemented ? '✅ Implementada' : '⏳ Pendente',
            match: story.title,
            contextPath: `${epic.phase} > ${epic.name}`,
            relevance: 85
          });
        }
        
        if (story.notes && story.notes.toLowerCase().includes(searchTerm)) {
          foundResults.push({
            type: 'story',
            id: story.id,
            title: story.title,
            description: story.notes,
            match: story.notes,
            contextPath: `${epic.phase} > ${epic.name}`,
            relevance: 75
          });
        }
      });
    });
    
    // Buscar em decisões técnicas
    constructionLog.forEach(phase => {
      phase.decisions.forEach(decision => {
        if (decision.decision.toLowerCase().includes(searchTerm) ||
            decision.rationale.toLowerCase().includes(searchTerm)) {
          foundResults.push({
            type: 'decision',
            id: `${phase.phase}-${decision.decision.substring(0, 20)}`,
            title: decision.decision,
            description: decision.rationale,
            match: decision.rationale,
            contextPath: phase.phase,
            relevance: 80
          });
        }
      });
    });
    
    // Buscar em fases
    constructionLog.forEach(phase => {
      if (phase.phase.toLowerCase().includes(searchTerm) ||
          phase.objective.toLowerCase().includes(searchTerm)) {
        foundResults.push({
          type: 'phase',
          id: phase.phase,
          title: phase.phase,
          description: phase.objective,
          match: phase.objective,
          contextPath: 'Timeline de Construção',
          relevance: 70
        });
      }
    });
    
    setIsSearching(false);
    
    // Ordenar por relevância
    return foundResults.sort((a, b) => b.relevance - a.relevance);
  }, [query]);
  
  return { results, isSearching };
}

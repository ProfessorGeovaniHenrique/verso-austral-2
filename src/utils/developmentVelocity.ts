import { mvpEpics, postMvpEpics, v2Epics } from '@/data/developer-logs/product-roadmap';

export interface MonthlyVelocity {
  month: string;
  monthLabel: string;
  storiesCompleted: number;
  storiesPlanned: number;
  epicsInProgress: string[];
}

export function calculateMonthlyVelocity(): MonthlyVelocity[] {
  const velocity: MonthlyVelocity[] = [];
  
  // Janeiro-Fevereiro 2025: Épico 0 (3 stories)
  velocity.push({
    month: '2025-01',
    monthLabel: 'Jan/2025',
    storiesCompleted: 3,
    storiesPlanned: 3,
    epicsInProgress: ['epic-0']
  });
  
  // Março 2025: Épico 1 início
  velocity.push({
    month: '2025-03',
    monthLabel: 'Mar/2025',
    storiesCompleted: 2,
    storiesPlanned: 5,
    epicsInProgress: ['epic-1']
  });
  
  // Abril 2025: Épico 1 continuação
  velocity.push({
    month: '2025-04',
    monthLabel: 'Abr/2025',
    storiesCompleted: 1,
    storiesPlanned: 5,
    epicsInProgress: ['epic-1']
  });
  
  // Maio 2025: Épico 1 finalização
  velocity.push({
    month: '2025-05',
    monthLabel: 'Mai/2025',
    storiesCompleted: 1,
    storiesPlanned: 5,
    epicsInProgress: ['epic-1']
  });
  
  // Novembro 2025: Épico 4 em progresso
  velocity.push({
    month: '2025-11',
    monthLabel: 'Nov/2025',
    storiesCompleted: 2,
    storiesPlanned: 2,
    epicsInProgress: ['epic-4']
  });
  
  return velocity;
}

export function getVelocityMetrics() {
  const velocity = calculateMonthlyVelocity();
  const totalCompleted = velocity.reduce((sum, v) => sum + v.storiesCompleted, 0);
  const totalPlanned = velocity.reduce((sum, v) => sum + v.storiesPlanned, 0);
  const averagePerMonth = totalCompleted / velocity.length;
  
  return {
    totalCompleted,
    totalPlanned,
    averagePerMonth: Math.round(averagePerMonth * 10) / 10,
    velocityData: velocity
  };
}

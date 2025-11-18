import { describe, test, expect } from 'vitest';
import { constructionLog } from '@/data/developer-logs/construction-log';
import { scientificChangelog } from '@/data/developer-logs/changelog-scientific';
import { milestones } from '@/data/developer-logs/product-roadmap';
import { isValidProjectDate } from '@/utils/dateHelpers';

describe('Date Validation', () => {
  test('Nenhuma data em construction_log deve ser anterior a 2025', () => {
    const allDates = [
      ...constructionLog.map(p => p.dateStart),
      ...constructionLog.filter(p => p.dateEnd).map(p => p.dateEnd as string),
    ];
    
    allDates.forEach(date => {
      if (date) {
        const year = parseInt(date.split('-')[0]);
        expect(year).toBeGreaterThanOrEqual(2025);
      }
    });
  });

  test('Nenhuma data em scientific_changelog deve ser anterior a 2025', () => {
    scientificChangelog.forEach(entry => {
      const year = parseInt(entry.date.split('-')[0]);
      expect(year).toBeGreaterThanOrEqual(2025);
    });
  });

  test('Nenhum milestone deve ser anterior a 2025', () => {
    milestones.forEach(milestone => {
      const year = parseInt(milestone.date.split(' ')[1]);
      expect(year).toBeGreaterThanOrEqual(2025);
    });
  });
  
  test('Datas em construction_log devem estar em ordem cronológica', () => {
    const phases = constructionLog.map(p => new Date(p.dateStart));
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].getTime()).toBeGreaterThanOrEqual(phases[i-1].getTime());
    }
  });

  test('Helper isValidProjectDate funciona corretamente', () => {
    expect(isValidProjectDate('2025-01-15')).toBe(true);
    expect(isValidProjectDate('2024-12-31')).toBe(false);
    expect(isValidProjectDate('Q1 2025')).toBe(true);
    expect(isValidProjectDate('Q4 2024')).toBe(false);
  });
});

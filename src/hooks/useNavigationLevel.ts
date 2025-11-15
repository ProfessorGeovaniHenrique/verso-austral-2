import { useState, useCallback } from 'react';

export type NavigationLevel = 'universe' | 'galaxy' | 'stellar-system' | 'scan';

export function useNavigationLevel() {
  const [level, setLevel] = useState<NavigationLevel>('universe');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const navigateToUniverse = useCallback(() => {
    setLevel('universe');
    setSelectedDomain(null);
    setSelectedWord(null);
  }, []);

  const navigateToGalaxy = useCallback((domainId: string) => {
    setLevel('galaxy');
    setSelectedDomain(domainId);
    setSelectedWord(null);
  }, []);

  const navigateToStellarSystem = useCallback((wordId: string) => {
    setLevel('stellar-system');
    setSelectedWord(wordId);
  }, []);

  const handleNavigate = useCallback((newLevel: NavigationLevel) => {
    if (newLevel === 'universe') {
      navigateToUniverse();
    } else if (newLevel === 'galaxy' && selectedDomain) {
      setLevel('galaxy');
      setSelectedWord(null);
    }
  }, [selectedDomain, navigateToUniverse]);

  return {
    level,
    selectedDomain,
    selectedWord,
    navigateToUniverse,
    navigateToGalaxy,
    navigateToStellarSystem,
    handleNavigate,
    setLevel,
  };
}

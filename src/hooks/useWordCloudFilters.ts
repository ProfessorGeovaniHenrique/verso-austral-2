import { useState, useMemo, useCallback } from 'react';

interface CloudNode {
  label: string;
  frequency: number;
  color: string;
  type: 'domain' | 'keyword';
  domain: string;
  tooltip: {
    prosody?: number;
    significancia?: string;
    [key: string]: any;
  };
}

export function useWordCloudFilters(nodes: CloudNode[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedProsody, setSelectedProsody] = useState<string>('all');
  const [selectedSignificance, setSelectedSignificance] = useState<string>('all');

  // Filter nodes based on all criteria
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // Search filter
    if (searchTerm) {
      result = result.filter(n =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Domain filter
    if (selectedDomain !== 'all') {
      result = result.filter(n => n.domain === selectedDomain);
    }

    // Prosody filter
    if (selectedProsody !== 'all') {
      result = result.filter(n => {
        const prosody = n.tooltip.prosody ?? 0;
        if (selectedProsody === 'positive') return prosody > 0;
        if (selectedProsody === 'negative') return prosody < 0;
        return prosody === 0;
      });
    }

    // Significance filter
    if (selectedSignificance !== 'all') {
      result = result.filter(n => n.tooltip.significancia === selectedSignificance);
    }

    return result;
  }, [nodes, searchTerm, selectedDomain, selectedProsody, selectedSignificance]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedDomain('all');
    setSelectedProsody('all');
    setSelectedSignificance('all');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' ||
           selectedDomain !== 'all' ||
           selectedProsody !== 'all' ||
           selectedSignificance !== 'all';
  }, [searchTerm, selectedDomain, selectedProsody, selectedSignificance]);

  return {
    searchTerm,
    setSearchTerm,
    selectedDomain,
    setSelectedDomain,
    selectedProsody,
    setSelectedProsody,
    selectedSignificance,
    setSelectedSignificance,
    filteredNodes,
    clearAllFilters,
    hasActiveFilters,
  };
}

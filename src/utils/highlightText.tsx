import React from 'react';

/**
 * Destaca termos de busca em um texto
 */
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) {
    return text;
  }

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-300 dark:bg-yellow-700 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * Verifica se um texto contém o termo de busca
 */
export function matchesSearch(text: string | null | undefined, searchTerm: string): boolean {
  if (!searchTerm.trim() || !text) return true;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
}

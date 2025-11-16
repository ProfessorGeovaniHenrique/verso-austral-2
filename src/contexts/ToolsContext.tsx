import { createContext, useContext, useState, ReactNode } from 'react';

interface ToolsContextType {
  selectedWord: string;
  setSelectedWord: (word: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToKWIC: (word: string) => void;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [selectedWord, setSelectedWord] = useState('');
  const [activeTab, setActiveTab] = useState('wordlist');

  const navigateToKWIC = (word: string) => {
    setSelectedWord(word);
    setActiveTab('kwic');
  };

  return (
    <ToolsContext.Provider value={{
      selectedWord,
      setSelectedWord,
      activeTab,
      setActiveTab,
      navigateToKWIC
    }}>
      {children}
    </ToolsContext.Provider>
  );
}

export function useTools() {
  const context = useContext(ToolsContext);
  if (!context) {
    throw new Error('useTools must be used within ToolsProvider');
  }
  return context;
}

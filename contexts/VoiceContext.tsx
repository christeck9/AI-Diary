import React, { createContext, useContext, useState } from 'react';
import { useVoice } from '../hooks/useVoice';
import { useLanguage } from './LanguageContext';

interface VoiceContextProps {
  voice: ReturnType<typeof useVoice>;
  isInteractiveRequested: boolean;
  setIsInteractiveRequested: (val: boolean) => void;
}

const VoiceContext = createContext<VoiceContextProps | undefined>(undefined);

export const VoiceProvider = ({ children }: { children: React.ReactNode }) => {
  const { lang } = useLanguage();
  // Se inicializa useVoice con el idioma del contexto dinámico
  const voice = useVoice(lang);
  const [isInteractiveRequested, setIsInteractiveRequested] = useState(false);

  return (
    <VoiceContext.Provider value={{ voice, isInteractiveRequested, setIsInteractiveRequested }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceContext = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }
  return context;
};

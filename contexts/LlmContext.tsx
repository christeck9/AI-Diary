import React, { createContext, useContext } from 'react';
import { useAppLlm } from '../hooks/useAppLlm';
import { useLanguage } from './LanguageContext';

// Re-export the hook's return type as the context type
type LlmContextType = ReturnType<typeof useAppLlm>;

const LlmContext = createContext<LlmContextType | null>(null);

/**
 * LlmProvider: wraps useAppLlm at the root layout level so the download
 * state survives tab navigation.
 */
export function LlmProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const llm = useAppLlm(lang);
  return <LlmContext.Provider value={llm}>{children}</LlmContext.Provider>;
}

/**
 * useLlm: drop-in replacement for useAppLlm() in any screen or component.
 * Must be used inside <LlmProvider>.
 */
export function useLlm(): LlmContextType {
  const ctx = useContext(LlmContext);
  if (!ctx) throw new Error('useLlm must be used inside <LlmProvider>');
  return ctx;
}

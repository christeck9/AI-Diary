import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { badgeService, BadgeCategory } from '../lib/BadgeService';
import { useVoiceContext } from '../contexts/VoiceContext';
import { useLanguage } from '../contexts/LanguageContext';

export function useBadgeTracker(category: BadgeCategory) {
  const hasActionRef = useRef(false);
  const { voice } = useVoiceContext();
  const { lang } = useLanguage();
  const db = useSQLiteContext();

  const markAction = useCallback(() => {
    hasActionRef.current = true;
    console.log(`[useBadgeTracker] Action marked for ${category}`);
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      // Reset action flag when tab is focused
      hasActionRef.current = false;

      return () => {
        // When tab is unfocused (user switches away), record the action
        if (hasActionRef.current) {
          hasActionRef.current = false;
          // Run asynchronously after a slight delay to avoid interrupting navigation transitions
          setTimeout(async () => {
            if (!db) return;
            const result = await badgeService.recordAction(db, category);
            if (result && result.awarded) {
              const congrats = lang === 'es' ? result.spanishCongrats : result.englishCongrats;
              if (congrats) {
                console.log(`[useBadgeTracker] Awarded ${category}! TTS: "${congrats}"`);
                voice.speak(congrats);
              }
            }
          }, 1200);
        }
      };
    }, [category, db, voice, lang])
  );

  return { markAction };
}

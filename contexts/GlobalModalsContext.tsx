import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProfileModal } from '../components/modals/ProfileModal';
import { IntroModal } from '../components/modals/IntroModal';
import { VaultExplorerModal } from '../components/modals/VaultExplorerModal';
import { VoiceSettingsModal } from '../components/modals/VoiceSettingsModal';
import { TestsMenuModal } from '../components/modals/TestsMenuModal';
import { PsyTestModal, MBTI_QUESTIONS, PSY_QUESTIONS } from '../components/modals/PsyTestModal';

import { useProfile } from './ProfileContext';
import { useAppTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { useSQLiteContext } from '../components/MemoryProvider';

export type ModalName = 'profile' | 'intro' | 'vault' | 'voice_settings' | 'tests_menu' | 'psy_test';

interface GlobalModalsContextType {
  openModal: (name: ModalName, payload?: any) => void;
  closeModal: (name: ModalName) => void;
}

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined);

export function GlobalModalsProvider({ children }: { children: ReactNode }) {
  const [activeModals, setActiveModals] = useState<Record<string, boolean>>({});
  const [psyStep, setPsyStep] = useState(0);
  const [psyAnswers, setPsyAnswers] = useState<number[]>([]);
  const [activeTest, setActiveTest] = useState<'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti'>('ocean');

  const openModal = (name: ModalName, payload?: any) => {
    setActiveModals(prev => ({ ...prev, [name]: true }));
    if (name === 'psy_test' && payload && payload.type) {
      setActiveTest(payload.type);
      setPsyStep(0);
      setPsyAnswers([]);
    }
  };

  const closeModal = (name: ModalName) => {
    setActiveModals(prev => ({ ...prev, [name]: false }));
  };

  return (
    <GlobalModalsContext.Provider value={{ openModal, closeModal }}>
      {children}
      <GlobalModalsRenderer 
        activeModals={activeModals} 
        closeModal={closeModal} 
        openModal={openModal}
        psyStep={psyStep}
        setPsyStep={setPsyStep}
        psyAnswers={psyAnswers}
        setPsyAnswers={setPsyAnswers}
        activeTest={activeTest}
      />
    </GlobalModalsContext.Provider>
  );
}

function GlobalModalsRenderer({ activeModals, closeModal, openModal, psyStep, setPsyStep, psyAnswers, setPsyAnswers, activeTest }: any) {
  const { userProfile, setUserProfile, psyProfile, setPsyProfile, setPsyCompleted } = useProfile();
  const { colors } = useAppTheme();
  const { lang } = useLanguage();
  const db = useSQLiteContext();

  return (
    <>
      {!!activeModals['profile'] && (
        <ProfileModal
          visible={true}
          onClose={() => closeModal('profile')}
          lang={lang}
          colors={colors}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          psyProfile={psyProfile}
          db={db}
        />
      )}

      {!!activeModals['intro'] && (
        <IntroModal
          visible={true}
          onClose={() => closeModal('intro')}
          lang={lang}
          colors={colors}
        />
      )}

      {!!activeModals['tests_menu'] && (
        <TestsMenuModal
          visible={true}
          onClose={() => closeModal('tests_menu')}
          lang={lang}
          colors={colors}
          onSelectTest={(type: any) => {
            closeModal('tests_menu');
            openModal('psy_test', { type });
          }}
        />
      )}

      {!!activeModals['psy_test'] && (
        <PsyTestModal
          visible={true}
          onClose={() => closeModal('psy_test')}
          lang={lang}
          colors={colors}
          psyProfile={psyProfile}
          psyStep={psyStep}
          setPsyStep={setPsyStep}
          psyAnswers={psyAnswers}
          setPsyAnswers={setPsyAnswers}
          activeTest={activeTest}
          scoreTest={async (type, answers) => {
            if (type === 'ocean') {
              const dims: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [], D: [], L: [] };
              answers.forEach((ansIdx, i) => {
                const q = PSY_QUESTIONS[i];
                const opt = q?.opts[ansIdx];
                if (opt && opt.dim) {
                  dims[opt.dim].push(opt.val);
                }
              });
              const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5;
              const scores = {
                O: avg(dims.O),
                C: avg(dims.C),
                E: avg(dims.E),
                A: avg(dims.A),
                N: avg(dims.N),
                D: avg(dims.D),
                L: avg(dims.L),
                moodBalance: psyProfile.moodBalance,
                mbtiType: psyProfile.mbtiType,
              };
              setPsyProfile(scores);
              setPsyCompleted(true);
              if (db) {
                await db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [scores.O, scores.C, scores.E, scores.A, scores.N, scores.D, scores.L, scores.moodBalance, scores.mbtiType]);
              }
            } else if (type === 'mbti') {
              const dims: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
              answers.forEach((ansIdx, i) => {
                const opt = MBTI_QUESTIONS[i]?.opts[ansIdx];
                if (opt && opt.dim) dims[opt.dim]++;
              });
              const res = (dims.E >= dims.I ? 'E' : 'I') +
                (dims.S >= dims.N ? 'S' : 'N') +
                (dims.T >= dims.F ? 'T' : 'F') +
                (dims.J >= dims.P ? 'J' : 'P');
              setPsyProfile((prev: any) => {
                const newProfile = { ...prev, mbtiType: res };
                if (db) {
                  db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newProfile.O, newProfile.C, newProfile.E, newProfile.A, newProfile.N, newProfile.D, newProfile.L, newProfile.moodBalance, newProfile.mbtiType]).catch((err: any) => console.log('[DB_ERROR]', err));
                }
                return newProfile;
              });
            } else if (type === 'mood') {
              const sum = answers.reduce((a, b) => a + b, 0);
              const normalized = sum / (answers.length * 3); // 25 questions * max 3 = 75
              setPsyProfile((prev: any) => {
                const newProfile = { ...prev, moodBalance: normalized };
                if (db) {
                  db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newProfile.O, newProfile.C, newProfile.E, newProfile.A, newProfile.N, newProfile.D, newProfile.L, newProfile.moodBalance, newProfile.mbtiType]).catch((err: any) => console.log('[DB_ERROR]', err));
                }
                return newProfile;
              });
            }
            console.log(`[TEST_COMPLETE] ${type} scored with ${answers.length} answers.`);
          }}
        />
      )}

      {!!activeModals['vault'] && (
        <VaultExplorerModal
          visible={true}
          onClose={() => closeModal('vault')}
          colors={colors}
          lang={lang}
        />
      )}

      {!!activeModals['voice_settings'] && (
        <VoiceSettingsModal
          visible={true}
          onClose={() => closeModal('voice_settings')}
          lang={lang}
          colors={colors}
        />
      )}
    </>
  );
}

export function useGlobalModals() {
  const context = useContext(GlobalModalsContext);
  if (!context) {
    throw new Error('useGlobalModals must be used within a GlobalModalsProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSQLiteContext } from '../components/MemoryProvider';

export interface UserProfile {
  name: string;
  nickname: string;
  work: string;
  likes: string;
  values: string[];
  shortTermGoal: string;
  longTermGoal: string;
  responseStyle: string[];
}

export interface PsyProfile {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
  D: number;
  L: number;
  moodBalance: number;
  mbtiType: string;
}

interface ProfileContextType {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  psyProfile: PsyProfile;
  setPsyProfile: React.Dispatch<React.SetStateAction<PsyProfile>>;
  psyCompleted: boolean;
  setPsyCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  fetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    nickname: '',
    work: '',
    likes: '',
    values: [],
    shortTermGoal: '',
    longTermGoal: '',
    responseStyle: []
  });
  
  const [psyProfile, setPsyProfile] = useState<PsyProfile>({
    O: 0, C: 0, E: 0, A: 0, N: 0, D: 0, L: 0, moodBalance: 0, mbtiType: ''
  });
  
  const [psyCompleted, setPsyCompleted] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!db) return;
    try {
      // Load User Profile
      const profileRes: any[] = await db.getAllAsync('SELECT * FROM user_profile LIMIT 1');
      if (profileRes && profileRes.length > 0) {
        setUserProfile({
          name: profileRes[0].name || '',
          nickname: profileRes[0].nickname || '',
          work: profileRes[0].work || '',
          likes: profileRes[0].likes || '',
          values: profileRes[0].values_tags ? JSON.parse(profileRes[0].values_tags) : [],
          shortTermGoal: profileRes[0].short_term_goal || '',
          longTermGoal: profileRes[0].long_term_goal || '',
          responseStyle: profileRes[0].response_style_tags ? JSON.parse(profileRes[0].response_style_tags) : []
        });
      }

      // Load Psy Profile
      const psyRes: any[] = await db.getAllAsync('SELECT * FROM psy_profile LIMIT 1');
      if (psyRes && psyRes.length > 0) {
        setPsyProfile({
          O: psyRes[0].O,
          C: psyRes[0].C,
          E: psyRes[0].E,
          A: psyRes[0].A,
          N: psyRes[0].N,
          D: psyRes[0].D,
          L: psyRes[0].L,
          moodBalance: psyRes[0].mood_balance ?? 0,
          mbtiType: psyRes[0].mbti_type ?? ''
        });
        setPsyCompleted(true);
      }
    } catch (e) {
      console.error('[PROFILE CONTEXT] Error fetching profile:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{
      userProfile, setUserProfile,
      psyProfile, setPsyProfile,
      psyCompleted, setPsyCompleted,
      fetchProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

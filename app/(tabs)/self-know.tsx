import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Platform, StatusBar, Dimensions } from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useSQLiteContext } from 'expo-sqlite';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { PsiIcon } from '../../components/ui/PsiIcon';
const SnowflakeChart = React.lazy(() => import('../../components/ui/SnowflakeChart').then(m => ({ default: m.SnowflakeChart })));
const PsyTestModal = React.lazy(() => import('../../components/modals/PsyTestModal').then(m => ({ default: m.PsyTestModal })));
import { MBTI_QUESTIONS, PSY_QUESTIONS } from '../../components/modals/PsyTestModal';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
// expo-print and expo-sharing are dynamically imported
import Svg, { Line } from 'react-native-svg';
import { useLlmState } from '../../contexts/LlmContext';

export default function SelfKnowScreen() {
  const { colors, activeTheme } = useAppTheme();
  const { lang } = useLanguage();
  const { psyProfile, setPsyProfile, setPsyCompleted, userProfile } = useProfile();
  const db = useSQLiteContext();
  const { status, activeModel } = useLlmState();

  // Local modals state
  const [isPsyTestVisible, setIsPsyTestVisible] = useState(false);
  const [isPsyTestMounted, setIsPsyTestMounted] = useState(false);
  const [activeTestType, setActiveTestType] = useState<'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti'>('ocean');
  const [localPsyStep, setLocalPsyStep] = useState(0);
  const [localPsyAnswers, setLocalPsyAnswers] = useState<number[]>([]);

  const handleOpenTest = (type: typeof activeTestType) => {
    setActiveTestType(type);
    setLocalPsyStep(0);
    setLocalPsyAnswers([]);
    setIsPsyTestMounted(true);
    setTimeout(() => {
      setIsPsyTestVisible(true);
    }, 50);
  };

  const handleCloseTest = () => {
    setIsPsyTestVisible(false);
    setTimeout(() => {
      setIsPsyTestMounted(false);
    }, 500);
  };

  const handleScoreTest = async (type: string, answers: number[]) => {
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
  };

  // Kebab handlers and vault checkers removed

  // --- Mind Map Nodes Generation ---
  const surroundingNodes: { label: string; color: string; type: string }[] = [];

  // 1. MBTI
  if (psyProfile.mbtiType) {
    surroundingNodes.push({
      label: psyProfile.mbtiType,
      color: '#a855f7', // Purple
      type: 'mbti'
    });
  }

  // 2. Values
  if (userProfile.values && userProfile.values.length > 0) {
    userProfile.values.slice(0, 2).forEach(val => {
      surroundingNodes.push({
        label: val,
        color: '#4ade80', // Green
        type: 'value'
      });
    });
  }

  // 3. Interests (Likes)
  if (userProfile.likes) {
    const likesList = userProfile.likes.split(/[,,;]/).map(s => s.trim()).filter(Boolean);
    likesList.slice(0, 2).forEach(like => {
      surroundingNodes.push({
        label: like,
        color: '#fbbf24', // Amber/Yellow
        type: 'interest'
      });
    });
  }

  // 4. Goals
  if (userProfile.shortTermGoal) {
    const shortened = userProfile.shortTermGoal.length > 12 
      ? userProfile.shortTermGoal.substring(0, 10) + '...' 
      : userProfile.shortTermGoal;
    surroundingNodes.push({
      label: shortened,
      color: '#60a5fa', // Blue
      type: 'goal'
    });
  }

  // Default placeholders if empty
  const nodesToRender = surroundingNodes.length > 0 ? surroundingNodes : [
    { label: lang === 'es' ? 'Valores' : 'Values', color: colors.border, type: 'default' },
    { label: lang === 'es' ? 'Intereses' : 'Interests', color: colors.border, type: 'default' },
    { label: 'MBTI', color: colors.border, type: 'default' },
    { label: lang === 'es' ? 'Metas' : 'Goals', color: colors.border, type: 'default' },
    { label: 'OCEAN+', color: colors.border, type: 'default' }
  ];

  // Layout Math
  const screenWidth = Dimensions.get('window').width;
  const cx = (screenWidth - 40) / 2;
  const cy = 135;
  const r = 85;
  const chipWidth = 84;
  const chipHeight = 32;

  const escapeHtml = (unsafe: string) => {
    return (unsafe || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const cleanMessageText = (text: string, role: string) => {
    let clean = text || '';
    if (role === 'ai') {
      clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
      clean = clean.replace(/<\|thought\|>[\s\S]*?<\/\|thought\|>/gi, '');
      clean = clean.replace(/<thought>[\s\S]*/gi, '');
      clean = clean.replace(/<\|thought\|>[\s\S]*/gi, '');
    }
    return escapeHtml(clean.trim());
  };

  const handleExportClinical = async () => {
    if (!db) return;
    try {
      const pRes: any[] = await db.getAllAsync('SELECT * FROM user_profile LIMIT 1');
      const msgsRaw: any[] = await db.getAllAsync('SELECT * FROM messages ORDER BY created_at ASC');
      // Limit to 200 messages to prevent OOM / UI Thread block in PDF rendering
      const msgs = msgsRaw.length > 200 ? msgsRaw.slice(-200) : msgsRaw;
      const profile = pRes[0] || { name: 'Unknown', nickname: 'User' };
      
      let chatHtml = '';
      if (msgs.length === 0) {
        chatHtml = `<p style="font-style: italic; color: #777;">${
          lang === 'es' 
            ? 'No hay mensajes en el historial (mostrando últimos 200).' 
            : 'No messages in chat history (showing last 200).'
        }</p>`;
      } else {
        chatHtml = msgs.map(m => {
          const isUser = m.role === 'user';
          const cleanText = cleanMessageText(m.text, m.role);
          const dateStr = formatMessageDate(m.created_at || Date.now());
          const senderName = isUser ? escapeHtml(profile.nickname || profile.name || (lang === 'es' ? 'Paciente' : 'Patient')) : 'AI Diary';
          const bubbleBg = isUser ? '#f1f5f9' : '#f0fbf6';
          const borderColor = isUser ? '#64748b' : '#10b981';
          return `
            <div style="margin-bottom: 12px; padding: 12px; border-radius: 8px; background-color: ${bubbleBg}; border-left: 4px solid ${borderColor};">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; color: #666;">
                <strong>${senderName}</strong>
                <span>${dateStr}</span>
              </div>
              <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${cleanText}</div>
            </div>
          `;
        }).join('');
      }

      // Generate HTML
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #666; margin-bottom: 25px; }
              .section { margin-bottom: 30px; }
              .section-title { font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #5c84a8; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
              .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
              .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Historial Clínico Completo' : 'Complete Clinical History'}</h1>
            <div class="subtitle">${lang === 'es' ? 'Fecha de generación' : 'Generation date'}: ${new Date().toLocaleString()}</div>
            
            <div class="section patient-info">
              <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #475569;">
                ${lang === 'es' ? 'Información del Paciente' : 'Patient Information'}
              </div>
              <div class="patient-grid">
                <div><strong>${lang === 'es' ? 'Nombre' : 'Name'}:</strong> ${escapeHtml(profile.name || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Alias' : 'Nickname'}:</strong> ${escapeHtml(profile.nickname || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Profesión/Ocupación' : 'Profession/Occupation'}:</strong> ${escapeHtml(profile.work || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Intereses' : 'Interests'}:</strong> ${escapeHtml(profile.likes || 'N/A')}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">${lang === 'es' ? 'Historial de Conversaciones (Últimos 200 mensajes)' : 'Chat History (Last 200 messages)'}</div>
              ${chatHtml}
            </div>
          </body>
        </html>
      `;

      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error(e); }
  };

  const handleExportPsycho = async () => {
    if (!db) return;
    try {
      const pRes: any[] = await db.getAllAsync('SELECT * FROM user_profile LIMIT 1');
      const psyRes: any[] = await db.getAllAsync('SELECT * FROM psy_profile LIMIT 1');
      const profile = pRes[0] || { name: 'Unknown', nickname: 'User' };
      const psy = psyRes[0];
      if (!psy) {
        Alert.alert(
          lang === 'es' ? 'Test no completado' : 'Test not completed',
          lang === 'es' ? 'Completa el test de personalidad en el chat para poder exportar el reporte.'
            : 'Complete the personality test in the chat to export the report.'
        );
        return;
      }

      const mbti = psy.mbti_type || 'N/A';
      const mood = psy.mood_balance !== undefined ? `${Math.round(psy.mood_balance * 100)}%` : 'N/A';
      const getVal = (val: number | null | undefined) => 
        val !== null && val !== undefined && !isNaN(val) ? `${Math.round(val * 100)}%` : 'N/A';

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #666; margin-bottom: 25px; }
              .section { margin-bottom: 30px; }
              .section-title { font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #5c84a8; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
              .grid { display: flex; flex-direction: column; gap: 8px; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; }
              .label { font-weight: bold; }
              .val { color: #555; }
              .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
              .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Reporte Psicológico de Personalidad' : 'Psychological Personality Report'}</h1>
            <div class="subtitle">${lang === 'es' ? 'Fecha de generación' : 'Generation date'}: ${new Date().toLocaleString()}</div>
            
            <div class="section patient-info">
              <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #475569;">
                ${lang === 'es' ? 'Información del Paciente' : 'Patient Information'}
              </div>
              <div class="patient-grid">
                <div><strong>${lang === 'es' ? 'Nombre' : 'Name'}:</strong> ${escapeHtml(profile.name || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Alias' : 'Nickname'}:</strong> ${escapeHtml(profile.nickname || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Profesión/Ocupación' : 'Profession/Occupation'}:</strong> ${escapeHtml(profile.work || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Intereses' : 'Interests'}:</strong> ${escapeHtml(profile.likes || 'N/A')}</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">${lang === 'es' ? 'Perfil OCEAN+' : 'OCEAN+ Profile'}</div>
              <div class="grid">
                <div class="row"><span class="label">${lang === 'es' ? 'Apertura (O)' : 'Openness (O)'}:</span><span class="val">${getVal(psy.O)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Responsabilidad (C)' : 'Conscientiousness (C)'}:</span><span class="val">${getVal(psy.C)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Extraversión (E)' : 'Extraversion (E)'}:</span><span class="val">${getVal(psy.E)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Amabilidad (A)' : 'Agreeableness (A)'}:</span><span class="val">${getVal(psy.A)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Estabilidad Emocional (N)' : 'Emotional Stability (N)'}:</span><span class="val">${getVal(psy.N)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Velocidad de Decisión (D)' : 'Decision Speed (D)'}:</span><span class="val">${getVal(psy.D)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Estilo de Aprendizaje (L)' : 'Learning Style (L)'}:</span><span class="val">${getVal(psy.L)}</span></div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">${lang === 'es' ? 'Indicadores Adicionales' : 'Additional Metrics'}</div>
              <div class="grid">
                <div class="row"><span class="label">MBTI:</span><span class="val">${mbti}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Balance Emocional' : 'Emotional Balance'}:</span><span class="val">${mood}</span></div>
              </div>
            </div>
          </body>
        </html>
      `;

      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error(e); }
  };

  const formatMessageDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportWeeklyChat = async () => {
    if (!db) return;
    try {
      const pRes: any[] = await db.getAllAsync('SELECT * FROM user_profile LIMIT 1');
      const psyRes: any[] = await db.getAllAsync('SELECT * FROM psy_profile LIMIT 1');
      const profile = pRes[0] || { name: 'Unknown', nickname: 'User' };
      const psy = psyRes[0];

      // Retrieve messages from the last 7 days (7 * 24 * 60 * 60 * 1000 ms)
      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const msgs: any[] = await db.getAllAsync(
        'SELECT * FROM messages WHERE created_at >= ? ORDER BY created_at ASC',
        [sevenDaysAgoMs]
      );

      const now = new Date();
      const sevenDaysAgoDate = new Date(sevenDaysAgoMs);
      const dateRangeString = lang === 'es'
        ? `${sevenDaysAgoDate.toLocaleDateString('es-ES')} - ${now.toLocaleDateString('es-ES')}`
        : `${sevenDaysAgoDate.toLocaleDateString('en-US')} - ${now.toLocaleDateString('en-US')}`;

      // Set up values for personality
      const mbti = psy?.mbti_type || 'N/A';
      const mood = psy?.mood_balance !== undefined ? `${Math.round(psy.mood_balance * 100)}%` : 'N/A';
      const getVal = (val: number | null | undefined) => 
        val !== null && val !== undefined && !isNaN(val) ? `${Math.round(val * 100)}%` : 'N/A';

      // Format weekly chat HTML
      let chatHtml = '';
      if (msgs.length === 0) {
        chatHtml = `<p style="font-style: italic; color: #777;">${
          lang === 'es' 
            ? 'No se registraron conversaciones en los últimos 7 días.' 
            : 'No conversations recorded in the last 7 days.'
        }</p>`;
      } else {
        chatHtml = msgs.map(m => {
          const isUser = m.role === 'user';
          const cleanText = cleanMessageText(m.text, m.role);
          const dateStr = formatMessageDate(m.created_at || Date.now());
          const senderName = isUser ? escapeHtml(profile.nickname || profile.name || (lang === 'es' ? 'Paciente' : 'Patient')) : 'AI Diary';
          const bubbleBg = isUser ? '#f1f5f9' : '#f0fbf6';
          const borderColor = isUser ? '#64748b' : '#10b981';
          return `
            <div style="margin-bottom: 12px; padding: 12px; border-radius: 8px; background-color: ${bubbleBg}; border-left: 4px solid ${borderColor};">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; color: #666;">
                <strong>${senderName}</strong>
                <span>${dateStr}</span>
              </div>
              <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${cleanText}</div>
            </div>
          `;
        }).join('');
      }

      // Generate HTML
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #666; margin-bottom: 25px; }
              .section { margin-bottom: 30px; }
              .section-title { font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #5c84a8; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
              .grid { display: flex; flex-direction: column; gap: 8px; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; }
              .label { font-weight: bold; }
              .val { color: #555; }
              .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
              .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Reporte Clínico Semanal' : 'Weekly Clinical Report'}</h1>
            <div class="subtitle">${lang === 'es' ? 'Rango de fechas' : 'Date range'}: ${dateRangeString}</div>
            
            <div class="section patient-info">
              <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #475569;">
                ${lang === 'es' ? 'Información del Paciente' : 'Patient Information'}
              </div>
              <div class="patient-grid">
                <div><strong>${lang === 'es' ? 'Nombre' : 'Name'}:</strong> ${escapeHtml(profile.name || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Alias' : 'Nickname'}:</strong> ${escapeHtml(profile.nickname || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Profesión/Ocupación' : 'Profession/Occupation'}:</strong> ${escapeHtml(profile.work || 'N/A')}</div>
                <div><strong>${lang === 'es' ? 'Intereses' : 'Interests'}:</strong> ${escapeHtml(profile.likes || 'N/A')}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">${lang === 'es' ? 'Perfil Psicológico de Personalidad' : 'Psychological Personality Profile'}</div>
              ${psy ? `
              <div class="grid">
                <div class="row"><span class="label">${lang === 'es' ? 'Apertura (O)' : 'Openness (O)'}:</span><span class="val">${getVal(psy.O)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Responsabilidad (C)' : 'Conscientiousness (C)'}:</span><span class="val">${getVal(psy.C)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Extraversión (E)' : 'Extraversion (E)'}:</span><span class="val">${getVal(psy.E)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Amabilidad (A)' : 'Agreeableness (A)'}:</span><span class="val">${getVal(psy.A)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Estabilidad Emocional (N)' : 'Emotional Stability (N)'}:</span><span class="val">${getVal(psy.N)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Velocidad de Decisión (D)' : 'Decision Speed (D)'}:</span><span class="val">${getVal(psy.D)}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Estilo de Aprendizaje (L)' : 'Learning Style (L)'}:</span><span class="val">${getVal(psy.L)}</span></div>
                <div class="row"><span class="label">MBTI:</span><span class="val">${mbti}</span></div>
                <div class="row"><span class="label">${lang === 'es' ? 'Balance Emocional' : 'Emotional Balance'}:</span><span class="val">${mood}</span></div>
              </div>
              ` : `<p style="font-style: italic; color: #777;">${lang === 'es' ? 'Sin datos de tests de personalidad aún.' : 'No personality test data available yet.'}</p>`}
            </div>

            <div class="section">
              <div class="section-title">${lang === 'es' ? 'Historial de Conversaciones (Últimos 7 Días)' : 'Chat History (Last 7 Days)'}</div>
              ${chatHtml}
            </div>
          </body>
        </html>
      `;

      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error(e); }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <SanctuaryHeader 
          activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
        />
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' ? 100 : 40 }]}
        >
        <Text style={[styles.title, { color: colors.primary }]}>
          {lang === 'es' ? 'Centro de Autoconocimiento' : 'Self-Knowledge Center'}
        </Text>

        {/* Cuestionarios */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: colors.secondary }]}
            onPress={() => handleOpenTest('ocean')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '1. Test Inicial (OCEAN+) [25 Q]' : '1. Initial Test (OCEAN+) [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Perfil de personalidad básico.' : 'Basic personality profile.'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: '#4ade80' }]}
            onPress={() => handleOpenTest('aptitude')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '2. Test de Aptitudes [25 Q]' : '2. Aptitude Test [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Descubre tus habilidades naturales.' : 'Discover your natural skills.'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: '#fbbf24' }]}
            onPress={() => handleOpenTest('vocational')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '3. Test Vocacional [25 Q]' : '3. Vocational Test [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Orientación de propósito y carrera.' : 'Purpose and career orientation.'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: '#f87171' }]}
            onPress={() => handleOpenTest('anxiety')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '4. Test de Balance Emocional [25 Q]' : '4. Emotional Balance Test [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Evaluación de balance y estabilidad emocional.' : 'Evaluation of emotional balance and stability.'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: '#60a5fa' }]}
            onPress={() => handleOpenTest('mood')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '5. Test de Bienestar Emocional [25 Q]' : '5. Emotional Well-being Test [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Monitoreo y reflexión de bienestar cotidiano.' : 'Daily well-being monitoring and reflection.'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderLeftColor: '#a855f7' }]}
            onPress={() => handleOpenTest('mbti')}
          >
            <Text style={[styles.buttonTitle, { color: colors.textPrimary }]}>{lang === 'es' ? '6. Test de Personalidad 16r [25 Q]' : '6. 16r Personality Test [25 Q]'}</Text>
            <Text style={[styles.buttonDesc, { color: colors.textSecondary }]}>{lang === 'es' ? 'Arquetipo de personalidad (Jung).' : 'Personality archetype (Jung).'}</Text>
          </TouchableOpacity>
        </View>

        {/* Snowflake Analysis */}
        <Text style={[styles.sectionLabel, { color: colors.primary, fontWeight: 'bold', marginTop: 15 }]}>
          {lang === 'es' ? 'Copo de Nieve (Análisis Cognitivo)' : 'Snowflake Analysis (Cognitive)'}
        </Text>
        <View style={[styles.chartBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <React.Suspense fallback={null}>
            <SnowflakeChart 
              data={{
                O: psyProfile.O || 0,
                C: psyProfile.C || 0,
                E: psyProfile.E || 0,
                A: psyProfile.A || 0,
                S: 1 - (psyProfile.N || 0),
                M: psyProfile.moodBalance || 0
              }}
              size={220}
              colors={colors}
              lang={lang}
            />
          </React.Suspense>
          <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: -10, marginBottom: 10 }}>
            {lang === 'es' ? 'Tu silueta cognitiva se ajusta con cada test.' : 'Your cognitive silhouette adjusts with each test.'}
          </Text>
        </View>

        {/* Mind Map */}
        <Text style={[styles.sectionLabel, { color: colors.primary, fontWeight: 'bold', marginTop: 15 }]}>
          {lang === 'es' ? 'Mapa Mental' : 'Mind Map'}
        </Text>
        <View style={[styles.mindMapBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, height: 270, marginBottom: 20 }]}>
          {/* SVG Connecting Lines */}
          <Svg style={StyleSheet.absoluteFill}>
            {nodesToRender.map((node, i) => {
              const numNodes = Math.max(1, nodesToRender.length);
              const angle = (i * 2 * Math.PI) / numNodes - Math.PI / 2;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              
              // Evitar valores NaN en coordenadas
              const safeX = isNaN(x) ? cx : x;
              const safeY = isNaN(y) ? cy : y;
              
              return (
                <Line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={safeX}
                  y2={safeY}
                  stroke={activeTheme === 'matrix' ? '#00FF00' : (colors.primary || '#6366f1')}
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              );
            })}
          </Svg>

          {/* Surrounding Node Chips */}
          {nodesToRender.map((node, i) => {
            const numNodes = Math.max(1, nodesToRender.length);
            const angle = (i * 2 * Math.PI) / numNodes - Math.PI / 2;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            
            const safeX = isNaN(x) ? cx : x;
            const safeY = isNaN(y) ? cy : y;
            
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={node.type === 'default' ? 0.7 : 0.85}
                onPress={() => {
                  if (node.type === 'default') {
                    Alert.alert(
                      lang === 'es' ? 'Mapa Mental Vacío' : 'Empty Mind Map',
                      lang === 'es' 
                        ? 'Completa tu perfil en la configuración o realiza tests de personalidad para rellenar este nodo.'
                        : 'Complete your profile in settings or take personality tests to populate this node.'
                    );
                  }
                }}
                style={[
                  styles.mindMapChip,
                  {
                    left: safeX - chipWidth / 2,
                    top: safeY - chipHeight / 2,
                    width: chipWidth,
                    height: chipHeight,
                    borderColor: node.color || '#DDD',
                    backgroundColor: colors.surface || '#FFF',
                  }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {node.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Central Core User Node */}
          <View style={[
            styles.mindMapCenterNode,
            {
              left: cx - 35,
              top: cy - 35,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            }
          ]}>
            <PsiIcon size={24} color="#FFF" />
            <Text style={styles.centerNodeText} numberOfLines={1}>
              {userProfile.nickname || (lang === 'es' ? 'Tú' : 'You')}
            </Text>
          </View>
        </View>

        {/* Banner de Calibración */}
        <View style={[styles.bannerCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
            {lang === 'es' 
              ? 'Elige uno de los cuestionarios de arriba para calibrar la personalidad y el tono de respuesta de tu IA.' 
              : 'Choose one of the questionnaires above to calibrate your AI\'s personality and response style.'}
          </Text>
        </View>

        {/* Botones de Exportar */}
        <View style={{ width: '100%', marginTop: 20 }}>

          <Text style={[styles.exportSubtitle, { color: colors.textSecondary }]}>
            {lang === 'es' 
              ? 'Exporta los resultados de tu test de personalidad en formato PDF.' 
              : 'Export your personality test results in a PDF format.'}
          </Text>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#7da885' }]} onPress={handleExportPsycho}>
            <Text style={styles.exportButtonText}>
              {lang === 'es' ? 'EXPORTAR REPORTE DE PERSONALIDAD (PDF)' : 'EXPORT PERSONALITY REPORT (PDF)'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.exportSubtitle, { color: colors.textSecondary, marginTop: 15 }]}>
            {lang === 'es' 
              ? 'Exporta un reporte semanal de reflexiones en formato clínico para tu psicólogo o terapeuta.' 
              : 'Export a weekly reflections report in clinical format for your psychologist or therapist.'}
          </Text>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#62929e' }]} onPress={handleExportWeeklyChat}>
            <Text style={styles.exportButtonText}>
              {lang === 'es' ? 'EXPORTAR REPORTE SEMANAL DE CHAT (PDF)' : 'EXPORT WEEKLY CHAT REPORT (PDF)'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.exportSubtitle, { color: colors.textSecondary, marginTop: 15 }]}>
            {lang === 'es' 
              ? 'Exportar todos los datos puede funcionar como un reporte clínico o como una auditoría de esta aplicación mostrando toda la información almacenada.' 
              : 'Exporting all data can work like a clinical report or like an audit for this app showing all data stored.'}
          </Text>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#5c84a8' }]} onPress={handleExportClinical}>
            <Text style={styles.exportButtonText}>
              {lang === 'es' ? 'EXPORTAR TODO EL HISTORIAL DE DATOS (PDF)' : 'EXPORT ALL DATA HISTORY (PDF)'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>

    {isPsyTestMounted && (
      <React.Suspense fallback={null}>
        <PsyTestModal
          visible={isPsyTestVisible}
          onClose={handleCloseTest}
          lang={lang}
          colors={colors}
          psyProfile={psyProfile}
          psyStep={localPsyStep}
          setPsyStep={setLocalPsyStep}
          psyAnswers={localPsyAnswers}
          setPsyAnswers={setLocalPsyAnswers}
          activeTest={activeTestType}
          scoreTest={handleScoreTest}
        />
      </React.Suspense>
    )}
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  section: {
    marginBottom: 15,
  },
  testButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  buttonTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  chartBox: {
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  mindMapBox: {
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mindMapChip: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  mindMapCenterNode: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  centerNodeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  bannerCard: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  exportSubtitle: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  exportButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

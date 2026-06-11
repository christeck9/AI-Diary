import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal, StatusBar, Animated, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate } from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { useSQLiteContext } from 'expo-sqlite';
import { getAnimaMessage } from '../../db/zenGardenSchema';
import { MatrixRain } from '@/components/MatrixRain';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { consultCodex } from '../../lib/openlibrary';
import { wikipediaSearch } from '../../lib/wikipedia';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useLlm } from '../../contexts/LlmContext';

import { settingsService } from '../../lib/SettingsService';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTodos } from '../../hooks/useTodos';
import { MarqueeText } from '../../components/ui/MarqueeText';


export default function ToolsScreen() {
  const { colors, activeTheme } = useAppTheme();
  const { lang, t, setLang } = useLanguage();
  const router = useRouter();
  const { voice } = useVoiceContext();
  const { status, activeModel, generateStreamingResponse, llamaContextRef } = useLlm();
  const db = useSQLiteContext();
  
  const [animaMessage, setAnimaMessage] = useState('');

  const fetchAnimaMessage = useCallback(async () => {
    if (db) {
      try {
        const msg = await getAnimaMessage(db, lang);
        setAnimaMessage(msg);
      } catch (e) {
        console.error('Error fetching anima message:', e);
      }
    }
  }, [db, lang]);

  useEffect(() => {
    fetchAnimaMessage();
  }, [fetchAnimaMessage]);

  useFocusEffect(
    useCallback(() => {
      fetchAnimaMessage();
    }, [fetchAnimaMessage])
  );

  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [kebabMenuTop, setKebabMenuTop] = useState(Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 70 : 85);
  const kebabTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopKebabTimer = () => {
    if (kebabTimerRef.current) {
      clearTimeout(kebabTimerRef.current);
      kebabTimerRef.current = null;
    }
  };

  const startKebabTimer = () => {
    stopKebabTimer();
    kebabTimerRef.current = setTimeout(() => {
      setShowKebabMenu(false);
    }, 5000);
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiResults, setWikiResults] = useState('');
  const [wikiLlmExplanation, setWikiLlmExplanation] = useState('');
  const [isWikiLoading, setIsWikiLoading] = useState(false);
  const [isLlmLoading, setIsLlmLoading] = useState(false);

  // --- TO-DO LIST STATE ---
  const { todos, addTodo, removeTodo } = useTodos();
  const [todoText, setTodoText] = useState('');
  const [todoDate, setTodoDate] = useState<Date | null>(null);
  const [todoTime, setTodoTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleAddTodo = async () => {
    if (!todoText.trim()) return;
    const dateStr = todoDate ? todoDate.toLocaleDateString() : null;
    const timeStr = todoTime ? todoTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    await addTodo(todoText, dateStr, timeStr);
    setTodoText('');
    setTodoDate(null);
    setTodoTime(null);
  };

  // --- DICTATION TOOL STATE ---
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isExportReady, setIsExportReady] = useState(false);
  const exportAnim = useRef(new Animated.Value(0)).current;
  const exportTimerRef = useRef<NodeJS.Timeout | null>(null);

  const exportTextColor = exportAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFF', '#ff3b30'] // White to Red text
  });

  const triggerExportFlash = () => {
    if (dictationText && dictationText.trim().length > 0) {
       setIsExportReady(true);
       exportAnim.setValue(0);
       Animated.loop(
         Animated.sequence([
           Animated.timing(exportAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
           Animated.timing(exportAnim, { toValue: 0, duration: 500, useNativeDriver: false })
         ])
       ).start();
       
       if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
       exportTimerRef.current = setTimeout(() => {
         exportAnim.stopAnimation();
         exportAnim.setValue(0);
         setIsExportReady(false);
       }, 10000);
    }
  };

  // Dictation Overlay Reanimated Values
  const ringScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isDictating) {
      buttonScale.value = withTiming(1.1, { duration: 150 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800 }),
          withTiming(1.0, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      buttonScale.value = withTiming(1.0, { duration: 150 });
      ringScale.value = 1;
    }
  }, [isDictating]);

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ringScale.value }],
      opacity: interpolate(ringScale.value, [1, 1.4], [0.6, 0.0]),
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleDictationPressIn = async () => {
    setIsDictating(true);
    setIsEditing(false); // Disable manual editing while recording
    setIsExportReady(false);
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    
    // Use the optimized interactive voice parameters defined by the system
    await voice.startListening(
      undefined, 
      (finalText) => {
        setDictationText((prev) => {
          const current = prev.trim();
          return current ? `${current} ${finalText}` : finalText;
        });
        setIsDictating(false);
      },
      undefined
    );
  };

  const handleDictationPressOut = async () => {
    setIsDictating(false);
    await voice.stopListening();
  };

  const copyDictationToClipboard = async () => {
    const textToCopy = isDictating ? voice.transcript : dictationText;
    if (textToCopy && textToCopy.trim()) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert(lang === 'es' ? 'Copiado' : 'Copied', lang === 'es' ? 'Texto copiado al portapapeles' : 'Text copied to clipboard');
    }
  };

  const handleExportDictationPdf = async () => {
    const textToExport = dictationText || voice.transcript;
    if (!textToExport || !textToExport.trim()) return;
    
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; margin-bottom: 30px; }
              .content { font-size: 16px; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Transcripción de Dictado' : 'Dictation Transcript'}</h1>
            <div class="content">${escapeHtml(textToExport)}</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };



  const [hasBraveKey, setHasBraveKey] = useState(false);

  const checkBraveKey = useCallback(async () => {
    try {
      const key = await SecureStore.getItemAsync('brave_search_api_key');
      if (key && key.trim()) {
        setHasBraveKey(true);
        return;
      }
      const settings = await settingsService.get();
      if (settings.braveApiKey && settings.braveApiKey.trim()) {
        setHasBraveKey(true);
        return;
      }
      setHasBraveKey(false);
    } catch (e) {
      setHasBraveKey(false);
    }
  }, []);

  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useFocusEffect(
    useCallback(() => {
      const handleFocus = async () => {
        console.log('[TOOLS] Tab focused. Releasing main voice resources...');
        checkBraveKey();
        if (voiceRef.current) {
          try { await voiceRef.current.stopSpeaking(); } catch (_) {}
          try { await voiceRef.current.stopListening(); } catch (_) {}
          // Pause to let native threads release mic
          await new Promise(resolve => setTimeout(resolve, 300));
          try { await voiceRef.current.releaseResources(); } catch (_) {}
        }
      };

      handleFocus();

      return () => {
        console.log('[TOOLS] Tab blurred. Releasing speech resources...');
      };
    }, [checkBraveKey])
  );

  useEffect(() => {
    checkBraveKey();
  }, [checkBraveKey]);

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
      const msgs: any[] = await db.getAllAsync('SELECT * FROM messages ORDER BY created_at ASC');
      const profile = pRes[0] || { name: 'Unknown', nickname: 'User' };
      
      let chatHtml = msgs.map(m => {
        const isUser = m.role === 'user';
        const cleanText = cleanMessageText(m.text, m.role);
        return `<div style="margin-bottom: 15px; padding: 12px; border-radius: 10px; background-color: ${isUser ? '#f8fafd' : '#f1f8f5'};"><strong>${isUser ? escapeHtml(profile.nickname || profile.name) : 'AI Diary'}</strong>: ${cleanText}</div>`;
      }).join('');

      const html = `<html><head><style>body { font-family: Arial, sans-serif; padding: 20px; }</style></head><body><h1>Diary Report</h1>${chatHtml}</body></html>`;
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
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; }
              .section { margin-bottom: 25px; }
              .section-title { font-weight: bold; font-size: 18px; margin-bottom: 10px; color: #7da885; }
              .grid { display: flex; flex-direction: column; gap: 8px; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; }
              .label { font-weight: bold; }
              .val { color: #555; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Reporte de Personalidad' : 'Personality Report'}</h1>
            <div class="section">
              <div class="row"><span class="label">${lang === 'es' ? 'Usuario' : 'User'}:</span><span class="val">${escapeHtml(profile.nickname || profile.name)}</span></div>
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

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error(e); }
  };

  const handleConsult = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResults('');
    try {
      const data = await consultCodex(query);
      if (data) {
        setResults(data);
      } else {
        setResults(lang === 'es' ? 'No se hallaron registros en la Bóveda para este término.' : 'No records found in the Vault for this term.');
      }
    } catch (e) {
      setResults(lang === 'es' ? 'Error en la conexión con la Gran Biblioteca.' : 'Error connecting to the Grand Library.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWikiSearch = async () => {
    if (!wikiQuery.trim()) return;
    setIsWikiLoading(true);
    setWikiResults('');
    setWikiLlmExplanation('');
    try {
      const data = await wikipediaSearch(wikiQuery, lang);
      if (data) {
        setWikiResults(data);
      } else {
        setWikiResults(lang === 'es' ? 'No se hallaron registros en Wikipedia para este término.' : 'No records found in Wikipedia for this term.');
      }
    } catch (e) {
      setWikiResults(lang === 'es' ? 'Error en la conexión con Wikipedia.' : 'Error connecting to Wikipedia.');
    } finally {
      setIsWikiLoading(false);
    }
  };

  const handleWikiLlmExplain = async () => {
    if (!wikiResults || !llamaContextRef.current) return;
    setIsLlmLoading(true);
    setWikiLlmExplanation('');
    
    const prompt = lang === 'es'
      ? `Basándote en el siguiente artículo de Wikipedia, explícame brevemente el término de manera amigable y resumida:\n\n${wikiResults}`
      : `Based on the following Wikipedia article, explain this term to me briefly and in a friendly, summarized way:\n\n${wikiResults}`;

    try {
      await generateStreamingResponse(
        prompt,
        (token) => {
          setWikiLlmExplanation((prev) => prev + token);
        },
        (error) => {
          Alert.alert(lang === 'es' ? 'Error de la IA' : 'AI Error', error);
        }
      );
    } catch (e: any) {
      Alert.alert(lang === 'es' ? 'Error de la IA' : 'AI Error', e?.message || String(e));
    } finally {
      setIsLlmLoading(false);
    }
  };


  return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && <MatrixRain />}

        <View style={{ zIndex: 100 }}>
          <SanctuaryHeader
            showVoiceIcon={false}
            activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
            showKebabMenu={showKebabMenu}
            onKebabPress={(calculatedTop) => {
              if (calculatedTop !== undefined) {
                setKebabMenuTop(calculatedTop);
              }
              const next = !showKebabMenu;
              setShowKebabMenu(next);
              if (next) startKebabTimer();
              else stopKebabTimer();
            }}
            onKebabAction={(action) => {
              if (action === 'clear') {
                Alert.alert(
                  lang === 'es' ? 'Acción no disponible' : 'Action not available',
                  lang === 'es'
                    ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                    : 'Chat history can only be cleared from the main tab.'
                );
              } else {
                router.replace({ pathname: '/', params: { openModal: action } });
              }
            }}
            animaMessage={animaMessage}
          />
        </View>

        {/* --- GLOBAL APP MENUS OVERLAY --- */}
        <Modal visible={showKebabMenu} transparent={true} animationType="fade">
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                if (showKebabMenu) {
                  setShowKebabMenu(false);
                  stopKebabTimer();
                }
              }}
            />

            {/* Kebab Menu Dropdown */}
            <View style={[styles.dropdown, {
              top: kebabMenuTop,
              right: 10,
                minWidth: 220,
                overflow: 'hidden',
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: 8,
              }]}>
                <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'profile' } }); }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'intro' } }); }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'voice_settings' } }); }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'vault' } }); }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'psy' } }); }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kebabItemLast} onPress={() => {
                  setShowKebabMenu(false);
                  Alert.alert(
                    lang === 'es' ? 'Acción no disponible' : 'Action not available',
                    lang === 'es'
                      ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                      : 'Chat history can only be cleared from the main tab.'
                  );
                }}>
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🗑️</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Borrar Historial' : 'Clear History'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, zIndex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent
            ]}
          >
            <View style={styles.content}>
              {/* EXPORT DATA BUTTONS */}
              <View style={{ width: '100%', marginBottom: 20 }}>
                {/* Export Personality Report Section */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={[styles.buttonSubtitle, { color: colors.textSecondary }]}>
                    {lang === 'es' 
                      ? 'Ve al menú principal y haz algunos tests, exporta tus resultados aquí. Es para ti y los tuyos.' 
                      : 'Go to the Main Menu and take some tests, export your results here. Is for you and yours to share.'}
                  </Text>
                  <TouchableOpacity style={styles.vaultButtonGreen} onPress={handleExportPsycho}>
                    <Text style={styles.vaultButtonText}>
                      {lang === 'es' ? 'EXPORTAR REPORTE DE PERSONALIDAD (PDF)' : 'EXPORT PERSONALITY REPORT (PDF)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Export Diary History Section */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={[styles.buttonSubtitle, { color: colors.textSecondary }]}>
                    {lang === 'es' 
                      ? 'Aquí verás todos tus recuerdos en esta app y podrás leerlos. Es para ti y los tuyos.' 
                      : 'Here you will see all your memories in this app and read them. Is for you and yours to share.'}
                  </Text>
                  <TouchableOpacity style={styles.vaultButtonBlue} onPress={handleExportClinical}>
                    <Text style={styles.vaultButtonText}>
                      {lang === 'es' ? 'EXPORTAR HISTORIAL DEL DIARIO (PDF)' : 'EXPORT DIARY HISTORY (PDF)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="books.vertical.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'BÚSQUEDA BIBLIOGRÁFICA' : 'BIBLIOGRAPHIC SEARCH'}
                  </Text>
                </View>

                {!hasBraveKey && (
                  <Text style={{ fontSize: 11, color: '#d96c6c', fontStyle: 'italic', marginBottom: 15 }}>
                    ⚠️ {lang === 'es' ? 'Necesitas la API de Brave para esta función.' : 'You need to have Brave API for this function.'}
                  </Text>
                )}

                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder={lang === 'es' ? 'Buscar tratado, libro o autor...' : 'Search for treaty, book or author...'}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                />

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleConsult}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {lang === 'es' ? 'BUSCAR UN LIBRO' : 'FIND A BOOK'}
                    </Text>
                  )}
                </TouchableOpacity>

                {results !== '' && (
                  <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary }]}>
                    <Text style={styles.resultsText}>{results}</Text>
                  </View>
                )}
              </View>

              {/* WIKIPEDIA VAULT CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="globe" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'BÚSQUEDA EN WIKIPEDIA' : 'WIKIPEDIA SEARCH'}
                  </Text>
                </View>

                {!hasBraveKey && (
                  <Text style={{ fontSize: 11, color: '#d96c6c', fontStyle: 'italic', marginBottom: 15 }}>
                    ⚠️ {lang === 'es' ? 'Necesitas la API de Brave para esta función.' : 'You need to have Brave API for this function.'}
                  </Text>
                )}

                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder={lang === 'es' ? 'Buscar en Wikipedia...' : 'Search Wikipedia...'}
                  placeholderTextColor={colors.textSecondary}
                  value={wikiQuery}
                  onChangeText={setWikiQuery}
                />

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleWikiSearch}
                  disabled={isWikiLoading}
                >
                  {isWikiLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {lang === 'es' ? 'CONSULTAR WIKIPEDIA' : 'CONSULT WIKIPEDIA'}
                    </Text>
                  )}
                </TouchableOpacity>

                {wikiResults !== '' && (
                  <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary }]}>
                    <Text style={styles.resultsText}>{wikiResults}</Text>
                    
                    {/* LLM Explanation Section */}
                    <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 }}>
                      {llamaContextRef.current ? (
                        <TouchableOpacity
                          style={[styles.button, { backgroundColor: colors.secondary, height: 40, borderRadius: 8 }]}
                          onPress={handleWikiLlmExplain}
                          disabled={isLlmLoading}
                        >
                          {isLlmLoading ? (
                            <ActivityIndicator color="#FFF" />
                          ) : (
                            <Text style={[styles.buttonText, { fontSize: 13 }]}>
                              🧠 {lang === 'es' ? 'EXPLICAR CON IA LOCAL' : 'EXPLAIN W/ LOCAL AI'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                          ℹ️ {lang === 'es' 
                            ? 'Carga un modelo de IA en la pestaña Diario para habilitar la explicación con IA.' 
                            : 'Load an AI model in the Diary tab to enable AI explanation.'}
                        </Text>
                      )}

                      {wikiLlmExplanation !== '' && (
                        <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>
                            {lang === 'es' ? 'Interpretación de la IA:' : 'AI Interpretation:'}
                          </Text>
                          <Text style={{ color: colors.textPrimary, fontSize: 13, lineHeight: 18 }}>
                            {wikiLlmExplanation}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* DICTATION TOOL CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="waveform" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'HERRAMIENTA DE DICTADO' : 'DICTATION TOOL'}
                  </Text>
                </View>

                {/* DICTATION TOOL EXTERNAL CARD (Simplified) */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                  <TouchableOpacity
                    style={[styles.vaultButtonBlue, { flex: 1, marginBottom: 0 }]}
                    onPress={() => setIsOverlayVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.vaultButtonText}>
                      {lang === 'es' ? 'DICTAR' : 'DICTATE'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.vaultButtonBlue, { flex: 1, marginBottom: 0, backgroundColor: dictationText ? (isExportReady ? colors.surfaceSecondary : '#5c84a8') : 'rgba(92, 132, 168, 0.4)' }]}
                    onPress={handleExportDictationPdf}
                    disabled={!dictationText}
                    activeOpacity={0.8}
                  >
                    <Animated.Text style={[styles.vaultButtonText, { color: isExportReady ? exportTextColor : '#FFF' }]}>
                      {lang === 'es' ? 'EXPORTAR A PDF' : 'EXPORT TO PDF'}
                    </Animated.Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TO-DO LIST CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="list.bullet.clipboard.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'TO-DO LIST / NOTAS' : 'TO-DO LIST / NOTES'}
                  </Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 10 }]}
                    placeholder={lang === 'es' ? 'Añadir nota...' : 'Add note...'}
                    placeholderTextColor={colors.textSecondary}
                    value={todoText}
                    onChangeText={setTodoText}
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity 
                      style={[styles.button, { flex: 1, height: 40, backgroundColor: todoDate ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.buttonText, { fontSize: 12, color: todoDate ? '#000' : colors.textPrimary }]}>
                        📅 {todoDate ? todoDate.toLocaleDateString() : 'TARGET DATE'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.button, { flex: 1, height: 40, backgroundColor: todoTime ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={[styles.buttonText, { fontSize: 12, color: todoTime ? '#000' : colors.textPrimary }]}>
                        ⏰ {todoTime ? todoTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TARGET TIME'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={todoDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setTodoDate(selectedDate);
                      }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={todoTime || new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) setTodoTime(selectedDate);
                      }}
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.vaultButtonGreen, { paddingVertical: 12, marginBottom: 0, opacity: todoText ? 1 : 0.5 }]}
                    onPress={handleAddTodo}
                    disabled={!todoText}
                  >
                    <Text style={styles.vaultButtonText}>{lang === 'es' ? 'HECHO / AÑADIR' : 'ADD NOTE'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Tareas */}
                {todos.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 10 }}>
                    {todos.map(todo => (
                      <View key={todo.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flex: 1, overflow: 'hidden' }}>
                          <MarqueeText text={todo.text} style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }} duration={10000} />
                          {(todo.target_date || todo.target_time) && (
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                              {todo.target_date || ''} {todo.target_time || ''}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity 
                          style={{ padding: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: colors.border }}
                          onPress={() => removeTodo(todo.id)}
                        >
                          <IconSymbol name="checkmark.circle.fill" size={18} color="#7da885" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* DICTATION OVERLAY */}
        <Modal visible={isOverlayVisible} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(10, 10, 14, 0.97)', justifyContent: 'space-between', paddingVertical: 40 }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
               <Text style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: colors.primary }}>
                 {lang === 'es' ? 'MODO DICTADO' : 'DICTATION MODE'}
               </Text>
               <TouchableOpacity 
                 style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} 
                 onPress={() => { setIsOverlayVisible(false); triggerExportFlash(); }}
               >
                 <IconSymbol name="xmark" size={24} color="white" />
               </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <View style={{ flex: 1, alignItems: 'center', width: '100%', paddingHorizontal: 24, marginTop: 30 }}>
              <Text style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 15, color: 'rgba(255,255,255,0.6)' }}>
                {lang === 'es' 
                  ? '🎙️ Mantén presionado el botón PULSA para hablar. Usa de 3-12 palabras.' 
                  : '🎙️ Press and hold the TALK button to speak. Use 3-12 words.'}
              </Text>
              
              <View style={{ width: '100%', flex: 1, marginTop: 20, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: isEditing ? colors.primary : 'rgba(255,255,255,0.1)' }}>
                <TextInput
                   style={[{ flex: 1, color: '#FFFFFF', fontSize: 18, lineHeight: 26, textAlignVertical: 'top' }, isEditing && { color: colors.primary }]}
                   multiline={true}
                   editable={isEditing}
                   value={isDictating ? (dictationText ? `${dictationText} ${voice.transcript}` : voice.transcript) : dictationText}
                   onChangeText={setDictationText}
                   placeholder={lang === 'es' ? 'El texto aparecerá aquí...' : 'Text will appear here...'}
                   placeholderTextColor="rgba(255,255,255,0.2)"
                />
                
                {/* Overlay Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 15 }}>
                  <TouchableOpacity 
                     style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: isEditing ? colors.primary : 'rgba(255,255,255,0.1)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                     onPress={() => setIsEditing(!isEditing)}
                  >
                     <IconSymbol name="pencil" size={14} color={isEditing ? '#000' : '#FFF'} />
                     <Text style={{ color: isEditing ? '#000' : '#FFF', fontSize: 12, fontWeight: 'bold' }}>EDIT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                     style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: (dictationText || voice.transcript) ? colors.primary : 'rgba(255,255,255,0.05)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                     onPress={copyDictationToClipboard}
                     disabled={!dictationText && !voice.transcript}
                     activeOpacity={0.7}
                  >
                     <IconSymbol name="doc.on.doc" size={14} color={(dictationText || voice.transcript) ? '#000' : 'rgba(255,255,255,0.2)'} />
                     <Text style={{ color: (dictationText || voice.transcript) ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 'bold' }}>
                       {lang === 'es' ? 'COPIAR AL PORTAPAPELES' : 'COPY TO CLIPBOARD'}
                     </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Node / Dictation Overlay Button */}
              <View style={{ height: 160, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 20 }}>
                 <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                    {isDictating && (
                      <Reanimated.View style={[
                        { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 3 }, 
                        { borderColor: '#ff3b30' },
                        animatedRingStyle
                      ]} />
                    )}
                    
                    <Reanimated.View style={animatedButtonStyle}>
                      <Pressable
                        onPressIn={handleDictationPressIn}
                        onPressOut={handleDictationPressOut}
                        style={({ pressed }) => [
                          { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6 },
                          {
                            borderColor: isDictating ? '#ff3b30' : colors.primary,
                            backgroundColor: pressed 
                              ? 'rgba(255, 59, 48, 0.15)' 
                              : 'rgba(0, 0, 0, 0.4)'
                          }
                        ]}
                      >
                        <IconSymbol 
                          name="waveform" 
                          size={38} 
                          color={isDictating ? '#ff3b30' : colors.primary} 
                        />
                        <Text style={[
                          { fontSize: 11, fontWeight: 'bold', marginTop: 6, letterSpacing: 1.5 }, 
                          { color: isDictating ? '#ff3b30' : 'white' }
                        ]}>
                          {isDictating 
                            ? (lang === 'es' ? 'SUELTA' : 'RELEASE') 
                            : (lang === 'es' ? 'PULSA' : 'TALK')}
                        </Text>
                      </Pressable>
                    </Reanimated.View>
                 </View>
              </View>
            </View>

            {/* Footer Control */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
              <TouchableOpacity 
                style={{ flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 }} 
                onPress={() => { setIsOverlayVisible(false); triggerExportFlash(); }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#07070a', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 }}>
                  {lang === 'es' ? 'SALIR DEL MODO DICTADO' : 'EXIT DICTATION MODE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  buttonSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 16,
    opacity: 0.85,
  },
  vaultCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultsText: {
    color: '#00FFCC',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  vaultButtonBlue: {
    backgroundColor: '#5c84a8',
    paddingVertical: 18,
    borderRadius: 24,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%'
  },
  vaultButtonGreen: {
    backgroundColor: '#7da885',
    paddingVertical: 18,
    borderRadius: 24,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%'
  },
  vaultButtonText: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  dropdown: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 5,
    zIndex: 9999,
    elevation: 999,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  kebabItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  kebabItemLast: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

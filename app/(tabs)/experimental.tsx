import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Switch, Alert, Platform, KeyboardAvoidingView } from 'react-native';

import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { MatrixRain } from '@/components/MatrixRain';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { consultCodex } from '../../lib/openlibrary';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useLlm } from '../../contexts/LlmContext';

import { settingsService } from '../../lib/SettingsService';


export default function ExperimentalScreen() {
  const { colors, activeTheme } = useAppTheme();
  const { lang, t, setLang } = useLanguage();
  const router = useRouter();
  const { voice } = useVoiceContext();
  const { status, activeModel } = useLlm();

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
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
  const [experimentalTurbo, setExperimentalTurbo] = useState(false);



  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useFocusEffect(
    useCallback(() => {
      const handleFocus = async () => {
        console.log('[EXPERIMENTAL] Tab focused. Releasing main voice resources...');
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
        console.log('[EXPERIMENTAL] Tab blurred. Releasing speech resources...');
      };
    }, [])
  );

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const settings = await settingsService.get();
        if (isMounted) {
          if (settings.experimentalTurbo) setExperimentalTurbo(true);
        }
      } catch (e) { console.log('Error loading settings', e); }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const saveSettings = async (updates: any) => {
    try {
      await settingsService.set(updates);
    } catch (e) { console.error('Save error', e); }
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


  return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && <MatrixRain />}

        <View style={{ zIndex: 100 }}>
          <SanctuaryHeader
            showVoiceIcon={false}
            activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
            showLangPicker={showLangPicker}
            onLangPress={() => setShowLangPicker(!showLangPicker)}
            onLangSelect={(l) => { setLang(l as 'en' | 'es'); setShowLangPicker(false); }}
            showKebabMenu={showKebabMenu}
            onKebabPress={() => {
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
          />
          {/* Overlay for closing menus on outside tap */}
        {(showLangPicker || showKebabMenu) && (
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, { zIndex: 9998, elevation: 998 }]}
            activeOpacity={1}
            onPress={() => {
              if (showLangPicker) setShowLangPicker(false);
              if (showKebabMenu) {
                setShowKebabMenu(false);
                stopKebabTimer();
              }
            }}
          />
        )}
        {/* Language Dropdown - rendered at top level for proper z-index */}
        {showLangPicker && (
            <View style={{
              position: 'absolute',
              top: 90,
              right: 60,
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 5,
              zIndex: 9999,
              elevation: 999,
              minWidth: 80,
            }}>
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setLang('en'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'en' ? colors.primary : colors.textPrimary }}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setLang('es'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'es' ? colors.primary : colors.textPrimary }}>ES</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Kebab Menu Dropdown - rendered at top level for proper z-index */}
          {showKebabMenu && (
            <View
              style={{
                position: 'absolute',
                top: 50,
                right: 10,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 5,
                zIndex: 9999,
                elevation: 999,
                minWidth: 220,
              }}
            >
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'profile' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'intro' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'voice_settings' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'vault' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'psy' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center' }} onPress={() => {
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
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, zIndex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent
            ]}
          >
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.primary }]}>EXPERIMENTAL LAB</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {lang === 'es' ? 'Cámara de investigación bibliográfica y voz offline.' : 'Bibliographic research and offline voice chamber.'}
              </Text>

              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="books.vertical.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>THE CODEX (v1.0)</Text>
                </View>

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
                      {lang === 'es' ? 'CONSULTAR EL CÓDICE' : 'CONSULT THE CODEX'}
                    </Text>
                  )}
                </TouchableOpacity>

                {results !== '' && (
                  <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary }]}>
                    <Text style={styles.resultsText}>{results}</Text>
                  </View>
                )}
              </View>

              {/* CORE HARDWARE (OPENCL GPU) CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="cpu" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>CORE HARDWARE</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      {lang === 'es' ? 'Turbo Experimental (OpenCL GPU)' : 'Experimental Turbo (OpenCL GPU)'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {lang === 'es' ? 'Desvía el LLM a la tarjeta gráfica. iPhone usa Metal por defecto. En Android (OpenCL) usa esto bajo tu propio riesgo, puede causar inestabilidad.' : 'Offloads LLM to the GPU. iPhone uses Metal by default. On Android (OpenCL) use at your own risk, may cause instability.'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: colors.border, true: '#d96c6c' }}
                    thumbColor={experimentalTurbo ? '#FFF' : '#f4f3f4'}
                    onValueChange={async (val) => {
                      setExperimentalTurbo(val);
                      await saveSettings({ experimentalTurbo: val });
                    }}
                    value={experimentalTurbo}
                  />
                </View>


              </View>

              {/* EXPERIMENTAL VOICE ENGINE CARD REMOVED (integrated directly in main chat tab header) */}




            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  }
});

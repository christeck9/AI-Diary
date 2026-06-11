// 🚨 MANDATORY: CHECK DESIGN_PROTOCOL_v1.8.0.md BEFORE MODIFYING UI OR LOGIC.
import { MatrixRain } from '@/components/MatrixRain';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, BackHandler, Modal } from 'react-native';
import { useSQLiteContext } from '../../components/MemoryProvider';
import { AppThemeType } from '../../constants/Themes';
import { ManifestoCard } from '../../components/SanctuaryUI';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';

import * as Haptics from 'expo-haptics';
import { useLlm } from '../../contexts/LlmContext';
import { runOnJS } from 'react-native-reanimated';

import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { useFocusEffect } from '@react-navigation/native';
import { getAnimaMessage } from '../../db/zenGardenSchema';



type ScannedModel = {
  id: string;
  label: string;
  sizeMB: number;
  isPartial: boolean;
  fileNames: string[];
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, activeTheme, setTheme } = useAppTheme();
  

  const { lang, setLang, t } = useLanguage();
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

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeInputText, setWipeInputText] = useState('');
  const [useCloudTTS, setUseCloudTTS] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<'openai' | 'google'>('openai');
  const [cloudTTSKey, setCloudTTSKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [manualEcoMode, setManualEcoMode] = useState(false);
  const [gpuTurbo, setGpuTurbo] = useState(false);
  const [isApiStored, setIsApiStored] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  const [showStorageMenu, setShowStorageMenu] = useState(false);
  const [scannedModels, setScannedModels] = useState<ScannedModel[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);
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

  const onKebabAction = useCallback(async (action: string) => {
    if (action === 'clear') {
      Alert.alert(
        lang === 'es' ? '¿Borrar Historial?' : 'Clear History?',
        lang === 'es' ? 'Se eliminarán todos los mensajes. Esta acción es irreversible.' : 'All messages will be deleted. This action is permanent.',
        [
          { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: lang === 'es' ? 'Borrar Todo' : 'Clear All',
            style: 'destructive',
            onPress: async () => {
              if (db) {
                await db.runAsync('DELETE FROM messages');
                Alert.alert("Success", "Chat history cleared.");
              }
            }
          }
        ]
      );
    } else {
      router.replace('/');
    }
  }, [lang, db, router]);
  const [freeDiskMB, setFreeDiskMB] = useState(0);
  const [totalDiskMB, setTotalDiskMB] = useState(0);

  
  // Extraemos funciones de LLM para el Force Reload
  const { loadModel, resetToHome, status, activeModel, selectModel, AVAILABLE_MODELS, getModelStatus, downloadModel } = useLlm();
  const [modelStatuses, setModelStatuses] = useState<Record<string, { status: 'missing' | 'outdated' | 'current', localSizeMB: number, remoteSizeMB: number, integrity: boolean }>>({});
  const [isCheckingModels, setIsCheckingModels] = useState(false);



  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      // --- Layer 1: SecureStore (isolated, fault-tolerant) ---
      // If Android KeyStore throws (e.g., KeyPermanentlyInvalidatedException after a system
      // update), we catch it here, clean up the corrupted entry, and continue loading.
      let secureKey: string | null = null;
      try {
        secureKey = await SecureStore.getItemAsync('brave_search_api_key');
        if (secureKey && secureKey.trim() && isMounted) {
          setIsApiStored(true);
        }
      } catch (e) {
        console.warn('[SecureStore] KeyStore error reading Brave API key — clearing corrupted entry:', e);
        try { await SecureStore.deleteItemAsync('brave_search_api_key'); } catch (_) {}
      }

      // --- Layer 2: app_settings.json (always runs, even if SecureStore failed above) ---
      try {
        const settingsPath = `${FileSystem.documentDirectory}app_settings.json`;
        const info = await FileSystem.getInfoAsync(settingsPath);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(settingsPath);
          const settings = JSON.parse(content);
          if (isMounted) {
            if (settings.cloudTTSKey) setCloudTTSKey(settings.cloudTTSKey);
            if (settings.openAIKey) setOpenAIKey(settings.openAIKey);
            if (settings.cloudProvider) setCloudProvider(settings.cloudProvider);
            if (settings.useCloudTTS) setUseCloudTTS(true);
            if (settings.manualEcoMode) setManualEcoMode(true);
            if (settings.gpuTurbo ?? settings.experimentalTurbo) setGpuTurbo(true);

            // Backup fallback: if Brave key is in app_settings.json but not in SecureStore (e.g. after upgrade),
            // restore it to SecureStore. Do NOT delete it from app_settings.json to preserve it as a backup.
            if (settings.braveApiKey && settings.braveApiKey.trim()) {
              if (isMounted) setIsApiStored(true);
              if (!secureKey) {
                try {
                  await SecureStore.setItemAsync('brave_search_api_key', settings.braveApiKey.trim());
                } catch (e) {
                  console.warn('[SecureStore] Could not restore Brave API key to SecureStore:', e);
                }
              }
            }
          }
        }
      } catch (e) { console.error('[Settings] Error loading app_settings.json:', e); }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const saveSettings = async (updates: any) => {
    try {
      const settingsPath = `${FileSystem.documentDirectory}app_settings.json`;
      const info = await FileSystem.getInfoAsync(settingsPath);
      let current = {};
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(settingsPath);
        current = JSON.parse(content);
      }
      const updated = { ...current, ...updates };
      await FileSystem.writeAsStringAsync(settingsPath, JSON.stringify(updated));
    } catch (e) { console.error('Save error', e); }
  };

  const executeWipe = async () => {
    try {
      // 0. Borrar API keys de almacenamiento seguro
      await SecureStore.deleteItemAsync('brave_search_api_key');

      if (db) {
        // 1. Limpieza de Bases de Datos (Tierra Quemada)
        await db.runAsync('DELETE FROM messages');
        await db.runAsync('DELETE FROM sentinel_audit'); // 🛡️ Borrar rastro del Sentinel
        await db.runAsync('DELETE FROM user_profile');
        await db.runAsync('DELETE FROM psy_profile');
        await db.runAsync('DELETE FROM memory_synthesis');
        await db.runAsync('DELETE FROM memory_fts');
        await db.runAsync('DELETE FROM onboarding_status');
        
        // 2. Limpieza de Archivos y Modelos (Deep Clean)
        const docs = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
        for (const file of docs) {
          if (file !== 'SQLite') { // Mantener carpeta DB (ya limpiada arriba)
            await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
          }
        }

        Alert.alert(
          lang === 'es' ? "Diario Reseteado" : "Diary Reset", 
          lang === 'es' 
            ? "Todos los datos locales han sido eliminados. La aplicación se cerrará ahora para completar el reinicio."
            : "All local data has been deleted. The application will close now to complete the reset.",
          [{ text: "OK", onPress: () => BackHandler.exitApp() }]
        );
      }
    } catch (e) { 
      console.error("Wipe failed", e);
      Alert.alert(
        lang === 'es' ? "Error" : "Error", 
        lang === 'es' ? "No se pudo completar el borrado total." : "Could not complete total wipe."
      );
    }
  };

  const handlePanicWipe = () => {
    setWipeInputText('');
    setShowWipeModal(true);
  };



  const renderThemeButton = (themeKey: AppThemeType, label: string) => {
    const isActive = activeTheme === themeKey;
    let bgColor = isActive ? colors.surfaceSecondary : colors.surface;
    let textColor = isActive ? colors.primary : colors.textSecondary;
    let borderColor = isActive ? colors.primary : colors.border;

    return (
      <TouchableOpacity
        style={[styles.themeButton, { borderColor, backgroundColor: bgColor }]}
        onPress={() => setTheme(themeKey)}
      >
        <Text style={[styles.themeButtonText, { color: textColor, fontSize: 10, fontWeight: isActive ? 'bold' : '500' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const scanModelStorage = async () => {
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      const total = await FileSystem.getTotalDiskCapacityAsync();
      setFreeDiskMB(Math.round(free / (1024 * 1024)));
      setTotalDiskMB(Math.round(total / (1024 * 1024)));
    } catch(e) { console.log('Error getting disk space', e); }

    const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
    const dirInfo = await FileSystem.getInfoAsync(baseDir);
    if (!dirInfo.exists) return;

    const foundModels: ScannedModel[] = [];
    
    for (const model of AVAILABLE_MODELS) {
      let totalSize = 0;
      let isPartial = false;
      let foundFiles: string[] = [];
      let hasAnyFile = false;

      const mainPath = `${baseDir}/${model.fileName}`;
      const mainInfo = await FileSystem.getInfoAsync(mainPath);
      if (mainInfo.exists) {
        hasAnyFile = true;
        foundFiles.push(model.fileName);
        const size = (mainInfo as any).size / (1024 * 1024);
        totalSize += size;
        if (size < model.sizeMB * 0.99) isPartial = true;
      }

      if (model.mmprojFileName) {
        const mmprojPath = `${baseDir}/${model.mmprojFileName}`;
        const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);
        if (mmprojInfo.exists) {
          hasAnyFile = true;
          foundFiles.push(model.mmprojFileName);
          const size = (mmprojInfo as any).size / (1024 * 1024);
          totalSize += size;
          // Some configurations might not have mmprojSizeMB defined, fall back to a reasonable ratio check or ignore size check if missing
          if (model.mmprojSizeMB && size < model.mmprojSizeMB * 0.99) isPartial = true;
        }
      }

      const mainResumePath = `${baseDir}/download_resume_${model.fileName}.json`;
      if ((await FileSystem.getInfoAsync(mainResumePath)).exists) {
        foundFiles.push(`download_resume_${model.fileName}.json`);
        isPartial = true;
      }
      
      if (model.mmprojFileName) {
        const mmprojResumePath = `${baseDir}/download_resume_${model.mmprojFileName}.json`;
        if ((await FileSystem.getInfoAsync(mmprojResumePath)).exists) {
          foundFiles.push(`download_resume_${model.mmprojFileName}.json`);
          isPartial = true;
        }
      }

      if (hasAnyFile || isPartial) {
        foundModels.push({
          id: model.id,
          label: lang === 'es' ? model.labelEs : model.labelEn,
          sizeMB: Math.round(totalSize),
          isPartial,
          fileNames: foundFiles
        });
      }
    }
    setScannedModels(foundModels);
  };

  const handleDeleteModel = (scannedModel: ScannedModel) => {
    Alert.alert(
      lang === 'es' ? 'Eliminar Modelo' : 'Delete Model',
      lang === 'es' ? `¿Estás seguro de que deseas eliminar ${scannedModel.label} y liberar ${scannedModel.sizeMB} MB?` : `Are you sure you want to delete ${scannedModel.label} and free up ${scannedModel.sizeMB} MB?`,
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: lang === 'es' ? 'Eliminar' : 'Delete', style: 'destructive', onPress: async () => {
          const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
          for (const fileName of scannedModel.fileNames) {
            const path = `${baseDir}/${fileName}`;
            try {
              await FileSystem.deleteAsync(path, { idempotent: true });
            } catch(e) { console.error('Error deleting', path, e); }
          }
          scanModelStorage();
        }}
      ]
    );
  };

  return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && <MatrixRain />}

        <SanctuaryHeader 
          showVoiceIcon={false}
          activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
          showLangPicker={showLangPicker}
          onKebabAction={onKebabAction}
          onLangPress={() => setShowLangPicker(!showLangPicker)}
          onLangSelect={(l) => { setLang(l as 'en' | 'es'); setShowLangPicker(false); }}
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
          animaMessage={animaMessage}
        />


        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{lang === 'es' ? 'Temas' : 'Themes'}</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {renderThemeButton('light', 'CLEAR')}
                {renderThemeButton('sanctuary', 'BALANCE')}
                {renderThemeButton('aura', 'AURA')}
                {renderThemeButton('matrix', 'ZION')}
              </View>
            </View>

            {/* 🌐 SOVEREIGN INTERNET / ANONYMOUS SEARCH SECTION */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
                <IconSymbol name="lock.shield.fill" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {lang === 'es' ? 'INTERNET SOBERANO (BÚSQUEDA ANÓNIMA)' : 'SOVEREIGN INTERNET (ANONYMOUS SEARCH)'}
                </Text>
              </View>

              <View style={{
                padding: 18,
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 15
              }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, lineHeight: 18 }}>
                  {lang === 'es'
                    ? 'Para consultar datos en tiempo real de forma 100% segura, privada y prácticamente gratuita (hasta 1,000 búsquedas libres al mes), obtén tu propia clave API de Brave Search y pégala aquí debajo.'
                    : 'To search the web 100% securely, privately, and virtually for free (up to 1,000 free searches per month), get your own Brave Search API Key and paste it below.'}
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 5,
                    elevation: 3
                  }}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      await Linking.openURL('https://api.search.brave.com/register');
                    } catch (err) {
                      Alert.alert('Error', lang === 'es' ? 'No se pudo abrir el enlace.' : 'Could not open the link.');
                    }
                  }}
                >
                  <IconSymbol name="square.and.arrow.up" size={16} color="black" />
                  <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 13 }}>
                    {lang === 'es' ? 'OBTENER CLAVE API GRATUITA' : 'GET FREE API KEY'}
                  </Text>
                </TouchableOpacity>

                {!isApiStored ? (
                  <View style={{ gap: 6, marginTop: 5 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold' }}>
                      {lang === 'es' ? 'CLAVE API DE BRAVE SEARCH' : 'BRAVE SEARCH API KEY'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <TextInput
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          color: colors.textPrimary,
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 13,
                          borderWidth: 1,
                          borderColor: colors.border,
                          fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
                        }}
                        placeholder="bsa_..."
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={tempApiKey}
                        onChangeText={setTempApiKey}
                      />
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          if (!tempApiKey.trim()) {
                            Alert.alert(
                              lang === 'es' ? 'Error' : 'Error',
                              lang === 'es' ? 'Por favor ingresa una clave válida.' : 'Please enter a valid key.'
                            );
                            return;
                          }
                          try {
                            await SecureStore.setItemAsync('brave_search_api_key', tempApiKey.trim());
                            await saveSettings({ braveApiKey: tempApiKey.trim() });
                            setIsApiStored(true);
                            setTempApiKey('');
                            Alert.alert(
                              lang === 'es' ? 'Éxito' : 'Success',
                              lang === 'es' ? 'Clave de Brave Search guardada de forma segura.' : 'Brave Search key stored securely.'
                            );
                          } catch (e) {
                            Alert.alert(
                              lang === 'es' ? 'Error' : 'Error',
                              lang === 'es' ? 'No se pudo guardar la clave.' : 'Could not store key.'
                            );
                          }
                        }}
                      >
                        <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 13 }}>
                          {lang === 'es' ? 'Guardar' : 'Store API'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontStyle: 'italic' }}>
                      {lang === 'es'
                        ? 'La clave se almacena localmente de forma privada en tu dispositivo.'
                        : 'The key is stored locally and privately on your device.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(46, 125, 50, 0.3)',
                    padding: 12,
                    gap: 12,
                    marginTop: 5
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconSymbol name="checkmark.circle.fill" size={18} color="#2e7d32" />
                      <Text style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: 13 }}>
                        {lang === 'es' ? '✓ Clave API de Brave almacenada' : '✓ Brave API stored'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          paddingVertical: 8,
                          alignItems: 'center',
                          backgroundColor: colors.surface
                        }}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsApiStored(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                          {lang === 'es' ? 'Cambiar Clave' : 'Change Key'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: '#d32f2f',
                          borderRadius: 8,
                          paddingVertical: 8,
                          alignItems: 'center',
                          backgroundColor: 'rgba(211, 47, 47, 0.05)'
                        }}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          Alert.alert(
                            lang === 'es' ? 'Eliminar Clave' : 'Remove Key',
                            lang === 'es' 
                              ? '¿Estás seguro de que deseas eliminar la clave API de Brave Search de tu dispositivo?' 
                              : 'Are you sure you want to remove the Brave Search API key from your device?',
                            [
                              { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                              {
                                text: lang === 'es' ? 'Eliminar' : 'Remove',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await SecureStore.deleteItemAsync('brave_search_api_key');
                                    await saveSettings({ braveApiKey: undefined });
                                    setIsApiStored(false);
                                  } catch (e) {
                                    Alert.alert('Error', lang === 'es' ? 'No se pudo eliminar la clave.' : 'Could not remove key.');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: '#d32f2f', fontSize: 12, fontWeight: '600' }}>
                          {lang === 'es' ? 'Eliminar Clave' : 'Remove Key'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
                <IconSymbol name="person.wave.2.fill" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{lang === 'es' ? 'MOTOR DE SÍNTESIS DE VOZ' : 'VOICE SYNTHESIS ENGINE'}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceSecondary, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 15 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                    {lang === 'es' ? 'Voces Naturales (Internet)' : 'Natural Voices (Internet)'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {lang === 'es' ? 'Envía la respuesta final a la nube para generar voces fluidas. Bajo riesgo de privacidad.' : 'Sends the final AI response to the cloud to generate fluid human voice. Low privacy risk.'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={useCloudTTS ? '#FFF' : '#f4f3f4'}
                  onValueChange={async (val) => {
                    setUseCloudTTS(val);
                    await saveSettings({ useCloudTTS: val });
                  }}
                  value={useCloudTTS}
                />
              </View>

              {useCloudTTS && (
                <View style={{
                  marginTop: -5,
                  marginBottom: 15,
                  padding: 15,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 12
                }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {lang === 'es' ? 'Proveedor de Voz' : 'Voice Provider'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        setCloudProvider('openai');
                        await saveSettings({ cloudProvider: 'openai' });
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: cloudProvider === 'openai' ? colors.primary : colors.border,
                        backgroundColor: cloudProvider === 'openai' ? 'rgba(125, 132, 168, 0.1)' : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: cloudProvider === 'openai' ? colors.primary : colors.textSecondary, fontWeight: 'bold', fontSize: 12 }}>OpenAI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        setCloudProvider('google');
                        await saveSettings({ cloudProvider: 'google' });
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: cloudProvider === 'google' ? colors.primary : colors.border,
                        backgroundColor: cloudProvider === 'google' ? 'rgba(125, 132, 168, 0.1)' : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: cloudProvider === 'google' ? colors.primary : colors.textSecondary, fontWeight: 'bold', fontSize: 12 }}>Google Cloud</Text>
                    </TouchableOpacity>
                  </View>

                  {cloudProvider === 'openai' ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>OpenAI API Key</Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          color: colors.textPrimary,
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 13,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                        placeholder="sk-..."
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={openAIKey}
                        onChangeText={async (val) => {
                          setOpenAIKey(val);
                          await saveSettings({ openAIKey: val });
                        }}
                      />
                      <Text style={{ color: colors.textSecondary, fontSize: 10, fontStyle: 'italic' }}>
                        {lang === 'es' ? 'Requiere una clave de OpenAI activa.' : 'Requires an active OpenAI API key.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>Google Cloud API Key</Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          color: colors.textPrimary,
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 13,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                        placeholder="AIzaSy..."
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={cloudTTSKey}
                        onChangeText={async (val) => {
                          setCloudTTSKey(val);
                          await saveSettings({ cloudTTSKey: val });
                        }}
                      />
                      <Text style={{ color: colors.textSecondary, fontSize: 10, fontStyle: 'italic' }}>
                        {lang === 'es' ? 'Requiere habilitar Text-to-Speech API en Google Cloud Console.' : 'Requires enabling Text-to-Speech API in Google Cloud Console.'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Eco-Mode Section */}
              <View style={{ backgroundColor: colors.surfaceSecondary, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>{lang === 'es' ? 'Modo Ecológico' : 'Eco-Mode'}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {lang === 'es' ? 'Actívalo manualmente para reducir el calor del procesador.' : 'You can activate it manually to reduce processor heat.'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={manualEcoMode ? '#FFF' : '#f4f3f4'}
                  onValueChange={async (val) => {
                    setManualEcoMode(val);
                    await saveSettings({ manualEcoMode: val });
                  }}
                  value={manualEcoMode}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
                <IconSymbol name="externaldrive" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>{lang === 'es' ? 'GESTIÓN DE ALMACENAMIENTO DE MODELOS' : 'MODEL STORAGE MANAGEMENT'}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.vaultButtonPanic, { backgroundColor: colors.surfaceSecondary, borderColor: '#d96c6c', borderWidth: 1, paddingVertical: 15 }]} 
                onPress={() => {
                  const n = !showStorageMenu;
                  setShowStorageMenu(n);
                  if (n) scanModelStorage();
                }}
              >
                <Text style={[styles.vaultButtonText, { color: '#d96c6c' }]}>
                  {lang === 'es' ? 'GESTIONAR MODELOS LOCALES' : 'MANAGE LOCAL AI MODELS'}
                </Text>
              </TouchableOpacity>

              {showStorageMenu && (
                <View style={{ marginTop: 15, padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  {totalDiskMB > 0 && (
                    <View style={{ marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold' }}>
                        {lang === 'es' ? 'ALMACENAMIENTO DEL DISPOSITIVO' : 'DEVICE STORAGE'}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>
                          {(freeDiskMB / 1024).toFixed(1)} GB {lang === 'es' ? 'Libres' : 'Free'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {(totalDiskMB / 1024).toFixed(1)} GB {lang === 'es' ? 'Total' : 'Total'}
                        </Text>
                      </View>
                      {/* Simple progress bar */}
                      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.max(0, 100 - (freeDiskMB / totalDiskMB) * 100)}%`, backgroundColor: colors.primary }} />
                      </View>
                    </View>
                  )}

                  {scannedModels.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                      {lang === 'es' ? 'No se encontraron modelos locales descargados.' : 'No local downloaded models found.'}
                    </Text>
                  ) : (
                    scannedModels.map((sm, index) => (
                      <View key={sm.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: index === scannedModels.length - 1 ? 0 : 10, marginBottom: index === scannedModels.length - 1 ? 0 : 10, borderBottomWidth: index === scannedModels.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                            {sm.label}
                            {sm.isPartial && <Text style={{ color: '#d96c6c', fontSize: 10 }}> {lang === 'es' ? '(Incompleto)' : '(Partial)'}</Text>}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {sm.sizeMB} MB
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={{ backgroundColor: '#d96c6c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                          onPress={() => handleDeleteModel(sm)}
                        >
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                            {lang === 'es' ? 'Eliminar' : 'Delete'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* 📱 MODEL PERSISTENCE SECTION */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
                <IconSymbol name="externaldrive" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {lang === 'es' ? 'PERSISTENCIA DE MODELOS DE IA' : 'AI MODEL PERSISTENCE'}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  paddingVertical: 15,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  marginBottom: 10
                }}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsCheckingModels(true);
                  const statuses: Record<string, { status: 'missing' | 'outdated' | 'current', localSizeMB: number, remoteSizeMB: number, integrity: boolean }> = {};
                  for (const model of AVAILABLE_MODELS) {
                    statuses[model.id] = await getModelStatus(model);
                  }
                  setModelStatuses(statuses);
                  setIsCheckingModels(false);
                }}
                disabled={isCheckingModels}
              >
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                  {isCheckingModels 
                    ? (lang === 'es' ? 'VERIFICANDO...' : 'CHECKING...') 
                    : (lang === 'es' ? 'VERIFICAR MODELOS ALMACENADOS' : 'CHECK STORED AI MODELS')}
                </Text>
              </TouchableOpacity>

              {Object.keys(modelStatuses).length > 0 && (
                <View style={{ marginTop: 10, gap: 10 }}>
                  {AVAILABLE_MODELS.map((model) => {
                    const status = modelStatuses[model.id];
                    if (!status) return null;
                    
                    const statusColor = status.status === 'current' ? '#2e7d32' : status.status === 'outdated' ? '#ff9800' : colors.textSecondary;
                    const statusText = status.status === 'current' 
                      ? (lang === 'es' ? 'Actualizado' : 'Current')
                      : status.status === 'outdated' 
                        ? (lang === 'es' ? 'Desactualizado' : 'Outdated')
                        : (lang === 'es' ? 'No descargado' : 'Not downloaded');
                    
                    return (
                      <View key={model.id} style={{
                        backgroundColor: colors.surfaceSecondary,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: 8
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                            {lang === 'es' ? model.labelEs : model.labelEn}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>
                              {statusText}
                            </Text>
                            {status.integrity && (
                              <Text style={{ fontSize: 14 }}>✅</Text>
                            )}
                          </View>
                        </View>
                        
                        {status.status === 'outdated' && (
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                              {lang === 'es' ? 'Local' : 'Local'}: {status.localSizeMB} MB
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                              {lang === 'es' ? 'Remoto' : 'Remote'}: {status.remoteSizeMB} MB
                            </Text>
                          </View>
                        )}

                        {status.status === 'outdated' && (
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.primary,
                              paddingVertical: 8,
                              borderRadius: 8,
                              alignItems: 'center'
                            }}
                            onPress={async () => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              Alert.alert(
                                lang === 'es' ? 'Actualizar Modelo' : 'Update Model',
                                lang === 'es' 
                                  ? `¿Deseas actualizar ${model.labelEs}? Se reemplazará el modelo local (${status.localSizeMB} MB) con la versión más reciente (${status.remoteSizeMB} MB).`
                                  : `Do you want to update ${model.labelEn}? The local model (${status.localSizeMB} MB) will be replaced with the latest version (${status.remoteSizeMB} MB).`,
                                [
                                  { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                                  {
                                    text: lang === 'es' ? 'Actualizar' : 'Update',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
                                        // Delete old model files
                                        if (model.fileName) {
                                          const modelPath = `${baseDir}/${model.fileName}`;
                                          const modelInfo = await FileSystem.getInfoAsync(modelPath);
                                          if (modelInfo.exists) {
                                            await FileSystem.deleteAsync(modelPath, { idempotent: true });
                                          }
                                        }
                                        if (model.mmprojFileName) {
                                          const mmprojPath = `${baseDir}/${model.mmprojFileName}`;
                                          const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);
                                          if (mmprojInfo.exists) {
                                            await FileSystem.deleteAsync(mmprojPath, { idempotent: true });
                                          }
                                        }
                                        // Download new model
                                        await downloadModel(model);
                                        Alert.alert(
                                          lang === 'es' ? 'Éxito' : 'Success',
                                          lang === 'es' ? 'Modelo actualizado correctamente.' : 'Model updated successfully.'
                                        );
                                      } catch (e: any) {
                                        const errorStr = String(e?.message || e);
                                        let friendlyMessage = '';

                                        if (
                                          errorStr.toLowerCase().includes('abort') ||
                                          errorStr.toLowerCase().includes('connection') ||
                                          errorStr.toLowerCase().includes('network') ||
                                          errorStr.toLowerCase().includes('timeout')
                                        ) {
                                          friendlyMessage = lang === 'es'
                                            ? 'La descarga se pausó temporalmente (por inactividad o cambio de red). Puedes reanudarla tocando el botón de descarga nuevamente.'
                                            : 'The download was temporarily paused (due to inactivity or network change). You can resume it by tapping the download button again.';
                                        } else if (errorStr.toLowerCase().includes('space') || errorStr.toLowerCase().includes('disk')) {
                                          friendlyMessage = lang === 'es'
                                            ? 'Espacio de almacenamiento insuficiente. Por favor, libera algo de espacio en tu dispositivo e inténtalo de nuevo.'
                                            : 'Insufficient storage space. Please free up some space on your device and try again.';
                                        } else {
                                          friendlyMessage = errorStr;
                                        }

                                        Alert.alert(
                                          lang === 'es' ? 'Aviso de Descarga' : 'Download Notice',
                                          friendlyMessage
                                        );
                                      }
                                    }
                                  }
                                ]
                              );
                            }}
                          >
                            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>
                              {lang === 'es' ? 'Actualizar Modelo' : 'Update Model'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* GPU ACCELERATION CARD */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
                <IconSymbol name="cpu" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {lang === 'es' ? 'ACELERACION GPU' : 'GPU ACCELERATION'}
                </Text>
              </View>

              <View style={{
                padding: 18,
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      {lang === 'es' ? 'Aceleración GPU (Turbo)' : 'GPU Acceleration (Turbo)'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {lang === 'es' 
                        ? 'Habilita OpenCL en Android (acelerado nativamente en iPhones con Metal, y teléfonos Samsung o Pixel). Puede causar inestabilidad en otros dispositivos, pero puedes probarlo.' 
                        : 'Enable OpenCL on Android (natively accelerated on iPhones with Metal, and Samsung or Pixel phones). It may cause instability on other devices, but you can try.'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: colors.border, true: '#d96c6c' }}
                    thumbColor={gpuTurbo ? '#FFF' : '#f4f3f4'}
                    onValueChange={async (val) => {
                      setGpuTurbo(val);
                      await saveSettings({ gpuTurbo: val, experimentalTurbo: val });
                    }}
                    value={gpuTurbo}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {lang === 'es' ? 'OPCIONES DE REINICIO' : 'RESET OPTIONS'}
              </Text>
              
              <TouchableOpacity
                style={styles.vaultButtonPanic}
                onPress={async () => {
                  if (!activeModel) {
                    Alert.alert(lang === 'es' ? 'No hay modelo activo' : 'No active model');
                    return;
                  }
                  const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
                  const modelPath = `${baseDir}/${activeModel.fileName}`;
                  const info = await FileSystem.getInfoAsync(modelPath);
                  if (!info.exists) {
                    Alert.alert(
                      lang === 'es' ? 'Modelo no Encontrado' : 'Model Not Found',
                      lang === 'es'
                        ? 'Primero descarga el modelo en la pantalla principal antes de intentar sincronizar.'
                        : 'Please download the model on the main screen first before trying to sync.'
                    );
                    return;
                  }
                  try {
                    await loadModel();
                    Alert.alert(
                      lang === 'es' ? 'Sincronización Exitosa' : 'Sync Successful',
                      lang === 'es' ? 'El procesador se ha sincronizado correctamente.' : 'The processor has been synchronized successfully.'
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e.message || String(e));
                  }
                }}
              >
                <Text style={styles.vaultButtonText}>{lang === 'es' ? 'SINCRONIZAR HARDWARE' : 'RE-SYNC HARDWARE'}</Text>
                <Text style={{ color: '#fff', fontSize: 9, opacity: 0.8 }}>{lang === 'es' ? 'Solo si cambiaste de teléfono para sincronizar el procesador.' : 'Only press if you change your phone to synchronize the processor.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.vaultButtonPanic, { marginTop: 15 }]} onPress={handlePanicWipe}>
                <Text style={styles.vaultButtonText}>{lang === 'es' ? 'BOTÓN DE REINICIO MAESTRO' : 'MASTER RESET BUTTON'}</Text>
                <Text style={{ color: '#fff', fontSize: 9, opacity: 0.8 }}>{lang === 'es' ? 'Solo si deseas borrar todos los datos de esta app.' : 'Only press if you would like to wipe all data from this app.'}</Text>
              </TouchableOpacity>
            </View>

            <ManifestoCard colors={colors} />

            <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 10, paddingHorizontal: 20 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10, opacity: 0.5, textAlign: 'center', marginBottom: 8 }}>
                {lang === 'es'
                  ? 'Esta aplicación utiliza modelos locales de la familia Gemma de Google, distribuidos bajo la Licencia de Uso de Gemma (Gemma 3) y la Licencia Apache 2.0 (Gemma 4), así como el modelo Llama 3.2 1B de Meta, distribuido bajo la Licencia Comunitaria de Llama.'
                  : 'This application utilizes local models from Google\'s Gemma family, distributed under the Gemma Terms of Use (Gemma 3) and the Apache License 2.0 (Gemma 4), as well as Meta\'s Llama 3.2 1B model, distributed under the Llama 3.2 Community License.'}
              </Text>
              <Text style={{ color: '#5a5a5a', fontSize: 10, opacity: 0.6, textAlign: 'center' }}>© 2026 AI Diary. All rights reserved.</Text>
              <Text style={{ color: '#5a5a5a', fontSize: 9, letterSpacing: 2, marginTop: 5, opacity: 0.6, textAlign: 'center' }}>AI DIARY v1.9.6. AI DIARY COGNITION INTERFACE</Text>
            </View>



          </ScrollView>
        </KeyboardAvoidingView>

        {/* Wipe Confirmation Modal */}
        <Modal
          visible={showWipeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowWipeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.secondary }]}>
                {lang === 'es' ? 'PELIGRO: BORRADO TOTAL' : 'WARNING: TOTAL WIPE'}
              </Text>
              <Text style={[styles.modalMessage, { color: colors.textPrimary }]}>
                {lang === 'es' ? 'Escribe "WIPE" para confirmar que deseas borrar todas tus conversaciones, perfiles y datos.'
                  : 'Type "WIPE" to confirm you want to delete all conversations, profiles, and data.'}
              </Text>
              <TextInput
                style={[styles.modalInput, { borderColor: colors.border, color: colors.textPrimary }]}
                value={wipeInputText}
                onChangeText={setWipeInputText}
                autoCapitalize="characters"
                placeholder="WIPE"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowWipeModal(false); setWipeInputText(''); }}>
                  <Text style={{ color: colors.textSecondary }}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnWipe, { backgroundColor: wipeInputText.toUpperCase() === 'WIPE' ? '#d96c6c' : colors.border }]} 
                  disabled={wipeInputText.toUpperCase() !== 'WIPE'}
                  onPress={async () => {
                    setShowWipeModal(false);
                    setWipeInputText('');
                    await executeWipe();
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>WIPE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      {/* --- GLOBAL APP MENUS OVERLAY --- */}
      <Modal visible={showLangPicker || showKebabMenu} transparent={true} animationType="fade">
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setShowLangPicker(false);
              if (showKebabMenu) {
                setShowKebabMenu(false);
                stopKebabTimer();
              }
            }}
          />
          {/* Language Dropdown */}
          {showLangPicker && (
            <View style={{
              position: 'absolute',
              top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 70 : 85,
              right: 60,
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 5,
              minWidth: 80,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}>
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setLang('en'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'en' ? colors.primary : colors.textPrimary }}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 10 }} onPress={() => { setLang('es'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'es' ? colors.primary : colors.textPrimary }}>ES</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Kebab Menu Dropdown */}
          {showKebabMenu && (
            <View style={{
              position: 'absolute',
              top: kebabMenuTop,
              right: 10,
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 8,
              minWidth: 220,
              overflow: 'hidden',
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('profile'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('intro'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('voice_settings'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('vault'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('psy'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); onKebabAction('clear'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🗑️</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Borrar Historial' : 'Clear History'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 15, textTransform: 'uppercase', opacity: 0.7 },
  themeButton: { flex: 1, borderWidth: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  themeButtonText: { fontSize: 10 },
  vaultButtonPanic: { backgroundColor: '#d96c6c', paddingVertical: 18, borderRadius: 24, alignItems: 'center' },
  vaultButtonText: { color: '#FFF', fontWeight: 'bold' },
  
  // Wipe Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnWipe: {
    borderWidth: 0,
  },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, StatusBar, Modal } from 'react-native';
import { ZenGarden } from '../../components/ui/ZenGarden';
import { getZenGardenState, getAnimaMessage } from '../../db/zenGardenSchema';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLlm } from '../../contexts/LlmContext';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { useCircadianCycle } from '../../hooks/useCircadianCycle';

export default function ZenGardenScreen() {
  const db = useSQLiteContext();
  const [treeState, setTreeState] = useState({ strength: 0, equanimity: 0, wisdom: 0 });
  const [flora, setFlora] = useState<any[]>([]);
  const [animaMessage, setAnimaMessage] = useState('');

  const { colors, activeTheme } = useAppTheme();
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const { isDayTime } = useCircadianCycle();

  const {
    status,
    activeModel,
    isDownloading,
    downloadingModel,
    downloadPercent,
    downloadedMB,
    downloadSpeed,
    resetToHome,
  } = useLlm();

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

  useEffect(() => {
    return () => {
      stopKebabTimer();
    };
  }, []);

  // Actualizar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      const fetchState = async () => {
        try {
          const state = await getZenGardenState(db);
          const treeData = state.tree as any;
          if (treeData) {
            setTreeState({
              strength: treeData.strength || 0,
              equanimity: treeData.equanimity || 0,
              wisdom: treeData.wisdom || 0,
            });
          }
          if (state.flora) {
            setFlora(state.flora);
          }
          const msg = await getAnimaMessage(db, lang);
          setAnimaMessage(msg);
        } catch (e) {
          console.error('Error fetching Zen Garden state:', e);
        }
      };

      fetchState();
    }, [db, lang])
  );

  const handleHeaderHomePress = useCallback(async () => {
    try {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    await resetToHome();
  }, [resetToHome]);

  const onKebabAction = useCallback((action: string) => {
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
  }, [lang, router]);

  // Posicionamiento dinámico de los menús dropdown debajo de la barra de navegación (incluyendo la sub-barra de Anima)
  const dropdownTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 70 : 85;

  return (
    <View style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
      {/* 1. Canvas del Jardín Zen (Fondo absoluto) */}
      <ZenGarden treeState={treeState} flora={flora} isStreaming={false} />

      {/* 2. Cabecera SanctuaryHeader */}
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
        onKebabAction={onKebabAction}
        onHomePress={handleHeaderHomePress}
        animaMessage={animaMessage}
      />

      {/* 3. Zen Garden Title & Subtitle */}
      <View style={styles.titleContainer} pointerEvents="none">
        <Text style={[styles.title, { color: (activeTheme === 'matrix' || !isDayTime) ? '#FFFFFF' : '#000000' }]}>
          {lang === 'es' ? 'Este es tu Jardín Zen' : 'This is your Zen Garden'}
        </Text>
        <Text style={[styles.subtitle, { color: (activeTheme === 'matrix' || !isDayTime) ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }]}>
          {lang === 'es' 
            ? 'Habla con tu Diario de IA y verás cómo florece.' 
            : 'Talk with your AI Diary and you will see it flourish.'}
        </Text>
      </View>


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
            <View style={[styles.dropdown, {
              top: dropdownTop + 5,
              right: 60,
              minWidth: 80,
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }]}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setLang('en'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'en' ? colors.primary : colors.textPrimary }}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setLang('es'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'es' ? colors.primary : colors.textPrimary }}>ES</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Kebab Menu Dropdown */}
          {showKebabMenu && (
            <View style={[styles.dropdown, {
              top: dropdownTop,
              right: 10,
              minWidth: 220,
              overflow: 'hidden',
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: 8,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }]}>
              {isDownloading && downloadingModel && (
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: `${colors.primary}15` }}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 }}>
                    {lang === 'es' ? 'DESCARGANDO NÚCLEO...' : 'DOWNLOADING CORE...'}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
                    {lang === 'es' ? downloadingModel.labelEs : downloadingModel.labelEn}
                  </Text>
                  <View style={{ height: 4, backgroundColor: `${colors.primary}20`, borderRadius: 2, marginVertical: 6, overflow: 'hidden' }}>
                    <View style={{ width: `${downloadPercent}%`, height: '100%', backgroundColor: colors.primary }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{downloadPercent}% ({downloadedMB}MB)</Text>
                    {downloadSpeed > 0 && <Text style={{ color: colors.textSecondary, fontSize: 9 }}>🚀 {downloadSpeed} MB/s</Text>}
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); onKebabAction('profile'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); onKebabAction('intro'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); onKebabAction('voice_settings'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); onKebabAction('vault'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kebabItem} onPress={() => { setShowKebabMenu(false); onKebabAction('psy'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kebabItemLast} onPress={() => { setShowKebabMenu(false); onKebabAction('clear'); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🗑️</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Borrar Historial' : 'Clear History'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 90 : 105,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSQLiteContext } from './MemoryProvider';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { IconSymbol } from './ui/icon-symbol';
import { useAppTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useLlmState } from '../contexts/LlmContext';

interface SanctuaryHeaderProps {
  onModelPress?: () => void;
  onHomePress?: () => void;
  activeModelLabel?: string;

  // External state for dropdowns (rendered at screen level)
  showLangPicker?: boolean;
  onLangPress?: () => void;
  onLangSelect?: (lang: string) => void;
  isStreaming?: boolean;
  animaMessage?: string;
  earnedBadge?: any;
}

export const SanctuaryHeader = ({ 
  onModelPress, 
  onHomePress, 
  activeModelLabel, 

  showLangPicker: showLangPickerProp,
  onLangPress,
  onLangSelect,
  isStreaming = false,
  earnedBadge,
}: SanctuaryHeaderProps) => {
  const { colors, activeTheme } = useAppTheme();
  const { lang, setLang } = useLanguage();
  const { deviceRAM } = useLlmState();
  const db = useSQLiteContext();

  const [lastBadge, setLastBadge] = useState<{ emoji: string, name: string } | null>(null);

  const fetchLastBadge = useCallback(async () => {
    if (!db) return;
    try {
      const rows: any[] = await db.getAllAsync(
        'SELECT emoji, name FROM user_badges WHERE count > 0 ORDER BY last_awarded DESC LIMIT 1'
      );
      if (rows && rows.length > 0) {
        setLastBadge(rows[0]);
      }
    } catch (e) {
      console.warn('[SanctuaryHeader] Error fetching last badge:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchLastBadge();
  }, [fetchLastBadge, earnedBadge]);

  // Kebab menu trigger removed, using local Clean Chat icon directly

  // Reanimated shared values for float and breathe/glow
  const floatValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    if (isStreaming) {
      // Pause animations in a neutral position (0 FPS equivalent)
      floatValue.value = withTiming(0, { duration: 300 });
      pulseValue.value = withTiming(1, { duration: 300 });
    } else {
      // Dynamic speed/duration based on device performance (12 FPS vs 24 FPS)
      const isLowRam = deviceRAM < 6000;
      const durationFloat = isLowRam ? 4000 : 2200;
      const durationPulse = isLowRam ? 3200 : 1600;

      floatValue.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: durationFloat, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration: durationFloat, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      pulseValue.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: durationPulse, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.06, { duration: durationPulse, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isStreaming, deviceRAM]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatValue.value },
        { scale: pulseValue.value }
      ] as any,
      opacity: pulseValue.value
    };
  });

  return (
    <View style={[styles.headerContainer, { 
      borderBottomColor: colors.border, 
      backgroundColor: activeTheme === 'matrix' ? 'transparent' : colors.surface,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 15 
    }]}>
      {/* Fila 1: Título y Acciones de Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity key="header-model-trigger" style={{ flexDirection: 'row', alignItems: 'center' }} onPress={onModelPress}>
          <View key="header-title-stack">
            <Text key="header-main-title" style={[styles.headerTitle, { color: colors.secondary }]}>AI Diary</Text>
            <Text key="header-subtitle" style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', opacity: 0.8 }}>
              {lang === 'es' ? 'Diario Personal' : 'Off-Line AI'}
            </Text>
          </View>
          {/* ICONO ESPIRAL: Botón de Reinicio Maestro */}
          <TouchableOpacity 
            key="header-home-btn"
            style={{ alignItems: 'center', justifyContent: 'center', marginLeft: 12, padding: 4 }} 
            onPress={() => {
              if (onHomePress) onHomePress();
            }}
          >
            <IconSymbol key="header-home-icon" name="spiral" size={24} color={colors.primary} />
            <Text style={{ 
              fontSize: 8, 
              fontWeight: 'bold', 
              color: colors.primary, 
              marginTop: 2, 
              letterSpacing: 0.5 
            }}>
              {lang === 'es' ? 'REINICIAR' : 'RESTART'}
            </Text>
            <Text style={{ 
              fontSize: 8, 
              fontWeight: 'bold', 
              color: colors.secondary, 
              marginTop: 1, 
              letterSpacing: 0.5 
            }}>
              {activeModelLabel ? activeModelLabel.toUpperCase() : 'AI CORE'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Central Badge Area */}
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {lastBadge ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>
                {lastBadge.emoji.endsWith('.png') ? '🧠' : lastBadge.emoji}
              </Text>
              <Text style={{ 
                fontSize: 8, 
                fontWeight: 'bold', 
                color: colors.primary, 
                marginTop: 2, 
                letterSpacing: 0.5 
              }}>
                {lastBadge.name.toUpperCase()}
              </Text>
            </View>
          ) : (
            <Text style={{ 
              fontSize: 10, 
              fontWeight: 'bold', 
              color: colors.textSecondary, 
              letterSpacing: 0.5, 
              opacity: 0.4 
            }}>
              {lang === 'es' ? 'INSIGNIAS' : 'BADGES'}
            </Text>
          )}
        </View>

        <View key="header-actions-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Language Pill Selector */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.primary, marginBottom: 2, letterSpacing: 0.5 }}>LANGUAGE</Text>
            <View style={{ 
              flexDirection: 'row', 
              backgroundColor: colors.surfaceSecondary || 'rgba(0,0,0,0.05)', 
              borderRadius: 20, 
              borderWidth: 1, 
              borderColor: colors.border,
              padding: 2,
              alignItems: 'center'
            }}>
              <TouchableOpacity 
                onPress={() => setLang('en')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 15,
                  backgroundColor: lang === 'en' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ 
                  fontSize: 10, 
                  fontWeight: 'bold', 
                  color: lang === 'en' ? (activeTheme === 'matrix' ? '#000000' : '#FFFFFF') : colors.textSecondary 
                }}>ENG</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setLang('es')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 15,
                  backgroundColor: lang === 'es' ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ 
                  fontSize: 10, 
                  fontWeight: 'bold', 
                  color: lang === 'es' ? (activeTheme === 'matrix' ? '#000000' : '#FFFFFF') : colors.textSecondary 
                }}>ESP</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1,
    zIndex: 1000,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  langToggle: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 2,
  },
  langText: {
    fontSize: 12,
  },
});
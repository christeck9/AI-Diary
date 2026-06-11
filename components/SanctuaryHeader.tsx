import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
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
import { useLlm } from '../contexts/LlmContext';

interface SanctuaryHeaderProps {
  onVoicePress?: () => void;
  onKebabAction?: (action: string) => void;
  onModelPress?: () => void;
  onHomePress?: () => void;
  showVoiceIcon?: boolean;
  activeModelLabel?: string;
  isMuted?: boolean;
  chatTtsEnabled?: boolean;
  // External state for dropdowns (rendered at screen level)
  showLangPicker?: boolean;
  onLangPress?: () => void;
  onLangSelect?: (lang: string) => void;
  showKebabMenu?: boolean;
  onKebabPress?: () => void;
  isStreaming?: boolean;
  animaMessage?: string;
}

export const SanctuaryHeader = ({ 
  onVoicePress, 
  onKebabAction, 
  onModelPress, 
  onHomePress, 
  showVoiceIcon = true, 
  activeModelLabel, 
  isMuted = false, 
  chatTtsEnabled = true,
  showLangPicker: showLangPickerProp,
  onLangPress,
  onLangSelect,
  showKebabMenu: showKebabMenuProp,
  onKebabPress,
  isStreaming = false,
}: SanctuaryHeaderProps) => {
  const { colors, activeTheme } = useAppTheme();
  const { lang } = useLanguage();
  const { deviceRAM } = useLlm();

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
      ],
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
              {lang === 'es' ? 'Diario Personal' : 'Diary Journal'}
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

        <View key="header-actions-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Language trigger - dropdown rendered at screen level */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.primary, marginBottom: 2, letterSpacing: 0.5 }}>LANGUAGE</Text>
            <TouchableOpacity
              key="header-lang-trigger"
              style={[styles.langToggle, { borderColor: colors.primary, paddingHorizontal: 10 }]}
              onPress={onLangPress}
            >
              <Text key="header-lang-text" style={[styles.langText, { color: colors.primary, fontWeight: 'bold' }]}>{lang.toUpperCase()} ▼</Text>
            </TouchableOpacity>
          </View>

          {/* CHAT VOICE: Prende / apaga la voz de la IA (TTS) */}
          {showVoiceIcon && (
            <TouchableOpacity 
              key="header-voice-btn" 
              onPress={onVoicePress}
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <IconSymbol
                  name={chatTtsEnabled ? 'voice.active' : 'voice.muted'}
                  size={22}
                  color={chatTtsEnabled ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text style={{ 
                fontSize: 8, 
                fontWeight: 'bold', 
                color: chatTtsEnabled ? colors.primary : colors.textSecondary, 
                marginTop: 2, 
                letterSpacing: 0.5 
              }}>
                CHAT VOICE
              </Text>
            </TouchableOpacity>
          )}

          {/* Hamburger trigger - kebab menu rendered at screen level */}
          <TouchableOpacity
            key="header-kebab-trigger"
            style={{ padding: 5 }}
            onPress={onKebabPress}
          >
            <Text key="header-hamburger-lines" style={{ color: colors.primary, fontSize: 22, fontWeight: 'bold' }}>☰</Text>
          </TouchableOpacity>
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
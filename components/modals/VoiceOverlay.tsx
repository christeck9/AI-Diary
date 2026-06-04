import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';

interface VoiceOverlayProps {
  voiceState: string;
  isVoiceInitializing: boolean;
  lang: string;
  colors: any;
  messages: any[];
  transcript: string;
  voiceError: string | null;
  toggleInteractiveMode: () => void;
  toggleMute: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  processingMessage: string;
  onInterrupt?: () => void;
}

const { width } = Dimensions.get('window');

export function VoiceOverlay({
  voiceState,
  isVoiceInitializing,
  lang,
  colors,
  messages,
  transcript,
  voiceError,
  toggleInteractiveMode,
  toggleMute,
  onPressIn,
  onPressOut,
  processingMessage,
  onInterrupt
}: VoiceOverlayProps) {
  
  // Reanimated values for pulsing rings
  const ringScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Reanimated values for Equalizer bars during SPEAKING
  const eq1 = useSharedValue(1);
  const eq2 = useSharedValue(1);
  const eq3 = useSharedValue(1);
  const eq4 = useSharedValue(1);
  const eq5 = useSharedValue(1);

  useEffect(() => {
    if (voiceState === 'RECORDING') {
      // Button scaling & ring pulsing
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
  }, [voiceState]);

  useEffect(() => {
    if (voiceState === 'SPEAKING') {
      eq1.value = withRepeat(withSequence(withTiming(3.0, { duration: 350 }), withTiming(1.0, { duration: 350 })), -1, true);
      eq2.value = withRepeat(withSequence(withTiming(4.5, { duration: 500 }), withTiming(1.0, { duration: 500 })), -1, true);
      eq3.value = withRepeat(withSequence(withTiming(2.5, { duration: 250 }), withTiming(1.0, { duration: 250 })), -1, true);
      eq4.value = withRepeat(withSequence(withTiming(5.0, { duration: 600 }), withTiming(1.0, { duration: 600 })), -1, true);
      eq5.value = withRepeat(withSequence(withTiming(3.5, { duration: 400 }), withTiming(1.0, { duration: 400 })), -1, true);
    } else {
      eq1.value = withTiming(1.0, { duration: 200 });
      eq2.value = withTiming(1.0, { duration: 200 });
      eq3.value = withTiming(1.0, { duration: 200 });
      eq4.value = withTiming(1.0, { duration: 200 });
      eq5.value = withTiming(1.0, { duration: 200 });
    }
  }, [voiceState]);

  // Animated styles
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

  const eqStyle1 = useAnimatedStyle(() => ({ transform: [{ scaleY: eq1.value }] }));
  const eqStyle2 = useAnimatedStyle(() => ({ transform: [{ scaleY: eq2.value }] }));
  const eqStyle3 = useAnimatedStyle(() => ({ transform: [{ scaleY: eq3.value }] }));
  const eqStyle4 = useAnimatedStyle(() => ({ transform: [{ scaleY: eq4.value }] }));
  const eqStyle5 = useAnimatedStyle(() => ({ transform: [{ scaleY: eq5.value }] }));

  if (voiceState === 'IDLE') return null;

  return (
    <View style={styles.overlayContainer}>
      {/* Upper Glassmorphism Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary || '#00ffcc' }]}>
          {isVoiceInitializing
            ? (lang === 'es' ? '⏳ CARGANDO MOTOR...' : '⏳ LOADING ENGINE...')
            : voiceState === 'WAITING'
              ? (lang === 'es' ? '🎙 LISTO PARA ESCUCHAR' : '🎙 READY TO LISTEN')
              : voiceState === 'RECORDING'
                ? (lang === 'es' ? '● GRABANDO — HABLA AHORA' : '● RECORDING — SPEAK NOW')
                : voiceState === 'PROCESSING'
                  ? (lang === 'es' ? '⚙ PROCESANDO...' : '⚙ PROCESSING...')
                  : voiceState === 'SPEAKING'
                    ? (lang === 'es' ? '🗣 IA RESPONDIENDO' : '🗣 AI RESPONDING')
                    : voiceState === 'MUTED'
                      ? (lang === 'es' ? '🔇 MODO SILENCIO' : '🔇 MUTED')
                      : 'VOICE MODE'}
        </Text>
        
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={toggleInteractiveMode}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        
        {/* Dynamic Display Text based on State */}
        <ScrollView 
          style={styles.textScrollView} 
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator={false}
        >
           {voiceState === 'WAITING' && (
             <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
               {lang === 'es' 
                 ? '🎙️ Mantén presionado el botón PULSA para hablar. Usa entre 3 y 12 palabras.' 
                 : '🎙️ Press and hold the TALK button to speak. Use 3-12 words.'}
             </Text>
           )}

          {voiceState === 'RECORDING' && (
            <Text style={[styles.speakingText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
              {transcript || (lang === 'es' ? '🎙️ Escuchando...' : '🎙️ Listening...')}
            </Text>
          )}

          {voiceState === 'PROCESSING' && (
            <View style={styles.processingWrapper}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 12 }} />
              <Text style={[styles.processingText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                {processingMessage}
              </Text>
            </View>
          )}

          {voiceState === 'SPEAKING' && (
            <Text selectable={true} style={[styles.speakingText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
              {messages.filter(m => m.role === 'ai').pop()?.text || ''}
            </Text>
          )}

          {voiceState === 'MUTED' && (
            <Text style={[styles.mutedText, { color: '#ff6b6b', fontWeight: 'bold' }]}>
              {lang === 'es' ? 'Silencio activo. Pulsa el botón de micrófono abajo para reactivar.' : 'Muted. Tap the microphone button below to unmute.'}
            </Text>
          )}
        </ScrollView>

        {/* Central Visualization / Interaction Node */}
        <View style={styles.centerNodeContainer}>
          {voiceState === 'SPEAKING' ? (
            /* Equalizer bars */
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={onInterrupt}
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={styles.equalizerContainer}>
                <Animated.View style={[styles.eqBar, { backgroundColor: colors.primary || '#00ffcc' }, eqStyle1]} />
                <Animated.View style={[styles.eqBar, { backgroundColor: colors.secondary || '#D4A017', marginHorizontal: 8 }, eqStyle2]} />
                <Animated.View style={[styles.eqBar, { backgroundColor: colors.primary || '#00ffcc' }, eqStyle3]} />
                <Animated.View style={[styles.eqBar, { backgroundColor: colors.secondary || '#D4A017', marginHorizontal: 8 }, eqStyle4]} />
                <Animated.View style={[styles.eqBar, { backgroundColor: colors.primary || '#00ffcc' }, eqStyle5]} />
              </View>
              <Text style={{
                fontSize: 10,
                color: colors.textSecondary || 'rgba(255,255,255,0.4)',
                fontWeight: '600',
                letterSpacing: 1,
                marginTop: 10,
                textTransform: 'uppercase'
              }}>
                {lang === 'es' ? '⚡ Tocar para interrumpir' : '⚡ Tap to interrupt'}
              </Text>
            </TouchableOpacity>
          ) : voiceState === 'PROCESSING' ? (
            /* Brain Core scanning animation style */
            <View style={styles.coreProcessingIconContainer}>
              <View style={[styles.coreCircle, { borderColor: colors.secondary || '#D4A017', borderWidth: 2 }]}>
                <IconSymbol name="cpu" size={40} color={colors.secondary || '#D4A017'} />
              </View>
            </View>
          ) : (
            /* Hold to Talk button (Walkie-Talkie) available in WAITING or RECORDING */
            <View style={styles.walkieTalkieButtonContainer}>
              {voiceState === 'RECORDING' && (
                <Animated.View style={[
                  styles.pulsingRing, 
                  { borderColor: colors.primary || '#00ffcc' },
                  animatedRingStyle
                ]} />
              )}
              
              <Animated.View style={animatedButtonStyle}>
                <Pressable
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  disabled={voiceState === 'MUTED' || isVoiceInitializing}
                  style={({ pressed }) => [
                    styles.talkButton,
                    {
                      borderColor: voiceState === 'RECORDING' ? '#ff3b30' : (colors.primary || '#00ffcc'),
                      backgroundColor: pressed 
                        ? 'rgba(255, 59, 48, 0.15)' 
                        : 'rgba(0, 0, 0, 0.4)'
                    }
                  ]}
                >
                  <IconSymbol 
                    name="waveform" 
                    size={38} 
                    color={voiceState === 'RECORDING' ? '#ff3b30' : (colors.primary || '#00ffcc')} 
                  />
                  <Text style={[
                    styles.talkButtonText, 
                    { color: voiceState === 'RECORDING' ? '#ff3b30' : 'white' }
                  ]}>
                    {voiceState === 'RECORDING' 
                      ? (lang === 'es' ? 'SUELTA' : 'RELEASE') 
                      : (lang === 'es' ? 'PULSA' : 'TALK')}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </View>
      </View>

      {/* Footer Controls */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerControlBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]} 
          onPress={toggleMute}
          activeOpacity={0.7}
        >
          <IconSymbol 
            name={voiceState === 'MUTED' ? "waveform.slash" : "waveform"} 
            size={22} 
            color={voiceState === 'MUTED' ? '#ff3b30' : 'white'} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.exitBtn, { backgroundColor: colors.primary || '#00ffcc' }]} 
          onPress={toggleInteractiveMode}
          activeOpacity={0.8}
        >
          <Text style={styles.exitBtnText}>
            {lang === 'es' ? 'SALIR MODO VOZ' : 'EXIT VOICE MODE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 14, 0.97)',
    zIndex: 1000,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  textScrollView: {
    maxHeight: 220,
    width: '100%',
    marginTop: 20,
    marginBottom: 30,
  },
  textScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 15,
  },
  recordingStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  processingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  processingText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  speakingText: {
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  mutedText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  centerNodeContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    justifyContent: 'center',
  },
  eqBar: {
    width: 6,
    height: 20,
    borderRadius: 3,
  },
  coreProcessingIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 160, 23, 0.05)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walkieTalkieButtonContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
  },
  talkButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  talkButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
    letterSpacing: 1.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
  },
  footerControlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitBtn: {
    flex: 1,
    marginLeft: 16,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  exitBtnText: {
    color: '#07070a',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});

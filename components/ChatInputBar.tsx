import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, KeyboardAvoidingView, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { IconSymbol } from './ui/icon-symbol';
import { CONSCIOUSNESS_CONFIG } from '../constants/NeuralConstants';

export function ChatInputBar({
  isTyping,
  processingAttachedFile,
  colors,
  lang,
  activeModel,
  handlePickDocument,
  inputText,
  handleInputChange,
  t,
  handleSend,
  stopGeneration,
  attachedFile,
  status,
  voiceState,
  toggleInteractiveMode,
  setMicPhase,
  setShowVoiceNoteModal,
  dictation,
  consciousnessLevel,
  setConsciousnessLevel,
  clearAttachment,
  isSearchingWeb,
  searchingStep,
  isThinking,
  downloadPercent = 0,
  downloadedMB = 0,
  downloadSpeed = 0
}: {
  isTyping: boolean;
  processingAttachedFile: any;
  colors: any;
  lang: string;
  activeModel: any;
  handlePickDocument: () => void;
  inputText: string;
  handleInputChange: (t: string) => void;
  t: any;
  handleSend: (overrideText?: string) => void;
  stopGeneration: () => void;
  attachedFile: any;
  status: any;
  voiceState: string;
  toggleInteractiveMode: () => Promise<void>;
  setMicPhase: (p: any) => void;
  setShowVoiceNoteModal: (v: boolean) => void;
  dictation: any;
  consciousnessLevel: number;
  setConsciousnessLevel: (v: number) => void;
  clearAttachment: () => void;
  isSearchingWeb?: boolean;
  searchingStep?: string;
  isThinking?: boolean;
  downloadPercent?: number;
  downloadedMB?: number;
  downloadSpeed?: number;
}) {
  return (
    <>
      {/* 🛡️ SENTINEL v3.0 — Indicador Dinámico de Fase */}
      {isSearchingWeb && (
        <Animated.View style={[styles.indicatorWrapper, { backgroundColor: colors.surfaceSecondary }]}>
          <ActivityIndicator size="small" color={searchingStep === 'searching' ? colors.primary : '#00ffcc'} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
            {searchingStep === 'searching'
              ? (lang === 'es' ? '🌐 Consultando Red de Búsqueda...' : '🌐 Querying Search Network...')
              : (lang === 'es' ? '🧠 Sintetizando Verdad...' : '🧠 Synthesizing Truth...')}
          </Text>
        </Animated.View>
      )}




      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS === 'ios'}
      >
        {isTyping && processingAttachedFile && (
          <View style={{ backgroundColor: colors.surfaceSecondary, padding: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {lang === 'es' 
                ? `Procesando ${processingAttachedFile.name}...` 
                : `Processing ${processingAttachedFile.name}...`}
            </Text>
          </View>
        )}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingBottom: 5, paddingHorizontal: 10 }]}>
          <TouchableOpacity
            style={{ marginRight: 10, paddingBottom: 5 }}
            onPress={handlePickDocument}
            accessibilityRole="button"
            accessibilityLabel={lang === 'es' ? 'Adjuntar archivo' : 'Attach file'}
            accessibilityHint={lang === 'es' ? 'Permite seleccionar una imagen o documento para analizar' : 'Allows selecting an image or document to analyze'}
          >
            <IconSymbol name="doc.fill" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, flex: 1 }]}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={t('chat.placeholder.ready')}
            placeholderTextColor={colors.textSecondary}
            multiline={true}
            returnKeyType="send"
            blurOnSubmit={Platform.OS === 'ios' ? false : true}
            onSubmitEditing={() => {
              const isVisionDownloading = attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD';
              if (!isVisionDownloading && ((inputText || "").trim() || attachedFile)) {
                handleSend();
              }
            }}
            onKeyPress={(e) => {
              const isVisionDownloading = attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD';
              if (!isVisionDownloading && e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey && Platform.OS !== 'web') {
                handleSend();
              }
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, ((!(inputText || "").trim() && !attachedFile && !isTyping) || (attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD')) && { opacity: 0.5 }]}
            onPress={isTyping ? stopGeneration : () => handleSend()}
            disabled={(!(inputText || "").trim() && !attachedFile && !isTyping) || (attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD')}
            accessibilityRole="button"
            accessibilityLabel={isTyping ? (lang === 'es' ? 'Detener generación' : 'Stop generation') : (lang === 'es' ? 'Enviar mensaje' : 'Send message')}
          >
            <IconSymbol name={isTyping ? "stop.circle.fill" : "arrow.up.circle.fill"} size={32} color={isTyping ? colors.primary : (((inputText || "").trim() || (attachedFile && attachedFile.extractedText !== 'PENDING_VISION_DOWNLOAD')) ? colors.primary : colors.textSecondary)} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, { marginLeft: 10 }]}
            onPress={async () => {
              if (status !== 'ready') return;

              if (voiceState !== 'IDLE') {
                console.log('[CHAT] Walkie-Talkie active. Turning it off before launching dictation.');
                await toggleInteractiveMode();
                await new Promise<void>((resolve) => setTimeout(resolve, 200));
              }

              setMicPhase('idle');
              setShowVoiceNoteModal(true);

              const success = await dictation.startListening(
                undefined,
                undefined,
                (phase: 'permission' | 'init' | 'ready') => setMicPhase(phase)
              );
              if (!success) {
                setMicPhase('idle');
              }
            }}
            disabled={status !== 'ready'}
            accessibilityRole="button"
            accessibilityLabel={lang === 'es' ? 'Grabar nota de voz' : 'Record voice note'}
          >
            <IconSymbol name="waveform" size={32} color={status === 'ready' ? '#4cd137' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.surface,
          paddingHorizontal: 15,
          paddingVertical: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border
        }}>
          {(() => {
            const isRecording = voiceState === 'RECORDING';
            const isProcessing = voiceState === 'PROCESSING';
            const isSpeakingNow = voiceState === 'SPEAKING';
            const isMutedWT = voiceState === 'MUTED';
            const isActive = voiceState !== 'IDLE';

            const btnColor = isRecording ? '#ff3b30'
              : isProcessing ? (colors.secondary || '#D4A017')
              : isSpeakingNow ? (colors.primary)
              : isMutedWT ? colors.textSecondary
              : isActive ? colors.primary
              : colors.textSecondary;

            const btnBg = isRecording ? 'rgba(255,59,48,0.15)'
              : isActive ? `${colors.primary}25`
              : colors.surfaceSecondary;

            const btnBorder = isRecording ? '#ff3b30'
              : isActive ? colors.primary
              : colors.border;

            const iconName = isRecording ? 'waveform'
              : isSpeakingNow ? 'waveform'
              : isMutedWT ? 'waveform.slash'
              : 'voice.active';

            const labelES = isRecording ? '● REC'
              : isProcessing ? '⚙ PROC.'
              : isSpeakingNow ? '🔊 HABLA'
              : isMutedWT ? '🔇 MUTED'
              : isActive ? '🎙 LISTO'
              : 'ACTIVE TALK';

            const labelEN = isRecording ? '● REC'
              : isProcessing ? '⚙ PROC.'
              : isSpeakingNow ? '🔊 SPEAK'
              : isMutedWT ? '🔇 MUTED'
              : isActive ? '🎙 READY'
              : 'ACTIVE TALK';

             return (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: btnBg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: btnBorder,
                  minWidth: 72,
                }}
                onPress={async () => {
                  if (status === 'ready') {
                    await toggleInteractiveMode();
                  } else {
                    Alert.alert(
                      lang === 'es' ? 'Núcleo inactivo' : 'Core inactive',
                      lang === 'es' ? 'Por favor activa el núcleo de IA primero.' : 'Please activate the AI Core first.'
                    );
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Modo Walkie Talkie' : 'Walkie Talkie Mode'}
              >
                <IconSymbol
                  name={iconName}
                  size={16}
                  color={btnColor}
                />
                <Text style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: btnColor,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                }}>
                  {lang === 'es' ? labelES : labelEN}
                </Text>
              </TouchableOpacity>
            );
          })()}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 12,
                lineHeight: 14,
                color: colors.textSecondary,
                fontWeight: 'bold',
                fontStyle: 'italic',
                marginRight: 12,
                textAlign: 'right'
              }}
            >
              {CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].desc}
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border
              }}
              onPress={() => {
                const nextLevel = consciousnessLevel >= 4 ? 1 : consciousnessLevel + 1;
                setConsciousnessLevel(nextLevel);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel={lang === 'es' ? `Nivel de consciencia: ${CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}` : `Consciousness level: ${CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}`}
            >
              <IconSymbol
                name="brain.head.profile"
                size={18}
                color={
                  consciousnessLevel === 1 ? colors.textSecondary :
                    consciousnessLevel === 2 ? '#4A90D9' : '#D4A017'
                }
              />
              <Text style={{
                marginLeft: 6,
                fontSize: 11,
                fontWeight: 'bold',
                color: consciousnessLevel === 1 ? colors.textSecondary :
                  consciousnessLevel === 2 ? '#4A90D9' : '#D4A017',
                textTransform: 'uppercase'
              }}>
                {CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {attachedFile && (
          <View style={{ backgroundColor: colors.surfaceSecondary, padding: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            {attachedFile.extractedText === 'PENDING_VISION_DOWNLOAD' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
                    {lang === 'es' ? 'Descargando Módulo de Visión...' : 'Downloading Vision Module...'}
                  </Text>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 6, overflow: 'hidden', width: '100%' }}>
                    <View style={{ height: '100%', width: `${downloadPercent}%`, backgroundColor: colors.primary }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                      {downloadPercent}% ({downloadedMB}MB / {attachedFile.sizeKB}MB)
                    </Text>
                    {downloadSpeed > 0 && (
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                        {downloadSpeed} MB/s
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={{ padding: 8 }} onPress={clearAttachment}>
                  <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : attachedFile.type === 'image' || attachedFile.type === 'image/vision-optimized' ? (
              <View style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 }}>
                <Image
                  source={{ uri: attachedFile.uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                  onPress={clearAttachment}
                >
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginRight: 8 }}>{attachedFile.type === 'pdf' ? '📄' : attachedFile.type === 'doc' ? '📝' : '📋'}</Text>
                  <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 13, flex: 1, fontWeight: 'bold' }}>{attachedFile.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 8 }}>{attachedFile.sizeKB}KB</Text>
                </View>
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={clearAttachment}>
                  <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  indicatorWrapper: {
    position: 'absolute', bottom: 100, alignSelf: 'center', paddingHorizontal: 15, paddingVertical: 8,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84
  },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 60, paddingTop: 10 },
  input: {
    borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15,
    maxHeight: 120, minHeight: 40, borderWidth: 1, borderColor: 'transparent'
  },
  sendButton: { paddingBottom: 5, justifyContent: 'center', alignItems: 'center' }
});

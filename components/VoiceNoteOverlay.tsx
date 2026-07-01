import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

export function VoiceNoteOverlay({
  show,
  lang,
  dictation,
  uiIsCapturing,
  micPhase,
  onClose,
  onSendAudio,
}: {
  show: boolean;
  lang: string;
  dictation: any;
  uiIsCapturing: boolean;
  micPhase: string;
  onClose: () => void;
  onSendAudio: (text: string) => void;
}) {
  if (!show) return null;

  return (
    <View style={styles.overlay}>
      {/* Botón cerrar */}
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <IconSymbol name="xmark" size={24} color="white" />
      </TouchableOpacity>

      {/* Fase: Solicitando permisos */}
      {micPhase === 'permission' && (
        <View style={styles.centerGap}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.textBold}>
            {lang === 'es' ? '🔐 Verificando permisos...' : '🔐 Checking permissions...'}
          </Text>
        </View>
      )}

      {/* Fase: Cargando modelo Whisper */}
      {micPhase === 'init' && (
        <View style={styles.centerGap}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.textBold}>
            {lang === 'es' ? '⚡ Iniciando motor de voz...' : '⚡ Starting voice engine...'}
          </Text>
          <Text style={styles.textSecondary}>
            {lang === 'es' ? 'Solo la primera vez tarda un momento.' : 'First time only — takes a moment.'}
          </Text>
        </View>
      )}

      {/* Fase: Escuchando / Error */}
      {(micPhase === 'ready' || micPhase === 'idle') && (
        <View style={styles.contentWrapper}>
          {dictation.voiceError ? (
            <View style={styles.centerGap}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
              <Text style={styles.errorText}>
                {dictation.voiceError}
              </Text>
            </View>
          ) : (
            <>
              <IconSymbol
                name={dictation.isInitializing ? 'waveform' : (uiIsCapturing ? 'waveform' : 'waveform.slash')}
                size={126}
                color={uiIsCapturing && !dictation.isInitializing ? '#4cd137' : 'rgba(255,255,255,0.3)'}
              />
              <Text style={styles.statusText}>
                {dictation.isInitializing || !uiIsCapturing
                  ? (lang === 'es' ? 'Iniciando micrófono...' : 'Microphone is starting...')
                  : (lang === 'es' ? 'Listo' : 'Ready')
                }
              </Text>

              {dictation.transcript && !dictation.isInitializing ? (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <ScrollView 
                    style={styles.transcriptScroll}
                    contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 10 }}
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={styles.transcriptText}>
                      {dictation.transcript}
                    </Text>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={() => onSendAudio(dictation.transcript)}
                  >
                    <IconSymbol name="arrow.up.circle.fill" size={18} color="black" />
                    <Text style={styles.sendBtnText}>
                      {lang === 'es' ? 'Enviar Audio' : 'Send Audio'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.waitingText}>
                  {dictation.isInitializing || !uiIsCapturing
                    ? (lang === 'es' ? 'Iniciando micrófono...' : 'Microphone is starting...')
                    : (lang === 'es' ? 'Esperando tu voz...' : 'Waiting for your voice...')
                  }
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Environment Control Panel */}
      {(micPhase === 'ready' || micPhase === 'idle') && !dictation.isInitializing && !dictation.voiceError && (
        <View style={styles.envPanel}>
          <Text style={styles.envTitle}>
            {lang === 'es' ? 'Entorno (Ruido)' : 'Environment (Noise)'}
          </Text>
          <View style={styles.vadControls}>
            <TouchableOpacity 
              onPress={() => dictation.changeVadLevel?.(Math.max(1, (dictation.vadLevel || 3) - 1))}
              style={{ padding: 8 }}
            >
              <Text style={[styles.vadText, { fontWeight: (dictation.vadLevel || 3) > 1 ? 'bold' : 'normal' }]}>
                {lang === 'es' ? 'Silencio' : 'Clean'}
              </Text>
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map(lvl => (
                <View 
                  key={lvl} 
                  style={[
                    styles.vadTick,
                    {
                      height: lvl === (dictation.vadLevel || 3) ? 14 : 6, 
                      backgroundColor: lvl === (dictation.vadLevel || 3) ? 'white' : 'rgba(255,255,255,0.25)',
                    }
                  ]} 
                />
              ))}
            </View>

            <TouchableOpacity 
              onPress={() => dictation.changeVadLevel?.(Math.min(5, (dictation.vadLevel || 3) + 1))}
              style={{ padding: 8 }}
            >
              <Text style={[styles.vadText, { fontWeight: (dictation.vadLevel || 3) < 5 ? 'bold' : 'normal' }]}>
                {lang === 'es' ? 'Ruidoso' : 'Noisy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1000, 
    justifyContent: 'center', alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, padding: 10, 
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20
  },
  centerGap: { alignItems: 'center', gap: 16, paddingHorizontal: 30 },
  textBold: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  textSecondary: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },
  contentWrapper: { alignItems: 'center', paddingHorizontal: 30, width: '100%' },
  errorText: { color: '#ff6b6b', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  statusText: { color: 'white', fontSize: 14, marginTop: 18, fontWeight: 'bold', textAlign: 'center' },
  transcriptScroll: { maxHeight: 150, width: '100%', marginVertical: 10 },
  transcriptText: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center', lineHeight: 20 },
  sendBtn: {
    backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4
  },
  sendBtnText: { color: 'black', fontSize: 12, fontWeight: 'bold' },
  waitingText: { color: 'white', fontSize: 12, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  envPanel: { position: 'absolute', bottom: 40, left: 30, right: 30, alignItems: 'center' },
  envTitle: { color: 'white', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  vadControls: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', 
    backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15 
  },
  vadText: { color: 'white', fontSize: 12 },
  vadTick: { width: 10, borderRadius: 5, borderWidth: 1, borderColor: 'white' }
});

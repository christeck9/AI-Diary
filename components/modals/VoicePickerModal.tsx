import React, { useState, useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';
import * as Speech from 'expo-speech';

interface VoicePickerModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'en' | 'es';
  colors: any;
  availableVoices: any[];
  selectedVoiceId: string | null;
  setSelectedVoiceId: (id: string) => void;
  isMuted?: boolean;
  toggleMute?: () => void | Promise<void>;
}

export const VoicePickerModal: React.FC<VoicePickerModalProps> = ({
  visible,
  onClose,
  lang,
  colors,
  availableVoices,
  selectedVoiceId,
  setSelectedVoiceId,
  isMuted = false,
  toggleMute
}) => {
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Stop previews when modal is closed
  useEffect(() => {
    if (!visible) {
      Speech.stop();
      setPreviewingId(null);
    }
  }, [visible]);

  const handlePlayPreview = (voiceId: string, voiceLang: string) => {
    if (previewingId === voiceId) {
      Speech.stop();
      setPreviewingId(null);
    } else {
      Speech.stop();
      setPreviewingId(voiceId);
      
      const sampleText = voiceLang.startsWith('es')
        ? "Esta es una muestra de mi voz en español. ¿Te gusta cómo suena?"
        : "This is a sample of my voice in English. Do you like how it sounds?";
        
      Speech.speak(sampleText, {
        voice: voiceId,
        language: voiceLang,
        onDone: () => setPreviewingId(null),
        onStopped: () => setPreviewingId(null),
        onError: (err) => {
          console.warn('[VOICE] Preview failed', err);
          setPreviewingId(null);
        },
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: '80%' }]}>
          <Text style={[styles.modalTitle, { color: colors.primary, textAlign: 'center' }]}>
            {lang === 'es' ? 'Seleccionar Voz (TTS)' : 'Select Voice (TTS)'}
          </Text>

          {toggleMute && (
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: 12, 
                backgroundColor: colors.surfaceSecondary, 
                borderRadius: 8, 
                marginBottom: 15,
                borderWidth: 1,
                borderColor: colors.border
              }}
              onPress={() => {
                toggleMute();
              }}
            >
              <IconSymbol 
                name={isMuted ? "waveform.slash" : "equalizer"} 
                size={20} 
                color={isMuted ? 'red' : colors.primary} 
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                {isMuted 
                  ? (lang === 'es' ? 'Activar Sonido (Muteado)' : 'Unmute Sound (Muted)')
                  : (lang === 'es' ? 'Silenciar Sonido (Activo)' : 'Mute Sound (Active)')}
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView style={{ marginTop: 10, marginBottom: 20 }}>
            {availableVoices
              .filter(v => {
                if (!v || typeof v.language !== 'string') return false;
                return lang === 'es' ? v.language.startsWith('es') : v.language.startsWith('en');
              })
              .sort((a, b) => {
                const aQual = a?.quality || '';
                const bQual = b?.quality || '';
                const aName = a?.name || '';
                const bName = b?.name || '';
                if (aQual === bQual) return aName.localeCompare(bName);
                return bQual.localeCompare(aQual);
              })
              .map(voice => {
                if (!voice || !voice.identifier) return null;
                // Lógica de traducción humana
                const id = voice.identifier.toLowerCase();

                // Detectar género basado en la última letra del código de voz (ej: en-au-x-aua -> a es impar -> Femenina)
                // Buscamos el segmento que contiene el código (usualmente después de -x-)
                const parts = id.split('-');
                const codeSegment = parts.find((p: string) => p.length === 3 && p !== 'loc' && p !== 'net') || '';
                const lastChar = codeSegment.slice(-1);
                const isFemale = ['a', 'c', 'e', 'g'].includes(lastChar);

                const gender = isFemale
                  ? (lang === 'es' ? 'Femenina' : 'Female')
                  : (lang === 'es' ? 'Masculina' : 'Male');

                const qualityTag = id.includes('network')
                  ? (lang === 'es' ? 'Alta Fidelidad' : 'High Fidelity')
                  : (lang === 'es' ? 'Privacidad Local' : 'Local Privacy');

                const displayName = `${lang === 'es' ? 'Voz del Diario' : 'Diary Voice'} ${gender} (${voice.name || 'N/A'})`;

                return (
                  <View
                    key={voice.identifier}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: selectedVoiceId === voice.identifier ? colors.surfaceSecondary : 'transparent'
                    }}
                  >
                    {/* Play Preview Button */}
                    <TouchableOpacity
                      style={{ paddingVertical: 15, paddingRight: 15 }}
                      onPress={() => {
                        handlePlayPreview(voice.identifier, voice.language);
                      }}
                    >
                      <IconSymbol 
                        name={previewingId === voice.identifier ? "volume.up.circle.fill" : "play.circle.fill"} 
                        size={26} 
                        color={previewingId === voice.identifier ? colors.secondary : colors.primary} 
                      />
                    </TouchableOpacity>

                    {/* Main Selection Area */}
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 15 }}
                      onPress={() => {
                        setSelectedVoiceId(voice.identifier);
                        onClose();
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ color: selectedVoiceId === voice.identifier ? colors.primary : colors.textPrimary, fontWeight: 'bold', fontSize: 16 }}>
                            {displayName}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>
                            {qualityTag}
                          </Text>
                        </View>
                        {selectedVoiceId === voice.identifier && (
                          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
          </ScrollView>

          <TouchableOpacity style={{ alignItems: 'center', padding: 10 }} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{lang === 'es' ? 'Cerrar' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    width: '100%', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#ccc'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 15
  },
});

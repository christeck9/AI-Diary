import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  Platform
} from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';

interface VoiceSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'en' | 'es';
  colors: any;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  visible,
  onClose,
  lang,
  colors,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'android' ? 85 : 20 }}>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
              {lang === 'es' ? 'Configuración de Voz del Sistema' : 'System Voice Configuration'}
            </Text>

            <View style={{ backgroundColor: colors.surfaceSecondary, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                {lang === 'es' 
                  ? 'Sigue estos pasos en tu dispositivo para descargar voces locales de alta calidad de Google y optimizar la voz nativa.' 
                  : 'Follow these steps on your device to download high-quality local Google voices and optimize the native voice.'}
              </Text>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {lang === 'es' ? (
                <>
                  <View style={styles.stepSection}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>1. Abre los Ajustes de tu Teléfono</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Ve a la aplicación de Ajustes o Configuración de tu dispositivo Android.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>2. Navega a Accesibilidad</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Busca la opción de <Text style={{ fontWeight: 'bold' }}>Accesibilidad</Text> y luego selecciona <Text style={{ fontWeight: 'bold' }}>Salida de síntesis de voz</Text> (Text-to-speech output).
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>3. Selecciona el Motor Preferido</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Asegúrate de que el <Text style={{ fontWeight: 'bold' }}>Motor preferido</Text> seleccionado sea <Text style={{ fontWeight: 'bold' }}>Servicios de voz de Google</Text>.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>4. Abre los Ajustes de Voz</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Toca el icono del <Text style={{ fontWeight: 'bold' }}>Engranaje/Ajustes</Text> al lado del motor preferido.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>5. Instala Datos de Voz</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Selecciona <Text style={{ fontWeight: 'bold' }}>Instalar datos de voz</Text> y elige el idioma <Text style={{ fontWeight: 'bold' }}>Español</Text> (o Inglés).
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>6. Elige y Previsualiza tu Voz</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Verás una lista de voces locales (ej. Voz I, Voz II, Voz III). Toca el icono de reproducir o pulsa sobre la voz para escuchar una muestra en vivo (ej. "Este es un ejemplo de síntesis de voz en español").
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.stepSection}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>1. Open your Phone's Settings</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Go to the Settings app on your Android device.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>2. Navigate to Accessibility</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Look for <Text style={{ fontWeight: 'bold' }}>Accessibility</Text> and tap on <Text style={{ fontWeight: 'bold' }}>Text-to-speech output</Text>.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>3. Select Preferred Engine</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Under <Text style={{ fontWeight: 'bold' }}>Preferred engine</Text>, make sure <Text style={{ fontWeight: 'bold' }}>Speech Services by Google</Text> is selected.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>4. Open Voice Settings</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Tap the <Text style={{ fontWeight: 'bold' }}>Gear/Settings</Text> icon next to the preferred engine.
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.secondary }]}>5. Install Voice Data</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Select <Text style={{ fontWeight: 'bold' }}>Install voice data</Text> and tap on <Text style={{ fontWeight: 'bold' }}>English</Text> (or Spanish).
                    </Text>
                  </View>

                  <View style={[styles.stepSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                    <Text style={[styles.stepTitle, { color: colors.primary }]}>6. Choose and Preview Voice</Text>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      You will see a list of voices (e.g., Voice I, Voice II, Voice III). Tap the Play icon or just press over the voice and you will hear a live local preview (e.g., "This is an example of speech synthesis in English").
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.closeBtn, { backgroundColor: colors.primary }]} 
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>{lang === 'es' ? 'Entendido' : 'Got it!'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeBtn: {
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10,
  },
  closeBtnText: {
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  stepSection: {
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 5,
  },
  stepText: {
    fontSize: 14, 
    lineHeight: 20,
  }
});

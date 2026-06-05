import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert
} from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';

interface IntroModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'en' | 'es';
  colors: any;
}

export const IntroModal: React.FC<IntroModalProps> = ({
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
          <View style={{ padding: 20 }}>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
              AI Diary: Your Safe Space
            </Text>

            <View style={{ backgroundColor: colors.surfaceSecondary, padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                {lang === 'es'
                  ? 'Si tienes problemas cargando la IA presiona el botón Master Reset.'
                  : 'If you have any problem loading the IA press the Master Reset Button.'}
              </Text>
            </View>

            <ScrollView
              style={{ height: '70%' }}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.introSection}>
                <Text style={[styles.introTitle, { color: colors.secondary }]}>🔒 {lang === 'es' ? '100% Privado e IA Local' : '100% Private & Local AI'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Tu espacio en AI Diary es soberano. Todo el procesamiento de chat, análisis de personalidad e historial de diario se ejecuta localmente (100% en este dispositivo) en una base de datos SQLite encriptada, operando de forma autónoma y sin enviar tus datos a la nube.'
                    : 'Your space in AI Diary is sovereign. All chat processing, personality analysis, and diary history execute locally (100% on this device) in an encrypted SQLite database, operating autonomously without sending your data to the cloud.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                  <IconSymbol name="cpu" size={22} color={colors.secondary} />
                  <Text style={[styles.introTitle, { color: colors.secondary, marginBottom: 0 }]}>
                    {lang === 'es' ? 'IA con modos de razonamiento personalizados' : 'Powered by AI w/custom reasoning modes'}
                  </Text>
                </View>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Las funciones de chat están impulsadas por IA local ejecutada directamente en tu dispositivo usando los modelos Llama 3.2 (1B), Gemma3:4b (bajo la Licencia de Uso de Gemma) y Gemma4:e2b (bajo la licencia Apache 2.0). Las IAs comienzan en el modo Zen (el más básico), les sigue el modo Balance (más intuitivo), luego el pensamiento Deep, y finalmente Philosophic. También en Avanzado puedes escoger la Inferencia Filosófica.'
                    : 'Conversational features are powered by local, on-device AI running Llama 3.2 (1B), Google\'s Gemma3:4b (under the Gemma Terms of Use) and Gemma4:e2b (under the Apache 2.0 license). The AIs start in Zen mode (the most basic), followed by the more intuitive Balance mode, then Deep thinking, and finally Philosophic. You can also choose Philosophical Inference in Advanced settings.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: colors.primary }]}>🛡️ {lang === 'es' ? 'Información y Noticias en Tiempo Real' : 'Realtime Info and News'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Si necesitas consultar datos o eventos actualizados, nuestro sistema Sentinel realiza búsquedas seguras y anónimas en Brave News, Wikipedia y The Codex (fichas bibliográficas) para actualizar e informar a la IA en tiempo real.'
                    : 'If you need to consult updated data or events, our Sentinel system performs secure and anonymous searches on Brave News, Wikipedia, and The Codex (bibliographic records) to update and inform the AI in real time.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: colors.secondary }]}>🗣️ {lang === 'es' ? 'Síntesis y Reconocimiento de Voz' : 'Speech Synthesis & Recognition'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'La IA te lee por oraciones en tiempo real con los motores de voz proporcionados por tu teléfono (lee en este menú Configuración de Voz Android). También como opción premium y única posibilidad de streaming, puedes experimentar con una API de Google (gratis o muy barata) o con una de ChatGPT (no son necesarias).'
                    : 'The AI reads to you sentence-by-sentence in real time using the voice engines provided by your phone (read the Android Voice Settings in this menu). Also, as a premium option and the only possibility for streaming, you can experiment with a Google API (free or very cheap) or a ChatGPT API (not required).'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: colors.primary }]}>📊 {lang === 'es' ? 'Autoconocimiento y Perfiles' : 'Self-Knowledge & Profiles'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Termina tu Perfil de Usuario y realiza cuestionarios de personalidad (OCEAN+, Aptitudes, temperamento, personalidad) para calibrar la manera y tono de respuesta de la IA. Dibuja tu copo de nieve cognitivo y exporta reportes de personalidad en PDF directamente desde el menú Advanced con el botón Exporta Reporte de Personalidad. También un informe más extenso de toda la información que contiene tu aplicación está disponible en Exporta Historial del Diario. Todo puede borrarse con el Botón de Reinicio Maestro.'
                    : 'Complete your User Profile and take personality tests (OCEAN+, Aptitudes, temperament, personality) to calibrate the response style and tone of the AI. Draw your cognitive snowflake and export personality reports in PDF directly from the Advanced menu using the Export Personality Report button. A more extensive report of all your application data is available in Export Diary History. Everything can be wiped with the Master Reset Button.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: '#d96c6c' }]}>{lang === 'es' ? '🚩 Sistema de Reporte y Amnesia' : '🚩 Flagging System & Amnesia'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Puedes reportar o marcar contenido ofensivo, dañino o inexacto generado por la IA (deslizando un mensaje a la izquierda). Elimina mensajes específicos para corregir el rumbo de la IA ante memorias erróneas, alucinaciones o bucles.'
                    : 'You can report or flag offensive, harmful, or inaccurate content generated by the AI (by swiping left on any message). Delete specific messages to correct the AI\'s course, clearing erroneous memories, hallucinations, or loops.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10, marginBottom: 30 }]}>
                <Text style={[styles.introTitle, { color: colors.primary }]}>💡 {lang === 'es' ? 'Buzón de Sugerencias' : 'Suggestion Box'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary, marginBottom: 10 }]}>
                  {lang === 'es'
                    ? '¿Tienes alguna idea para mejorar el Diario? Cuéntanos de forma breve (máx. 140 caracteres).'
                    : 'Do you have an idea to improve the Diary? Tell us briefly (max. 140 chars).'}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.textPrimary,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 14,
                    height: 80,
                    textAlignVertical: 'top'
                  }}
                  placeholder={lang === 'es' ? 'Escribe aquí...' : 'Write here...'}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={140}
                  multiline
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    padding: 10,
                    borderRadius: 20,
                    marginTop: 10,
                    alignItems: 'center'
                  }}
                  onPress={() => Alert.alert(lang === 'es' ? '¡Gracias!' : 'Thanks!', lang === 'es' ? 'Tu sugerencia ha sido guardada localmente.' : 'Your suggestion has been saved locally.')}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{lang === 'es' ? 'Enviar' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={onClose}
            >
              <Text style={styles.saveBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  saveBtn: {
    padding: 12, borderRadius: 5, alignItems: 'center', marginTop: 10
  },
  saveBtnText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16
  },
  introSection: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 5,
  },
  introText: {
    fontSize: 14, lineHeight: 20,
  }
});

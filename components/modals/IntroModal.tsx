import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Dimensions
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
  const [layoutTicket, setLayoutTicket] = useState(0);
  const isAndroidEnvironment = Platform.OS === 'android';
  const { width: absoluteScreenWidth, height: absoluteScreenHeight } = Dimensions.get('screen');

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setLayoutTicket(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      {isAndroidEnvironment && <View style={{ height: (layoutTicket % 2 === 1) ? 0.5 : 0 }} />}
      <View 
        style={{ 
          flex: 1, 
          width: absoluteScreenWidth, 
          height: absoluteScreenHeight, 
          backgroundColor: colors.background, 
          margin: 0, 
          padding: 0,
          paddingTop: isAndroidEnvironment && (layoutTicket % 2 === 1) ? 0.5 : 0
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'android' ? 85 : 20 }}>
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
              style={{ flex: 1 }}
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
                    ? 'La IA te lee en tiempo real con los motores de voz proporcionados por tu teléfono. También puedes usar una API de Google o ChatGPT para voces naturales en la nube. ¡El lector de libros soporta reproducción en segundo plano con la pantalla apagada! Para evitar que Android interrumpa la lectura tras unos minutos, mantén presionado el ícono de la app, ve a "Información de la aplicación" -> "Batería" y selecciona "Sin restricciones".'
                    : 'The AI reads to you in real time using your phone\'s native voice engines, or cloud APIs (Google/ChatGPT) for natural voices. The book reader supports background reading with the screen off! To prevent Android from interrupting the reading after a few minutes, long-press the app icon, go to "App Info" -> "Battery" and select "Unrestricted".'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: colors.primary }]}>📊 {lang === 'es' ? 'Autoconocimiento y Perfiles' : 'Self-Knowledge & Profiles'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Completa tu Perfil de Usuario en Opciones y realiza cuestionarios de personalidad en la pestaña de Autoconocimiento para calibrar la manera y tono de respuesta de la IA. Dibuja tu copo de nieve cognitivo, explora tu Mapa Mental y exporta reportes de personalidad o el historial completo de auditoría clínica en PDF directamente desde la pestaña Autoconocimiento. Todo puede borrarse con el Botón de Reinicio Maestro en Opciones.'
                    : 'Complete your User Profile in Settings and take personality tests in the Self-Know tab to calibrate the response style and tone of the AI. Draw your cognitive snowflake, explore your Mind Map, and export personality reports or your full clinical audit data history as PDFs directly from the Self-Know tab. Everything can be wiped using the Master Reset Button in Settings.'}
                </Text>
              </View>

              <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10 }]}>
                <Text style={[styles.introTitle, { color: '#d96c6c' }]}>{lang === 'es' ? '🚩 Sistema de Reporte y Amnesia' : '🚩 Flagging System & Amnesia'}</Text>
                <Text style={[styles.introText, { color: colors.textSecondary }]}>
                  {lang === 'es'
                    ? 'Puedes reportar o marcar contenido ofensivo, dañino o inexacto generado por la IA (deslizando un mensaje a la izquierda). Al ser una app local-first, esta acción se procesa 100% offline: elimina el mensaje inmediatamente de la base de datos SQLite y de la memoria de la IA en tu dispositivo, sin enviar ningún reporte ni dato a servidores externos, garantizando privacidad absoluta.'
                    : 'You can report or flag offensive, harmful, or inaccurate content generated by the AI (by swiping left on any message). As a local-first app, this action is processed 100% offline: it immediately deletes the message from your device\'s SQLite database and AI memory without sending any report or data to external servers, guaranteeing absolute privacy.'}
                </Text>
              </View>

              {lang === 'es' ? (
                <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10, marginBottom: 20 }]}>
                  <Text style={[styles.introTitle, { color: colors.primary }]}>🗺️ Mapa de la Aplicación: Navegando las Pestañas</Text>
                  <Text style={[styles.introText, { color: colors.textSecondary }]}>
                    Explora las 5 pestañas en la parte inferior de la pantalla para aprovechar al máximo tu diario:{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>🏠 Home (Inicio):</Text> Tu espacio de conversación principal. Escribe tu diario, chatea con las IAs locales, alterna entre modos de razonamiento (Zen, Balance, Deep, Philosophic e Inferencia Filosófica Avanzada) y desliza hacia la izquierda en cualquier mensaje para activar la amnesia local y borrarlo al instante.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>🔧 Tools (Herramientas):</Text> Tu centro de consulta local. Realiza búsquedas seguras y anónimas en Wikipedia, accede a fichas bibliográficas (The Codex) y resume libros o artículos de manera 100% offline.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>📋 Projects (Proyectos):</Text> Organiza tu mente. Un espacio dedicado para gestionar listas de tareas, checklists, ideas, objetivos y proyectos personales.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Ψ Self-Know (Autoconocimiento):</Text> Tu suite de autodescubrimiento. Realiza tests de personalidad (MBTI 16r, OCEAN+), calibra la IA, visualiza tus rasgos en el gráfico del Copo de Nieve Cognitivo, explora el Mapa Mental y exporta reportes de personalidad o auditorías clínicas en PDF.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>⚙️ Settings (Opciones):</Text> Centro de configuración del sistema. Cambia el idioma, selecciona temas (Oscuro/Claro/Lavanda), gestiona el almacenamiento de modelos locales de IA, activa la aceleración GPU Turbo, guarda claves de API para voz natural en la nube y realiza un Reinicio Maestro si lo necesitas.
                  </Text>
                </View>
              ) : (
                <View style={[styles.introSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginTop: 10, marginBottom: 20 }]}>
                  <Text style={[styles.introTitle, { color: colors.primary }]}>🗺️ Application Map: Navigating the Tabs</Text>
                  <Text style={[styles.introText, { color: colors.textSecondary }]}>
                    Explore the 5 tabs at the bottom of the screen to make the most of your diary:{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>🏠 Home:</Text> Your main chat space. Write your journal, chat with local AIs, toggle between reasoning levels (Zen, Balance, Deep, Philosophic, and Advanced Philosophical Inference), and swipe left on any AI message to trigger local amnesia and delete it instantly.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>🔧 Tools:</Text> Your local knowledge center. Search Wikipedia, access bibliographic records (The Codex), and compile book/article summaries entirely offline and anonymously.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>📋 Projects:</Text> Organize your mind. A dedicated layout to manage lists of tasks, checklists, ideas, objectives, and personal project goals.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Ψ Self-Know:</Text> The insight suite. Take MBTI (16r) and OCEAN+ personality tests, calibrate the AI, view your traits on the Cognitive Snowflake chart, explore the self-knowledge Mind Map, and export results or clinical audits as PDFs.{"\n\n"}
                    <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>⚙️ Settings:</Text> Configuration hub. Adjust language and themes (Dark/Light/Lavender), manage local AI model storage, toggle GPU Turbo acceleration, secure external API keys for natural streaming voices, and perform a Master Reset if needed.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
              onPress={onClose}
            >
              <Text style={styles.saveBtnText}>{lang === 'es' ? 'Cerrar' : 'Close'}</Text>
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

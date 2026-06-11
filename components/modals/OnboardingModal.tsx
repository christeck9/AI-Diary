import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Image, ScrollView } from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';
import { PSY_QUESTIONS, PsyProfile } from './PsyTestModal';
import { UserProfile } from '../../lib/PromptService';
import { getTotalRAMValue } from '../../lib/MemoryManager';

interface OnboardingModalProps {
  visible: boolean;
  lang: 'en' | 'es';
  setLang: (lang: 'en' | 'es') => void;
  colors: any;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  psyStep: number;
  setPsyStep: (step: number) => void;
  psyAnswers: number[];
  setPsyAnswers: (answers: number[] | ((prev: number[]) => number[])) => void;
  setPsyProfile: (profile: PsyProfile) => void;
  setIsOnboardingComplete: (val: boolean) => void;
  setPsyCompleted: (val: boolean) => void;
  db: any;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  lang,
  setLang,
  colors,
  onboardingStep,
  setOnboardingStep,
  userProfile,
  setUserProfile,
  psyStep,
  setPsyStep,
  psyAnswers,
  setPsyAnswers,
  setPsyProfile,
  setIsOnboardingComplete,
  setPsyCompleted,
  db
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.statusOverlay, { backgroundColor: colors.surfaceSecondary, borderColor: colors.primary, zIndex: 999 }]}>
      <Image 
        source={require('../../assets/images/icon.png')} 
        style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 5 }} 
      />
      <Text style={[styles.statusText, { color: colors.textPrimary, marginTop: 10, fontSize: 18 }]}>
        {lang === 'es' ? 'Iniciando AI Diary' : 'AI Diary Initialization'}
      </Text>

      {onboardingStep === 0 && (() => {
        const ramMB = getTotalRAMValue();
        const ramGB = Math.round(ramMB / 1024);
        const isLowRam = ramGB < 4;

        let ramDetectionText = '';
        if (ramGB < 4) {
          ramDetectionText = lang === 'es'
            ? `Tu teléfono tiene ${ramGB} GB de RAM, tu teléfono no es capaz de ejecutar esta APP.`
            : `Your phone has ${ramGB} GB in RAM, your phone is not able to run this APP.`;
        } else if (ramGB < 6) {
          ramDetectionText = lang === 'es'
            ? `Tu teléfono tiene ${ramGB} GB de RAM, puedes ejecutar AI Light Core`
            : `Your phone has ${ramGB} GB in RAM you can run AI Light Core`;
        } else if (ramGB < 8) {
          ramDetectionText = lang === 'es'
            ? `Tu teléfono tiene ${ramGB} GB de RAM, puedes ejecutar AI Light Core & AI Balanced Core`
            : `Your phone has ${ramGB} GB in RAM you can run AI Light Core & AI Balanced Core`;
        } else {
          ramDetectionText = lang === 'es'
            ? `Tu teléfono tiene ${ramGB} GB de RAM, puedes ejecutar cualquiera de nuestros modelos.`
            : `Your phone has ${ramGB} GB in RAM you can run any of our models.`;
        }

        return (
          <ScrollView 
            style={{ width: '100%', marginTop: 10 }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', marginBottom: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: lang === 'en' ? colors.primary : 'transparent' }} 
                onPress={() => setLang('en')}
              >
                <Text style={{ color: lang === 'en' ? '#FFF' : colors.textPrimary, fontWeight: 'bold' }}>ENGLISH</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: lang === 'es' ? colors.primary : 'transparent' }} 
                onPress={() => setLang('es')}
              >
                <Text style={{ color: lang === 'es' ? '#FFF' : colors.textPrimary, fontWeight: 'bold' }}>ESPAÑOL</Text>
              </TouchableOpacity>
            </View>

            {/* Banner */}
            <Text style={{ 
              color: colors.secondary, 
              fontWeight: 'bold', 
              marginBottom: 15, 
              textAlign: 'center',
              fontSize: 12,
              fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
            }}>
              {lang === 'es'
                ? '[ AI Diary 100% privado, ningún dato, chat o perfil saldrá de este dispositivo ]'
                : '[ AI Diary 100% private, no data, chat or profile will ever leave the device ]'}
            </Text>

            {/* Requirements Box */}
            <View style={{ 
              width: '100%', 
              padding: 12, 
              backgroundColor: colors.surface, 
              borderRadius: 8, 
              borderWidth: 1, 
              borderColor: colors.border, 
              marginBottom: 12 
            }}>
              <Text style={{ 
                color: colors.textSecondary, 
                fontSize: 11, 
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
                marginBottom: 4 
              }}>
                {lang === 'es'
                  ? 'AI Light Core requiere 4GB en RAM (solo texto y voz)'
                  : 'AI Light Core requires 4GB in RAM (only text and voice)'}
              </Text>
              <Text style={{ 
                color: colors.textSecondary, 
                fontSize: 11, 
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
                marginBottom: 4 
              }}>
                {lang === 'es'
                  ? 'AI Balanced Core requiere 6GB en RAM (multimedia)'
                  : 'AI Balanced Core requires 6GB in RAM (multimedia)'}
              </Text>
              <Text style={{ 
                color: colors.textSecondary, 
                fontSize: 11, 
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
              }}>
                {lang === 'es'
                  ? 'AI Deepmind Core requiere 8GB en RAM (multimedia)'
                  : 'AI Deepmind Core requires 8GB in RAM (multimedia)'}
              </Text>
            </View>

            {/* Dynamic RAM Status */}
            <View style={{ 
              width: '100%', 
              padding: 10, 
              borderRadius: 8, 
              borderWidth: 1, 
              borderColor: isLowRam ? '#EF4444' : colors.primary, 
              backgroundColor: isLowRam ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 255, 0, 0.05)', 
              marginBottom: 12,
              alignItems: 'center'
            }}>
              <Text style={{ 
                color: isLowRam ? '#EF4444' : colors.primary, 
                fontWeight: 'bold', 
                fontSize: 11, 
                textAlign: 'center',
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
              }}>
                {ramDetectionText}
              </Text>
            </View>

            {/* Free Tier Note */}
            <Text style={{ 
              color: colors.textSecondary, 
              fontSize: 8.5, 
              textAlign: 'center', 
              marginBottom: 15, 
              lineHeight: 12,
              fontStyle: 'italic'
            }}>
              {lang === 'es'
                ? 'Nota: El nivel gratuito es solo AI Light Core y un nivel de Pruebas Psicológicas, pero eso es básicamente el 100% de cómo puedes usar esta aplicación como Diario, memoria de todos los registros y salida de los mismos. ¡Disfruta! Para los probadores, estan abiertas todos los modelos. ¡Gracias!'
                : 'Note: Free tier is only AI Light Core and one tier of Psychological Tests but that basically is 100% of how you can use this app as a Diary, memory of all records and output of them. Enjoy! For testers, all models are open. Thanks!'}
            </Text>

            {/* Action Button */}
            <TouchableOpacity 
              disabled={isLowRam}
              style={[
                styles.actionBtn, 
                { 
                  backgroundColor: isLowRam ? colors.surface : colors.primary, 
                  borderColor: isLowRam ? colors.border : colors.primary, 
                  paddingHorizontal: 40, 
                  borderRadius: 24,
                  opacity: isLowRam ? 0.5 : 1
                }
              ]} 
              onPress={() => setOnboardingStep(1)}
            >
              <Text style={{ color: isLowRam ? colors.textSecondary : '#FFF', fontWeight: 'bold' }}>
                {lang === 'es' ? 'Empecemos' : "Let's Begin"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        );
      })()}

      {onboardingStep === 1 && (
        <ScrollView 
          style={{ width: '100%', marginTop: 10 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: colors.secondary, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', fontSize: 16 }}>
            {lang === 'es' ? '¡Bienvenido a AI Diary. Diario Privado!' : 'Welcome to AI Diary. Private Journal!'}
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 15, fontSize: 11, lineHeight: 15 }}>
            {lang === 'es'
              ? 'Una aplicación privada impulsada por IA que utiliza el hardware de tu teléfono para funcionar. Se recomienda tener al menos 8 GB de RAM y un procesador de 64 bits para ejecutarla. No requiere todo el poder del mundo para correr una IA. La desventaja es que no es tan rápida como las basadas en servidores.'
              : 'An AI-powered private application that uses your phone\'s hardware to work. It\'s recommended to have at least 8 GB of RAM and a 64-bit processor to run it. It doesn\'t use all the power in the world to run an AI. The drawback is that it\'s not as fast as server-based ones.'}
          </Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>{lang === 'es' ? '¿Cómo debemos llamarte?' : 'What should we call you?'}</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, marginBottom: 15, width: '100%', minHeight: 45, borderRadius: 8, borderWidth: 1, color: colors.textPrimary }]} value={userProfile.nickname || ''} onChangeText={t => setUserProfile({...userProfile, nickname: t})} />
          
          <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>{lang === 'es' ? '¿A qué te dedicas actualmente?' : 'What is your current occupation?'}</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, marginBottom: 15, width: '100%', minHeight: 45, borderRadius: 8, borderWidth: 1, color: colors.textPrimary }]} value={userProfile.work} onChangeText={t => setUserProfile({...userProfile, work: t})} />
          
          <Text style={{ color: colors.textSecondary, fontSize: 9.5, lineHeight: 14, textAlign: 'center', marginBottom: 15, fontStyle: 'italic' }}>
            {lang === 'es'
              ? 'Nota: Después de instalar la aplicación, necesitarás descargar el modelo de IA (de entre 2 y 4 GB aproximadamente), por lo que requerirás conexión a internet para esta primera descarga. Una vez descargado, el modelo funciona 100% offline, aunque cuentas con la opción de conectarlo a internet para actualizarlo con noticias de la actualidad. Ejecutar una IA de forma local puede calentar tu teléfono, especialmente durante conversaciones largas. Ten en cuenta esto y ¡disfruta de tu aplicación!'
              : 'Note: After installing the application, you will need to download the AI model (approximately 2 to 4 GB), so you will require an internet connection for this initial download. Once downloaded, the model runs 100% offline, although you have the option to connect it to the internet to update it with current news. Running a local AI can warm up your phone, especially during long conversations. Please keep this in mind and enjoy your application!'}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <TouchableOpacity 
              style={[styles.actionBtn, { flex: 1, backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, borderRadius: 24 }]} 
              onPress={() => setOnboardingStep(0)}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{lang === 'es' ? 'Atrás' : 'Back'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { flex: 2, backgroundColor: (userProfile.nickname && userProfile.work) ? colors.primary : colors.surface, alignItems: 'center', borderRadius: 24 }]} 
              onPress={async () => {
                if (userProfile.nickname && userProfile.work) {
                  try {
                    if (db) {
                      await db.runAsync('DELETE FROM user_profile');
                      await db.runAsync('INSERT INTO user_profile (name, nickname, work, likes) VALUES (?, ?, ?, ?)', ['', userProfile.nickname, userProfile.work, '']);
                    }
                  } catch (e) {}
                  setOnboardingStep(2);
                }
              }}
            >
              <Text style={{ color: (userProfile.nickname && userProfile.work) ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>{lang === 'es' ? 'Siguiente' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {onboardingStep === 2 && (
        <ScrollView 
          style={{ width: '100%', marginTop: 10 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <TouchableOpacity 
              onPress={() => {
                if (psyStep > 0) {
                  setPsyStep(psyStep - 1);
                  setPsyAnswers(prev => prev.slice(0, -1));
                } else {
                  setOnboardingStep(1);
                }
              }}
              style={{ padding: 5 }}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.secondary} />
            </TouchableOpacity>
            <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>[ AI CALIBRATOR ]</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 15, fontSize: 12 }}>{psyStep + 1} / 5</Text>
          
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
            {lang === 'es' ? PSY_QUESTIONS[psyStep]?.q_es : PSY_QUESTIONS[psyStep]?.q_en}
          </Text>

          {PSY_QUESTIONS[psyStep]?.opts.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={{ padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginBottom: 10, backgroundColor: colors.surfaceSecondary }}
              onPress={async () => {
                const newAnswers = [...psyAnswers, idx];
                setPsyAnswers(newAnswers);
                if (psyStep + 1 < 5) {
                  setPsyStep(psyStep + 1);
                } else {
                  try {
                     if (db) {
                       await db.runAsync('DELETE FROM psy_profile');
                       const dims: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [], D: [], L: [] };
                       for (let i = 0; i < 5; i++) {
                         const q = PSY_QUESTIONS[i];
                         const ansIdx = newAnswers[i] ?? 0;
                         const opt = q.opts[ansIdx];
                         if (opt) dims[opt.dim].push(opt.val);
                       }
                       const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5;
                       const scores = { O: avg(dims.O), C: avg(dims.C), E: avg(dims.E), A: avg(dims.A), N: avg(dims.N), D: avg(dims.D), L: avg(dims.L) };
                       
                       await db.runAsync('INSERT INTO psy_profile (O, C, E, A, N, D, L) VALUES (?, ?, ?, ?, ?, ?, ?)', [scores.O, scores.C, scores.E, scores.A, scores.N, scores.D, scores.L]);
                       setPsyProfile(scores);
                       await db.runAsync('INSERT OR REPLACE INTO onboarding_status (id, completed, completed_at) VALUES (1, 1, ?)', [Date.now()]);
                     }
                  } catch (e) { console.log(e); }
                  setIsOnboardingComplete(true);
                  setPsyCompleted(true);
                  setPsyStep(0); 
                }
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 13, textAlign: 'center' }}>{lang === 'es' ? opt.es : opt.en}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statusOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', padding: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 14, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }), fontWeight: 'bold' },
  actionBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 5 },
  input: { borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 10, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
});

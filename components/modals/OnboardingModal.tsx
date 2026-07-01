import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, Image, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconSymbol } from '../ui/icon-symbol';
import { PSY_QUESTIONS, PsyProfile } from './PsyTestModal';
import { UserProfile } from '../../lib/PromptService';
import { getFreeDiskStorageMB } from '../../lib/hardware';
import { getFreeRAM, evaluateDeviceRAMCapabilities } from '../../lib/RAMGuard';
import { CompactDownloadOverlay } from '../SanctuaryUI';
import type { ModelInfo } from '../../hooks/useAppLlm';
import { ModelDefinition } from '../../src/config/ModelConfig';

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
  handleDownload?: () => void;
  canResume?: boolean;
  status?: any;
  modelExists?: boolean;
  downloadPercent?: number;
  downloadedMB?: number;
  downloadingModel?: ModelDefinition | null;
  downloadingType?: 'model' | 'vision' | null;
  activeModel?: ModelInfo | null;
  downloadSpeed?: number;
  waitPhrase?: string;
  handleLoad?: () => void;
  selectedModel?: ModelInfo;
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
  db,
  handleDownload,
  canResume,
  status,
  modelExists,
  downloadPercent,
  downloadedMB,
  downloadingModel,
  downloadingType,
  activeModel,
  downloadSpeed,
  waitPhrase,
  selectedModel
}) => {
  const [freeDiskMB, setFreeDiskMB] = React.useState<number | null>(null);
  const [freeRamMB, setFreeRamMB] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (onboardingStep === 1) {
      getFreeDiskStorageMB().then(setFreeDiskMB);
      getFreeRAM().then(setFreeRamMB);
    }
  }, [onboardingStep]);

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

      {onboardingStep === 0 && (
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

          <Text style={{ color: colors.secondary, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', fontSize: 16 }}>
            {lang === 'es' ? '¡Bienvenido a AI Diary!' : 'Welcome to AI Diary!'}
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 5, width: '100%' }}>{lang === 'es' ? '¿Cómo debemos llamarte?' : 'What should we call you?'}</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, marginBottom: 15, width: '100%', minHeight: 45, borderRadius: 8, borderWidth: 1, color: colors.textPrimary }]} value={userProfile.nickname || ''} onChangeText={t => setUserProfile({ ...userProfile, nickname: t })} />

          <Text style={{ color: colors.textSecondary, marginBottom: 5, width: '100%' }}>{lang === 'es' ? '¿A qué te dedicas actualmente?' : 'What is your current occupation?'}</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, marginBottom: 15, width: '100%', minHeight: 45, borderRadius: 8, borderWidth: 1, color: colors.textPrimary }]} value={userProfile.work} onChangeText={t => setUserProfile({ ...userProfile, work: t })} />

          {/* Privacy Note */}
          <Text style={{
            color: colors.secondary,
            fontWeight: 'bold',
            marginTop: 10,
            marginBottom: 20,
            textAlign: 'center',
            fontSize: 12,
            fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
          }}>
            {lang === 'es'
              ? '[ AI Diary puede operar 100% offline después de descargar los modelos de IA principales. Es ecológico ya que vive en tu teléfono y es completamente privado, incluso encriptado ]'
              : '[ AI Diary can operate 100% offline after downloading core AI models. It is ecological as it lives in your phone and it is completely private even encrypted ]'}
          </Text>

          <TouchableOpacity
            disabled={!userProfile.nickname || !userProfile.work}
            style={[
              styles.actionBtn,
              {
                backgroundColor: (userProfile.nickname && userProfile.work) ? colors.primary : colors.surface,
                borderColor: (userProfile.nickname && userProfile.work) ? colors.primary : colors.border,
                paddingHorizontal: 40,
                borderRadius: 24,
                opacity: (userProfile.nickname && userProfile.work) ? 1 : 0.5
              }
            ]}
            onPress={() => setOnboardingStep(1)}
          >
            <Text style={{ color: (userProfile.nickname && userProfile.work) ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>
              {lang === 'es' ? 'Siguiente' : "Next"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {onboardingStep === 1 && (() => {
        let ramDetectionText = '';
        let isLowRam = false;
        let ramStatus: 'red' | 'yellow' | 'green' = 'red';

        if (freeRamMB !== null) {
          const evalRes = evaluateDeviceRAMCapabilities(freeRamMB, lang);
          ramDetectionText = evalRes.message;
          isLowRam = evalRes.isLowRam;
          ramStatus = evalRes.status;
        } else {
          ramDetectionText = lang === 'es' ? 'Evaluando Memoria RAM disponible...' : 'Evaluating available RAM...';
        }

        const diskGB = freeDiskMB ? (freeDiskMB / 1024).toFixed(1) : '...';
        const isLowDisk = freeDiskMB !== null && freeDiskMB < 4000;

        let diskDetectionText = '';
        if (freeDiskMB !== null) {
          if (isLowDisk) {
            diskDetectionText = lang === 'es'
              ? `Espacio libre: ${diskGB} GB. Es recomendable liberar al menos 6 GB (recomendado).`
              : `Free space: ${diskGB} GB. It is recommended to free up at least 6 GB (recommended).`;
          } else {
            diskDetectionText = lang === 'es'
              ? `Espacio libre: ${diskGB} GB. Tienes suficiente espacio de almacenamiento (se recomienda 6 GB).`
              : `Free space: ${diskGB} GB. You have enough storage space (6 GB recommended).`;
          }
        }

        return (
          <ScrollView
            style={{ width: '100%', marginTop: 10 }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
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
                  ? 'Anima Light requiere 4GB en RAM (solo texto y voz)'
                  : 'Anima Light requires 4GB in RAM (only text and voice)'}
              </Text>
              <Text style={{
                color: colors.textSecondary,
                fontSize: 11,
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
                marginBottom: 4
              }}>
                {lang === 'es'
                  ? 'Anima Balance requiere 4GB en RAM (multimedia)'
                  : 'Anima Balance requires 4GB in RAM (multimedia)'}
              </Text>
              <Text style={{
                color: colors.textSecondary,
                fontSize: 11,
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
              }}>
                {lang === 'es'
                  ? 'Anima Deepmind requiere 6GB en RAM (multimedia)'
                  : 'Anima Deepmind requires 6GB in RAM (multimedia)'}
              </Text>
            </View>

            {/* Dynamic RAM Status */}
            <View style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: ramStatus === 'red' ? '#ac3e4bff' : (ramStatus === 'yellow' ? '#EAB308' : colors.primary),
              backgroundColor: ramStatus === 'red' ? 'rgba(114, 47, 55, 0.1)' : (ramStatus === 'yellow' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0, 255, 0, 0.05)'),
              marginBottom: 8,
              alignItems: 'center'
            }}>
              <Text style={{
                color: ramStatus === 'red' ? '#ac3e4bff' : (ramStatus === 'yellow' ? '#EAB308' : colors.primary),
                fontWeight: 'bold',
                fontSize: 11,
                textAlign: 'center',
                fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
              }}>
                {ramDetectionText}
              </Text>
            </View>

            {/* Dynamic Disk Status */}
            {freeDiskMB !== null && (
              <View style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isLowDisk ? '#EAB308' : colors.primary,
                backgroundColor: isLowDisk ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0, 255, 0, 0.05)',
                marginBottom: 12,
                alignItems: 'center'
              }}>
                <Text style={{
                  color: isLowDisk ? '#EAB308' : colors.primary,
                  fontWeight: 'bold',
                  fontSize: 11,
                  textAlign: 'center',
                  fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' })
                }}>
                  {diskDetectionText}
                </Text>
              </View>
            )}

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
                ? 'Nota: El nivel gratuito es solo Anima Light y un nivel de Pruebas Psicológicas, pero eso es básicamente el 100% de cómo puedes usar esta aplicación como Diario, memoria de todos los registros y salida de los mismos. ¡Disfruta! Para los probadores, estan abiertas todos los modelos. ¡Gracias!'
                : 'Note: Free tier is only Anima Light and one tier of Psychological Tests but that basically is 100% of how you can use this app as a Diary, memory of all records and output of them. Enjoy! For testers, all models are open. Thanks!'}
            </Text>

            {/* DOWNLOAD UI */}
            {selectedModel && !isLowRam && !isLowDisk && (
              <View style={{ width: '100%', marginTop: 5, alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 10 }}>
                  {selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} ({selectedModel.sizeMB} MB)
                </Text>

                {(status === 'idle' || status === 'downloading') && (
                  <Animated.View style={[{ opacity: !modelExists ? 1 : 0.6, marginBottom: 10 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: modelExists ? colors.border : (status === 'downloading' ? '#424242' : colors.primary),
                          backgroundColor: modelExists ? 'transparent' : (status === 'downloading' ? '#424242' : colors.primary),
                          borderWidth: modelExists ? 1 : 2,
                          paddingHorizontal: 30,
                          borderRadius: 24,
                        }
                      ]}
                      onPress={handleDownload}
                      disabled={modelExists || status === 'downloading'}
                    >
                      <Text style={{ color: modelExists ? colors.textSecondary : (status === 'downloading' ? '#888888' : '#FFF'), fontWeight: 'bold', fontSize: 13 }}>
                        {modelExists ? (lang === 'es' ? 'Descargado' : 'Downloaded') : (status === 'downloading' || canResume ? (lang === 'es' ? 'Continuar Descarga' : 'Continue Download') : (lang === 'es' ? 'Descargar Modelo' : 'Download Model'))}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {(status === 'downloading' || status === 'loading') && (
                  <View style={{ alignItems: 'center', marginTop: 8, width: '100%' }}>
                    <CompactDownloadOverlay
                      downloadPercent={downloadPercent || 0}
                      downloadedMB={downloadedMB || 0}
                      totalMB={
                        downloadingModel
                          ? (downloadingType === 'vision' ? (downloadingModel.mmprojSizeMB || 0) : downloadingModel.sizeMB)
                          : (activeModel ? (downloadingType === 'vision' ? (activeModel.mmprojSizeMB || 0) : activeModel.sizeMB) : selectedModel.sizeMB)
                      }
                      downloadSpeed={downloadSpeed || 0}
                      waitPhrase={waitPhrase || ''}
                      colors={colors}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, borderRadius: 24 }]}
                onPress={() => setOnboardingStep(0)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: 'bold', textAlign: 'center' }}>{lang === 'es' ? 'Atrás' : 'Back'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!modelExists || isLowRam || isLowDisk || status === 'downloading'}
                style={[
                  styles.actionBtn,
                  {
                    flex: 2,
                    backgroundColor: (modelExists && !isLowRam && !isLowDisk && status !== 'downloading') ? colors.primary : colors.surface,
                    borderColor: (modelExists && !isLowRam && !isLowDisk && status !== 'downloading') ? colors.primary : colors.border,
                    alignItems: 'center',
                    borderRadius: 24,
                    opacity: (modelExists && !isLowRam && !isLowDisk && status !== 'downloading') ? 1 : 0.5
                  }
                ]}
                onPress={() => setOnboardingStep(2)}
              >
                <Text style={{ color: (modelExists && !isLowRam && !isLowDisk && status !== 'downloading') ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>
                  {lang === 'es' ? 'Empezar Evaluación' : 'Start Evaluation'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      })()}

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
                      await db.runAsync('DELETE FROM user_profile');
                      await db.runAsync('INSERT INTO user_profile (name, nickname, work, likes) VALUES (?, ?, ?, ?)', ['', userProfile.nickname, userProfile.work, '']);

                      await db.runAsync('DELETE FROM psy_profile');
                      const dims: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [], D: [], L: [] };
                      for (let i = 0; i < 5; i++) {
                        const q = PSY_QUESTIONS[i];
                        const ansIdx = newAnswers[i] ?? 0;
                        const option = q.opts[ansIdx];
                        if (option) dims[option.dim].push(option.val);
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
  actionBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 5, justifyContent: 'center' },
  input: { borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 10, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
});

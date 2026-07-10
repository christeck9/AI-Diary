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
  setIsOnboardingComplete: (val: boolean) => void;
  setSelectedModel?: (model: ModelInfo) => void;
  AVAILABLE_MODELS?: ModelInfo[];
  handleConfirmVisionDownload?: (modelOverride?: any) => void;
  checkSpecificModelExists?: (model: ModelInfo) => Promise<boolean>;
  checkVisionModelExists?: (model: ModelInfo) => Promise<boolean>;
  db: any;
  handleDownload?: (modelOverride?: any) => void;
  canResume?: boolean;
  status?: any;
  modelStatus?: 'missing' | 'outdated' | 'current';
  downloadPercent?: number;
  downloadedMB?: number;
  downloadingModel?: ModelInfo | null;
  downloadingType?: 'text' | 'vision' | null;
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
  setIsOnboardingComplete,
  setSelectedModel,
  AVAILABLE_MODELS,
  handleConfirmVisionDownload,
  checkSpecificModelExists,
  checkVisionModelExists,
  db,
  handleDownload,
  canResume,
  status,
  modelStatus,
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
  
  const [model0Exists, setModel0Exists] = React.useState(false);
  const [model1Exists, setModel1Exists] = React.useState(false);
  const [visionExists, setVisionExists] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const checkExistences = async () => {
      if (!AVAILABLE_MODELS) return;
      if (AVAILABLE_MODELS[0] && checkSpecificModelExists) {
        const exists0 = await checkSpecificModelExists(AVAILABLE_MODELS[0]);
        if (isMounted) setModel0Exists(exists0);
      }
      if (AVAILABLE_MODELS[1] && checkSpecificModelExists) {
        const exists1 = await checkSpecificModelExists(AVAILABLE_MODELS[1]);
        if (isMounted) setModel1Exists(exists1);
      }
      if (AVAILABLE_MODELS[1] && checkVisionModelExists) {
        const existsVision = await checkVisionModelExists(AVAILABLE_MODELS[1]);
        if (isMounted) setVisionExists(existsVision);
      }
    };
    checkExistences();
    return () => { isMounted = false; };
  }, [onboardingStep, status, AVAILABLE_MODELS, checkSpecificModelExists, checkVisionModelExists]);

  React.useEffect(() => {
    if (onboardingStep >= 1) {
      getFreeDiskStorageMB().then(setFreeDiskMB);
      getFreeRAM().then(setFreeRamMB);
    }
  }, [onboardingStep]);

  const saveAndCompleteOnboarding = async () => {
    try {
      if (db) {
        // Save user profile
        await db.runAsync('DELETE FROM user_profile');
        await db.runAsync('INSERT INTO user_profile (name, nickname, work, likes) VALUES (?, ?, ?, ?)', ['', userProfile.nickname, userProfile.work, '']);

        // Mark onboarding as completed
        await db.runAsync('INSERT OR REPLACE INTO onboarding_status (id, completed, completed_at) VALUES (1, 1, ?)', [Date.now()]);
      }
    } catch (e) {
      console.warn('[ONBOARDING] Error saving onboarding status:', e);
    }
    setIsOnboardingComplete(true);
  };

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

          <Text style={{ color: colors.secondary, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', fontSize: 20 }}>
            {lang === 'es' ? '¡Bienvenido a AI Diary!' : 'Welcome to AI Diary!'}
          </Text>

          <View style={{ width: '100%', marginTop: 15, marginBottom: 5 }} />

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
            fontFamily: Platform.select({ ios: 'Arial', android: 'Arial' })
          }}>
            {lang === 'es'
              ? 'AI DIARY PUEDE OPERAR 100% OFFLINE DESPUÉS DE DESCARGAR LOS MODELOS DE IA PRINCIPALES. ES ECOLÓGICO YA QUE VIVE EN TU TELÉFONO Y ES COMPLETAMENTE PRIVADO Y LO PUEDES ENCRIPTAR'
              : 'AI DIARY CAN OPERATE 100% OFFLINE AFTER DOWNLOADING CORE AI MODELS. IT IS ECOLOGICAL AS IT LIVES IN YOUR PHONE AND IT IS COMPLETELY PRIVATE AND YOU CAN ENCRYPTED'}
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
            onPress={async () => {
              try {
                if (db) {
                  await db.runAsync('DELETE FROM user_profile');
                  await db.runAsync('INSERT INTO user_profile (name, nickname, work, likes) VALUES (?, ?, ?, ?)', ['', userProfile.nickname, userProfile.work, '']);
                }
              } catch (e) {
                console.warn('[ONBOARDING] Error saving profile:', e);
              }
              setOnboardingStep(1);
            }}
          >
            <Text style={{ color: (userProfile.nickname && userProfile.work) ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>
              {lang === 'es' ? 'Siguiente' : "Next"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {onboardingStep >= 1 && onboardingStep <= 3 && (() => {
        let ramDetectionText = '';
        let isLowRam = false;
        let ramStatus: 'red' | 'yellow' | 'green' = 'red';
        let canRunLight = false;
        let canRunDeepMindText = false;
        let canRunDeepMindVision = false;

        if (freeRamMB !== null) {
          const evalRes = evaluateDeviceRAMCapabilities(freeRamMB, lang);
          ramDetectionText = evalRes.message;
          isLowRam = evalRes.isLowRam;
          ramStatus = evalRes.status;
          canRunLight = evalRes.canRunLight || false;
          canRunDeepMindText = evalRes.canRunDeepMindText || false;
          canRunDeepMindVision = evalRes.canRunDeepMindVision || false;
        } else {
          ramDetectionText = lang === 'es' ? 'Evaluando Memoria RAM disponible...' : 'Evaluating available RAM...';
        }

        const diskGB = freeDiskMB ? (freeDiskMB / 1024).toFixed(1) : '...';
        const isLowDisk = freeDiskMB !== null && freeDiskMB < 4000;

        let diskDetectionText = '';
        if (freeDiskMB !== null) {
          if (isLowDisk) {
            diskDetectionText = lang === 'es'
              ? `Espacio libre: ${diskGB} GB. Es recomendable liberar al menos 6 GB.`
              : `Disk Space ${diskGB} GB. It is recommended to free up at least 6 GB.`;
          } else {
            diskDetectionText = lang === 'es'
              ? `Espacio en disco: ${diskGB} GB. Tienes más que suficiente de los 6 GB recomendados.`
              : `Disk Space ${diskGB} GB you have more than enough from the 6GB recomended.`;
          }
        }

        const renderDownloadOverlay = (modelId: string, modelMB: number, isVision: boolean = false) => {
          if (status !== 'downloading' && status !== 'loading') return null;
          if (downloadingModel && downloadingModel.id !== modelId) return null;
          if (isVision && downloadingType !== 'vision') return null;
          if (!isVision && downloadingType === 'vision') return null;

          return (
            <View style={{ alignItems: 'center', marginTop: 8, width: '100%' }}>
              <CompactDownloadOverlay
                downloadPercent={downloadPercent || 0}
                downloadedMB={downloadedMB || 0}
                totalMB={downloadingModel
                  ? (downloadingType === 'vision' ? (downloadingModel.mmprojSizeMB || 0) : downloadingModel.sizeMB)
                  : modelMB
                }
                downloadSpeed={downloadSpeed || 0}
                waitPhrase={waitPhrase || ''}
                colors={colors}
              />
            </View>
          );
        };

        const isStep1Downloading = status === 'downloading' && downloadingModel?.id === AVAILABLE_MODELS?.[0]?.id;

        return (
          <ScrollView
            style={{ width: '100%', marginTop: 10 }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
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

            {/* Offline/Privacy Legend */}
            <Text style={{
              color: colors.textSecondary,
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 16,
              lineHeight: 16,
              paddingHorizontal: 10
            }}>
              {lang === 'es'
                ? 'Para operar sin conexión a internet y proteger tu privacidad, esta aplicación descarga los modelos de IA directo a tu dispositivo.'
                : 'To operate without an internet connection and protect your privacy, this application downloads the AI models directly to your device.'}
            </Text>

            {/* STEP 1: Core AI */}
            {onboardingStep === 1 && (
              <View style={{ width: '100%', marginTop: 5, alignItems: 'center' }}>
                {!canRunLight ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 15 }}>
                    {lang === 'es'
                      ? "No podemos descargar la IA más ligera que tenemos, pero aún así puedes usar la pestaña Tools y Self-Know. Cuando tengas un teléfono con más memoria, puedes volver a intentar."
                      : "We cannot download the lightest AI we have, but you can still use the Tools and Self-Know tab. When you have a phone with more memory, you can try again."}
                  </Text>
                ) : (
                  <>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 10 }}>
                      {AVAILABLE_MODELS?.[0]?.[lang === 'es' ? 'labelEs' : 'labelEn']} ({AVAILABLE_MODELS?.[0]?.sizeMB} MB)
                    </Text>

                    {(status === 'idle' || status === 'downloading' || status === 'ready') && (
                      <Animated.View style={[{ opacity: !model0Exists ? 1 : 0.6, marginBottom: 10 }]}>
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            {
                              borderColor: model0Exists ? colors.border : (status === 'downloading' ? '#424242' : colors.primary),
                              backgroundColor: model0Exists ? 'transparent' : (status === 'downloading' ? '#424242' : colors.primary),
                              borderWidth: model0Exists ? 1 : 2,
                              paddingHorizontal: 30,
                              borderRadius: 24,
                            }
                          ]}
                          onPress={() => {
                            if (AVAILABLE_MODELS?.[0] && setSelectedModel && handleDownload) {
                              setSelectedModel(AVAILABLE_MODELS[0]);
                              handleDownload(AVAILABLE_MODELS[0]);
                            }
                          }}
                          disabled={model0Exists || status === 'downloading'}
                        >
                          <Text style={{ color: model0Exists ? colors.textSecondary : (status === 'downloading' ? '#888888' : '#FFF'), fontWeight: 'bold', fontSize: 13 }}>
                            {model0Exists ? (lang === 'es' ? 'Descargado' : 'Downloaded') : (status === 'downloading' || canResume ? (lang === 'es' ? 'Continuar Descarga' : 'Continue Download') : (lang === 'es' ? 'Descargar Modelo' : 'Download Model'))}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                    
                    {renderDownloadOverlay(AVAILABLE_MODELS?.[0]?.id || '', AVAILABLE_MODELS?.[0]?.sizeMB || 0)}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, borderRadius: 24 }]}
                    onPress={() => setOnboardingStep(0)}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: 'bold', textAlign: 'center' }}>{lang === 'es' ? 'Atrás' : 'Back'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isStep1Downloading || (canRunLight && !model0Exists)}
                    style={[
                      styles.actionBtn,
                      {
                        flex: 2,
                        backgroundColor: (!isStep1Downloading && (!canRunLight || model0Exists)) ? colors.primary : colors.surface,
                        borderColor: (!isStep1Downloading && (!canRunLight || model0Exists)) ? colors.primary : colors.border,
                        alignItems: 'center',
                        borderRadius: 24,
                        opacity: (!isStep1Downloading && (!canRunLight || model0Exists)) ? 1 : 0.5
                      }
                    ]}
                    onPress={() => {
                      if (canRunDeepMindText) setOnboardingStep(2);
                      else saveAndCompleteOnboarding();
                    }}
                  >
                    <Text style={{ color: (!isStep1Downloading && (!canRunLight || model0Exists)) ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>
                      {canRunDeepMindText 
                        ? (lang === 'es' ? 'SIGUIENTE' : 'NEXT') 
                        : (lang === 'es' ? 'EMPEZAR' : 'START')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 2: DeepMind Text Optional */}
            {onboardingStep === 2 && (
              <View style={{ width: '100%', marginTop: 5, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 15, paddingHorizontal: 10 }}>
                  {lang === 'es'
                    ? "También tienes la posibilidad de descargar Anima DeepMind. Lo puedes hacer ahorita o después. Dado que mide ~2.5GB se va a tardar unas tres veces más que la anterior, ¿lo quieres hacer ahorita?"
                    : "You also have the possibility to download Anima DeepMind. You can do it now or later. Since it measures ~2.5GB it will take about three times longer than the previous one, do you want to do it right now?"}
                </Text>
                
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 10 }}>
                  {AVAILABLE_MODELS?.[1]?.[lang === 'es' ? 'labelEs' : 'labelEn']} ({AVAILABLE_MODELS?.[1]?.sizeMB} MB)
                </Text>

                {(status === 'idle' || status === 'downloading' || status === 'ready') && (
                  <Animated.View style={[{ opacity: !model1Exists ? 1 : 0.6, marginBottom: 10 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: model1Exists ? colors.border : (status === 'downloading' ? '#424242' : colors.primary),
                          backgroundColor: model1Exists ? 'transparent' : (status === 'downloading' ? '#424242' : colors.primary),
                          borderWidth: model1Exists ? 1 : 2,
                          paddingHorizontal: 30,
                          borderRadius: 24,
                        }
                      ]}
                      onPress={() => {
                        if (AVAILABLE_MODELS?.[1] && setSelectedModel && handleDownload) {
                          setSelectedModel(AVAILABLE_MODELS[1]);
                          handleDownload(AVAILABLE_MODELS[1]);
                        }
                      }}
                      disabled={model1Exists || status === 'downloading'}
                    >
                      <Text style={{ color: model1Exists ? colors.textSecondary : (status === 'downloading' ? '#888888' : '#FFF'), fontWeight: 'bold', fontSize: 13 }}>
                        {model1Exists ? (lang === 'es' ? 'Descargado' : 'Downloaded') : (status === 'downloading' || canResume ? (lang === 'es' ? 'Continuar Descarga' : 'Continue Download') : 'DOWNLOAD NOW')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
                
                {renderDownloadOverlay(AVAILABLE_MODELS?.[1]?.id || '', AVAILABLE_MODELS?.[1]?.sizeMB || 0)}

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, borderRadius: 24 }]}
                    onPress={() => {
                      if (canRunDeepMindVision) setOnboardingStep(3);
                      else saveAndCompleteOnboarding();
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: 'bold', textAlign: 'center' }}>LATER</Text>
                  </TouchableOpacity>

                  {model1Exists && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 2, backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'center', borderRadius: 24 }]}
                      onPress={() => {
                        if (canRunDeepMindVision) setOnboardingStep(3);
                        else saveAndCompleteOnboarding();
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>CONTINUE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* STEP 3: DeepMind Vision Optional */}
            {onboardingStep === 3 && (
              <View style={{ width: '100%', marginTop: 5, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 15, paddingHorizontal: 10 }}>
                  {lang === 'es'
                    ? "Tu teléfono también soporta el módulo de Visión de DeepMind para analizar imágenes y PDFs gráficos. Es opcional y puedes bajarlo después si lo deseas. ¿Quieres descargarlo ahora?"
                    : "Your phone also supports the DeepMind Vision module to analyze images and graphic PDFs. It is optional and you can download it later if you wish. Do you want to download it now?"}
                </Text>
                
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 10 }}>
                  DeepMind Vision ({AVAILABLE_MODELS?.[1]?.mmprojSizeMB || 0} MB)
                </Text>

                {(status === 'idle' || status === 'downloading' || status === 'ready') && (
                  <Animated.View style={[{ opacity: !visionExists ? 1 : 0.6, marginBottom: 10 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: visionExists ? colors.border : (status === 'downloading' ? '#424242' : colors.primary),
                          backgroundColor: visionExists ? 'transparent' : (status === 'downloading' ? '#424242' : colors.primary),
                          borderWidth: 2,
                          paddingHorizontal: 30,
                          borderRadius: 24,
                        }
                      ]}
                      onPress={() => {
                         if (handleConfirmVisionDownload) {
                            handleConfirmVisionDownload(AVAILABLE_MODELS?.[1]);
                         }
                      }}
                      disabled={visionExists || status === 'downloading'}
                    >
                      <Text style={{ color: visionExists ? colors.textSecondary : (status === 'downloading' ? '#888888' : '#FFF'), fontWeight: 'bold', fontSize: 13 }}>
                        {visionExists ? (lang === 'es' ? 'Descargado' : 'Downloaded') : (status === 'downloading' ? (lang === 'es' ? 'Descargando...' : 'Downloading...') : 'DOWNLOAD NOW')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
                
                {renderDownloadOverlay(AVAILABLE_MODELS?.[1]?.id || '', AVAILABLE_MODELS?.[1]?.mmprojSizeMB || 0, true)}

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1, borderRadius: 24 }]}
                    onPress={() => saveAndCompleteOnboarding()}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: 'bold', textAlign: 'center' }}>LATER</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.actionBtn, 
                      { 
                        flex: 2, 
                        backgroundColor: colors.primary, 
                        borderColor: colors.primary, 
                        alignItems: 'center', 
                        borderRadius: 24 
                      }
                    ]}
                    onPress={() => saveAndCompleteOnboarding()}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>CONTINUE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        );
      })()}
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

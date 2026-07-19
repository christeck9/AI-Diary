import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { IconSymbol } from './ui/icon-symbol';
import { CompactDownloadOverlay } from './SanctuaryUI';
import { settingsService } from '../lib/SettingsService';
import type { ModelInfo } from '../hooks/useAppLlm';
import { ModelDefinition } from '../src/config/ModelConfig';

export function ModelLoaderPanel({
  status,
  isOnboardingComplete,
  colors,
  lang,
  t,
  showModelPicker,
  setShowModelPicker,
  selectedModel,
  setSelectedModel,
  AVAILABLE_MODELS,
  deviceRAM,
  selectModel,
  modelStatus,
  handleDownload,
  canResume,
  handleLoad,
  downloadPercent,
  downloadedMB,
  downloadingModel,
  downloadingType,
  activeModel,
  downloadSpeed,
  waitPhrase
}: {
  status: any;
  isOnboardingComplete: boolean;
  colors: any;
  lang: string;
  t: any;
  showModelPicker: boolean;
  setShowModelPicker: (val: boolean) => void;
  selectedModel: ModelInfo;
  setSelectedModel: (val: ModelInfo) => void;
  AVAILABLE_MODELS: ModelInfo[];
  deviceRAM: number;
  selectModel: (val: ModelInfo) => void;
  modelStatus: 'missing' | 'outdated' | 'current';
  handleDownload: () => void;
  canResume: boolean;
  handleLoad: () => void;
  downloadPercent: number;
  downloadedMB: number;
  downloadingModel: ModelDefinition | null;
  downloadingType: 'model' | 'vision' | null;
  activeModel: ModelInfo | null;
  downloadSpeed: number;
  waitPhrase: string;
}) {
  if ((status === 'ready' && !showModelPicker) || !isOnboardingComplete) return null;

  const isFloating = status === 'ready';

  const panelContent = (
    <View style={[
      styles.statusOverlay,
      { backgroundColor: colors.surfaceSecondary, borderColor: colors.secondary },
      isFloating && {
        position: 'absolute',
        top: '25%',
        alignSelf: 'center',
        width: '75%',
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    ]}>
      <View style={styles.statusHeader}>
        <IconSymbol name="cpu" size={28} color={colors.secondary} style={{ marginRight: 10 }} />
        <Text style={[styles.statusTitle, { color: colors.textPrimary, fontSize: 13, opacity: 0.8 }]}>
          {lang === 'es' ? 'MODELO DE IA' : 'AI MODEL'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.modelSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowModelPicker(!showModelPicker)}
      >
        <Image 
          source={selectedModel.id === 'llama3.2-1b-q4' ? require('../assets/images/anima_light_logo.png') : require('../assets/images/anima_spirit.png')}
          style={{ width: 24, height: 24, marginRight: 10 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
            {selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']}
          </Text>
        </View>
        <IconSymbol name="chevron.up.chevron.down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {showModelPicker && (
        <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {AVAILABLE_MODELS.filter((m: any) => !m.experimental).map((model: any) => {
            let isDisabled = false;
            if (model.id === 'gemma4-e2b-qat' && deviceRAM < 6000) isDisabled = true;
            if (model.id === 'gemma3-4b-q4' && deviceRAM < 4000) isDisabled = true;

            return (
              <TouchableOpacity
                key={model.id}
                disabled={isDisabled}
                style={[
                  styles.pickerItem,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selectedModel.id === model.id ? colors.surfaceSecondary : 'transparent',
                    opacity: isDisabled ? 0.4 : 1
                  }
                ]}
                onPress={async () => {
                  setSelectedModel(model);
                  if (activeModel?.id !== model.id) {
                    selectModel(model);
                  }
                  setShowModelPicker(false);
                  try {
                    await settingsService.set({ preferredModel: model.id });
                  } catch (e) { }
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: selectedModel.id === model.id ? 'bold' : 'normal' }}>
                    {model.label}
                  </Text>
                  {isDisabled && (
                    <IconSymbol name="lock.fill" size={14} color={colors.textSecondary} />
                  )}
                </View>
                {isDisabled && (
                  <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>
                    {lang === 'es' ? 'Requiere más memoria RAM' : 'Requires more RAM'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {(status === 'idle' || status === 'downloading') && (
        <View style={{ width: '90%', marginTop: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          {/* DOWNLOAD / UPDATE BUTTON */}
          {modelStatus !== 'current' && (
            <Animated.View style={[{ flex: 1, opacity: (status !== 'downloading') ? 1 : 0.6 }]}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary,
                    borderWidth: 2,
                    width: '100%'
                  }
                ]}
                onPress={handleDownload}
                disabled={status === 'downloading'}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11, textAlign: 'center' }}>
                  {modelStatus === 'outdated'
                    ? (lang === 'es' ? 'ACTUALIZAR' : 'UPDATE')
                    : (lang === 'es' ? 'DESCARGAR' : 'DOWNLOAD')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ACTIVATE BUTTON */}
          <Animated.View style={[{ flex: 1, opacity: ((modelStatus === 'current' || modelStatus === 'outdated') && status !== 'downloading') ? 1 : 0.6 }]}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: ((modelStatus === 'current' || modelStatus === 'outdated') && status !== 'downloading') ? colors.secondary : colors.border,
                  backgroundColor: ((modelStatus === 'current' || modelStatus === 'outdated') && status !== 'downloading') ? colors.secondary : 'transparent',
                  borderWidth: ((modelStatus === 'current' || modelStatus === 'outdated') && status !== 'downloading') ? 2 : 1,
                  width: '100%'
                }
              ]}
              onPress={handleLoad}
              disabled={(modelStatus === 'missing') || status === 'downloading'}
            >
              <Text style={{ color: ((modelStatus === 'current' || modelStatus === 'outdated') && status !== 'downloading') ? '#FFF' : colors.textSecondary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' }}>
                {lang === 'es' ? 'ACTIVAR' : 'ACTIVATE'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {(status === 'downloading' || status === 'loading') && (
        <View style={{ alignItems: 'center', marginTop: 8, width: '90%' }}>
          <CompactDownloadOverlay
            downloadPercent={downloadPercent}
            downloadedMB={downloadedMB}
            totalMB={
              downloadingModel
                ? (downloadingType === 'vision' ? (downloadingModel.mmprojSizeMB || 0) : downloadingModel.sizeMB)
                : (activeModel ? (downloadingType === 'vision' ? (activeModel.mmprojSizeMB || 0) : activeModel.sizeMB) : 0)
            }
            downloadSpeed={downloadSpeed}
            waitPhrase={waitPhrase}
            colors={colors}
          />
        </View>
      )}
    </View>
  );

  if (isFloating) {
    return (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9998,
        justifyContent: 'center',
      }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={() => setShowModelPicker(false)} 
          activeOpacity={1}
        />
        {panelContent}
      </View>
    );
  }

  return panelContent;
}

const styles = StyleSheet.create({
  statusOverlay: { margin: 15, borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, zIndex: 100 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  modelSelectBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8,
    borderRadius: 24, marginTop: 12, borderWidth: 1, width: '100%'
  },
  pickerContainer: {
    borderRadius: 12, width: '100%', marginTop: 5, borderWidth: 1, overflow: 'hidden',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4
  },
  pickerItem: { padding: 15, borderBottomWidth: 1 },
  actionBtn: { paddingHorizontal: 15, borderRadius: 24, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }
});

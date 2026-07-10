import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  modelExists,
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
  modelExists: boolean;
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
  if (status === 'ready' || !isOnboardingComplete) return null;

  return (
    <View style={[styles.statusOverlay, { backgroundColor: colors.surfaceSecondary, borderColor: colors.secondary }]}>
      <View style={styles.statusHeader}>
        <IconSymbol name="cpu" size={28} color={colors.secondary} style={{ marginRight: 10 }} />
        <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
          {lang === 'es' ? 'SELECCIONA TU MODELO DE IA' : 'SELECT YOUR AI MODEL'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.modelSelectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowModelPicker(!showModelPicker)}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
            {selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
            {selectedModel.sizeMB} MB — {lang === 'es' ? 'Local' : 'Local'}
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
                  const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
                  const modelPath = `${baseDir}/${model.fileName}`;
                  const info = await FileSystem.getInfoAsync(modelPath);

                  if (info.exists) {
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
          {/* DOWNLOAD BUTTON */}
          {!modelExists && (
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
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                  {lang === 'es' ? 'DESCARGAR' : 'DOWNLOAD'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ACTIVATE BUTTON */}
          <Animated.View style={[{ flex: 1, opacity: (modelExists && status !== 'downloading') ? 1 : 0.6 }]}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  borderColor: (modelExists && status !== 'downloading') ? colors.secondary : colors.border,
                  backgroundColor: (modelExists && status !== 'downloading') ? colors.secondary : 'transparent',
                  borderWidth: (modelExists && status !== 'downloading') ? 2 : 1,
                  width: '100%'
                }
              ]}
              onPress={handleLoad}
              disabled={!modelExists || status === 'downloading'}
            >
              <Text style={{ color: (modelExists && status !== 'downloading') ? '#FFF' : colors.textSecondary, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
                {lang === 'es' ? 'ACTIVAR IA' : 'ACTIVATE AI'}
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
}

const styles = StyleSheet.create({
  statusOverlay: { margin: 15, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, zIndex: 100 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', width: '90%', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  modelSelectBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 12, marginTop: 8, borderWidth: 1, width: '90%'
  },
  pickerContainer: {
    borderRadius: 12, width: '90%', marginTop: 5, borderWidth: 1, overflow: 'hidden',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4
  },
  pickerItem: { padding: 15, borderBottomWidth: 1 },
  actionBtn: { paddingHorizontal: 25, borderRadius: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }
});

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../constants/Themes';
import { useLanguage } from '../contexts/LanguageContext';

interface ManifestoProps {
  colors: ThemeColors;
}

export const ManifestoCard: React.FC<ManifestoProps> = ({ colors }) => {
  const { t } = useLanguage();
  return (
    <View style={[styles.manifestoSection, { borderColor: 'rgba(125, 132, 168, 0.1)', backgroundColor: 'rgba(125, 132, 168, 0.06)' }]}>
      <Text style={[styles.manifestoTitle, { color: colors.primary, letterSpacing: 4 }]}>{t('manifesto.title')}</Text>
      <Text style={[styles.manifestoText, { fontWeight: 'bold', color: colors.textSecondary, textAlign: 'center', marginBottom: 10 }]}>
        {t('manifesto.subtitle')}
      </Text>
      <Text style={[styles.manifestoText, { textAlign: 'justify', lineHeight: 20, color: colors.textSecondary }]}>
        {t('manifesto.body')}
      </Text>
      
      <View style={styles.disclaimerContainer}>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          <Text style={{ fontWeight: 'bold' }}>{t('manifesto.disclaimer.title')}</Text> {t('manifesto.disclaimer.body')}
        </Text>
        <Text style={[styles.disclaimerSubtext, { color: colors.textSecondary }]}>
          {t('manifesto.disclaimer.subtext')}
        </Text>
      </View>
      
      <Text style={[styles.manifestoFooter, { color: colors.textSecondary, opacity: 0.5 }]}>
        {t('manifesto.footer')}
      </Text>
    </View>
  );
};

interface InferenceEngineProps {
  colors: ThemeColors;
  preferredModel: string;
  setPreferredModel: (m: string) => void;
  loadModel: () => void;
}

export const InferenceEngine: React.FC<InferenceEngineProps> = ({ colors, preferredModel, setPreferredModel, loadModel }) => {
  const { t } = useLanguage();
  const isQ3 = preferredModel.endsWith('q3');
  const isQ4 = preferredModel.endsWith('q4');

  const greenColor = '#7da885';
  const greenBg = 'rgba(125, 168, 133, 0.05)';
  const greenBorder = 'rgba(125, 168, 133, 0.2)';
  const greenBorderBtn = 'rgba(125, 168, 133, 0.3)';
  const greenBgActive = 'rgba(125, 168, 133, 0.1)';

  return (
    <View style={[styles.experimentalZone, { borderColor: greenBorder, backgroundColor: greenBg }]}>
      <Text style={[styles.experimentalTitle, { color: greenColor }]}>{t('inference.title')}</Text>
      <View style={styles.modelSelectionRow}>
        <TouchableOpacity 
          onPress={() => setPreferredModel('gemma4-e2b-q3')} 
          style={[
            styles.modelBtn, 
            { 
              borderColor: isQ3 ? greenColor : greenBorderBtn, 
              backgroundColor: isQ3 ? greenBgActive : 'transparent' 
            }
          ]}
        >
          <Text style={{ color: greenColor, fontSize: 11, fontWeight: 'bold' }}>AGILE</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setPreferredModel('gemma4-e2b-q4')} 
          style={[
            styles.modelBtn, 
            { 
              borderColor: isQ4 ? greenColor : greenBorderBtn, 
              backgroundColor: isQ4 ? greenBgActive : 'transparent' 
            }
          ]}
        >
          <Text style={{ color: greenColor, fontSize: 11, fontWeight: 'bold' }}>ESSENCE</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={loadModel} style={[styles.reloadBtn, { backgroundColor: greenColor }]}>
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{t('inference.reloadCore')}</Text>
      </TouchableOpacity>
      <Text style={[styles.reloadHint, { color: greenColor }]}>
        {t('inference.reloadHint')}
      </Text>
    </View>
  );
};

interface DownloadOverlayProps {
  downloadPercent: number;
  downloadedMB: number;
  totalMB: number;
  downloadSpeed: number;
  waitPhrase: string;
  colors: ThemeColors;
}

export const CompactDownloadOverlay: React.FC<DownloadOverlayProps> = ({ downloadPercent, downloadedMB, totalMB, downloadSpeed, waitPhrase, colors }) => (
  <View style={styles.downloadOverlay}>
    <View style={{ width: '100%' }}>
      <View style={styles.downloadHeader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.downloadPercent, { color: colors.primary }]}>{downloadPercent}%</Text>
        <Text style={[styles.downloadStats, { color: colors.textPrimary }]}>
          {downloadedMB}MB / {totalMB}MB
        </Text>
      </View>
      <View style={styles.downloadFooter}>
        <Text style={[styles.downloadSpeed, { color: 'rgba(255,255,255,0.7)' }]}>
          {downloadSpeed > 0 ? `🚀 ${downloadSpeed} MB/s` : '...'}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${downloadPercent}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    </View>
    <Text style={[styles.downloadWaitPhrase, { color: colors.textSecondary }]}>
      {waitPhrase}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  manifestoSection: { 
    padding: 25, marginBottom: 20, borderRadius: 24, borderWidth: 1 
  },
  manifestoTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, letterSpacing: 3 },
  manifestoText: { fontSize: 13, lineHeight: 22, textAlign: 'justify' },
  disclaimerContainer: { marginTop: 25 },
  disclaimerText: { fontSize: 12, lineHeight: 20, textAlign: 'justify' },
  disclaimerSubtext: { fontSize: 11, marginTop: 10, fontStyle: 'italic', opacity: 0.8 },
  manifestoFooter: { fontSize: 10, textAlign: 'center', marginTop: 15, letterSpacing: 1 },
  experimentalZone: { padding: 15, borderRadius: 16, borderWidth: 1 },
  experimentalTitle: { fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  modelSelectionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  reloadBtn: { paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  reloadHint: { fontSize: 10, textAlign: 'center', fontStyle: 'italic', marginTop: 10, opacity: 0.7 },
  downloadOverlay: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  downloadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  downloadPercent: { fontSize: 18, fontWeight: 'bold' },
  downloadStats: { fontSize: 11, fontWeight: 'bold', fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
  downloadFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  downloadSpeed: { fontSize: 10, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }) },
  progressBarBg: { height: 2, flex: 0.6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  downloadWaitPhrase: { marginTop: 6, fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
});

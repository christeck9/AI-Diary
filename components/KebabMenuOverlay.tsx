import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { AppLanguage } from '../contexts/LanguageContext';

export interface KebabMenuItem {
  emoji: string;
  labelEs: string;
  labelEn: string;
  onPress: () => void;
}

export interface KebabMenuOverlayProps {
  visible: boolean;
  anchorTop: number;
  onClose: () => void;
  colors: any;
  lang: AppLanguage;
  isDownloading?: boolean;
  downloadingModel?: { labelEs: string; labelEn: string } | null;
  downloadPercent?: number;
  downloadedMB?: number;
  downloadSpeed?: number;
  menuItems: KebabMenuItem[];
}

export const KebabMenuOverlay: React.FC<KebabMenuOverlayProps> = ({
  visible,
  anchorTop,
  onClose,
  colors,
  lang,
  isDownloading,
  downloadingModel,
  downloadPercent,
  downloadedMB,
  downloadSpeed,
  menuItems,
}) => {
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.dropdownCard,
          {
            top: anchorTop,
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {isDownloading && downloadingModel && (
          <View style={[styles.downloadBanner, { borderBottomColor: colors.border, backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.downloadTitle, { color: colors.primary }]}>
              {lang === 'es' ? 'DESCARGANDO NÚCLEO...' : 'DOWNLOADING CORE...'}
            </Text>
            <Text style={[styles.downloadModelName, { color: colors.textPrimary }]} numberOfLines={1}>
              {lang === 'es' ? downloadingModel.labelEs : downloadingModel.labelEn}
            </Text>
            <View style={[styles.progressBarContainer, { backgroundColor: `${colors.primary}20` }]}>
              <View style={[styles.progressBarFill, { width: `${downloadPercent || 0}%`, backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.downloadStats}>
              <Text style={[styles.downloadStatText, { color: colors.textSecondary }]}>{downloadPercent || 0}% ({downloadedMB || 0}MB)</Text>
              {(downloadSpeed ?? 0) > 0 && <Text style={[styles.downloadStatText, { color: colors.textSecondary }]}>🚀 {downloadSpeed} MB/s</Text>}
            </View>
          </View>
        )}

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.kebabItem,
              { borderBottomColor: index === menuItems.length - 1 ? 'transparent' : 'rgba(255,255,255,0.1)' }
            ]}
            onPress={() => {
              onClose();
              item.onPress();
            }}
          >
            <Text style={styles.kebabEmoji}>{item.emoji}</Text>
            <Text style={[styles.kebabText, { color: colors.textPrimary }]}>
              {lang === 'es' ? item.labelEs : item.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 9998,
    elevation: 998,
  },
  dropdownCard: {
    position: 'absolute',
    right: 20,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
    overflow: 'hidden',
  },
  downloadBanner: {
    padding: 12,
    borderBottomWidth: 1,
  },
  downloadTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  downloadModelName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  downloadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadStatText: {
    fontSize: 9,
  },
  kebabItem: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kebabEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  kebabText: {
    flex: 1,
  },
});

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useLlm } from '../contexts/LlmContext';
import { useAppTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * GlobalDownloadBanner
 * ─────────────────────────────────────────────────────────
 * Renders a slim, persistent download progress bar that
 * floats above the tab bar on ALL screens while a model
 * is downloading.  Tapping it navigates back to Sanctuary.
 * Automatically collapses after a few seconds to a mini-bar.
 */
export function GlobalDownloadBanner() {
  const { isDownloading, downloadingModel, downloadPercent, downloadedMB, downloadSpeed, pauseDownload } = useLlm();
  const { colors } = useAppTheme();
  const { lang } = useLanguage();

  const [pulseAnim] = React.useState(() => new Animated.Value(0.4));
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Animation for the progress bar
  React.useEffect(() => {
    if (isDownloading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [isDownloading]);

  // Auto-collapse timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExpanded && isDownloading) {
      timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000); // 5 seconds before it shrinks
    }
    return () => clearTimeout(timer);
  }, [isExpanded, isDownloading]);

  // If a new download starts, expand it automatically
  React.useEffect(() => {
    if (isDownloading) {
      setIsExpanded(true);
    }
  }, [downloadingModel?.id]); // Depend on model ID so it re-expands if a new model starts

  if (!isDownloading || !downloadingModel) return null;

  const totalMB = downloadingModel.sizeMB + (downloadingModel.mmprojSizeMB || 0);
  const modelLabel = lang === 'es' ? downloadingModel.labelEs : downloadingModel.labelEn;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (!isExpanded) setIsExpanded(true);
      }}
      style={[
        styles.banner, 
        { 
          backgroundColor: colors.surface, 
          borderBottomColor: colors.primary,
          paddingVertical: isExpanded ? 8 : 4,
          borderBottomWidth: isExpanded ? 1 : 0, // hide border when collapsed for cleaner look
        }
      ]}
    >
      {/* Progress fill bar */}
      <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}22`, height: isExpanded ? 3 : 6 }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${downloadPercent}%`, backgroundColor: colors.primary, opacity: pulseAnim }
          ]}
        />
      </View>

      {isExpanded ? (
        <View style={styles.row}>
          {/* Left: icon + label */}
          <View style={styles.leftGroup}>
            <Text style={styles.icon}>⬇️</Text>
            <View>
              <Text style={[styles.modelName, { color: colors.primary }]} numberOfLines={1}>
                {modelLabel}
              </Text>
              <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                {lang === 'es' ? 'Descargando modelo…' : 'Downloading model…'}
              </Text>
            </View>
          </View>

          {/* Right: stats and pause */}
          <View style={styles.statsGroup}>
            <Text style={[styles.percent, { color: colors.primary }]}>{downloadPercent}%</Text>
            <Text style={[styles.mb, { color: colors.textSecondary }]}>
              {downloadedMB} / {totalMB} MB
            </Text>
            {downloadSpeed > 0 && (
              <Text style={[styles.speed, { color: colors.textSecondary }]}>🚀 {downloadSpeed} MB/s</Text>
            )}
            <TouchableOpacity 
              style={[styles.pauseBtn, { borderColor: colors.primary }]} 
              onPress={pauseDownload}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Text style={[styles.pauseText, { color: colors.primary }]}>
                {lang === 'es' ? 'PAUSAR' : 'PAUSE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Collapsed View
        <View style={styles.collapsedRow}>
          <Text style={[styles.collapsedText, { color: colors.primary }]} numberOfLines={1}>
            {downloadPercent}% • {modelLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.select({ android: 110, ios: 125, default: 110 }), // Pushed down to avoid header
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  collapsedText: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 18,
  },
  modelName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  statsGroup: {
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  mb: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  speed: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  pauseBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pauseText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

interface VisionDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  modelName: string;
  sizeMB: number;
  colors: any;
  lang: string;
}

export function VisionDownloadModal({
  visible,
  onClose,
  onConfirm,
  modelName,
  sizeMB,
  colors,
  lang
}: VisionDownloadModalProps) {
  const isEs = lang === 'es';

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
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      {isAndroidEnvironment && <View style={{ height: (layoutTicket % 2 === 1) ? 0.5 : 0 }} />}
      <View 
        style={[
          styles.overlay, 
          { 
            width: absoluteScreenWidth, 
            height: absoluteScreenHeight,
            paddingTop: isAndroidEnvironment && (layoutTicket % 2 === 1) ? 20.5 : 20
          }
        ]}
      >
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <IconSymbol name="photo.fill" size={32} color={colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEs ? 'Módulo de Visión Requerido' : 'Vision Module Required'}
          </Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {isEs 
              ? `Para analizar imágenes con ${modelName}, necesitas descargar el proyector multimodal (~${sizeMB} MB).`
              : `To analyze images with ${modelName}, you need to download the multimodal projector (~${sizeMB} MB).`}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelBtn, { borderColor: colors.border }]} 
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                {isEs ? 'Cancelar' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.confirmBtn, { backgroundColor: colors.primary }]} 
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                {isEs ? 'Descargar' : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelBtn: {
    borderWidth: 1
  },
  confirmBtn: {},
  btnText: {
    fontSize: 14
  }
});

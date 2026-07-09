import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput, Platform, Dimensions } from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VAULT_DIR, listVaultFiles, decryptContent, hasVaultPin, verifyVaultPin, setVaultPin } from '../../lib/vault';

interface VaultExplorerModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  lang: 'es' | 'en';
}

export const VaultExplorerModal: React.FC<VaultExplorerModalProps> = ({
  visible,
  onClose,
  colors,
  lang,
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  
  // PIN States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [mustSetPin, setMustSetPin] = useState(false);

  const checkPinStatus = async () => {
    const exists = await hasVaultPin();
    setMustSetPin(!exists);
    setIsUnlocked(false);
    setPin('');
  };

  useEffect(() => {
    if (visible) {
      checkPinStatus();
      loadFiles();
      setSelectedFileContent(null);
      setSelectedFileName(null);
    }
  }, [visible]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const fileList = await listVaultFiles();
      setFiles(fileList.reverse());
    } catch (e) {
      console.error('Error loading vault files:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(clean);
    if (clean.length === 4) {
      handlePinSubmit(clean);
    }
  };

  const handlePinSubmit = async (val: string) => {
    if (mustSetPin) {
      await setVaultPin(val);
      setMustSetPin(false);
      setIsUnlocked(true);
    } else {
      const ok = await verifyVaultPin(val);
      if (ok) {
        setIsUnlocked(true);
      } else {
        Alert.alert('Error', lang === 'es' ? 'PIN incorrecto' : 'Incorrect PIN');
        setPin('');
      }
    }
  };

  const handleOpenFile = async (fileName: string) => {
    try {
      const path = `${VAULT_DIR}${fileName}`;
      const encryptedData = await FileSystem.readAsStringAsync(path);
      const decrypted = await decryptContent(encryptedData);
      setSelectedFileContent(decrypted);
      setSelectedFileName(fileName);
    } catch (e) {
      Alert.alert('Error', lang === 'es' ? 'No se pudo abrir el archivo.' : 'Could not open file.');
    }
  };

  const handleShare = async (fileName: string) => {
    try {
      const path = `${VAULT_DIR}${fileName}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      }
    } catch (e) {
      console.error('Sharing error:', e);
    }
  };

  const handleDelete = async (fileName: string) => {
    Alert.alert(
      lang === 'es' ? 'Eliminar Archivo' : 'Delete File',
      lang === 'es' ? `¿Estás seguro de eliminar ${fileName}?` : `Are you sure you want to delete ${fileName}?`,
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'es' ? 'Eliminar' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await FileSystem.deleteAsync(`${VAULT_DIR}${fileName}`);
            loadFiles();
          }
        }
      ]
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false} 
      statusBarTranslucent={false}
      onRequestClose={onClose}
    >
      <View 
        style={{ 
          flex: 1, 
          width: '100%', 
          height: '100%', 
          backgroundColor: colors.background, 
          margin: 0, 
          padding: 0
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            {(!selectedFileContent && !isUnlocked) ? (
              <View style={{ width: 24 }} />
            ) : (
              <TouchableOpacity onPress={selectedFileContent ? () => setSelectedFileContent(null) : onClose}>
                <IconSymbol name={selectedFileContent ? "chevron.left" : "xmark"} size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {selectedFileContent ? selectedFileName : (lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {!isUnlocked ? (
            <View style={styles.pinContainer}>
              <IconSymbol name="lock.fill" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                {mustSetPin 
                  ? (lang === 'es' ? 'Crea tu PIN de Seguridad' : 'Create your Security PIN')
                  : (lang === 'es' ? 'Introduce tu PIN' : 'Enter your PIN')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 30, textAlign: 'center', paddingHorizontal: 40 }}>
                {mustSetPin 
                  ? (lang === 'es' ? 'Este PIN protegerá tus reportes cifrados localmente.' : 'This PIN will protect your locally encrypted reports.')
                  : (lang === 'es' ? 'Necesitas el PIN para descifrar tus reportes.' : 'You need the PIN to decrypt your reports.')}
              </Text>
              
              <TextInput
                style={[styles.pinInput, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.primary }]}
                value={pin}
                onChangeText={handlePinChange}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                autoFocus
                placeholder="****"
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity
                style={{
                  marginTop: 40,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 40,
                  paddingVertical: 12,
                  borderRadius: 24,
                  minWidth: 150,
                  alignItems: 'center'
                }}
                onPress={onClose}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                  {lang === 'es' ? 'Cerrar' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
          ) : selectedFileContent ? (
            <ScrollView style={styles.contentScroll}>
              <View style={[styles.reportContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}>
                  {selectedFileContent}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.shareBtn, { backgroundColor: colors.secondary }]}
                onPress={() => handleShare(selectedFileName!)}
              >
                <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
                <Text style={styles.shareBtnText}>{lang === 'es' ? 'Compartir (Cifrado)' : 'Share (Encrypted)'}</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.listScroll}>
              {files.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 100 }}>
                  {lang === 'es' ? 'No hay archivos cifrados.' : 'No encrypted files found.'}
                </Text>
              ) : (
                files.map((file) => (
                  <View key={file} style={[styles.fileItem, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={styles.fileInfo} onPress={() => handleOpenFile(file)}>
                      <IconSymbol 
                        name={file.endsWith('.SOAP') ? "doc.plaintext.fill" : "doc.text.fill"} 
                        size={24} 
                        color={file.endsWith('.SOAP') ? colors.secondary : colors.primary} 
                      />
                      <View style={{ marginLeft: 15 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{file}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {file.endsWith('.SOAP') ? 'Reflective Summary (SOAP)' : 'Session Report'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.fileActions}>
                      <TouchableOpacity onPress={() => handleShare(file)} style={{ padding: 10 }}>
                        <IconSymbol name="square.and.arrow.up" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(file)} style={{ padding: 10 }}>
                        <IconSymbol name="trash" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20,
  },
  title: {
    fontSize: 20, fontWeight: 'bold',
  },
  listScroll: {
    flex: 1, paddingHorizontal: 10,
  },
  fileItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1,
  },
  fileInfo: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
  },
  contentScroll: {
    flex: 1, padding: 20,
  },
  reportContainer: {
    padding: 20, borderRadius: 10, borderWidth: 1, marginBottom: 20,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 30, gap: 10, marginBottom: 30,
  },
  shareBtnText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16,
  },
  pinContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100,
  },
  pinInput: {
    width: 200, height: 60, borderRadius: 10, borderWidth: 2, textAlign: 'center', fontSize: 32, fontWeight: 'bold', letterSpacing: 10,
  }
});

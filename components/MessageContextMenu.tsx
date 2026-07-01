import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, Platform, Dimensions } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { IconSymbol } from './ui/icon-symbol';

export function MessageContextMenu({
  selectedContextMsg,
  setSelectedContextMsg,
  colors,
  lang,
  isTypingRef,
  addSystemMessage,
  setInputText,
  handleSend,
  handleReportMessage,
  handleDeleteMessage
}: {
  selectedContextMsg: any;
  setSelectedContextMsg: (msg: any) => void;
  colors: any;
  lang: string;
  isTypingRef: React.MutableRefObject<boolean>;
  addSystemMessage: (msg: string) => void;
  setInputText: (text: string) => void;
  handleSend: (overrideText?: string) => void;
  handleReportMessage: (id: string) => void;
  handleDeleteMessage: (id: string) => void;
}) {
  const [layoutTicket, setLayoutTicket] = useState(0);
  const isAndroidEnvironment = Platform.OS === 'android';
  const { width: absoluteScreenWidth, height: absoluteScreenHeight } = Dimensions.get('screen');
  const visible = !!selectedContextMsg;

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setLayoutTicket(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!selectedContextMsg) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" statusBarTranslucent={true}>
      {isAndroidEnvironment && <View style={{ height: (layoutTicket % 2 === 1) ? 0.5 : 0 }} />}
      <View 
        style={[
          styles.modalBg, 
          { 
            width: absoluteScreenWidth, 
            height: absoluteScreenHeight,
            paddingTop: isAndroidEnvironment && (layoutTicket % 2 === 1) ? 0.5 : 0
          }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={() => setSelectedContextMsg(null)}
          activeOpacity={1}
        />
        <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.textPrimary }]}>
              {lang === 'es' ? 'Acciones de Mensaje' : 'Message Actions'}
            </Text>
          </View>

          <View style={[styles.previewContainer, { borderBottomColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
              <Text selectable={true} style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>
                {selectedContextMsg.text}
              </Text>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { borderBottomColor: colors.border }]}
            onPress={() => {
              if (selectedContextMsg) {
                ExpoClipboard.setStringAsync(selectedContextMsg.text);
                Alert.alert(lang === 'es' ? "Copiado" : "Copied", lang === 'es' ? "Texto copiado al portapapeles." : "Text copied to clipboard.");
              }
              setSelectedContextMsg(null);
            }}
          >
            <IconSymbol name="doc.on.doc" size={22} color={colors.primary} style={{ marginRight: 15 }} />
            <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{lang === 'es' ? 'Copiar Texto' : 'Copy Text'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderBottomColor: colors.border }]}
            onPress={() => {
              if (selectedContextMsg) {
                const originalText = selectedContextMsg.text;
                setSelectedContextMsg(null);
                if (isTypingRef.current) {
                  addSystemMessage(lang === 'es' ? '⏳ Espera a que termine la respuesta actual.' : '⏳ Wait for the current response to finish.');
                  return;
                }
                const prompt = lang === 'es'
                  ? `Haz un análisis profundo y explícame mejor esto que dijiste: "${originalText}"`
                  : `Do a deep analysis and explain better what you said here: "${originalText}"`;
                
                // Trigger send with override text directly, avoiding stale closure & setTimeout
                handleSend(prompt);
              }
            }}
          >
            <IconSymbol name="brain.head.profile" size={22} color={colors.secondary} style={{ marginRight: 15 }} />
            <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{lang === 'es' ? 'Análisis Profundo' : 'Deep Analysis'}</Text>
          </TouchableOpacity>

          {selectedContextMsg.role === 'ai' && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderBottomColor: colors.border }]}
              onPress={() => {
                if (selectedContextMsg) {
                  const idToDel = selectedContextMsg.id;
                  setSelectedContextMsg(null);
                  handleReportMessage(idToDel);
                }
              }}
            >
              <IconSymbol name="exclamationmark.triangle" size={22} color="#D4A017" style={{ marginRight: 15 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{lang === 'es' ? 'Reportar Alucinación' : 'Report Hallucination'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (selectedContextMsg) {
                const idToDel = selectedContextMsg.id;
                setSelectedContextMsg(null);
                handleDeleteMessage(idToDel);
              }
            }}
          >
            <IconSymbol name="trash" size={22} color="#ff3b30" style={{ marginRight: 15 }} />
            <Text style={{ color: '#ff3b30', fontSize: 15 }}>{lang === 'es' ? 'Eliminar Mensaje' : 'Delete Message'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { borderRadius: 20, width: '85%', overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6.68 },
  header: { padding: 20, borderBottomWidth: 1 },
  headerText: { fontWeight: 'bold', fontSize: 16 },
  previewContainer: { padding: 15, borderBottomWidth: 1, maxHeight: 180 },
  actionBtn: { padding: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 }
});

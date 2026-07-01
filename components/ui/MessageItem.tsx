import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Swipeable, TouchableOpacity as RNGHTouchableOpacity } from 'react-native-gesture-handler';
import { IconSymbol } from './icon-symbol';
import { CognitiveNode } from './CognitiveNode';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  imageUri?: string;
  thoughts?: string;
  tool_query?: string;
  created_at?: number;
  status?: 'pending' | 'sent';
}

export const MessageItem = React.memo(({
  item,
  colors,
  isAi,
  isLatest,
  isTyping,
  processingPhase,
  lang,
  onAction,
  onImagePress
}: {
  item: Message,
  colors: any,
  isAi: boolean,
  isLatest: boolean,
  isTyping: boolean,
  processingPhase: 'idle' | 'reading_file' | 'indexing' | 'generating' | 'thinking',
  lang: string,
  onAction: (action: 'copy' | 'analyze' | 'report' | 'delete', item: Message) => void,
  onImagePress: (uri: string) => void,
}) => {

  const renderRightActions = () => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 20 }}>
        <RNGHTouchableOpacity style={styles.actionBtn} onPress={() => onAction('copy', item)}>
          <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{lang === 'es' ? 'Copiar' : 'Copy'}</Text>
        </RNGHTouchableOpacity>
        {isAi && (
          <RNGHTouchableOpacity style={styles.actionBtn} onPress={() => onAction('analyze', item)}>
            <IconSymbol name="brain.head.profile" size={20} color={colors.secondary} />
            <Text style={[styles.actionLabel, { color: colors.secondary }]}>{lang === 'es' ? 'Analizar' : 'Analyze'}</Text>
          </RNGHTouchableOpacity>
        )}
        {isAi && (
          <RNGHTouchableOpacity style={styles.actionBtn} onPress={() => onAction('report', item)}>
            <IconSymbol name="exclamationmark.triangle" size={20} color="#D4A017" />
            <Text style={[styles.actionLabel, { color: '#D4A017' }]}>{lang === 'es' ? 'Reportar' : 'Report'}</Text>
          </RNGHTouchableOpacity>
        )}
        <RNGHTouchableOpacity style={styles.actionBtn} onPress={() => onAction('delete', item)}>
          <IconSymbol name="trash" size={20} color="#ff3b30" />
          <Text style={[styles.actionLabel, { color: '#ff3b30' }]}>{lang === 'es' ? 'Borrar' : 'Delete'}</Text>
        </RNGHTouchableOpacity>
      </View>
    );
  };

  const innerContent = (
    <Swipeable renderRightActions={renderRightActions} friction={2} overshootRight={false} activeOffsetX={[-10, 10]} failOffsetY={[-10, 10]}>
      <View style={[
        styles.messageWrapper,
        isAi ? styles.messageWrapperAi : styles.messageWrapperUser,
        item.status === 'pending' && { opacity: 0.5 },
        isLatest && { marginBottom: 60, marginTop: 15 }
      ]}>
        {isAi && (
          <View style={[
            styles.avatarAi,
            { backgroundColor: colors.surface, borderColor: colors.secondary, padding: 0 }
          ]}>
            <Image
              source={require('../../assets/images/anima_spirit.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isAi ? { backgroundColor: colors.surfaceSecondary, borderLeftWidth: 2, borderLeftColor: colors.secondary }
            : { backgroundColor: colors.surfaceSecondary, borderRightWidth: 2, borderRightColor: colors.primary },
          isLatest && {
            backgroundColor: colors.surfaceSecondary === '#1a1a24' ? '#323248' :
                             colors.surfaceSecondary === '#1a1e1a' ? '#2a382a' :
                             colors.surfaceSecondary === '#f0f0f5' ? '#ffffff' :
                             colors.surfaceSecondary === '#e8ebe4' ? '#ffffff' :
                             colors.surfaceSecondary === '#e6e8f4' ? '#ffffff' :
                             colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: isAi ? colors.secondary : colors.primary,
            borderLeftWidth: isAi ? 3 : 1,
            borderRightWidth: isAi ? 1 : 3,
          }
        ]}>
          {item.imageUri && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress(item.imageUri!)}
              style={styles.imageTouchable}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {isAi ? (
            <View>
              {(!item.text.trim() && !item.thoughts?.trim() && !item.tool_query && isLatest && isTyping) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                    {processingPhase === 'reading_file'
                      ? (lang === 'es' ? 'Leyendo documento...' : 'Reading document...')
                      : processingPhase === 'indexing'
                      ? (lang === 'es' ? 'Indexando memoria local...' : 'Indexing local memory...')
                      : processingPhase === 'generating'
                      ? (lang === 'es' ? 'Escribiendo respuesta...' : 'Generating response...')
                      : (lang === 'es' ? 'Pensando...' : 'Thinking...')}
                  </Text>
                </View>
              ) : (
                item.thoughts || item.tool_query ? (
                  <View>
                    <CognitiveNode
                      thought={item.thoughts || ''}
                      toolQuery={item.tool_query}
                      colors={colors}
                      lang={lang}
                    />
                    <Text selectable={true} style={[styles.messageText, { color: colors.textPrimary }]}>
                      <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{'> '} </Text>
                      {item.text}
                    </Text>
                  </View>
                ) : (
                  <Text selectable={true} style={[styles.messageText, { color: colors.textPrimary }]}>
                    <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{'> '} </Text>
                    {item.text}
                  </Text>
                )
              )}
            </View>
          ) : (
            <Text selectable={true} style={[styles.messageText, { color: colors.textPrimary }]}>
              {item.text}
            </Text>
          )}
        </View>
        {!isAi && <View style={[styles.avatarUser, { backgroundColor: colors.surface, borderColor: colors.primary }]}><IconSymbol name="person.fill" size={20} color={colors.primary} /></View>}
      </View>
    </Swipeable>
  );

  return innerContent;
}, (prevProps, nextProps) => {
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.text !== nextProps.item.text) return false;
  if (prevProps.item.status !== nextProps.item.status) return false;
  if (prevProps.item.thoughts !== nextProps.item.thoughts) return false;
  if (prevProps.item.tool_query !== nextProps.item.tool_query) return false;
  if (prevProps.lang !== nextProps.lang) return false;
  
  // Optimize: Compare colors by their primitive values to prevent unnecessary re-renders when the parent object reference changes
  if (
    prevProps.colors.surface !== nextProps.colors.surface ||
    prevProps.colors.secondary !== nextProps.colors.secondary ||
    prevProps.colors.surfaceSecondary !== nextProps.colors.surfaceSecondary ||
    prevProps.colors.primary !== nextProps.colors.primary ||
    prevProps.colors.textSecondary !== nextProps.colors.textSecondary ||
    prevProps.colors.textPrimary !== nextProps.colors.textPrimary
  ) return false;

  // Crucial performance fix: Ignore typing/phase updates if this is not the latest message
  if (!prevProps.isLatest && !nextProps.isLatest) {
    return true; // No need to re-render old messages just because typing state changed
  }

  // If it is the latest, check the dynamic states
  if (prevProps.isLatest !== nextProps.isLatest) return false;
  if (prevProps.isTyping !== nextProps.isTyping) return false;
  if (prevProps.processingPhase !== nextProps.processingPhase) return false;

  return true;
});

const styles = StyleSheet.create({
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  messageWrapperAi: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  avatarAi: { marginRight: 10, padding: 8, borderRadius: 0, borderWidth: 1 },
  avatarUser: { marginLeft: 10, padding: 8, borderRadius: 0, borderWidth: 1 },
  messageBubble: { maxWidth: '75%', padding: 15, borderRadius: 0 },
  messageText: { fontSize: 16, lineHeight: 24 },
  imageTouchable: { width: 220, height: 160, borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
  image: { width: '100%', height: '100%' },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 55,
  },
  actionLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
});

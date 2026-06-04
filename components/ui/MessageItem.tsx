import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
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
  onReport,
  onLongPress,
  onImagePress
}: {
  item: Message,
  colors: any,
  isAi: boolean,
  isLatest: boolean,
  isTyping: boolean,
  processingPhase: 'idle' | 'reading_file' | 'indexing' | 'generating',
  lang: string,
  onReport: (id: string) => void,
  onLongPress: (item: Message) => void,
  onImagePress: (uri: string) => void,
}) => {

  const innerContent = (
    <TouchableWithoutFeedback
      delayLongPress={400}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        onLongPress(item);
      }}
    >
      <View style={[styles.messageWrapper, isAi ? styles.messageWrapperAi : styles.messageWrapperUser, item.status === 'pending' && { opacity: 0.5 }]}>
        {isAi && (
          <View style={[
            styles.avatarAi,
            { backgroundColor: colors.surface, borderColor: colors.secondary }
          ]}>
            <IconSymbol name="cpu" size={20} color={colors.secondary} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isAi ? { backgroundColor: colors.surfaceSecondary, borderLeftWidth: 2, borderLeftColor: colors.secondary }
            : { backgroundColor: colors.surfaceSecondary, borderRightWidth: 2, borderRightColor: colors.primary }
        ]}>
          {item.imageUri && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onImagePress(item.imageUri!)}
              style={{ width: 220, height: 160, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={{ width: '100%', height: '100%' }}
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
                    <Text selectable={false} style={[styles.messageText, { color: colors.textPrimary }]}>
                      <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{'> '} </Text>
                      {item.text}
                    </Text>
                  </View>
                ) : (
                  <Text selectable={false} style={[styles.messageText, { color: colors.textPrimary }]}>
                    <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{'> '} </Text>
                    {item.text}
                  </Text>
                )
              )}
            </View>
          ) : (
            <Text selectable={false} style={[styles.messageText, { color: colors.textPrimary }]}>
              {item.text}
            </Text>
          )}
        </View>
        {!isAi && <View style={[styles.avatarUser, { backgroundColor: colors.surface, borderColor: colors.primary }]}><IconSymbol name="person.fill" size={20} color={colors.primary} /></View>}
      </View>
    </TouchableWithoutFeedback>
  );

  return innerContent;
});

const styles = StyleSheet.create({
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  messageWrapperAi: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  avatarAi: { marginRight: 10, padding: 8, borderRadius: 0, borderWidth: 1 },
  avatarUser: { marginLeft: 10, padding: 8, borderRadius: 0, borderWidth: 1 },
  messageBubble: { maxWidth: '75%', padding: 15, borderRadius: 0 },
  messageText: { fontSize: 16, lineHeight: 24 },
});

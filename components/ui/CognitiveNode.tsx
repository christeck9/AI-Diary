import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { IconSymbol } from './icon-symbol';

/**
 * 🧠 COGNITIVE NODE: Recuadro colapsable para el proceso de pensamiento de la IA.
 */
export const CognitiveNode = React.memo(({ thought, toolQuery, colors, lang }: { thought: string, toolQuery?: string, colors: any, lang: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const heightVal = useSharedValue(0);
  const opacityVal = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      heightVal.value = withTiming(2000, { duration: 300 });
      opacityVal.value = withTiming(1, { duration: 250 });
    } else {
      heightVal.value = withTiming(0, { duration: 300 });
      opacityVal.value = withTiming(0, { duration: 200 });
    }
  }, [isExpanded]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: heightVal.value,
      opacity: opacityVal.value,
      overflow: 'hidden'
    };
  });

  const toggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (!thought && !toolQuery) return null;

  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      marginBottom: 10,
      overflow: 'hidden'
    }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconSymbol name="cpu" size={16} color={colors.secondary} />
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              fontWeight: 'bold',
              fontStyle: 'italic',
              lineHeight: 20,
              textAlignVertical: 'center',
              includeFontPadding: false
            }}>
            {lang === 'es' ? 'Proceso de pensamiento...' : 'Thinking process...'}
          </Text>
        </View>
        <IconSymbol name={isExpanded ? "chevron.up" : "chevron.down"} size={14} color={colors.secondary} />
      </TouchableOpacity>

      <Animated.View style={[{ paddingHorizontal: 12 }, animatedStyle]}>
        <View style={{ paddingBottom: 12 }}>
          {toolQuery ? (
            <Text
              selectable={false}
              style={{
                color: colors.primary,
                fontSize: 11,
                fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
                marginBottom: 8,
                backgroundColor: 'rgba(255,255,255,0.03)',
                padding: 6,
                borderRadius: 4,
                borderLeftWidth: 2,
                borderLeftColor: colors.primary
              }}>
              [SENTINEL_QUERY]: {toolQuery}
            </Text>
          ) : null}
          <Text
            selectable={false}
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
              lineHeight: 18
            }}>
            {thought.trim()}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
});

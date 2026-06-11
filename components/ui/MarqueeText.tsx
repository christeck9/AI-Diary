import React, { useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent, TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withDelay } from 'react-native-reanimated';

interface MarqueeTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  duration?: number;
  gap?: number;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ text, style, duration = 8000, gap = 40 }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useSharedValue(0);

  const shouldAnimate = textWidth > containerWidth && containerWidth > 0;

  useEffect(() => {
    if (shouldAnimate) {
      offset.value = 0;
      offset.value = withDelay(
        1000,
        withRepeat(
          withTiming(-(textWidth + gap), { duration, easing: Easing.linear }),
          -1,
          false
        )
      );
    } else {
      offset.value = 0;
    }
  }, [textWidth, containerWidth, text, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View 
      style={{ overflow: 'hidden', width: '100%', flexDirection: 'row', alignItems: 'center' }}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }, animatedStyle]}>
        <Text 
          style={[style, { flexShrink: 0 }]} 
          onLayout={(e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width)}
          numberOfLines={1}
        >
          {text}
        </Text>
        
        {shouldAnimate && (
          <Text style={[style, { paddingLeft: gap, flexShrink: 0 }]} numberOfLines={1}>
            {text}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

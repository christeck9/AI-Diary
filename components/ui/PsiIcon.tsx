import React from 'react';
import { Text } from 'react-native';

export interface PsiIconProps {
  size?: number;
  color?: string;
}

export function PsiIcon({ size = 28, color = '#000' }: PsiIconProps) {
  return (
    <Text style={{
      fontSize: size,
      color: color,
      includeFontPadding: false,
      textAlignVertical: 'center',
      textAlign: 'center',
      lineHeight: size,
      fontWeight: 'bold',
      transform: [{ translateY: 3 }]
    }}>
      Ψ
    </Text>
  );
}

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TabLayout() {
  const { colors, activeTheme } = useAppTheme();
  const { t, lang } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          default: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: lang === 'es' ? 'Diario' : 'Diary',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: lang === 'es' ? 'Herramientas' : 'Tools',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="zengarden"
        options={{
          title: lang === 'es' ? 'Jardín' : 'Garden',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="leaf.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: lang === 'es' ? 'Opciones' : 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}


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
        name="advanced"
        options={{
          title: 'Advanced',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="slider.horizontal.3" color={color} />,
        }}
      />
      <Tabs.Screen
        name="experimental"
        options={{
          title: 'Experimental',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="flask.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}


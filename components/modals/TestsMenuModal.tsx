import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, SafeAreaView } from 'react-native';

interface TestsMenuModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'en' | 'es';
  colors: any;
  onSelectTest: (type: 'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti') => void;
}

export const TestsMenuModal: React.FC<TestsMenuModalProps> = ({
  visible,
  onClose,
  lang,
  colors,
  onSelectTest
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'android' ? 85 : 20 }}>
            <Text style={{ color: colors.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
              {lang === 'es' ? 'Centro de Autoconocimiento' : 'Self-Knowledge Center'}
            </Text>

            <View style={{ backgroundColor: colors.surfaceSecondary, padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                {lang === 'es' 
                  ? 'Elige uno de los cuestionarios de abajo para calibrar la personalidad y el tono de respuesta de tu IA.' 
                  : 'Choose one of the questionnaires below to calibrate your AI\'s personality and response style.'}
              </Text>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.secondary }}
                onPress={() => { onSelectTest('ocean'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '1. Test Inicial (OCEAN+) [25 Q]' : '1. Initial Test (OCEAN+) [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Perfil de personalidad básico.' : 'Basic personality profile.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#4ade80' }}
                onPress={() => { onSelectTest('aptitude'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '2. Test de Aptitudes [25 Q]' : '2. Aptitude Test [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Descubre tus habilidades naturales.' : 'Discover your natural skills.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#fbbf24' }}
                onPress={() => { onSelectTest('vocational'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '3. Test Vocacional [25 Q]' : '3. Vocational Test [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Orientación de propósito y carrera.' : 'Purpose and career orientation.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#f87171' }}
                onPress={() => { onSelectTest('anxiety'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '4. Test de Balance Emocional [25 Q]' : '4. Emotional Balance Test [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Evaluación de balance y estabilidad emocional.' : 'Evaluation of emotional balance and stability.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#60a5fa' }}
                onPress={() => { onSelectTest('mood'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '5. Test de Bienestar Emocional [25 Q]' : '5. Emotional Well-being Test [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Monitoreo y reflexión de bienestar cotidiano.' : 'Daily well-being monitoring and reflection.'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ padding: 15, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#a855f7' }}
                onPress={() => { onSelectTest('mbti'); onClose(); }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{lang === 'es' ? '6. Test de Personalidad 16r [25 Q]' : '6. 16r Personality Test [25 Q]'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{lang === 'es' ? 'Arquetipo de personalidad (Jung).' : 'Personality archetype (Jung).'}</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={{ padding: 14, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center', marginTop: 10 }} 
              onPress={onClose}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{lang === 'es' ? 'Cerrar' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({});

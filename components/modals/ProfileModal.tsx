import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';
import { PsyProfile } from './PsyTestModal';
import { UserProfile } from '../../contexts/ProfileContext';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'en' | 'es';
  colors: any;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  psyProfile: PsyProfile & { moodBalance: number };
  db: any;
}

const VALUE_OPTIONS = {
  en: ['Freedom', 'Justice', 'Family', 'Peace', 'Success', 'Health', 'Creativity', 'Wisdom', 'Security', 'Love'],
  es: ['Libertad', 'Justicia', 'Familia', 'Paz', 'Éxito', 'Salud', 'Creatividad', 'Sabiduría', 'Seguridad', 'Amor']
};

const STYLE_OPTIONS = {
  en: ['Concisely', 'Friendly', 'Analytically', 'Exhaustively', 'Socratically', 'Supportively'],
  es: ['Con concisión', 'Amigable', 'Analítico', 'Exhaustivo', 'Socrático', 'Empático']
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible, onClose, lang, colors, userProfile, setUserProfile, psyProfile, db
}) => {
  const toggleTag = (current: string[] | undefined, val: string, limit: number, field: keyof UserProfile) => {
    let updated = current ? [...current] : [];
    if (updated.includes(val)) {
      updated = updated.filter(v => v !== val);
    } else {
      if (updated.length >= limit) {
        Alert.alert(
          lang === 'es' ? 'Límite alcanzado' : 'Limit reached',
          lang === 'es' ? `Máximo ${limit} opciones.` : `Maximum ${limit} choices.`
        );
        return;
      }
      updated.push(val);
    }
    setUserProfile(prev => ({ ...prev, [field]: updated }));
  };

  const renderTags = (options: string[], current: string[] | undefined, limit: number, field: keyof UserProfile, englishOptions?: string[]) => (
    <View style={styles.tagContainer}>
      {options.map((tag, idx) => {
        const valToStore = englishOptions ? englishOptions[idx] : tag;
        const isSelected = current?.includes(valToStore);
        return (
          <TouchableOpacity 
            key={tag} 
            onPress={() => toggleTag(current, valToStore, limit, field)}
            style={[styles.tag, { 
              backgroundColor: isSelected ? colors.primary : colors.surface,
              borderColor: isSelected ? colors.primary : colors.border
            }]}
          >
            <Text style={{ color: isSelected ? '#FFF' : colors.textPrimary, fontSize: 12 }}>{tag}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

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
          <View style={{ flex: 1, padding: 20, paddingBottom: Platform.OS === 'android' ? 85 : 20 }}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              {lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}
            </Text>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              bounces={false} 
              overScrollMode="never"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.label}>{lang === 'es' ? 'Nombre y Apellido' : 'Full Name'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.name}
              onChangeText={text => setUserProfile(prev => ({ ...prev, name: text }))}
            />

            <Text style={styles.label}>{lang === 'es' ? 'Apodo / Alias' : 'Nickname / Alias'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.nickname}
              onChangeText={text => setUserProfile(prev => ({ ...prev, nickname: text }))}
            />

            <Text style={styles.label}>{lang === 'es' ? 'Intereses / Gustos' : 'Interests / Likes'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.likes}
              onChangeText={text => setUserProfile(prev => ({ ...prev, likes: text }))}
            />

            <Text style={styles.label}>{lang === 'es' ? 'Área de Trabajo o Estudios' : 'Work or Studies'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.work}
              onChangeText={text => setUserProfile(prev => ({ ...prev, work: text }))}
            />

            <View style={styles.divider} />

            <Text style={styles.label}>{lang === 'es' ? 'Mis Valores (Máximo 3)' : 'My Values (Max 3)'}</Text>
            {renderTags(VALUE_OPTIONS[lang], userProfile.values, 3, 'values', VALUE_OPTIONS.en)}

            <Text style={styles.label}>{lang === 'es' ? 'Objetivo a Corto Plazo' : 'Short-Term Goal'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.shortTermGoal}
              onChangeText={text => setUserProfile(prev => ({ ...prev, shortTermGoal: text }))}
            />

            <Text style={styles.label}>{lang === 'es' ? 'Objetivo a Largo Plazo' : 'Long-Term Goal'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={userProfile.longTermGoal}
              onChangeText={text => setUserProfile(prev => ({ ...prev, longTermGoal: text }))}
            />

            <Text style={styles.label}>{lang === 'es' ? '¿Cómo quieres que te conteste la AI? (Máximo 3)' : 'How should the AI respond? (Max 3)'}</Text>
            {renderTags(STYLE_OPTIONS[lang], userProfile.responseStyle, 3, 'responseStyle', STYLE_OPTIONS.en)}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Text style={{ color: colors.textPrimary }}>{lang === 'es' ? 'Cancelar' : 'Cancel'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: colors.primary }]} 
              onPress={async () => {
                try {
                  if (db) {
                    await db.runAsync('DELETE FROM user_profile');
                    await db.runAsync(`INSERT INTO user_profile (name, nickname, work, likes, values_tags, short_term_goal, long_term_goal, response_style_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                      [userProfile.name, userProfile.nickname, userProfile.work, userProfile.likes, 
                       JSON.stringify(userProfile.values || []), userProfile.shortTermGoal || '', userProfile.longTermGoal || '', JSON.stringify(userProfile.responseStyle || [])]);
                  }
                  onClose();
                } catch (e) { console.error(e); }
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{lang === 'es' ? 'Guardar' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '90%', borderRadius: 15, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  placeholderBox: { borderRadius: 10, borderWidth: 1, padding: 15, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  chartBox: { borderRadius: 15, borderWidth: 1, marginTop: 5, overflow: 'hidden' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 15 },
  btn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});

import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Alert, TextInput, Platform, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { IconSymbol } from '../ui/icon-symbol';
import { LibraryBook, LibraryManagerService } from '../../lib/LibraryManagerService';
import { SQLiteDatabase } from 'expo-sqlite';
import { settingsService } from '../../lib/SettingsService';
import { cloudTTSService } from '../../lib/CloudTTSService';

interface BookReaderModalProps {
  visible: boolean;
  onClose: () => void;
  book: LibraryBook | null;
  colors: any;
  lang: 'es' | 'en';
  db: SQLiteDatabase;
}

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  visible,
  onClose,
  book,
  colors,
  lang,
  db
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageText, setPageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputPage, setInputPage] = useState('1');
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [chunks, setChunks] = useState<string[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);

  const isSpeakingRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible && book) {
      setCurrentPage(book.last_read_page || 1);
      setInputPage(String(book.last_read_page || 1));
      loadPageContent(book.file_path, book.last_read_page || 1);

      // Load available voices with a delay and safety checks to prevent thread locks
      const timer = setTimeout(() => {
        Speech.getAvailableVoicesAsync()
          .then(voices => {
            if (voices) {
              setAvailableVoices(voices);
            }
          })
          .catch(e => {
            console.warn('[READER] Failed to load available voices:', e);
          });
      }, 500);

      return () => {
        clearTimeout(timer);
        stopSpeech();
      };
    }
    return () => {
      stopSpeech();
    };
  }, [visible, book]);

  const loadPageContent = async (filePath: string, pageNum: number) => {
    setLoading(true);
    try {
      const text = await LibraryManagerService.getPageContent(filePath, pageNum);
      setPageText(text);

      const parsedChunks = splitTextIntoSpeechChunks(text, 1000);
      setChunks(parsedChunks);
      setActiveChunkIndex(0);

      // Persist progress in background
      if (book) {
        await LibraryManagerService.updateReadingProgress(db, book.id, pageNum);
        book.last_read_page = pageNum; // Update locally
      }
    } catch (e) {
      console.log('[READER] Failed to load page:', e);
      setPageText(lang === 'es' ? 'Error al cargar el contenido de la página.' : 'Error loading page content.');
      setChunks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (!book) return;
    let next = currentPage + 1;
    if (next > book.total_pages) {
      next = 1; // Wrap to first page
    }
    setCurrentPage(next);
    setInputPage(String(next));
    loadPageContent(book.file_path, next);

    if (isSpeakingRef.current) {
      // Re-trigger speech for next page
      setTimeout(() => {
        speakCurrentPage(next, 0);
      }, 500);
    } else {
      setActiveChunkIndex(0);
    }
  };

  const handlePrevPage = () => {
    if (!book) return;
    let prev = currentPage - 1;
    if (prev < 1) {
      prev = book.total_pages; // Wrap to last page
    }
    setCurrentPage(prev);
    setInputPage(String(prev));
    loadPageContent(book.file_path, prev);

    if (isSpeakingRef.current) {
      setTimeout(() => {
        speakCurrentPage(prev, 0);
      }, 500);
    } else {
      setActiveChunkIndex(0);
    }
  };

  const handleJumpToPage = () => {
    if (!book) return;
    const parsed = parseInt(inputPage, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > book.total_pages) {
      Alert.alert(
        lang === 'es' ? 'Página inválida' : 'Invalid page',
        lang === 'es'
          ? `Introduce un número entre 1 y ${book.total_pages}`
          : `Please enter a number between 1 and ${book.total_pages}`
      );
      setInputPage(String(currentPage));
      return;
    }
    setCurrentPage(parsed);
    loadPageContent(book.file_path, parsed);

    if (isSpeakingRef.current) {
      setTimeout(() => {
        speakCurrentPage(parsed, 0);
      }, 500);
    } else {
      setActiveChunkIndex(0);
    }
  };

  const splitTextIntoSpeechChunks = (text: string, maxLength: number = 3000): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    return chunks;
  };

  // --- TEXT TO SPEECH (TTS) NARRATION ---
  const speakCurrentPage = async (pageVal: number, startChunkIndex: number = 0) => {
    if (!book) return;

    // Stop current speech first
    await stopSpeech();

    // Fetch fresh page content
    const textToSpeak = await LibraryManagerService.getPageContent(book.file_path, pageVal);
    if (!textToSpeak || textToSpeak.startsWith('[Error') || textToSpeak.startsWith('[Página')) {
      stopSpeech();
      return;
    }

    // Set up audio mode for playback ONCE for the entire narration session
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
      console.log('[READER] Audio mode set to playback for page narration');
    } catch (modeErr) {
      console.warn('[READER] setAudioModeAsync error before narration:', modeErr);
    }

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const chunksList = splitTextIntoSpeechChunks(textToSpeak, 1000);
    setChunks(chunksList);
    setActiveChunkIndex(startChunkIndex);
    console.log(`[READER] Speaking page ${pageVal} split into ${chunksList.length} chunks starting at index ${startChunkIndex}`);

    let currentChunkIndex = startChunkIndex;

    const speakNextChunk = async () => {
      if (!isSpeakingRef.current) return;
      if (currentChunkIndex >= chunksList.length) {
        // Finished all chunks of this page! Advance page
        if (pageVal < book.total_pages) {
          console.log('[READER] Continuous read: advancing to next page');
          const next = pageVal + 1;
          setCurrentPage(next);
          setInputPage(String(next));
          await loadPageContent(book.file_path, next);
          speakCurrentPage(next, 0);
        } else {
          console.log('[READER] Reached end of book, stopping TTS');
          stopSpeech();
        }
        return;
      }

      const chunkText = chunksList[currentChunkIndex];
      setActiveChunkIndex(currentChunkIndex);
      console.log(`[READER] Speaking chunk ${currentChunkIndex + 1}/${chunksList.length} of page ${pageVal}`);

      // --- CHECK CLOUD TTS ---
      try {
        const settings = await settingsService.get();
        if (settings && settings.useCloudTTS) {
          console.log('[READER] Using Cloud TTS for narration');
          const uri = await cloudTTSService.synthesize(chunkText, lang, settings as any, 'speech_reader');
          if (uri) {
            if (!isSpeakingRef.current) {
              await cloudTTSService.cleanupAudioFile(uri);
              return;
            }

            // Play via expo-av
            if (soundRef.current) {
              try { await soundRef.current.unloadAsync(); } catch (e) { }
            }
            const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
            soundRef.current = sound;
            sound.setOnPlaybackStatusUpdate(async (status: any) => {
              if (status.isLoaded) {
                if (status.didJustFinish) {
                  try {
                    if (soundRef.current === sound) {
                      soundRef.current = null;
                    }
                    await sound.unloadAsync();
                    await cloudTTSService.cleanupAudioFile(uri);
                  } catch (e) {
                    console.warn('[READER] Auto-cleanup error:', e);
                  }
                  if (isSpeakingRef.current) {
                    currentChunkIndex++;
                    speakNextChunk();
                  }
                }
              } else if (status.error) {
                console.error('[READER] Playback error:', status.error);
                stopSpeech();
              }
            });
            return;
          } else {
            throw new Error('Cloud TTS synthesis returned null (check API Key / Internet connection)');
          }
        }
      } catch (cloudErr) {
        console.error('[READER] Cloud TTS synthesis/playback failed, falling back to Native TTS:', cloudErr);
      }

      // Native TTS fallback
      let targetLanguage = lang === 'es' ? 'es-MX' : 'en-US';
      if (availableVoices && availableVoices.length > 0) {
        const matchingVoice = availableVoices.find(v => v.language.toLowerCase().startsWith(lang.toLowerCase()));
        if (matchingVoice) {
          targetLanguage = matchingVoice.language;
        }
      }

      console.log(`[READER] Speaking native fallback with language: ${targetLanguage}`);
      if (Platform.OS === 'android') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playThroughEarpieceAndroid: false,
          });
        } catch (modeErr) {
          console.warn('[READER] setAudioModeAsync pre-speech.speak() error:', modeErr);
        }
      }

      try {
        await Speech.stop(); // Reset Speech engine to clear any pending tasks
        Speech.speak(chunkText, {
          language: targetLanguage,
          pitch: 1.0,
          rate: 1.0,
          onDone: () => {
            currentChunkIndex++;
            speakNextChunk();
          },
          onStopped: () => {
            console.log(`[READER] Chunk ${currentChunkIndex} stopped`);
          },
          onError: (e) => {
            console.error('[READER] Native Speech.speak onError callback:', e);
            stopSpeech();
          }
        });
      } catch (speechErr) {
        console.error('[READER] Native Speech.speak failed completely:', speechErr);
        stopSpeech();
      }
    };

    speakNextChunk();
  };

  const stopSpeech = async () => {
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    try {
      await Speech.stop();
    } catch (e) {
      // Ignore
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (e) { }
      try {
        await soundRef.current.unloadAsync();
      } catch (e) { }
      soundRef.current = null;
    }
  };

  const handleParagraphPress = (idx: number) => {
    if (isSpeakingRef.current) {
      speakCurrentPage(currentPage, idx);
    } else {
      setActiveChunkIndex(idx);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      speakCurrentPage(currentPage, activeChunkIndex);
    }
  };

  const handleClose = () => {
    stopSpeech();
    onClose();
  };

  if (!book) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false} 
      statusBarTranslucent={false}
      onRequestClose={handleClose}
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

          {/* HEADER */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 15, alignItems: 'center' }}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {book.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {book.author}
              </Text>
            </View>

            {/* Font adjust buttons */}
            <View style={styles.fontControls}>
              <TouchableOpacity onPress={() => setFontSize(prev => Math.max(12, prev - 2))} style={styles.iconBtn}>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFontSize(prev => Math.min(24, prev + 2))} style={styles.iconBtn}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* QUICK TOP NAVIGATION */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={handlePrevPage}
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSecondary }}
            >
              <IconSymbol name="chevron.left" size={18} color={colors.primary} />
            </TouchableOpacity>

            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 }}>
              {lang === 'es' ? `PÁGINA ${currentPage} DE ${book.total_pages}` : `PAGE ${currentPage} OF ${book.total_pages}`}
            </Text>

            <TouchableOpacity
              onPress={handleNextPage}
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSecondary }}
            >
              <IconSymbol name="chevron.right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* MAIN PAGE VIEWPORT */}
          <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
            ) : (
              <View style={[styles.pageContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={{ color: colors.textPrimary, fontSize, lineHeight: fontSize * 1.6, textAlign: 'justify' }}>
                  {chunks.length > 0 ? (
                    chunks.map((chunk, idx) => {
                      const isActive = isSpeaking && activeChunkIndex === idx;
                      const isPaused = !isSpeaking && activeChunkIndex === idx && activeChunkIndex > 0;
                      return (
                        <Text
                          key={idx}
                          onPress={() => handleParagraphPress(idx)}
                          style={isActive ? {
                            color: colors.primary,
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(125, 132, 168, 0.18)',
                          } : isPaused ? {
                            color: colors.textSecondary,
                            textDecorationLine: 'underline',
                          } : undefined}
                        >
                          {chunk}{' '}
                        </Text>
                      );
                    })
                  ) : (
                    pageText
                  )}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* NARRATOR OVERLAY CONTROLS (Floating waveform-like play/pause button) */}
          <View style={[styles.narratorBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.ttsBtn, { backgroundColor: isSpeaking ? '#ff3b30' : colors.primary }]}
              onPress={toggleSpeech}
            >
              <IconSymbol name={isSpeaking ? "pause.fill" : "waveform"} size={22} color="#FFF" />
              <Text style={styles.ttsBtnText}>
                {isSpeaking
                  ? (lang === 'es' ? 'DETENER VOZ' : 'STOP VOICE')
                  : (lang === 'es' ? 'LEER EN VOZ ALTA' : 'READ ALOUD')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* NAVIGATION FOOTER */}
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              style={[styles.navBtn, currentPage <= 1 && { opacity: 0.3 }]}
            >
              <IconSymbol name="arrow.left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.pageIndicator}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {lang === 'es' ? 'Pág.' : 'Page'}
              </Text>
              <TextInput
                style={[styles.pageInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                value={inputPage}
                onChangeText={setInputPage}
                keyboardType="numeric"
                onSubmitEditing={handleJumpToPage}
                onBlur={handleJumpToPage}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                / {book.total_pages}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextPage}
              disabled={currentPage >= book.total_pages || loading}
              style={[styles.navBtn, currentPage >= book.total_pages && { opacity: 0.3 }]}
            >
              <IconSymbol name="arrow.right" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
    padding: 16,
  },
  pageContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 300,
  },
  narratorBar: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  ttsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ttsBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageInput: {
    width: 45,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
  }
});

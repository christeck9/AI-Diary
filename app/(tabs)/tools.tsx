import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal, StatusBar, Animated, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate } from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { KebabMenuOverlay } from '../../components/KebabMenuOverlay';
import { useSQLiteContext } from 'expo-sqlite';

const MatrixRain = React.lazy(() => import('@/components/MatrixRain').then(m => ({ default: m.MatrixRain })));
import { IconSymbol } from '../../components/ui/icon-symbol';
// openlibrary and wikipedia dynamically imported
import * as FileSystem from 'expo-file-system';
// expo-print and expo-sharing dynamically imported
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useLlmState, useLlmActions } from '../../contexts/LlmContext';

import { settingsService } from '../../lib/SettingsService';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTodos } from '../../hooks/useTodos';
import { MarqueeText } from '../../components/ui/MarqueeText';
import { useGlobalModals } from '../../contexts/GlobalModalsContext';
const InteractiveCalendar = React.lazy(() => import('../../components/ui/InteractiveCalendar').then(m => ({ default: m.InteractiveCalendar })));

import * as DocumentPicker from 'expo-document-picker';
import type { LibraryBook, SearchResult } from '../../lib/LibraryManagerService';
const BookReaderModal = React.lazy(() => import('../../components/modals/BookReaderModal').then(m => ({ default: m.BookReaderModal })));


export default function ToolsScreen() {
  const { colors, activeTheme } = useAppTheme();
  const { lang, t, setLang } = useLanguage();
  const router = useRouter();
  const { voice } = useVoiceContext();
  const { status, activeModel } = useLlmState();
  const { generateStreamingResponse, llamaContextRef, generateEmbeddings } = useLlmActions();
  const db = useSQLiteContext();
  const { openModal } = useGlobalModals();

  // --- LIBRARY & DOWNLOAD CENTER STATE ---
  const [libActiveTab, setLibActiveTab] = useState<'search' | 'library'>('search');
  const [libSearchSource, setLibSearchSource] = useState<'arxiv' | 'openlibrary'>('arxiv');
  const [libQuery, setLibQuery] = useState('');
  const [libSearchResults, setLibSearchResults] = useState<SearchResult[]>([]);
  const [isLibSearching, setIsLibSearching] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [isReaderVisible, setIsReaderVisible] = useState(false);
  const [indexingBookId, setIndexingBookId] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState({ current: 0, total: 0 });

  const loadLibrary = useCallback(async () => {
    if (db) {
      const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
      const books = await LibraryManagerService.getBooks(db);
      setLibraryBooks(books);
    }
  }, [db]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary])
  );

  const handleLibrarySearch = async () => {
    if (!libQuery.trim()) return;
    setIsLibSearching(true);
    setLibSearchResults([]);
    try {
      let results: SearchResult[] = [];
      const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
      if (libSearchSource === 'arxiv') {
        results = await LibraryManagerService.searchArXiv(libQuery);
      } else {
        results = await LibraryManagerService.searchOpenLibrary(libQuery);
      }
      setLibSearchResults(results);
      if (results.length === 0) {
        Alert.alert(
          lang === 'es' ? 'Sin resultados' : 'No results',
          lang === 'es' ? 'No se encontraron libros para esta búsqueda.' : 'No books found matching this query.'
        );
      }
    } catch (e) {
      console.log(e);
      Alert.alert(lang === 'es' ? 'Error' : 'Error', lang === 'es' ? 'Error al buscar en la biblioteca.' : 'Error searching the library.');
    } finally {
      setIsLibSearching(false);
    }
  };

  const handleDownloadBook = async (item: SearchResult) => {
    if (!db) return;
    setDownloadingUrl(item.pdfUrl);
    setDownloadProgress(0);
    try {
      const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
      const book = await LibraryManagerService.downloadBook(
        db,
        item.title,
        item.author,
        item.year,
        item.pdfUrl,
        (progress) => setDownloadProgress(progress)
      );
      if (book) {
        Alert.alert(
          lang === 'es' ? '¡Descarga Exitosa!' : 'Download Complete!',
          lang === 'es' ? `"${item.title}" se agregó a tu biblioteca.` : `"${item.title}" added to your library.`
        );
        loadLibrary();
        setLibActiveTab('library');
      } else {
        Alert.alert(lang === 'es' ? 'Error' : 'Error', lang === 'es' ? 'No se pudo descargar el archivo PDF.' : 'Failed to download PDF.');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setDownloadingUrl(null);
    }
  };

  const handleImportLocal = async () => {
    if (!db) return;
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      if (pickerResult.canceled || !pickerResult.assets) return;

      const asset = pickerResult.assets[0];
      const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
      const book = await LibraryManagerService.importLocalPdf(db, asset.uri, asset.name);
      if (book) {
        Alert.alert(
          lang === 'es' ? 'Importación Exitosa' : 'Import Complete',
          lang === 'es' ? `"${book.title}" se cargó en la biblioteca.` : `"${book.title}" loaded to the library.`
        );
        loadLibrary();
        setLibActiveTab('library');
      }
    } catch (e) {
      console.log(e);
      Alert.alert(lang === 'es' ? 'Error' : 'Error', lang === 'es' ? 'No se pudo importar el archivo local.' : 'Failed to import local file.');
    }
  };

  const handleIndexBook = async (bookId: string) => {
    if (!db) return;
    if (!generateEmbeddings) {
      Alert.alert(
        lang === 'es' ? 'Modelo no listo' : 'Model not ready',
        lang === 'es' ? 'El modelo de vectorización no está cargado.' : 'The embedding vector model is not loaded.'
      );
      return;
    }

    Alert.alert(
      lang === 'es' ? 'Indexar con IA' : 'Index with AI',
      lang === 'es'
        ? 'Esto dividirá el libro e insertará fragmentos vectorizados en la memoria de la IA. Puede tomar un momento. ¿Deseas continuar?'
        : 'This will chunk and vectorise the book for the AI. This process takes a moment. Do you want to continue?',
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'Comenzar' : 'Start',
          onPress: async () => {
            setIndexingBookId(bookId);
            setIndexingProgress({ current: 0, total: 0 });
            try {
              const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
              const success = await LibraryManagerService.indexBook(
                db,
                bookId,
                generateEmbeddings,
                (curr, tot) => setIndexingProgress({ current: curr, total: tot })
              );
              if (success) {
                Alert.alert(
                  lang === 'es' ? 'Indexación Completa' : 'Indexing Complete',
                  lang === 'es' ? 'El libro ya está accesible por la IA en tus conversaciones.' : 'The book is now accessible by the AI in your chats.'
                );
                loadLibrary();
              }
            } catch (e) {
              console.log(e);
              Alert.alert(lang === 'es' ? 'Error' : 'Error', lang === 'es' ? 'Error al indexar el libro.' : 'Failed to index the book.');
            } finally {
              setIndexingBookId(null);
            }
          }
        }
      ]
    );
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!db) return;
    Alert.alert(
      lang === 'es' ? 'Eliminar libro' : 'Delete book',
      lang === 'es' ? '¿Estás seguro de eliminar este libro y su memoria de la IA?' : 'Are you sure you want to delete this book and its AI memory?',
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'Eliminar' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { LibraryManagerService } = await import('../../lib/LibraryManagerService');
            const success = await LibraryManagerService.deleteBook(db, bookId);
            if (success) {
              loadLibrary();
            }
          }
        }
      ]
    );
  };



  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [kebabMenuTop, setKebabMenuTop] = useState(Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 70 : 85);
  const kebabTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopKebabTimer = () => {
    if (kebabTimerRef.current) {
      clearTimeout(kebabTimerRef.current);
      kebabTimerRef.current = null;
    }
  };

  const startKebabTimer = () => {
    stopKebabTimer();
    kebabTimerRef.current = setTimeout(() => {
      setShowKebabMenu(false);
    }, 5000);
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiResults, setWikiResults] = useState('');
  const [wikiLlmExplanation, setWikiLlmExplanation] = useState('');
  const [isWikiLoading, setIsWikiLoading] = useState(false);
  const [isLlmLoading, setIsLlmLoading] = useState(false);

  // --- TO-DO LIST STATE ---
  const { todos, addTodo, removeTodo } = useTodos();
  const [todoText, setTodoText] = useState('');
  const [todoDate, setTodoDate] = useState<Date | null>(null);
  const [todoTime, setTodoTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // --- RECURRING TASKS STATE ---
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);
  const [presetKey, setPresetKey] = useState('ai_news');
  const [customQuery, setCustomQuery] = useState('');
  const [intervalVal, setIntervalVal] = useState('daily');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);

  const loadRecurringTasks = useCallback(async () => {
    if (!db) return;
    try {
      const rows = await db.getAllAsync("SELECT * FROM recurring_tasks ORDER BY created_at DESC");
      setRecurringTasks(rows);
    } catch (e) {
      console.error('[RECURRING_TASKS] Error loading tasks:', e);
    }
  }, [db]);

  const handleAddRecurringTask = async () => {
    if (!db) return;
    let title = '';
    if (presetKey === 'ai_news') {
      title = lang === 'es' ? 'Noticias de IA del día' : 'Daily AI News';
    } else if (presetKey === 'finance_news') {
      title = lang === 'es' ? 'Reseña de Finanzas semanal' : 'Weekly Finance Review';
    } else if (presetKey === 'stock_tracker') {
      if (!customQuery.trim()) {
        Alert.alert(
          lang === 'es' ? 'Símbolo requerido' : 'Ticker required',
          lang === 'es' ? 'Por favor introduce el ticker de la acción (Ej. AAPL).' : 'Please enter the stock ticker (e.g. AAPL).'
        );
        return;
      }
      title = `${lang === 'es' ? 'Seguir Acción:' : 'Track Stock:'} ${customQuery.trim().toUpperCase()}`;
    } else if (presetKey === 'crypto_tracker') {
      if (!customQuery.trim()) {
        Alert.alert(
          lang === 'es' ? 'Moneda requerida' : 'Crypto ticker required',
          lang === 'es' ? 'Por favor introduce el ticker de la criptomoneda (Ej. BTC, ETH).' : 'Please enter the cryptocurrency ticker (e.g. BTC, ETH).'
        );
        return;
      }
      title = `${lang === 'es' ? 'Seguir Criptomoneda:' : 'Track Crypto:'} ${customQuery.trim().toUpperCase()}`;
    } else if (presetKey === 'mood_wellbeing') {
      title = lang === 'es' ? 'Análisis de Humor y Bienestar' : 'Mood & Wellbeing Analysis';
    } else if (presetKey === 'goal_progress') {
      title = lang === 'es' ? 'Progreso de Objetivos y Hábitos' : 'Goal & Habit Progress Tracker';
    } else if (presetKey === 'reading_learning') {
      title = lang === 'es' ? 'Resumen de Lecturas y Aprendizaje' : 'Reading & Learning Summary';
    } else {
      if (!customQuery.trim()) {
        Alert.alert(
          lang === 'es' ? 'Consulta requerida' : 'Query required',
          lang === 'es' ? 'Por favor introduce una consulta para la tarea repetitiva.' : 'Please enter a custom query.'
        );
        return;
      }
      title = customQuery.trim();
    }

    try {
      const id = `rec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await db.runAsync(
        "INSERT INTO recurring_tasks (id, title, preset_key, custom_query, interval_val, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, title, presetKey, (presetKey === 'custom' || presetKey === 'stock_tracker' || presetKey === 'crypto_tracker') ? customQuery.trim() : null, intervalVal, Date.now()]
      );

      // Auto-generar un reporte inicial crudo simulado / descargado inmediatamente de bajo procesamiento
      const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      let dummyContent = '';
      if (presetKey === 'ai_news') {
        dummyContent = `[AI News Report - ${new Date().toLocaleDateString()}]\n- OpenAI announced GPT-5 development progress.\n- DeepMind released AlphaFold 3 source code.\n- Anthropic updated Claude 3.5 Sonnet context window capabilities.`;
      } else if (presetKey === 'finance_news') {
        dummyContent = `[Weekly Finance Report - ${new Date().toLocaleDateString()}]\n- S&P 500 reached a new all-time high.\n- Fed signal rates will remain unchanged for the next quarter.\n- Technology stocks led the weekly market rally.`;
      } else if (presetKey === 'stock_tracker') {
        const ticker = customQuery.trim().toUpperCase();
        dummyContent = `[Stock Market Report: ${ticker} - ${new Date().toLocaleDateString()}]\n- ${ticker} closed at $${(Math.random() * 200 + 100).toFixed(2)} (+${(Math.random() * 4).toFixed(2)}%).\n- Trading volume was slightly above the 30-day average.\n- Key resistance levels identified around the 50-day moving average.`;
      } else if (presetKey === 'crypto_tracker') {
        const coin = customQuery.trim().toUpperCase();
        dummyContent = `[Cryptocurrency Report: ${coin} - ${new Date().toLocaleDateString()}]\n- ${coin} price is currently trading at $${coin === 'BTC' ? (60000 + Math.random() * 5000).toFixed(2) : coin === 'ETH' ? (3200 + Math.random() * 300).toFixed(2) : (50 + Math.random() * 20).toFixed(2)}.\n- 24-hour trading volume shows dynamic accumulation activity.\n- Network difficulty and hash rate remain stable at peak efficiency levels.`;
      } else if (presetKey === 'mood_wellbeing') {
        dummyContent = `[Mood & Wellbeing Report - ${new Date().toLocaleDateString()}]\n- El usuario mostró patrones estables de sueño esta semana.\n- Frecuencia cardíaca promedio en reposo normal (72 lpm).\n- Niveles de actividad moderada pero menor estrés reportado el miércoles.`;
      } else if (presetKey === 'goal_progress') {
        dummyContent = `[Goal Progress Tracker - ${new Date().toLocaleDateString()}]\n- Hábito de lectura de 20 minutos completado en un 80%.\n- Ejercicio físico: 3 de 4 sesiones semanales completadas.\n- Objetivo de aprendizaje de idiomas: Pendiente revisar vocabulario de la lección 4.`;
      } else if (presetKey === 'reading_learning') {
        dummyContent = `[Reading & Learning Summary - ${new Date().toLocaleDateString()}]\n- Leído: "Hábitos Atómicos", Capítulos 4 y 5.\n- Conceptos clave: Señales visuales y diseño del entorno para cambiar conductas.\n- Nota de estudio: Facilitar las señales para los buenos hábitos y ocultar las malas.`;
      } else {
        dummyContent = `[Custom Report: ${title} - ${new Date().toLocaleDateString()}]\n- Recopilando datos recientes sobre: ${title}...\n- Se encontraron 3 artículos relevantes de fuentes públicas.`;
      }

      await db.runAsync(
        "INSERT INTO pending_reports (id, task_id, raw_content, is_processed, created_at) VALUES (?, ?, ?, ?, ?)",
        [reportId, id, dummyContent, 0, Date.now()]
      );

      setCustomQuery('');
      await loadRecurringTasks();
      Alert.alert(
        lang === 'es' ? 'Tarea Creada' : 'Task Created',
        lang === 'es' ? 'Se ha configurado la tarea repetitiva con éxito.' : 'Recurring task successfully configured.'
      );
    } catch (e) {
      console.error('[RECURRING_TASKS] Error adding task:', e);
    }
  };

  const handleDeleteRecurringTask = async (id: string) => {
    if (!db) return;
    try {
      await db.runAsync("DELETE FROM recurring_tasks WHERE id = ?", [id]);
      await loadRecurringTasks();
    } catch (e) {
      console.error('[RECURRING_TASKS] Error deleting task:', e);
    }
  };

  const handleAddTodo = async () => {
    if (!todoText.trim()) return;
    const dateStr = todoDate ? todoDate.toLocaleDateString() : null;
    const timeStr = todoTime ? todoTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    await addTodo(todoText, dateStr, timeStr);
    setTodoText('');
    setTodoDate(null);
    setTodoTime(null);
  };

  // --- DICTATION TOOL STATE ---
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isExportReady, setIsExportReady] = useState(false);
  const exportAnim = useRef(new Animated.Value(0)).current;
  const exportTimerRef = useRef<NodeJS.Timeout | null>(null);

  const exportTextColor = exportAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFF', '#ff3b30'] // White to Red text
  });

  const triggerExportFlash = () => {
    if (dictationText && dictationText.trim().length > 0) {
      setIsExportReady(true);
      exportAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(exportAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(exportAnim, { toValue: 0, duration: 500, useNativeDriver: false })
        ])
      ).start();

      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      exportTimerRef.current = setTimeout(() => {
        exportAnim.stopAnimation();
        exportAnim.setValue(0);
        setIsExportReady(false);
      }, 10000);
    }
  };

  // Dictation Overlay Reanimated Values
  const ringScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isDictating) {
      buttonScale.value = withTiming(1.1, { duration: 150 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800 }),
          withTiming(1.0, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      buttonScale.value = withTiming(1.0, { duration: 150 });
      ringScale.value = 1;
    }
  }, [isDictating]);

  const animatedRingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ringScale.value }],
      opacity: interpolate(ringScale.value, [1, 1.4], [0.6, 0.0]),
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleDictationPressIn = async () => {
    setIsDictating(true);
    setIsEditing(false); // Disable manual editing while recording
    setIsExportReady(false);
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);

    // Use the optimized interactive voice parameters defined by the system
    await voice.startListening(
      undefined,
      (finalText) => {
        setDictationText((prev) => {
          const current = prev.trim();
          return current ? `${current} ${finalText}` : finalText;
        });
        setIsDictating(false);
      },
      undefined
    );
  };

  const handleDictationPressOut = async () => {
    setIsDictating(false);
    await voice.stopListening();
  };

  const copyDictationToClipboard = async () => {
    const textToCopy = isDictating ? voice.transcript : dictationText;
    if (textToCopy && textToCopy.trim()) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert(lang === 'es' ? 'Copiado' : 'Copied', lang === 'es' ? 'Texto copiado al portapapeles' : 'Text copied to clipboard');
    }
  };

  const handleExportDictationPdf = async () => {
    const textToExport = dictationText || voice.transcript;
    if (!textToExport || !textToExport.trim()) return;

    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              h1 { color: #5c84a8; border-bottom: 2px solid #5c84a8; padding-bottom: 10px; margin-bottom: 30px; }
              .content { font-size: 16px; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${lang === 'es' ? 'Transcripción de Dictado' : 'Dictation Transcript'}</h1>
            <div class="content">${escapeHtml(textToExport)}</div>
          </body>
        </html>
      `;
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };



  const [hasBraveKey, setHasBraveKey] = useState(false);

  const checkBraveKey = useCallback(async () => {
    try {
      const key = await SecureStore.getItemAsync('brave_search_api_key');
      if (key && key.trim()) {
        setHasBraveKey(true);
        return;
      }
      const settings = await settingsService.get();
      if (settings.braveApiKey && settings.braveApiKey.trim()) {
        setHasBraveKey(true);
        return;
      }
      setHasBraveKey(false);
    } catch (e) {
      setHasBraveKey(false);
    }
  }, []);

  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useFocusEffect(
    useCallback(() => {
      const handleFocus = async () => {
        console.log('[TOOLS] Tab focused. Releasing main voice resources...');
        checkBraveKey();
        loadRecurringTasks();
        if (voiceRef.current) {
          try { await voiceRef.current.stopSpeaking(); } catch (_) { }
          try { await voiceRef.current.stopListening(); } catch (_) { }
          // Pause to let native threads release mic
          await new Promise(resolve => setTimeout(resolve, 300));
          try { await voiceRef.current.releaseResources(); } catch (_) { }
        }
      };

      handleFocus();

      return () => {
        console.log('[TOOLS] Tab blurred. Releasing speech resources...');
      };
    }, [checkBraveKey, loadRecurringTasks])
  );

  useEffect(() => {
    checkBraveKey();
    loadRecurringTasks();
  }, [checkBraveKey, loadRecurringTasks]);

  const escapeHtml = (unsafe: string) => {
    return (unsafe || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handleConsult = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResults('');
    try {
      const { consultCodex } = await import('../../lib/openlibrary');
      const data = await consultCodex(query);
      if (data) {
        setResults(data);
      } else {
        setResults(lang === 'es' ? 'No se hallaron registros en la Bóveda para este término.' : 'No records found in the Vault for this term.');
      }
    } catch (e) {
      setResults(lang === 'es' ? 'Error en la conexión con la Gran Biblioteca.' : 'Error connecting to the Grand Library.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWikiSearch = async () => {
    if (!wikiQuery.trim()) return;
    setIsWikiLoading(true);
    setWikiResults('');
    setWikiLlmExplanation('');
    try {
      const { wikipediaSearch } = await import('../../lib/wikipedia');
      const data = await wikipediaSearch(wikiQuery, lang);
      if (data) {
        setWikiResults(data);
      } else {
        setWikiResults(lang === 'es' ? 'No se hallaron registros en Wikipedia para este término.' : 'No records found in Wikipedia for this term.');
      }
    } catch (e) {
      setWikiResults(lang === 'es' ? 'Error en la conexión con Wikipedia.' : 'Error connecting to Wikipedia.');
    } finally {
      setIsWikiLoading(false);
    }
  };

  const handleWikiLlmExplain = async () => {
    if (!wikiResults || !llamaContextRef.current) return;
    setIsLlmLoading(true);
    setWikiLlmExplanation('');

    const prompt = lang === 'es'
      ? `Basándote en el siguiente artículo de Wikipedia, explícame brevemente el término de manera amigable y resumida:\n\n${wikiResults}`
      : `Based on the following Wikipedia article, explain this term to me briefly and in a friendly, summarized way:\n\n${wikiResults}`;

    try {
      await generateStreamingResponse(
        prompt,
        (token) => {
          setWikiLlmExplanation((prev) => prev + token);
        },
        (error) => {
          Alert.alert(lang === 'es' ? 'Error de la IA' : 'AI Error', error);
        }
      );
    } catch (e: any) {
      Alert.alert(lang === 'es' ? 'Error de la IA' : 'AI Error', e?.message || String(e));
    } finally {
      setIsLlmLoading(false);
    }
  };


  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && (
          <React.Suspense fallback={null}>
            <MatrixRain />
          </React.Suspense>
        )}

        <View style={{ zIndex: 100 }}>
          <SanctuaryHeader
            showVoiceIcon={false}
            activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
            showKebabMenu={showKebabMenu}
            onKebabPress={(calculatedTop) => {
              if (calculatedTop !== undefined) {
                setKebabMenuTop(calculatedTop);
              }
              const next = !showKebabMenu;
              setShowKebabMenu(next);
              if (next) startKebabTimer();
              else stopKebabTimer();
            }}
            onKebabAction={(action) => {
              if (action === 'clear') {
                Alert.alert(
                  lang === 'es' ? 'Acción no disponible' : 'Action not available',
                  lang === 'es'
                    ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                    : 'Chat history can only be cleared from the main tab.'
                );
              } else {
                openModal(action as any);
              }
            }}

          />
        </View>



        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, zIndex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent
            ]}
          >
            <View style={styles.content}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                letterSpacing: 2,
                color: colors.primary,
                textAlign: 'center',
                marginBottom: 20,
                marginTop: 5,
              }}>
                {lang === 'es' ? 'HERRAMIENTAS PRIVADAS (OFF-LINE/ANONIMOUS)' : 'PRIVATE TOOLS (OFF-LINE/ANONIMOUS)'}
              </Text>

              {/* TO-DO LIST CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="list.bullet.clipboard.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'PENDIENTES / OBJETIVOS' : 'TO-DO LISTS / OBJECTIVES'}
                  </Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 10 }]}
                    placeholder={lang === 'es' ? 'Añadir nota...' : 'Add note...'}
                    placeholderTextColor={colors.textSecondary}
                    value={todoText}
                    onChangeText={setTodoText}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.button, { flex: 1, height: 40, backgroundColor: todoDate ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.buttonText, { fontSize: 12, color: todoDate ? '#000' : colors.textPrimary }]}>
                        📅 {todoDate ? todoDate.toLocaleDateString() : 'TARGET DATE'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, { flex: 1, height: 40, backgroundColor: todoTime ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={[styles.buttonText, { fontSize: 12, color: todoTime ? '#000' : colors.textPrimary }]}>
                        ⏰ {todoTime ? todoTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TARGET TIME'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={todoDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setTodoDate(selectedDate);
                      }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={todoTime || new Date()}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) setTodoTime(selectedDate);
                      }}
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.vaultButtonGreen, { paddingVertical: 12, marginBottom: 0, opacity: todoText ? 1 : 0.5 }]}
                    onPress={handleAddTodo}
                    disabled={!todoText}
                  >
                    <Text style={styles.vaultButtonText}>{lang === 'es' ? 'HECHO / AÑADIR' : 'ADD NOTE'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Tareas */}
                {todos.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 10 }}>
                    {todos.map(todo => (
                      <View key={todo.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flex: 1, overflow: 'hidden' }}>
                          <MarqueeText text={todo.text} style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }} duration={10000} />
                          {(todo.target_date || todo.target_time) && (
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                              {todo.target_date || ''} {todo.target_time || ''}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: colors.border }}
                          onPress={() => removeTodo(todo.id)}
                        >
                          <IconSymbol name="checkmark.circle.fill" size={18} color="#7da885" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* DOWNLOAD CENTER & LIBRARY CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="books.vertical.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'BIBLIOTECA: DESCARGA/ESCUCHA LIBROS' : 'LIBRARY: DOWNLOAD/LISTEN BOOKS'}
                  </Text>
                </View>

                {/* Tab selector */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: libActiveTab === 'search' ? 2 : 0, borderBottomColor: colors.primary }}
                    onPress={() => setLibActiveTab('search')}
                  >
                    <Text style={{ color: libActiveTab === 'search' ? colors.primary : colors.textSecondary, fontWeight: 'bold', fontSize: 13 }}>
                      {lang === 'es' ? 'Descargar PDFs' : 'Download PDFs'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: libActiveTab === 'library' ? 2 : 0, borderBottomColor: colors.primary }}
                    onPress={() => { setLibActiveTab('library'); loadLibrary(); }}
                  >
                    <Text style={{ color: libActiveTab === 'library' ? colors.primary : colors.textSecondary, fontWeight: 'bold', fontSize: 13 }}>
                      {lang === 'es' ? `Lee PDFs (${libraryBooks.length})` : `Read PDFs (${libraryBooks.length})`}
                    </Text>
                  </TouchableOpacity>
                </View>

                {libActiveTab === 'search' ? (
                  <View>
                    {/* Source selector */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: libSearchSource === 'arxiv' ? colors.primary : 'transparent' }}
                        onPress={() => setLibSearchSource('arxiv')}
                      >
                        <Text style={{ color: libSearchSource === 'arxiv' ? (activeTheme === 'light' ? '#FFF' : '#000') : colors.textSecondary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' }}>
                          {lang === 'es' ? 'Artículos (IA/Ciencia)' : 'Science & AI Articles'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: libSearchSource === 'openlibrary' ? colors.primary : 'transparent' }}
                        onPress={() => setLibSearchSource('openlibrary')}
                      >
                        <Text style={{ color: libSearchSource === 'openlibrary' ? (activeTheme === 'light' ? '#FFF' : '#000') : colors.textSecondary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' }}>
                          {lang === 'es' ? 'Libros Clásicos' : 'Classic Books'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                      <View style={{ marginRight: 12, justifyContent: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5, lineHeight: 12 }}>Keyword</Text>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5, lineHeight: 12 }}>Book</Text>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5, lineHeight: 12 }}>Author</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 0 }]}
                        placeholder={lang === 'es' ? 'Buscar...' : 'Search...'}
                        placeholderTextColor={colors.textSecondary}
                        value={libQuery}
                        onChangeText={setLibQuery}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary, flex: 1, width: 'auto' }]}
                        onPress={handleLibrarySearch}
                        disabled={isLibSearching}
                      >
                        {isLibSearching ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {lang === 'es' ? 'BUSCAR' : 'SEARCH'}
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.secondary, flex: 1.3, width: 'auto' }]}
                        onPress={handleImportLocal}
                      >
                        <Text style={[styles.buttonText, { fontSize: 13 }]}>
                          {lang === 'es' ? 'SUBIR TU PDF' : 'ADD YOUR PDF'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Search Results */}
                    {libSearchResults.length > 0 && (
                      <View style={{ marginTop: 20, gap: 12 }}>
                        {libSearchResults.map((item) => (
                          <View key={item.id} style={{ padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                              {item.author} ({item.year})
                            </Text>
                            <TouchableOpacity
                              style={{
                                marginTop: 8,
                                paddingVertical: 6,
                                borderRadius: 6,
                                backgroundColor: colors.primary,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onPress={() => handleDownloadBook(item)}
                              disabled={downloadingUrl !== null}
                            >
                              {downloadingUrl === item.pdfUrl ? (
                                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 11 }}>
                                  {lang === 'es' ? `Descargando... ${downloadProgress}%` : `Downloading... ${downloadProgress}%`}
                                </Text>
                              ) : (
                                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 11 }}>
                                  {lang === 'es' ? 'DESCARGAR PDF' : 'DOWNLOAD PDF'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    {/* Library List */}
                    {libraryBooks.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginVertical: 30 }}>
                        {lang === 'es' ? 'Tu biblioteca está vacía. Descarga o importa PDFs para comenzar.' : 'Your library is empty. Download or import PDFs to start.'}
                      </Text>
                    ) : (
                      <View style={{ gap: 15 }}>
                        {libraryBooks.map((book) => {
                          const progress = book.total_pages > 0 ? (book.last_read_page / book.total_pages) : 0;
                          return (
                            <View key={book.id} style={{ padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: colors.border }}>
                              <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>
                                {book.title}
                              </Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                                {book.author}
                              </Text>

                              {/* Progress bar */}
                              <View style={{ marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                    {lang === 'es' ? `Pág. ${book.last_read_page} de ${book.total_pages}` : `Page ${book.last_read_page} of ${book.total_pages}`}
                                  </Text>
                                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                    {Math.round(progress * 100)}%
                                  </Text>
                                </View>
                                <View style={{ height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                  <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: colors.primary }} />
                                </View>
                              </View>

                              {/* Action row */}
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                <TouchableOpacity
                                  style={{ flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center' }}
                                  onPress={() => { setSelectedBook(book); setIsReaderVisible(true); }}
                                >
                                  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 11 }}>
                                    {lang === 'es' ? 'LEER' : 'READ'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{ flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: book.is_indexed ? 'rgba(125, 168, 133, 0.2)' : colors.secondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: book.is_indexed ? '#7da885' : 'transparent' }}
                                  onPress={() => handleIndexBook(book.id)}
                                  disabled={indexingBookId !== null}
                                >
                                  {indexingBookId === book.id ? (
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 10 }}>
                                      {indexingProgress.current}/{indexingProgress.total}
                                    </Text>
                                  ) : book.is_indexed ? (
                                    <Text style={{ color: '#7da885', fontWeight: 'bold', fontSize: 11 }}>
                                      ✓ {lang === 'es' ? 'IA LISTA' : 'AI READY'}
                                    </Text>
                                  ) : (
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 11 }}>
                                      {lang === 'es' ? 'INDEXAR IA' : 'AI INDEX'}
                                    </Text>
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{ width: 36, borderRadius: 6, backgroundColor: '#ff4444', alignItems: 'center', justifyContent: 'center' }}
                                  onPress={() => handleDeleteBook(book.id)}
                                >
                                  <IconSymbol name="trash" size={14} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* WIKIPEDIA VAULT CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="globe" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'BUSCA TÓPICOS DE WIKIPEDIA GRATIS' : 'SEARCH WIKIPEDIA TOPICS'}
                  </Text>
                </View>

                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder={lang === 'es' ? 'Buscar en Wikipedia...' : 'Search Wikipedia...'}
                  placeholderTextColor={colors.textSecondary}
                  value={wikiQuery}
                  onChangeText={setWikiQuery}
                />

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleWikiSearch}
                  disabled={isWikiLoading}
                >
                  {isWikiLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {lang === 'es' ? 'CONSULTAR WIKIPEDIA' : 'CONSULT WIKIPEDIA'}
                    </Text>
                  )}
                </TouchableOpacity>

                {wikiResults !== '' && (
                  <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary }]}>
                    <Text style={styles.resultsText}>{wikiResults}</Text>

                    {/* LLM Explanation Section */}
                    <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 }}>
                      {llamaContextRef.current ? (
                        <TouchableOpacity
                          style={[styles.button, { backgroundColor: colors.secondary, height: 40, borderRadius: 8 }]}
                          onPress={handleWikiLlmExplain}
                          disabled={isLlmLoading}
                        >
                          {isLlmLoading ? (
                            <ActivityIndicator color="#FFF" />
                          ) : (
                            <Text style={[styles.buttonText, { fontSize: 13 }]}>
                              🧠 {lang === 'es' ? 'EXPLICAR CON IA LOCAL' : 'EXPLAIN W/ LOCAL AI'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
                          ℹ️ {lang === 'es'
                            ? 'Carga un modelo de IA en la pestaña Diario para habilitar la explicación con IA.'
                            : 'Load an AI model in the Diary tab to enable AI explanation.'}
                        </Text>
                      )}

                      {wikiLlmExplanation !== '' && (
                        <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>
                            {lang === 'es' ? 'Interpretación de la IA:' : 'AI Interpretation:'}
                          </Text>
                          <Text style={{ color: colors.textPrimary, fontSize: 13, lineHeight: 18 }}>
                            {wikiLlmExplanation}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* DICTATION TOOL CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="waveform" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'HERRAMIENTA DE DICTADO' : 'DICTATION TOOL'}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: -12, marginBottom: 15, lineHeight: 16 }}>
                  {lang === 'es' 
                    ? 'Con el micrófono, habla y conviértelo a texto, se guarda en memoria y lo puedes pegar fuera de la aplicación o crea un PDF con tu dictado.' 
                    : 'With the microphone, speak and convert it to text. It is saved in memory and you can paste it outside the application or create a PDF with your dictation.'}
                </Text>

                {/* DICTATION TOOL EXTERNAL CARD (Simplified) */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                  <TouchableOpacity
                    style={[styles.vaultButtonBlue, { flex: 1, marginBottom: 0 }]}
                    onPress={() => setIsOverlayVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.vaultButtonText}>
                      {lang === 'es' ? 'DICTAR' : 'DICTATE'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.vaultButtonBlue, { flex: 1, marginBottom: 0, backgroundColor: dictationText ? (isExportReady ? colors.surfaceSecondary : '#5c84a8') : 'rgba(92, 132, 168, 0.4)' }]}
                    onPress={handleExportDictationPdf}
                    disabled={!dictationText}
                    activeOpacity={0.8}
                  >
                    <Animated.Text style={[styles.vaultButtonText, { color: isExportReady ? exportTextColor : '#FFF' }]}>
                      {lang === 'es' ? 'EXPORTAR A PDF' : 'EXPORT TO PDF'}
                    </Animated.Text>
                  </TouchableOpacity>
                </View>
              </View>



              {/* AUTOMATIONS / RECURRING TASKS CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="timer" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'AUTOMATIZACIONES / TAREAS REPETITIVAS' : 'AUTOMATIONS / RECURRING TASKS'}
                  </Text>
                </View>

                <View style={{ marginBottom: 15, zIndex: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                    {lang === 'es' ? 'SUGERENCIA / TAREA' : 'SUGGESTION / TASK'}
                  </Text>

                  {/* Custom Dropdown for Suggestion presets */}
                  <TouchableOpacity
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 5, justifyContent: 'center' }]}
                    onPress={() => {
                      setShowPresetDropdown(!showPresetDropdown);
                      setShowIntervalDropdown(false);
                    }}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {presetKey === 'ai_news'
                        ? (lang === 'es' ? '📰 Noticias de IA del día' : '📰 Daily AI News')
                        : presetKey === 'finance_news'
                          ? (lang === 'es' ? '📈 Reseña de Finanzas semanal' : '📈 Weekly Finance Review')
                          : presetKey === 'stock_tracker'
                            ? (lang === 'es' ? '📊 Seguir Acción / Stock' : '📊 Track a Stock / Share')
                            : presetKey === 'crypto_tracker'
                              ? (lang === 'es' ? '🪙 Seguir Criptomoneda (BTC, ETH...)' : '🪙 Track Cryptocurrency (BTC, ETH...)')
                              : presetKey === 'mood_wellbeing'
                                ? (lang === 'es' ? '🧘 Análisis de Humor y Bienestar' : '🧘 Mood & Wellbeing Analysis')
                                : presetKey === 'goal_progress'
                                  ? (lang === 'es' ? '🎯 Progreso de Objetivos y Hábitos' : '🎯 Goal & Habit Progress Tracker')
                                  : presetKey === 'reading_learning'
                                    ? (lang === 'es' ? '📚 Resumen de Lecturas y Aprendizaje' : '📚 Reading & Learning Summary')
                                    : (lang === 'es' ? '⚙️ Otro / Personalizado' : '⚙️ Other / Custom')}
                    </Text>
                  </TouchableOpacity>

                  {showPresetDropdown && (
                    <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 15 }]}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('ai_news');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '📰 Noticias de IA del día' : '📰 Daily AI News'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('finance_news');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '📈 Reseña de Finanzas semanal' : '📈 Weekly Finance Review'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('stock_tracker');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '📊 Seguir Acción / Stock' : '📊 Track a Stock / Share'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('crypto_tracker');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '🪙 Seguir Criptomoneda (BTC, ETH...)' : '🪙 Track Cryptocurrency (BTC, ETH...)'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('mood_wellbeing');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '🧘 Análisis de Humor y Bienestar' : '🧘 Mood & Wellbeing Analysis'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('goal_progress');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '🎯 Progreso de Objetivos y Hábitos' : '🎯 Goal & Habit Progress Tracker'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('reading_learning');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '📚 Resumen de Lecturas y Aprendizaje' : '📚 Reading & Learning Summary'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPresetKey('custom');
                          setShowPresetDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? '⚙️ Otro / Personalizado' : '⚙️ Other / Custom'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(presetKey === 'custom' || presetKey === 'stock_tracker' || presetKey === 'crypto_tracker') && (
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 5, marginBottom: 15 }]}
                      placeholder={presetKey === 'stock_tracker'
                        ? (lang === 'es' ? 'Ticker de Acción (Ej. AAPL, TSLA, NVDA)...' : 'Stock Ticker (e.g. AAPL, TSLA, NVDA)...')
                        : presetKey === 'crypto_tracker'
                          ? (lang === 'es' ? 'Criptomoneda (Ej. BTC, ETH, SOL)...' : 'Cryptocurrency (e.g. BTC, ETH, SOL)...')
                          : (lang === 'es' ? '¿Qué quieres que busque? (Ej. Clima local)...' : 'What do you want to research? (e.g. Local weather)...')}
                      placeholderTextColor={colors.textSecondary}
                      value={customQuery}
                      onChangeText={setCustomQuery}
                    />
                  )}

                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 6, marginTop: 5 }}>
                    {lang === 'es' ? 'INTERVALO DE REPETICIÓN' : 'REPETITION INTERVAL'}
                  </Text>

                  {/* Interval Dropdown */}
                  <TouchableOpacity
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 5, justifyContent: 'center' }]}
                    onPress={() => {
                      setShowIntervalDropdown(!showIntervalDropdown);
                      setShowPresetDropdown(false);
                    }}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {intervalVal === 'daily'
                        ? (lang === 'es' ? 'Diario' : 'Daily')
                        : (lang === 'es' ? 'Semanal' : 'Weekly')}
                    </Text>
                  </TouchableOpacity>

                  {showIntervalDropdown && (
                    <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 15 }]}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setIntervalVal('daily');
                          setShowIntervalDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? 'Diario' : 'Daily'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setIntervalVal('weekly');
                          setShowIntervalDropdown(false);
                        }}
                      >
                        <Text style={{ color: colors.textPrimary }}>
                          {lang === 'es' ? 'Semanal' : 'Weekly'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.vaultButtonGreen, { paddingVertical: 12, marginTop: 15, marginBottom: 0 }]}
                    onPress={handleAddRecurringTask}
                  >
                    <Text style={styles.vaultButtonText}>
                      {lang === 'es' ? 'CREAR TAREA REPETITIVA' : 'CREATE RECURRING TASK'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Active Recurring Tasks List */}
                {recurringTasks.length > 0 && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 10 }}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>
                      {lang === 'es' ? 'TAREAS REPETITIVAS ACTIVAS:' : 'ACTIVE RECURRING TASKS:'}
                    </Text>
                    {recurringTasks.map(task => (
                      <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flex: 1, overflow: 'hidden' }}>
                          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                            {task.title}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                            {lang === 'es' ? 'Intervalo: ' : 'Interval: '}
                            {task.interval_val === 'daily' ? (lang === 'es' ? 'Diario' : 'Daily') : (lang === 'es' ? 'Semanal' : 'Weekly')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: '#ff4444' }}
                          onPress={() => handleDeleteRecurringTask(task.id)}
                        >
                          <IconSymbol name="trash" size={16} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* CALENDAR CARD */}
              <View style={{ width: '100%', marginTop: 20 }}>
              <React.Suspense fallback={null}>
                <InteractiveCalendar colors={colors} lang={lang as any} />
              </React.Suspense>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* DICTATION OVERLAY */}
        {isOverlayVisible && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(10, 10, 14, 0.98)', justifyContent: 'space-between', paddingVertical: 40, zIndex: 10000 }]}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 40 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: colors.primary }}>
                {lang === 'es' ? 'MODO DICTADO' : 'DICTATION MODE'}
              </Text>
              <TouchableOpacity
                style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                onPress={() => { setIsOverlayVisible(false); triggerExportFlash(); }}
              >
                <IconSymbol name="xmark" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <View style={{ flex: 1, alignItems: 'center', width: '100%', paddingHorizontal: 24, marginTop: 20 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 15, color: 'rgba(255,255,255,0.6)' }}>
                {lang === 'es'
                  ? '🎙️ Mantén presionado el botón PULSA para hablar. Usa de 3-12 palabras.'
                  : '🎙️ Press and hold the ACTIVE TALK button to speak. Use 3-12 words.'}
              </Text>

              <View style={{ width: '100%', flex: 1, marginTop: 20, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: isEditing ? colors.primary : 'rgba(255,255,255,0.1)' }}>
                <TextInput
                  style={[{ flex: 1, color: '#FFFFFF', fontSize: 18, lineHeight: 26, textAlignVertical: 'top' }, isEditing && { color: colors.primary }]}
                  multiline={true}
                  editable={isEditing}
                  value={isDictating ? (dictationText ? `${dictationText} ${voice.transcript}` : voice.transcript) : dictationText}
                  onChangeText={setDictationText}
                  placeholder={lang === 'es' ? 'El texto aparecerá aquí...' : 'Text will appear here...'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />

                {/* Overlay Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 15 }}>
                  <TouchableOpacity
                    style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: isEditing ? colors.primary : 'rgba(255,255,255,0.1)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => setIsEditing(!isEditing)}
                  >
                    <IconSymbol name="pencil" size={14} color={isEditing ? '#000' : '#FFF'} />
                    <Text style={{ color: isEditing ? '#000' : '#FFF', fontSize: 12, fontWeight: 'bold' }}>EDIT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: (dictationText || voice.transcript) ? colors.primary : 'rgba(255,255,255,0.05)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={copyDictationToClipboard}
                    disabled={!dictationText && !voice.transcript}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="doc.on.doc" size={14} color={(dictationText || voice.transcript) ? '#000' : 'rgba(255,255,255,0.2)'} />
                    <Text style={{ color: (dictationText || voice.transcript) ? '#000' : 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 'bold' }}>
                      {lang === 'es' ? 'COPIAR AL PORTAPAPELES' : 'COPY TO CLIPBOARD'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Node / Dictation Overlay Button */}
              <View style={{ height: 160, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 20 }}>
                <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                  {isDictating && (
                    <Reanimated.View style={[
                      { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 3 },
                      { borderColor: '#ff3b30' },
                      animatedRingStyle
                    ]} />
                  )}

                  <Reanimated.View style={animatedButtonStyle}>
                    <Pressable
                      onPressIn={handleDictationPressIn}
                      onPressOut={handleDictationPressOut}
                      style={({ pressed }) => [
                        { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6 },
                        {
                          borderColor: isDictating ? '#ff3b30' : colors.primary,
                          backgroundColor: pressed
                            ? 'rgba(255, 59, 48, 0.15)'
                            : 'rgba(0, 0, 0, 0.4)'
                        }
                      ]}
                    >
                      <IconSymbol
                        name="waveform"
                        size={38}
                        color={isDictating ? '#ff3b30' : colors.primary}
                      />
                      <Text style={[
                        { fontSize: 11, fontWeight: 'bold', marginTop: 6, letterSpacing: 1.5 },
                        { color: isDictating ? '#ff3b30' : 'white' }
                      ]}>
                        {isDictating
                          ? (lang === 'es' ? 'SUELTA' : 'RELEASE')
                          : (lang === 'es' ? 'PULSA' : 'ACTIVE TALK')}
                      </Text>
                    </Pressable>
                  </Reanimated.View>
                </View>
              </View>
            </View>

            {/* Footer Control */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 }}
                onPress={() => { setIsOverlayVisible(false); triggerExportFlash(); }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#07070a', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 }}>
                  {lang === 'es' ? 'SALIR DEL MODO DICTADO' : 'EXIT DICTATION MODE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </SafeAreaView>

      {/* --- GLOBAL APP MENUS OVERLAY --- */}
      <KebabMenuOverlay
        visible={showKebabMenu}
        anchorTop={kebabMenuTop}
        onClose={() => {
          setShowKebabMenu(false);
          stopKebabTimer();
        }}
        colors={colors}
        lang={lang}
        menuItems={[
          { emoji: '👤', labelEs: 'Perfil del Usuario', labelEn: 'User Profile', onPress: () => { setShowKebabMenu(false); setTimeout(() => openModal('profile'), Platform.OS === 'android' ? 100 : 0); } },
          { emoji: '👓', labelEs: 'Introducción', labelEn: 'Introduction', onPress: () => { setShowKebabMenu(false); setTimeout(() => openModal('intro'), Platform.OS === 'android' ? 100 : 0); } },
          { emoji: '🔊', labelEs: 'Configuración Voz Android', labelEn: 'Android Voice Settings', onPress: () => { setShowKebabMenu(false); setTimeout(() => openModal('voice_settings'), Platform.OS === 'android' ? 100 : 0); } },
          { emoji: '🔒', labelEs: 'Encriptación de Datos', labelEn: 'Data Encryption', onPress: () => { setShowKebabMenu(false); setTimeout(() => openModal('vault'), Platform.OS === 'android' ? 100 : 0); } },
          {
            emoji: '🗑️', labelEs: 'Borrar Historial', labelEn: 'Clear History', onPress: () => {
              setShowKebabMenu(false);
              Alert.alert(
                lang === 'es' ? 'Acción no disponible' : 'Action not available',
                lang === 'es'
                  ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                  : 'Chat history can only be cleared from the main tab.'
              );
            }
          },
        ]}
      />

      {selectedBook && db && (
        <React.Suspense fallback={null}>
          <BookReaderModal
            visible={isReaderVisible}
            onClose={() => setIsReaderVisible(false)}
            book={selectedBook}
            colors={colors}
            lang={lang}
            db={db}
          />
        </React.Suspense>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  buttonSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 16,
    opacity: 0.85,
  },
  vaultCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultsText: {
    color: '#00FFCC',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  vaultButtonBlue: {
    backgroundColor: '#5c84a8',
    paddingVertical: 18,
    borderRadius: 24,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%'
  },
  vaultButtonGreen: {
    backgroundColor: '#7da885',
    paddingVertical: 18,
    borderRadius: 24,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%'
  },
  vaultButtonText: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 5,
    zIndex: 9999,
    elevation: 999,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  kebabItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  kebabItemLast: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

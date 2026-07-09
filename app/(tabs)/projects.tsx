import React, { useEffect, useState, useRef, useCallback } from 'react';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Platform, StatusBar, ScrollView, FlatList, ActivityIndicator, KeyboardAvoidingView, Modal, Dimensions } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLlmState, useLlmDownload, useLlmActions } from '../../contexts/LlmContext';
import { useVoice } from '../../hooks/useVoice';
import { useFileAttachment } from '../../hooks/useFileAttachment';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { settingsService } from '../../lib/SettingsService';
// WisdomService dynamically imported
const VisionDownloadModal = React.lazy(() => import('../../components/VisionDownloadModal').then(m => ({ default: m.VisionDownloadModal })));
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';


const themesList = [
  { value: 'Self Growth', labelEs: '🌱 Crecimiento Personal', labelEn: '🌱 Self Growth' },
  { value: 'Study Book', labelEs: '📚 Estudiar un Libro', labelEn: '📚 Study a Book' },
  { value: 'Study Class', labelEs: '🎓 Estudiar Materia o Concepto', labelEn: '🎓 Study Subject or Concept' },
  { value: 'Create Book', labelEs: '✍️ Crear un Libro', labelEn: '✍️ Create a Book' },
  { value: 'Learn Language', labelEs: '🗣️ Aprender un Idioma', labelEn: '🗣️ Learn a Language' },
  { value: 'Brainstorming', labelEs: '💡 Lluvia de Ideas', labelEn: '💡 Brainstorming' },
  { value: 'Relationship', labelEs: '🤝 Lidiar con una Relación', labelEn: '🤝 Deal with a Relationship' },
  { value: 'Other', labelEs: '⚙️ Otro', labelEn: '⚙️ Other' }
];

const getConsoleSystemPrompt = (project: any, lang: string) => {
  const theme = project.theme;
  const name = project.name;
  const description = project.description || '';
  
  if (lang === 'es') {
    return `Eres Anima, una IA asistente experta integrada en el diario del usuario. Estás ayudando al usuario en su proyecto actual:
Nombre del Proyecto: "${name}"
Tema del Proyecto: "${theme}"
Descripción: "${description}"

Tu objetivo es guiar, sugerir y estructurar el avance de este proyecto. Tienes control directo sobre la Mesa de Trabajo del usuario a través de comandos especiales. Si deseas actualizar la Mesa de Trabajo, debes incluir uno o más de los siguientes tags en tu respuesta (se procesarán en segundo plano y se ocultarán al usuario):
- Para establecer o actualizar el recordatorio/meta clave en la tarjeta PIN: [SET_PIN: Tu recordatorio clave aquí]
- Para añadir una tarjeta de estudio (Flashcard) DEBES incluir siempre la respuesta separada por doble barra: [ADD_CARD: Concepto clave (resumen 1-4 palabras) || Respuesta detallada]
- Para añadir un paso o tarea en la lista jerárquica: [ADD_STEP: Descripción de la tarea]

Si el tema del proyecto es estudiar un libro ("Study Book") y el libro es desconocido para ti o necesitas acceso directo a su contenido, pídele al usuario de forma clara y amable que suba el archivo PDF o DOCX utilizando el botón de documento (📄) en la consola para que puedas analizarlo directamente.

Si el tema del proyecto es aprender un idioma ("Learn Language"), actúa como un tutor interactivo de idiomas. Ayuda al usuario con gramática, vocabulario y traducción. Genera tarjetas de estudio dinámicas usando [ADD_CARD: Palabra o Frase en idioma objetivo || Traducción, pronunciación y ejemplo de uso] para que el usuario pueda repasar de forma autónoma.

Si el usuario te pide información en tiempo real, eventos recientes, datos externos que no conoces de forma offline o investigaciones complejas fuera de tu base de datos, indícale amablemente que no tienes acceso directo a internet en esta consola de Proyectos. Sugiérele que vaya a la pestaña "Home" (el chat principal) para realizar la consulta allí (donde puedes usar Brave Search y Wikipedia), y que luego regrese aquí para continuar.

Por favor, sé conciso, minimalista y mantén una personalidad de consola inteligente. Si el usuario te pide ayuda, dale respuestas directas y útiles.`;
  } else {
    return `You are Anima, an expert AI assistant integrated into the user's diary. You are helping the user with their active project:
Project Name: "${name}"
Project Theme: "${theme}"
Description: "${description}"

Your goal is to guide, suggest, and structure the progress of this project. You have direct control over the user's Worktable through special commands. If you want to update the Worktable, include one or more of the following tags in your response (they will be processed in the background and hidden from the user):
- To set/update the key reminder on the PIN card: [SET_PIN: Concise main goal (1-5 words)]
- To add a study flashcard, you MUST always include the answer separated by double pipes: [ADD_CARD: Key concept (1-4 word summary) || Detailed answer]
- To add a step or task to the checklist: [ADD_STEP: Task description]

If the project theme is studying a book ("Study Book") and the book is unknown to you or you need direct access to its contents, politely and clearly ask the user to upload the PDF or DOCX file using the document button (📄) in the console so that you can analyze and read it directly.

If the project theme is learning a language ("Learn Language"), act as an interactive language tutor. Help the user with grammar, vocabulary, and translation. Generate dynamic flashcards using [ADD_CARD: Word (1-3 words) || Translation and usage example] so the user can study autonomously.

If the user asks for real-time information, recent events, external search queries you do not know offline, or complex research outside your database, politely explain that you do not have direct internet access in this Projects console. Suggest they go to the "Home" tab (the main chat) to perform the search there (where you can search the web using Brave Search and Wikipedia), and then return here to continue.

Please be concise, minimalist, and maintain a smart console persona. If the user asks for help, provide direct and actionable responses.`;
  }
};

const cleanResponseTags = (text: string): string => {
  return text
    .replace(/\[SET_PIN:\s*[^\]]+\]/gi, '')
    .replace(/\[ADD_CARD:\s*[^\]]+\]/gi, '')
    .replace(/\[ADD_STEP:\s*[^\]]+\]/gi, '')
    .trim();
};

export default function ProjectsScreen() {
  const db = useSQLiteContext();
  const { colors, activeTheme } = useAppTheme();
  const { lang } = useLanguage();

  const { status: llmStatus, activeModel } = useLlmState();
  const { isDownloading, downloadingModel, downloadingType, downloadPercent, downloadedMB, downloadSpeed } = useLlmDownload();
  const { generateStreamingResponse, abortGeneration, resetToHome, downloadVisionModel, checkVisionModelExists, cancelDownload } = useLlmActions();

  // Voice/Whisper
  const dictation = useVoice(lang);

  // File Attachment
  const { attachedFile, setAttachedFile, pickDocument, clearAttachment, isProcessing: isPickingFile, buildFileContext } = useFileAttachment(lang);

  const [showVisionModal, setShowVisionModal] = useState(false);
  const visionPromiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  const handleBeforeProcessImage = useCallback(async (): Promise<boolean> => {
    if (!activeModel || !activeModel.mmprojFileName) return true;
    const exists = await checkVisionModelExists(activeModel);
    if (exists) return true;

    return new Promise<boolean>((resolve) => {
      visionPromiseResolveRef.current = resolve;
      setShowVisionModal(true);
    });
  }, [activeModel, checkVisionModelExists]);

  const handleConfirmVisionDownload = async () => {
    setShowVisionModal(false);
    if (visionPromiseResolveRef.current) {
      visionPromiseResolveRef.current(false);
      visionPromiseResolveRef.current = null;
    }

    setAttachedFile({
      name: activeModel?.mmprojFileName || 'vision.gguf',
      type: 'image',
      uri: '',
      sizeKB: activeModel?.mmprojSizeMB || 940,
      extractedText: 'PENDING_VISION_DOWNLOAD'
    });

    try {
      if (activeModel) {
        await downloadVisionModel(activeModel);
        clearAttachment();
        Alert.alert(
          lang === 'es' ? 'Descarga Completa' : 'Download Complete',
          lang === 'es'
            ? 'El soporte visual ya está listo. Puedes volver a seleccionar tu imagen.'
            : 'Vision support is ready. You can select your image again.'
        );
      }
    } catch (err: any) {
      clearAttachment();
      Alert.alert(
        lang === 'es' ? 'Error de Descarga' : 'Download Error',
        lang === 'es'
          ? `No se pudo descargar el módulo de visión: ${err.message}`
          : `Failed to download vision module: ${err.message}`
      );
    }
  };

  const handleCloseVisionModal = () => {
    setShowVisionModal(false);
    if (visionPromiseResolveRef.current) {
      visionPromiseResolveRef.current(false);
      visionPromiseResolveRef.current = null;
    }
  };

  const handleClearAttachment = useCallback(async () => {
    clearAttachment();
    if (downloadingType === 'vision') {
      await cancelDownload();
    }
  }, [clearAttachment, downloadingType, cancelDownload]);

  const handlePickDocument = async () => {
    await pickDocument(handleBeforeProcessImage);
  };

  // Console Scroll Ref
  const consoleScrollRef = useRef<ScrollView>(null);
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      consoleScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [projectTheme, setProjectTheme] = useState('Self Growth');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  // Projects State
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [dropdownTicket, setDropdownTicket] = useState(0);

  useEffect(() => {
    if (showThemeDropdown || showProjectDropdown) {
      const timer = setTimeout(() => {
        setDropdownTicket(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showThemeDropdown, showProjectDropdown]);

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Worktable State
  const [worktable, setWorktable] = useState<{ pin: any; cards: { id: number, question: string, answer: string, timestamp: number }[]; steps: any[] }>({ pin: null, cards: [], steps: [] });
  const [flippingCardId, setFlippingCardId] = useState<number | null>(null);

  // Header & Kebab Menu removed

  // Compression loading state
  const [isCompressing, setIsCompressing] = useState(false);

  const isMatrix = activeTheme === 'matrix';

  // Scroll to bottom when messages or generation state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  // Initialize project_messages table
  useEffect(() => {
    const initProjectMessages = async () => {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS project_messages (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at INTEGER NOT NULL
          );
        `);
      } catch (e) {
        console.error('[PROJECTS] Error creating project_messages table:', e);
      }
    };
    initProjectMessages();
  }, [db]);

  // Load projects list
  const loadProjects = async () => {
    try {
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC"
      );
      setActiveProjects(rows);
      
      const activeId = await settingsService.get('activeProjectId');
      if (activeId && rows.some(r => r.id === activeId)) {
        setSelectedProjectId(activeId);
      } else if (rows.length > 0) {
        setSelectedProjectId(rows[0].id);
        await settingsService.set({ activeProjectId: rows[0].id });
      } else {
        setSelectedProjectId(null);
        await settingsService.set({ activeProjectId: null });
      }
    } catch (e) {
      console.error('[PROJECTS] Error loading projects:', e);
    }
  };

  const loadWorktableItems = async (projectId: string) => {
    const rows = await db.getAllAsync<{ id: number, fact: string, timestamp: number }>(
      "SELECT id, fact, timestamp FROM knowledge_base WHERE category = 'Proyecto' AND fact LIKE ? ORDER BY timestamp ASC",
      [`[Proyecto:${projectId}]%`]
    );
    
    let pin: { id: number, text: string } | null = null;
    const cards: { id: number, question: string, answer: string, timestamp: number }[] = [];
    const steps: { id: number, description: string, status: 'pending' | 'completed' }[] = [];

    rows.forEach(row => {
      // PIN
      const pinMatch = row.fact.match(/^\[Proyecto:[^\]]+\]\[Card:PIN\]\s*(.*)$/i);
      if (pinMatch) {
        pin = { id: row.id, text: pinMatch[1].trim() };
        return;
      }

      // Flashcard
      const cardMatch = row.fact.match(/^\[Proyecto:[^\]]+\]\[Card:Flashcard\]\s*(.*)$/i);
      if (cardMatch) {
        const parts = cardMatch[1].split('||');
        if (parts.length >= 2) {
          cards.push({
            id: row.id,
            question: parts[0].trim(),
            answer: parts[1].trim(),
            timestamp: row.timestamp
          });
        }
        return;
      }

      // Step
      const stepMatch = row.fact.match(/^\[Proyecto:[^\]]+\]\[Card:Step\]\s*(.*)$/i);
      if (stepMatch) {
        const parts = stepMatch[1].split('||');
        const desc = parts[0].trim();
        const status = (parts[1] || 'pending').trim().toLowerCase() === 'completed' ? 'completed' : 'pending';
        steps.push({
          id: row.id,
          description: desc,
          status: status as any
        });
        return;
      }
    });

    return { pin, cards, steps };
  };

  const refreshWorktable = async (projId: string) => {
    if (!projId) return;
    try {
      const data = await loadWorktableItems(projId);
      setWorktable(data);
    } catch (e) {
      console.error('[PROJECTS] Error loading worktable:', e);
    }
  };

  const loadProjectMessages = async (projId: string) => {
    if (!projId) return;
    try {
      const rows = await db.getAllAsync<any>(
        "SELECT role, text FROM project_messages WHERE project_id = ? ORDER BY created_at ASC",
        [projId]
      );
      const cleaned = rows.map(r => ({
        ...r,
        text: r.role === 'ai' ? cleanResponseTags(r.text) : r.text
      }));
      setMessages(cleaned);
    } catch (e) {
      console.error('[PROJECTS] Error loading messages:', e);
      setMessages([]);
    }
  };

  // Sync state on focus
  useFocusEffect(
    useCallback(() => {
      loadProjects();

    }, [db, lang])
  );

  // Sync selection details
  useEffect(() => {
    if (selectedProjectId) {
      const proj = activeProjects.find(p => p.id === selectedProjectId);
      setActiveProject(proj || null);
      loadProjectMessages(selectedProjectId);
      refreshWorktable(selectedProjectId);
    } else {
      setActiveProject(null);
      setMessages([]);
      setWorktable({ pin: null, cards: [], steps: [] });
    }
  }, [selectedProjectId, activeProjects]);

  // Sync transcription
  useEffect(() => {
    if (dictation.isListening && dictation.transcript) {
      setInputText(dictation.transcript);
    }
  }, [dictation.transcript, dictation.isListening]);

  // Create Project
  const createProject = async () => {
    if (!projectName.trim()) {
      Alert.alert(
        lang === 'es' ? 'Nombre requerido' : 'Name required',
        lang === 'es' ? 'Por favor introduce un nombre para el proyecto.' : 'Please enter a name for the project.'
      );
      return;
    }
    if (projectTheme === 'Other' && !customTheme.trim()) {
      Alert.alert(
        lang === 'es' ? 'Tema requerido' : 'Theme required',
        lang === 'es' ? 'Por favor introduce un tema personalizado.' : 'Please enter a custom theme.'
      );
      return;
    }
    try {
      const id = `proj-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const now = Date.now();
      const themeValue = projectTheme === 'Other' && customTheme.trim() ? customTheme.trim() : projectTheme;
      
      await db.runAsync(
        "INSERT INTO projects (id, name, theme, status, created_at) VALUES (?, ?, ?, ?, ?)",
        [id, projectName.trim(), themeValue, 'active', now]
      );
      
      const welcomeText = lang === 'es'
        ? `Consola de Proyecto iniciada para: "${projectName.trim()}". ¿En qué te puedo ayudar hoy con respecto al tema de "${themeValue}"?`
        : `Project Console initialized for: "${projectName.trim()}". How can I assist you today regarding "${themeValue}"?`;
      
      await db.runAsync(
        "INSERT INTO project_messages (id, project_id, role, text, created_at) VALUES (?, ?, ?, ?, ?)",
        [`msg-welcome-${Date.now()}`, id, 'ai', welcomeText, now]
      );

      const pinText = `${projectName.trim()} (${themeValue})`;
      await db.runAsync(
        "INSERT INTO knowledge_base (category, fact, confidence, timestamp) VALUES (?, ?, ?, ?)",
        ['Proyecto', `[Proyecto:${id}][Card:PIN] ${pinText}`, 1.0, now]
      );

      setProjectName('');
      setCustomTheme('');
      await settingsService.set({ activeProjectId: id });
      await loadProjects();
      
      Alert.alert(
        lang === 'es' ? 'Proyecto Creado' : 'Project Created',
        lang === 'es' ? `El proyecto "${projectName.trim()}" ha sido creado con éxito.` : `Project "${projectName.trim()}" created successfully.`
      );
    } catch (e) {
      console.error('[PROJECTS] Error creating project:', e);
      Alert.alert('Error', String(e));
    }
  };

  // Bracket commands processor
  const processTags = async (database: any, projectId: string, text: string) => {
    try {
      // SET_PIN
      const pinRegex = /\[SET_PIN:\s*([^\]]+)\]/gi;
      let pinMatch;
      while ((pinMatch = pinRegex.exec(text)) !== null) {
        const pinContent = pinMatch[1].trim();
        await database.runAsync(
          "DELETE FROM knowledge_base WHERE category = 'Proyecto' AND fact LIKE ?",
          [`[Proyecto:${projectId}][Card:PIN]%`]
        );
        await database.runAsync(
          "INSERT INTO knowledge_base (category, fact, confidence, timestamp) VALUES (?, ?, ?, ?)",
          ['Proyecto', `[Proyecto:${projectId}][Card:PIN] ${pinContent}`, 1.0, Date.now()]
        );
      }

      // ADD_CARD
      const cardRegex = /\[ADD_CARD:\s*([^|\]]+)(?:\|\|([^\]]+))?\]/gi;
      let cardMatch;
      while ((cardMatch = cardRegex.exec(text)) !== null) {
        const question = cardMatch[1].trim();
        const answer = cardMatch[2] ? cardMatch[2].trim() : (lang === 'es' ? 'Toca para revelar' : 'Tap to reveal');
        await database.runAsync(
          "INSERT INTO knowledge_base (category, fact, confidence, timestamp) VALUES (?, ?, ?, ?)",
          ['Proyecto', `[Proyecto:${projectId}][Card:Flashcard] ${question} || ${answer}`, 1.0, Date.now()]
        );
      }

      // ADD_STEP
      const stepRegex = /\[ADD_STEP:\s*([^\]]+)\]/gi;
      let stepMatch;
      while ((stepMatch = stepRegex.exec(text)) !== null) {
        const stepDescription = stepMatch[1].trim();
        await database.runAsync(
          "INSERT INTO knowledge_base (category, fact, confidence, timestamp) VALUES (?, ?, ?, ?)",
          ['Proyecto', `[Proyecto:${projectId}][Card:Step] ${stepDescription} || pending`, 1.0, Date.now()]
        );
      }
    } catch (err) {
      console.error('[PROJECTS] Error parsing command tags:', err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if ((!inputText.trim() && !attachedFile) || isGenerating || !selectedProjectId) return;
    const userText = inputText.trim();
    setInputText('');
    
    const userMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = Date.now();
    
    // Clear attachment state immediately and extract file context
    const fileContextText = buildFileContext(attachedFile);
    const combinedUserText = fileContextText ? `${userText}\n${fileContextText}` : userText;
    
    if (attachedFile) {
      clearAttachment();
    }
    
    // Add User msg
    const displayMsg = userText || (lang === 'es' ? '[Documento Adjuntado]' : '[Attached Document]');
    const newUserMsg = { role: 'user', text: displayMsg };
    setMessages(prev => [...prev, newUserMsg]);
    await db.runAsync(
      "INSERT INTO project_messages (id, project_id, role, text, created_at) VALUES (?, ?, ?, ?, ?)",
      [userMsgId, selectedProjectId, 'user', displayMsg, now]
    );
    
    setIsGenerating(true);
    
    try {
      const { WisdomService } = await import('../../lib/WisdomService');
      const ragContext = await WisdomService.getWisdomContext(db, combinedUserText);
      
      const historyRows = await db.getAllAsync<any>(
        "SELECT role, text FROM project_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 10",
        [selectedProjectId]
      );
      
      const history = historyRows
        .slice(1) // exclude current
        .reverse()
        .map(row => ({
          id: '',
          role: row.role as 'user' | 'ai',
          text: row.text
        }));
        
      const systemPrompt = getConsoleSystemPrompt(activeProject, lang);
      const formattedPrompt = require('../../lib/PromptService').formatFullPrompt(
        activeModel,
        systemPrompt,
        history,
        combinedUserText,
        lang,
        ragContext,
        false,
        '',
        2
      );

      let streamedResponse = '';
      const aiMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      setMessages(prev => [...prev, { role: 'ai', text: '' }]);
      
      await generateStreamingResponse(
        formattedPrompt,
        (token) => {
          streamedResponse += token;
          setMessages(prev => {
            const list = [...prev];
            if (list.length > 0) {
              list[list.length - 1] = { role: 'ai', text: cleanResponseTags(streamedResponse) };
            }
            return list;
          });
        },
        (err) => {
          console.error('[PROJECTS] LLM error:', err);
          setIsGenerating(false);
        },
        undefined,
        undefined,
        undefined,
        2,
        false,
        false
      );
      
      setIsGenerating(false);
      
      await db.runAsync(
        "INSERT INTO project_messages (id, project_id, role, text, created_at) VALUES (?, ?, ?, ?, ?)",
        [aiMsgId, selectedProjectId, 'ai', streamedResponse, Date.now()]
      );
      
      await processTags(db, selectedProjectId, streamedResponse);
      await refreshWorktable(selectedProjectId);
      
    } catch (e) {
      console.error('[PROJECTS] Error sending message:', e);
      setIsGenerating(false);
    }
  };

  // Toggle checklist step
  const toggleStep = async (stepId: number, currentDesc: string, currentStatus: 'pending' | 'completed') => {
    if (!selectedProjectId) return;
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const newFact = `[Proyecto:${selectedProjectId}][Card:Step] ${currentDesc} || ${newStatus}`;
    try {
      await db.runAsync(
        "UPDATE knowledge_base SET fact = ? WHERE id = ?",
        [newFact, stepId]
      );
      await refreshWorktable(selectedProjectId);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    } catch (e) {
      console.error('[PROJECTS] Error toggling step:', e);
    }
  };

  // Delete worktable item
  
  const reorderCards = async (newData: any[]) => {
    if (!selectedProjectId) return;
    try {
      const baseTime = Date.now();
      for (let i = 0; i < newData.length; i++) {
        await db.runAsync("UPDATE knowledge_base SET timestamp = ? WHERE id = ?", [baseTime + i, newData[i].id]);
      }
      setWorktable(prev => ({ ...prev, cards: newData }));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteWorktableItem = async (itemId: number) => {
    if (!selectedProjectId) return;
    try {
      await db.runAsync("DELETE FROM knowledge_base WHERE id = ?", [itemId]);
      await refreshWorktable(selectedProjectId);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    } catch (e) {
      console.error('[PROJECTS] Error deleting worktable item:', e);
    }
  };

  // Finish and Compress Project
  const finishProject = async () => {
    if (!selectedProjectId || !activeProject) return;
    
    Alert.alert(
      lang === 'es' ? 'Terminar Proyecto' : 'Finish Project',
      lang === 'es'
        ? `¿Estás seguro de que quieres terminar el proyecto "${activeProject.name}"? Se comprimirá la memoria detallada en un resumen conciso.`
        : `Are you sure you want to finish the project "${activeProject.name}"? Detailed memories will be compressed into a concise summary.`,
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'Terminar y Comprimir' : 'Finish and Compress',
          style: 'destructive',
          onPress: async () => {
            setIsCompressing(true);
            try {
              const rows = await db.getAllAsync<{ fact: string }>(
                "SELECT fact FROM knowledge_base WHERE category = 'Proyecto' AND fact LIKE ?",
                [`[Proyecto:${selectedProjectId}]%`]
              );
              
              let factsText = '';
              rows.forEach(r => {
                const cleanFact = r.fact.replace(/^\[Proyecto:[^\]]+\]/, '').trim();
                factsText += `- ${cleanFact}\n`;
              });
              
              if (!factsText.trim()) {
                factsText = lang === 'es' ? 'Sin datos guardados.' : 'No recorded data.';
              }

              const prompt = lang === 'es'
                ? `Eres un sistema experto de compresión de memoria. Resume las lecciones clave, hitos y datos más importantes de este proyecto en un párrafo conciso (máximo 4 oraciones) para la memoria a largo plazo del usuario. Sé directo y objetivo, no saludes ni agregues introducciones.
Aquí están los detalles guardados en el proyecto:
${factsText}`
                : `You are an expert memory compression system. Summarize the key lessons, milestones, and most important facts from this project in a single concise paragraph (maximum 4 sentences) for the user's long-term memory. Be direct and objective, do not greet or add introductions.
Here are the recorded project details:
${factsText}`;

              let summaryText = '';
              await generateStreamingResponse(
                prompt,
                (token) => {
                  summaryText += token;
                },
                (err) => {
                  console.error('[PROJECTS] Summary compression error:', err);
                },
                undefined,
                undefined,
                undefined,
                1, // consciousnessLevel = 1 (forces low temperature)
                false,
                true // forceDeterminism = true (temp 0.15)
              );
              
              const cleanSummaryText = cleanResponseTags(summaryText).trim();

              await db.runAsync(
                "UPDATE projects SET status = 'finished', summary = ? WHERE id = ?",
                [cleanSummaryText, selectedProjectId]
              );

              await db.runAsync(
                "DELETE FROM knowledge_base WHERE category = 'Proyecto' AND fact LIKE ?",
                [`[Proyecto:${selectedProjectId}]%`]
              );

              const summaryFactText = lang === 'es'
                ? `[Resumen de Proyecto: ${activeProject.name}] ${cleanSummaryText}`
                : `[Project Summary: ${activeProject.name}] ${cleanSummaryText}`;
                
              await db.runAsync(
                "INSERT INTO knowledge_base (category, fact, confidence, timestamp) VALUES (?, ?, ?, ?)",
                ['Proyecto', summaryFactText, 1.0, Date.now()]
              );

              await settingsService.set({ activeProjectId: null });
              
              Alert.alert(
                lang === 'es' ? 'Proyecto Terminado' : 'Project Finished',
                lang === 'es'
                  ? `El proyecto ha sido archivado y comprimido en RAG con éxito.`
                  : `The project has been archived and compressed in RAG successfully.`
              );
              
              await loadProjects();
              
            } catch (e) {
              console.error('[PROJECTS] Error finishing project:', e);
              Alert.alert('Error', String(e));
            } finally {
              setIsCompressing(false);
            }
          }
        }
      ]
    );
  };

  // Mic Press Handler
  const handleMicPress = async () => {
    if (dictation.isListening) {
      await dictation.stopListening();
    } else {
      try {
        const success = await dictation.startListening(
          undefined,
          (text) => {
            if (text.trim()) {
              setInputText(text);
            }
          }
        );
      } catch (err) {
        console.error('[PROJECTS] Mic error:', err);
      }
    }
  };

  // Kebab / Header actions
  const handleHeaderHomePress = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    await resetToHome();
  }, [resetToHome]);

  // Kebab / Header actions removed

  const activeThemeLabel = themesList.find(t => t.value === projectTheme);
  const activeThemeLabelText = activeThemeLabel ? (lang === 'es' ? activeThemeLabel.labelEs : activeThemeLabel.labelEn) : projectTheme;

  // Console Styles Conditionally
  const consoleBg = isMatrix ? '#0a0b0a' : colors.surfaceSecondary;
  const consoleText = isMatrix ? '#00ff41' : colors.textPrimary;
  const consoleFont = isMatrix ? (Platform.OS === 'ios' ? 'Courier' : 'monospace') : undefined;
  const consoleBorder = isMatrix ? '#1a2b1a' : colors.border;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SanctuaryHeader
        activeModelLabel={llmStatus === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
        onHomePress={handleHeaderHomePress}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        {/* CREATE PROJECT SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {lang === 'es' ? '💼 Crear un Proyecto' : '💼 Create a Project'}
          </Text>
          
          {/* CUSTOM THEME DROPDOWN */}
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4, marginTop: 4 }}>
            {lang === 'es' ? 'Tema del Proyecto' : 'Project Theme'}
          </Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            onPress={() => setShowThemeDropdown(true)}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 14 }}>
              {projectTheme === 'Other' && customTheme.trim() ? customTheme : activeThemeLabelText}
            </Text>
            <IconSymbol name="chevron.down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {projectTheme === 'Other' && (
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginBottom: 12 }]}
              value={customTheme}
              onChangeText={setCustomTheme}
              placeholder={lang === 'es' ? 'Escribe tu tema personalizado...' : 'Write your custom theme...'}
              placeholderTextColor={colors.textSecondary}
            />
          )}

          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
            value={projectName}
            onChangeText={setProjectName}
            placeholder={lang === 'es' ? 'Nombre del Proyecto...' : 'Project Name...'}
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={createProject}
          >
            <Text style={styles.createButtonText}>
              {lang === 'es' ? 'Crear Proyecto' : 'Create Project'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ACTIVE PROJECTS SELECTOR / ARCHIVE */}
        {activeProjects.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4 }}>
              {lang === 'es' ? 'Proyectos Activos' : 'Active Projects'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { flex: 1, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowProjectDropdown(true)}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                  {activeProject ? activeProject.name : (lang === 'es' ? 'Seleccionar...' : 'Select...')}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {activeProject && (
                <TouchableOpacity
                  style={[styles.finishButton, { backgroundColor: colors.error }]}
                  onPress={finishProject}
                  disabled={isCompressing}
                >
                  {isCompressing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.finishButtonText}>{lang === 'es' ? 'Terminar' : 'Finish'}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* COMPRESSION LOADER */}
        {isCompressing && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16, alignItems: 'center', padding: 20 }]}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textPrimary, fontWeight: 'bold', textAlign: 'center' }}>
              {lang === 'es' ? '🧠 Comprimiendo memoria neurológica local...' : '🧠 Compressing local neurological memory...'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              {lang === 'es' ? 'Esto purgará los hechos detallados y guardará un resumen optimizado en RAG.' : 'This will purge detailed facts and store an optimized summary in RAG.'}
            </Text>
          </View>
        )}

        {/* CONSOLE & WORKTABLE SECTION (ONLY SHOW IF PROJECT SELECTED & NOT COMPRESSING) */}
        {activeProject && !isCompressing && (
          <>
            {/* MESA DE TRABAJO */}
            {(worktable.pin || worktable.cards.length > 0 || worktable.steps.length > 0) && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                  {lang === 'es' ? '🛠️ Mesa de Trabajo' : '🛠️ Worktable'}
                </Text>
  
  
                {/* CHECKLIST STEPS (Objetivos Pendientes) - MOVIDO AL PRINCIPIO */}
                {worktable.steps.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 }}>
                      {lang === 'es' ? 'Objetivos Pendientes' : 'Steps Plan'}
                    </Text>
                    {worktable.steps.map((step) => {
                      const isCompleted = step.status === 'completed';
                      return (
                        <View
                          key={step.id}
                          style={[
                            styles.stepItem,
                            {
                              backgroundColor: isMatrix ? '#121412' : colors.surfaceSecondary,
                              borderColor: isMatrix ? '#1a2b1a' : colors.border,
                              borderWidth: 1
                            }
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => toggleStep(step.id, step.description, step.status)}
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 4 }}
                          >
                            {isCompleted ? (
                              <IconSymbol
                                name="checkmark.circle.fill"
                                size={20}
                                color="#4cd137"
                              />
                            ) : (
                              <MaterialIcons
                                name="radio-button-unchecked"
                                size={20}
                                color={colors.textSecondary}
                              />
                            )}
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              style={{ flex: 1, marginLeft: 10 }}
                              contentContainerStyle={{ alignItems: 'center' }}
                            >
                              <Text style={{
                                fontSize: 13,
                                color: isCompleted ? colors.textSecondary : colors.textPrimary,
                                textDecorationLine: isCompleted ? 'line-through' : 'none'
                              }}
                              numberOfLines={1}>
                                {step.description}
                              </Text>
                            </ScrollView>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => deleteWorktableItem(step.id)}
                            style={{ padding: 4 }}
                          >
                            <IconSymbol name="trash" size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
  
                {/* PIN CARD (Meta Principal) - MOVIDO AL MEDIO */}
                {worktable.pin && (
                  <View style={[styles.pinCard, { backgroundColor: isMatrix ? '#121412' : '#fef9c3', borderColor: isMatrix ? '#00ff41' : '#fef08a', borderWidth: 1, marginBottom: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="push-pin" size={14} color={isMatrix ? '#00ff41' : '#ca8a04'} />
                        <Text style={{ marginLeft: 6, fontWeight: 'bold', fontSize: 11, color: isMatrix ? '#00ff41' : '#854d0e', textTransform: 'uppercase' }}>
                          {lang === 'es' ? 'Meta Principal' : 'Main Goal'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteWorktableItem(worktable.pin.id)}>
                        <IconSymbol name="trash" size={12} color={isMatrix ? '#00ff41' : '#ca8a04'} />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 14, color: isMatrix ? '#d1ffd7' : '#713f12', lineHeight: 18 }}>
                      {worktable.pin.text}
                    </Text>
                  </View>
                )}
  
                {/* STUDY FLASHCARDS - AL FINAL */}
                {worktable.cards.length > 0 && (
                  <View style={{ marginTop: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 }}>
                      {lang === 'es' ? 'Tarjetas de Estudio' : 'Study Flashcards'}
                    </Text>
                    <View style={{ height: 160 }}>
                    <React.Suspense fallback={<ActivityIndicator style={{marginTop: 20}} />}>
                    <DraggableFlatList
                      data={worktable.cards}
                      horizontal={true}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
                      onDragEnd={({ data }) => reorderCards(data)}
                      keyExtractor={(item: any) => item.id.toString()}
                      renderItem={({ item, drag, isActive }) => {
                        const card = item as any;
                        const isFlipped = flippingCardId === card.id;
                        return (
                          <ScaleDecorator>
                            <View style={{ position: 'relative' }}>
                              <TouchableOpacity
                                activeOpacity={0.9}
                                onLongPress={drag}
                                disabled={isActive}
                                onPress={() => {
                                  setFlippingCardId(isFlipped ? null : card.id);
                                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                                }}
                                style={[
                                  styles.flashcard,
                                  {
                                    backgroundColor: isFlipped
                                      ? (isMatrix ? '#1a1e1a' : colors.primary + '15')
                                      : (isActive ? (isMatrix ? '#2b472b' : colors.border) : (isMatrix ? '#121412' : colors.surfaceSecondary)),
                                    borderColor: isMatrix ? '#00ff41' : colors.border,
                                    borderWidth: 1
                                  }
                                ]}
                              >
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 }}>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                                    {isFlipped ? (lang === 'es' ? 'Respuesta' : 'Answer') : (lang === 'es' ? 'Pregunta' : 'Question')}
                                  </Text>
                                  <Text style={{
                                    fontSize: 13,
                                    fontWeight: 'bold',
                                    color: isFlipped ? colors.primary : colors.textPrimary,
                                    textAlign: 'center'
                                  }}>
                                    {isFlipped ? card.answer : card.question}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => deleteWorktableItem(card.id)}
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                style={{ position: 'absolute', top: 6, right: 6, zIndex: 10, padding: 6 }}
                              >
                                <IconSymbol name="trash" size={14} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          </ScaleDecorator>
                        );
                      }}
                    />
                    </React.Suspense>
                  </View>
                  </View>
                )}
              </View>
            )}

            {/* INTERACTIVE CONSOLE */}
            <View style={[styles.card, { backgroundColor: consoleBg, borderColor: consoleBorder, borderWidth: 1, marginTop: 16 }]}>
              <Text style={{
                color: isMatrix ? '#00ff41' : colors.textSecondary,
                fontFamily: consoleFont,
                fontSize: 12,
                fontWeight: 'bold',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>
                {lang === 'es' ? '💻 CONSOLA INTERACTIVA' : '💻 INTERACTIVE CONSOLE'}
              </Text>

              {/* MESSAGES VIEW */}
              <View style={{ height: 220, backgroundColor: isMatrix ? '#060706' : colors.surface, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: consoleBorder, marginBottom: 8 }}>
                <ScrollView
                  ref={consoleScrollRef}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  onContentSizeChange={scrollToBottom}
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                  indicatorStyle={isMatrix ? 'white' : 'default'}
                >
                  {messages.map((item, index) => (
                    <View key={index} style={{ marginBottom: 10 }}>
                      <Text style={{
                        color: item.role === 'ai' ? (isMatrix ? '#00ff41' : colors.secondary) : (isMatrix ? '#8cff9e' : colors.primary),
                        fontFamily: consoleFont,
                        fontWeight: 'bold',
                        fontSize: 12
                      }}>
                        {item.role === 'ai' ? 'ANIMA >' : 'USER >'}
                      </Text>
                      <Text style={{
                        color: isMatrix ? '#d1ffd7' : colors.textPrimary,
                        fontFamily: consoleFont,
                        fontSize: 13,
                        lineHeight: 16,
                        marginTop: 2
                      }}>
                        {item.text}
                      </Text>
                    </View>
                  ))}
                  {isGenerating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ color: isMatrix ? '#00ff41' : colors.secondary, fontFamily: consoleFont, fontSize: 13, marginRight: 6 }}>
                        ANIMA {'>'}
                      </Text>
                      <ActivityIndicator size="small" color={isMatrix ? '#00ff41' : colors.secondary} />
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* ATTACHED FILE INDICATOR */}
              {attachedFile && (
                <View style={{
                  backgroundColor: isMatrix ? '#121412' : colors.surfaceSecondary,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: consoleBorder
                }}>
                  {attachedFile.extractedText === 'PENDING_VISION_DOWNLOAD' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ActivityIndicator size="small" color={isMatrix ? '#00ff41' : colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: consoleText, fontSize: 12, fontWeight: 'bold', fontFamily: consoleFont }}>
                          {lang === 'es' ? 'Descargando Módulo de Visión...' : 'Downloading Vision Module...'}
                        </Text>
                        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: isMatrix ? '#060706' : colors.border, marginTop: 4, overflow: 'hidden', width: '100%' }}>
                          <View style={{ height: '100%', width: `${downloadPercent}%`, backgroundColor: isMatrix ? '#00ff41' : colors.primary }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                          <Text style={{ color: isMatrix ? '#2b472b' : colors.textSecondary, fontSize: 9, fontFamily: consoleFont }}>
                            {downloadPercent}% ({downloadedMB}MB / {attachedFile.sizeKB}MB)
                          </Text>
                          {downloadSpeed > 0 && (
                            <Text style={{ color: isMatrix ? '#2b472b' : colors.textSecondary, fontSize: 9, fontFamily: consoleFont }}>
                              {downloadSpeed} MB/s
                            </Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity onPress={handleClearAttachment} style={{ padding: 4 }}>
                        <Text style={{ color: isMatrix ? '#ff003c' : colors.error, fontWeight: 'bold', fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>📄</Text>
                      <Text numberOfLines={1} style={{ flex: 1, color: consoleText, fontSize: 12, fontWeight: 'bold', fontFamily: consoleFont }}>
                        {attachedFile.name} ({attachedFile.sizeKB}KB)
                      </Text>
                      <TouchableOpacity onPress={handleClearAttachment} style={{ padding: 4 }}>
                        <Text style={{ color: isMatrix ? '#ff003c' : colors.error, fontWeight: 'bold', fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* INPUT BAR */}
              {llmStatus === 'ready' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[
                      styles.consoleInput,
                      {
                        color: consoleText,
                        backgroundColor: isMatrix ? '#060706' : colors.surface,
                        borderColor: consoleBorder,
                        fontFamily: consoleFont
                      }
                    ]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={lang === 'es' ? 'Escribe o habla...' : 'Type or speak...'}
                    placeholderTextColor={isMatrix ? '#2b472b' : colors.textSecondary}
                    onSubmitEditing={sendMessage}
                    editable={!isGenerating}
                  />

                  {/* PDF / File Attachment Button */}
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      {
                        backgroundColor: isMatrix ? '#121412' : colors.surface,
                        borderColor: consoleBorder,
                        borderWidth: 1
                      }
                    ]}
                    onPress={handlePickDocument}
                    disabled={isGenerating || isPickingFile || (attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD')}
                  >
                    {isPickingFile ? (
                      <ActivityIndicator size="small" color={isMatrix ? '#00ff41' : colors.primary} />
                    ) : (
                      <IconSymbol
                        name="doc.fill"
                        size={18}
                        color={isMatrix ? '#00ff41' : colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      {
                        backgroundColor: dictation.isListening ? '#ff3b30' : (isMatrix ? '#121412' : colors.surface),
                        borderColor: dictation.isListening ? '#ff3b30' : consoleBorder,
                        borderWidth: 1
                      }
                    ]}
                    onPress={handleMicPress}
                  >
                    <IconSymbol
                      name="waveform"
                      size={18}
                      color={dictation.isListening ? '#fff' : (isMatrix ? '#00ff41' : colors.primary)}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sendConsoleButton, { backgroundColor: isMatrix ? '#121412' : colors.primary, borderColor: consoleBorder, borderWidth: 1 }]}
                    onPress={sendMessage}
                    disabled={isGenerating || (!inputText.trim() && !attachedFile) || (attachedFile?.extractedText === 'PENDING_VISION_DOWNLOAD')}
                  >
                    <IconSymbol name="paperplane.fill" size={16} color={isMatrix ? '#00ff41' : '#fff'} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ padding: 10, backgroundColor: isMatrix ? '#121412' : colors.surface, borderRadius: 6, alignItems: 'center' }}>
                  <Text style={{ color: isMatrix ? '#ff003c' : colors.error, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                    {lang === 'es'
                      ? '⚠️ El núcleo de IA está desconectado. Cárgalo en la pantalla principal para poder chatear.'
                      : '⚠️ AI Core is offline. Load the model on the main screen to enable chat.'}
                  </Text>
                </View>
              )}
              <React.Suspense fallback={null}>
                <VisionDownloadModal
                  visible={showVisionModal}
                  onClose={handleCloseVisionModal}
                  onConfirm={handleConfirmVisionDownload}
                  modelName={activeModel?.label || 'Anima AI'}
                  sizeMB={activeModel?.mmprojSizeMB || 940}
                  colors={colors}
                  lang={lang}
                />
              </React.Suspense>
            </View>
          </>
        )}
      </ScrollView>

      {/* THEME PICKER MODAL */}
      <Modal visible={showThemeDropdown} transparent animationType="fade" statusBarTranslucent={true} onRequestClose={() => setShowThemeDropdown(false)}>
        {Platform.OS === 'android' && <View style={{ height: (dropdownTicket % 2 === 1) ? 0.5 : 0 }} />}
        <TouchableOpacity 
          style={[
            styles.modalOverlay, 
            { 
              width: Dimensions.get('screen').width, 
              height: Dimensions.get('screen').height,
              paddingTop: Platform.OS === 'android' && (dropdownTicket % 2 === 1) ? 0.5 : 0
            }
          ]} 
          activeOpacity={1} 
          onPress={() => setShowThemeDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {lang === 'es' ? 'Selecciona un Tema' : 'Select a Theme'}
            </Text>
            {themesList.map((theme) => (
              <TouchableOpacity
                key={theme.value}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setProjectTheme(theme.value);
                  setShowThemeDropdown(false);
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {lang === 'es' ? theme.labelEs : theme.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ACTIVE PROJECTS MODAL */}
      <Modal visible={showProjectDropdown} transparent animationType="fade" statusBarTranslucent={true} onRequestClose={() => setShowProjectDropdown(false)}>
        {Platform.OS === 'android' && <View style={{ height: (dropdownTicket % 2 === 1) ? 0.5 : 0 }} />}
        <TouchableOpacity 
          style={[
            styles.modalOverlay, 
            { 
              width: Dimensions.get('screen').width, 
              height: Dimensions.get('screen').height,
              paddingTop: Platform.OS === 'android' && (dropdownTicket % 2 === 1) ? 0.5 : 0
            }
          ]} 
          activeOpacity={1} 
          onPress={() => setShowProjectDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {lang === 'es' ? 'Selecciona un Proyecto' : 'Select a Project'}
            </Text>
            {activeProjects.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={async () => {
                  setSelectedProjectId(p.id);
                  await settingsService.set({ activeProjectId: p.id });
                  setShowProjectDropdown(false);
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: p.id === selectedProjectId ? 'bold' : 'normal' }}>
                  {p.name} ({p.theme})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* GLOBAL APP KEBAB MENU OVERLAY REMOVED */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12
  },
  dropdownTrigger: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  createButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  finishButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  consoleInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendConsoleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pinCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1
  },
  flashcard: {
    width: 150,
    height: 100,
    borderRadius: 8,
    position: 'relative'
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 16,
    maxHeight: '60%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1
  }
});

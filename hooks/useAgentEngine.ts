import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppLlm } from './useAppLlm';
import { useDocumentProcessor } from './useDocumentProcessor';
import { DatabaseService } from '../lib/DatabaseService';
import { Logger } from '../lib/Logger';
import { getGemmaSystemPrompt, PromptComplexity } from '../lib/systemPrompt';
import * as PromptService from '../lib/PromptService';
import { SanctuarySearchOrchestrator } from '../lib/tools';
import { getDeviceTemperature } from '../lib/hardware';
import * as SentinelService from '../lib/SentinelService';
import { SentinelStream } from '../lib/SentinelService';
import { factExtractionService } from '../lib/FactExtractionService';
// WisdomService, ContextFoldingService, KnowledgeManager, and BadgeService are dynamically imported

import * as SQLite from 'expo-sqlite';
import { settingsService } from '../lib/SettingsService';

import { SQLiteDatabase } from 'expo-sqlite';
import { ModelInfo } from './useAppLlm';
import { Message, UserProfile, PsyProfile } from '../types';
import { MODEL_CONFIG } from '../src/config/ModelConfig';

type Architecture = 'gemma4' | 'llama';

const commonGreetings = new Set([
  'hi', 'hello', 'hey', 'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
  'how are you', 'how r u', 'como estas', 'como te va', 'que tal', 'como andas',
  'whats up', 'sup', 'test', 'prueba', 'hello there', 'hi there'
]);

const isZenMessage = (text: string): boolean => {
  const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  // Common short greetings and social queries
  if (clean.length < 3) return true; // Extremely short inputs
  if (commonGreetings.has(clean)) return true;
  if (clean.length < 15 && (clean.includes('hola') || clean.includes('hello') || clean.includes('hi') || clean.includes('hey'))) return true;
  return false;
};

const isInputDangerous = (text: string): boolean => {
  const lowercase = text.toLowerCase();
  const dangerousKeywords = [
    'suicidarse', 'suicidio', 'quitarme la vida', 'cómo morir', 'como morir', 'autolesion', 'autolesión', 'cortarme',
    'suicide', 'kill myself', 'self harm', 'how to die', 'cutting myself'
  ];
  return dangerousKeywords.some(keyword => lowercase.includes(keyword));
};

const executeSearchWithTimeout = async (stream: SentinelStream, query: string, lang: 'es' | 'en', timeoutMs = 6000): Promise<string> => {
  let timer: any;
  const timeoutPromise = new Promise<string>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const res = await Promise.race([
      SanctuarySearchOrchestrator(stream, query, lang),
      timeoutPromise
    ]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[AGENT_ENGINE] Sanctuary Search timed out or failed, returning SENTINEL_NULL_DATA:', err);
    return "SENTINEL_NULL_DATA";
  }
};

const detectNGramRepetition = (text: string, maxRepeats = 3): boolean => {
  const words = text.toLowerCase().trim().split(/\s+/);
  // No evaluar strings extremadamente cortos
  if (words.length < 9) return false;

  // Analizar secuencias de 3 a 5 palabras
  for (let len = 3; len <= 5; len++) {
    if (words.length < len * maxRepeats) continue;
    
    // Tomar el último segmento de len palabras
    const lastSeq = words.slice(-len).join(' ');
    
    let matches = 0;
    for (let r = 1; r < maxRepeats; r++) {
      const prevSeq = words.slice(-len * (r + 1), -len * r).join(' ');
      if (prevSeq === lastSeq) {
        matches++;
      } else {
        break;
      }
    }
    
    if (matches >= maxRepeats - 1) {
      console.warn(`[N-GRAM DETECTOR] Loop detected for sequence "${lastSeq}". Stop generation flag raised.`);
      return true;
    }
  }
  return false;
};


export const useAgentEngine = (
  lang: 'en' | 'es',
  db: SQLiteDatabase | null,
  activeModel: ModelInfo | null,
  generateStreamingResponse: (
    prompt: string | null,
    onTokenReceived: (text: string) => void,
    onError: (error: string) => void,
    imagePath?: string | string[],
    multimodalMessages?: any[],
    binaryBuffer?: Uint8Array,
    consciousnessLevel?: number,
    forceHighTemperature?: boolean,
    forceDeterminism?: boolean,
    isVoiceMode?: boolean
  ) => Promise<string>,
  userProfile: UserProfile,
  psyProfile: PsyProfile,
  psyCompleted: boolean,
  buildFileContext: (file?: any) => string,
  extractTextInChunks: (file: any, onProgress?: any, returnFullText?: boolean) => Promise<any>,
  speak: (text: string, psyProfile?: PsyProfile) => void,
  voiceState: any,
  abortGeneration: () => Promise<void>,
  currentContextSize: number,
  llamaContextRef?: React.RefObject<any>,
  prefillContextLlm?: (prompt: string) => Promise<void>,
  generateEmbeddings?: (texts: string[]) => Promise<number[][]>
) => {
  const { processAttachments } = useDocumentProcessor(
    lang,
    generateStreamingResponse,
    buildFileContext,
    extractTextInChunks,
    db,
    generateEmbeddings
  );

  useEffect(() => {
    // Pre-cargar módulos pesados en background
    import('../lib/WisdomService').catch(console.warn);
    import('../lib/KnowledgeManager').catch(console.warn);
    import('../lib/SemanticService').catch(console.warn);
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [searchingStep, setSearchingStep] = useState<string>('');
  const [earnedBadge, setEarnedBadge] = useState<{ emoji: string, name: string, count: number } | null>(null);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'reading_file' | 'indexing' | 'generating' | 'thinking'>('idle');
  // Gemma 4 reasoning indicator: true while the model is inside <|think|>...</|think|> block.
  // Prevents the TTS from firing and signals the UI to show a "Thinking..." indicator.
  const [isThinking, setIsThinking] = useState(false);
  const isThinkingRef = useRef(false);
  const tokenCountRef = useRef(0);
  const isTypingRef = useRef(false);
  const textBufferRef = useRef('');

  const queueRef = useRef<any[]>([]);
  const toolQueryRef = useRef('');
  const searchPromiseRef = useRef<Promise<string> | null>(null);
  const searchStreamRef = useRef<'FAST_FACT' | 'DEEP_RESEARCH' | 'LOCAL_VAULT' | 'NONE'>('NONE');
  const wasInterruptedRef = useRef(false);
  const consecutiveUnusedTokensRef = useRef(0);

  const registerInterruption = useCallback(() => {
    wasInterruptedRef.current = true;
  }, []);

  const getSanctuaryArchitecture = (): Architecture => {
    if (!activeModel) return 'gemma4';
    const id = activeModel.id?.toLowerCase() || '';
    const name = (activeModel as any)?.name?.toLowerCase() || '';

    if (id.includes('llama') || name.includes('llama') || id.includes('gemma3') || name.includes('gemma3')) return 'llama';
    return 'gemma4';
  };

  const stopGeneration = async () => {
    await abortGeneration();
    setIsProcessing(false);
  };

  const prefillContext = async (userText: string) => {
    if (!prefillContextLlm || !activeModel || isProcessing) return;

    let history: any[] = [];
    if (db) {
      try {
        const rows = await db.getAllAsync('SELECT * FROM messages ORDER BY created_at DESC LIMIT 30');
        history = rows.reverse().map((row: any) => ({
          role: row.role,
          text: row.text,
        }));
      } catch (e) { }
    }

    const formattedPrompt = PromptService.formatFullPrompt(
      activeModel,
      PromptService.getSystemPrompt(lang as 'en' | 'es', userProfile, psyProfile, psyCompleted, '', undefined, 'gemma4'),
      history,
      userText,
      lang as any,
      '', 0, ''
    );

    await prefillContextLlm(formattedPrompt);
  };

  const processMessage = async (
    userText: string,
    messageId: string,
    setMessagesUI: any,
    options?: {
      attachedFile?: any;
      isVoice?: boolean;
      consciousness?: number;
      onSentenceGenerated?: (sentence: string) => void;
      onClearSpeechQueue?: () => void;
      onPreloadSpeech?: (text: string) => void;
    }
  ) => {
    const attachedFile = options?.attachedFile;
    const isVoice = options?.isVoice ?? false;
    const consciousness = options?.consciousness ?? 2;
    const onSentenceGenerated = options?.onSentenceGenerated;
    const onClearSpeechQueue = options?.onClearSpeechQueue;
    const onPreloadSpeech = options?.onPreloadSpeech;

    let useCloudTTS = false;
    try {
      const settings = await settingsService.get();
      useCloudTTS = settings?.useCloudTTS ?? false;
    } catch (err) {
      console.warn('[AGENT_ENGINE] Failed to load settings:', err);
    }

    // Mutex lock: React state (isProcessing) is asynchronous and can allow race conditions
    // if two calls happen in the same tick. isTypingRef updates synchronously.
    if (isTypingRef.current) return;
    isTypingRef.current = true;
    setIsProcessing(true);
    consecutiveUnusedTokensRef.current = 0;

    let sentenceWasEmitted = false;
    const activeOnSentenceGenerated = onSentenceGenerated
      ? (sentence: string) => {
        sentenceWasEmitted = true;
        onSentenceGenerated(sentence);
      }
      : undefined;
    setProcessingPhase(attachedFile ? 'reading_file' : 'indexing');
    tokenCountRef.current = 0;

    if (isInputDangerous(userText)) {
      const systemNoticeId = `sys-alert-${Date.now()}`;
      const safetyResponse = lang === 'es'
        ? 'Si estás experimentando pensamientos de autolesión o una crisis de salud mental, por favor busca ayuda de inmediato. Puedes comunicarte con los servicios de emergencia de tu localidad o llamar a una línea de ayuda (por ejemplo, el 988 en EE. UU./Canadá, o los servicios de emergencia de tu país).'
        : 'If you are experiencing thoughts of self-harm or a mental health crisis, please seek help immediately. You can reach out to your local emergency services or contact a mental health helpline (such as 988 in the US/Canada, or emergency services in your country).';

      setMessagesUI((prev: any) => [...prev, {
        id: systemNoticeId,
        role: 'ai',
        text: safetyResponse,
        created_at: Date.now(),
      }]);

      if (db) {
        try {
          await DatabaseService.insertMessage(db, systemNoticeId, 'ai', safetyResponse, '[SAFETY_FILTER_BLOCK]', '');
        } catch (e) {
          console.error('[AGENT_ENGINE] Error persisting safety response:', e);
        }
      }

      setIsProcessing(false);
      isTypingRef.current = false;
      return safetyResponse;
    }

    const modelResponseId = `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setMessagesUI((prev: any) => [...prev, {
      id: modelResponseId,
      role: 'ai',
      text: '',
      created_at: Date.now(),
    }]);

    let processedContext = '';
    let processedImages: string[] | undefined = undefined;
    if (attachedFile) {
      try {
        const processed = await processAttachments(attachedFile, userText, setMessagesUI);
        processedContext = processed?.context || '';
        processedImages = (processed as any)?.imagePaths;
      } catch (e) {
        console.error('[AGENT_ENGINE] Error processing attachments:', e);
      }
    }
    setProcessingPhase('thinking');

    const currentDate = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US');
    const contextData = {
      nickname: userProfile.nickname,
      goal: (userProfile as any).longTermGoal,
      date: currentDate,
      year: "2026",
      identity: activeModel?.labelEs || "Anima Balance",
    };

    const arch = getSanctuaryArchitecture();

    // ═══ Speech Pipelining Configuration ═══
    const FLUSH_TIMEOUT_MS = 2500;     // Max silence: flush accumulated text after 2.5s
    const MIN_FLUSH_LENGTH = 15;       // Minimum chars to justify a timeout flush

    let isFirstSpeechChunk = true;
    let lastSentenceEmitTime = Date.now();
    let flushTimerId: any = null;
    let globalSentenceOffset = 0;
    let previousRoundsCleanText = '';
    let roundResponse = '';

    const resetFlushTimer = () => {
      if (flushTimerId) clearTimeout(flushTimerId);
      if (!activeOnSentenceGenerated) return;
      flushTimerId = setTimeout(() => {
        const roundClean = SentinelService.filterUI(roundResponse, arch);
        const fullClean = previousRoundsCleanText + roundClean;
        const remaining = fullClean.substring(globalSentenceOffset).trim();
        if (remaining.length >= MIN_FLUSH_LENGTH) {
          console.log(`[SPEECH_PIPELINE] ⏰ Timeout flush (${FLUSH_TIMEOUT_MS}ms): "${remaining.substring(0, 40)}..."`);
          activeOnSentenceGenerated(remaining);
          globalSentenceOffset = fullClean.length;
          isFirstSpeechChunk = false;
          lastSentenceEmitTime = Date.now();
          resetFlushTimer(); // Re-arm for next gap
        }
      }, FLUSH_TIMEOUT_MS);
    };

    // FIX BUG-07: Correct parameter order is (lang, userContext, complexity, arch)
    let seedMemoryStr = '';
    if (db) {
      try {
        const { createKnowledgeManager } = await import('../lib/KnowledgeManager');
        const km = createKnowledgeManager(db);
        seedMemoryStr = await km.getSeedMemoryMap();
      } catch (e) {
        console.warn('[AGENT_ENGINE] Error fetching seed memory:', e);
      }
    }
    
    const profileParts: string[] = [];
    if (contextData.nickname) profileParts.push(`name:${contextData.nickname}`);
    if (contextData.goal) profileParts.push(`goal:${contextData.goal}`);

    const contextDataStr = profileParts.join(', ') + 
      (seedMemoryStr ? `\n\n[MEMORIA LOCAL EN SQLITE - CONCEPTOS CONOCIDOS]:\n${seedMemoryStr}` : '');
    const complexityMap: Record<number, PromptComplexity> = {
      1: PromptComplexity.LOW,
      2: PromptComplexity.MEDIUM,
      3: PromptComplexity.MEDIUM,
      4: PromptComplexity.HIGH
    };
    const complexity = complexityMap[consciousness] || PromptComplexity.MEDIUM;
    const systemPrompt = getGemmaSystemPrompt(lang as any, contextDataStr, complexity, arch);

    // ⚡ Early Intent Routing: Skip FTS5 & episodic memory if user query is a simple greeting or consciousness level is ZEN
    const isZenMode = complexity === PromptComplexity.LOW || isZenMessage(userText);

    let ragContext = '';
    if (!isZenMode && db) {
      setProcessingPhase('indexing');
      console.log('[AGENT_ENGINE] 🚀 Early Routing: BALANCE/DEEP active. Fetching Wisdom context (FTS5) and Semantic Context (RAG)...');
      const { WisdomService } = await import('../lib/WisdomService');
      const ftsContext = await WisdomService.getWisdomContext(db, userText);
      const semanticContext = await require('../lib/SemanticService').SemanticService.getSemanticContext(db, userText, generateEmbeddings);
      ragContext = ftsContext + '\n' + semanticContext;
      
      // 🗜️ Truncate RAG context for Llama to prevent context window saturation
      if (arch === 'llama' && ragContext.length > 600) {
        console.log('[AGENT_ENGINE] 🗜️ Truncating RAG context to 600 chars for Llama stability.');
        ragContext = ragContext.substring(0, 600) + '...';
      }
    } else {
      console.log('[AGENT_ENGINE] ⚡ Early Routing: ZEN/Greeting active. Bypassing Wisdom context.');
    }

    let history: Message[] = [];
    let foldedContext = '';
    let messagesToDrop: { role: string, text: string }[] = [];

    if (db) {
      try {
        // 🛡️ Read Active Episodic Memory (Context Folding) - Skip in ZEN mode
        if (!isZenMode) {
          console.log('[AGENT_ENGINE] 🚀 Fetching active episodic memory (Context Folding)...');
          const foldRow = await db.getFirstAsync<{ folded_text: string }>('SELECT folded_text FROM session_folding WHERE id = 1');
          if (foldRow && foldRow.folded_text) {
            foldedContext = foldRow.folded_text;
          }
        } else {
          console.log('[AGENT_ENGINE] ⚡ Bypassing active episodic memory (Context Folding).');
        }

        const rows = await db.getAllAsync<{ id: string, role: string, text: string }>(
          'SELECT id, role, text FROM messages ORDER BY created_at DESC LIMIT 20'
        );
        const mappedHistory = rows
          .reverse()
          .filter((row: any) => row.id !== messageId)
          .map((row: any) => ({
            id: row.id || '',
            role: (row.role === 'ai' ? 'ai' : 'user') as Message['role'],
            text: row.text
          }));

        // 🛡️ Context Guillotine (Anti-Drift Measure)
        // Dynamic calculation based on actual context budget to maximize memory usage safely.
        // Assuming ~512 tokens for output + ~300 for system prompt. Tokens are roughly chars / 3.5.
        const reservedTokens = 812;
        const availableHistoryTokens = Math.max(500, currentContextSize - reservedTokens);
        const MAX_HISTORY_CHARS = Math.floor(availableHistoryTokens * 3.5);
        
        let currentChars = 0;
        const safeHistory: typeof mappedHistory = [];
        for (let i = mappedHistory.length - 1; i >= 0; i--) {
          const msgLen = mappedHistory[i].text?.length || 0;
          if (currentChars + msgLen > MAX_HISTORY_CHARS) {
            // 🗜️ These messages dropped from active memory
            messagesToDrop = mappedHistory.slice(0, i + 1).map((m: any) => ({ role: m.role, text: m.text }));
            break;
          }
          currentChars += msgLen;
          safeHistory.unshift(mappedHistory[i]);
        }
        history = safeHistory;
      } catch (e) {
        console.error('[AGENT_ENGINE] Error retrieving history:', e);
      }
    }

    const promptText = processedContext ? `${userText}\n${processedContext}` : userText;

    const formattedPrompt = PromptService.formatFullPrompt(
      activeModel,
      systemPrompt,
      history,
      promptText,
      lang as any,
      ragContext, // 🔱 Injecting persistent memory
      attachedFile?.type === 'image' ? 1 : (processedImages ? processedImages.length : 0),
      foldedContext, // 🗜️ Injecting folded episodic memory
      consciousness
    );

    let fullResponse = '';
    let toolCallDetected = false;
    let searchTriggered = false;
    let toolRounds = 0;
    const MAX_TOOL_ROUNDS = 3;
    let pendingToolResponse = '';
    toolQueryRef.current = '';
    let searchResult: string | null = null;

    // 🚀 Preemptive Search Trigger (Skipped in ZEN mode)
    const preemptiveCheck = !isZenMode ? SentinelService.processInbound("", userText, arch as any) : { detected: false, dialect: '', query: '', stream: 'NONE' as SentinelService.SentinelStream };
    if (preemptiveCheck.detected && preemptiveCheck.dialect === 'PROACTIVE_CURRENCY_CHECK') {
      console.log(`[AGENT_ENGINE] 🚀 Preemptive Search Triggered: "${preemptiveCheck.query}"`);
      toolQueryRef.current = preemptiveCheck.query;
      setIsSearchingWeb(true);
      setSearchingStep('searching');
      try {
        searchResult = await executeSearchWithTimeout(preemptiveCheck.stream, preemptiveCheck.query, lang);
      } catch (e) {
        searchResult = "SENTINEL_NULL_DATA";
      } finally {
        setIsSearchingWeb(false);
      }

      if (db && searchResult && searchResult !== 'SENTINEL_NULL_DATA' && searchResult !== 'NO_DATA') {
        try {
          const { createKnowledgeManager } = await import('../lib/KnowledgeManager');
          const km = createKnowledgeManager(db);
          await km.saveFact({
            category: 'Sabiduría',
            fact: `[Búsqueda: ${toolQueryRef.current}]: ${searchResult.replace(/\s+/g, ' ').substring(0, 500)}`,
            confidence: 0.9,
            source: 'WebSearch'
          });
        } catch (e) {
          console.warn('[AGENT_ENGINE] Error saving preemptive search semantic cache:', e);
        }
      }

      const injectedContext = {
        query: toolQueryRef.current,
        liveData: searchResult || 'SENTINEL_NULL_DATA',
        timestamp: new Date().toISOString().split('T')[0]
      };

      pendingToolResponse = SentinelService.buildHandshakeInjection(injectedContext, userText, arch, lang);
      toolRounds = 1;
      searchResult = null; // Clear so it doesn't trigger the secondary check
    }

    try {
      let currentPrompt = formattedPrompt;
      if (pendingToolResponse) {
        const cleanPromptBase = formattedPrompt
          .replace(/<(?:start_of_turn|\|turn)>model\n?$/i, '')
          .replace(/<\|start_header_id\|>assistant<\|end_header_id\|>\n*\n*$/i, '');
        currentPrompt = cleanPromptBase + pendingToolResponse;
      }

      // Fix #5: Persist sentence offset across tool rounds to prevent sentence
      // duplication/skipping when Sentinel triggers a second generation round.
      globalSentenceOffset = 0;
      previousRoundsCleanText = '';

      while (toolRounds < MAX_TOOL_ROUNDS) {
        let roundSearchTriggered = false;
        let hasAborted = false;
        roundResponse = '';
        textBufferRef.current = '';

        Logger.debug(`[AGENT_ENGINE] 🔫 Round ${toolRounds + 1} started.`);
        setProcessingPhase('generating');
        resetFlushTimer();
        
        let incrementalCleanText = '';
        let filterCursor = 0;
        const LOOKBEHIND = 50;
        let lastUiUpdateTime = 0;
        let lastProcessInboundLength = 0;

        await generateStreamingResponse(
          currentPrompt,
          async (partial: string) => {
            let isUnusedToken = /<(?:unused\d+|pad|bos|eos|unk|mask)>/i.test(partial);
            if (isUnusedToken) {
              consecutiveUnusedTokensRef.current = (consecutiveUnusedTokensRef.current || 0) + 1;
              if (consecutiveUnusedTokensRef.current >= 3) {
                console.warn(`[AGENT_ENGINE] 🛡️ Anti-loop: detected ${consecutiveUnusedTokensRef.current} consecutive unused tokens. Aborting generation.`);
                await abortGeneration();
                return;
              }
            } else {
              consecutiveUnusedTokensRef.current = 0;
            }

            let cleanPartial = partial;
            if (cleanPartial) {
              // 🛡️ Anti-corruption: strip raw vocabulary tokens (like <unused50>) during streaming
              cleanPartial = cleanPartial.replace(/<(?:unused\d+|pad|bos|eos|unk|mask)>/gi, '');
              if (cleanPartial && __DEV__) {
                console.log(`[RAW TOKEN]: ${JSON.stringify(cleanPartial)}`);
              }
            }
            if (!cleanPartial) return;
            resetFlushTimer();

            if (roundSearchTriggered) {
              if (!hasAborted && (searchResult !== null || /<\/thought>|<start_function_call>|<call:|!!SEARCH|<\|tool_call>|\[SEARCH:/i.test(roundResponse))) {
                hasAborted = true;
                await abortGeneration();

                if (onClearSpeechQueue) {
                   onClearSpeechQueue();
                }

                const results = searchResult !== null ? searchResult : await searchPromiseRef.current;
                
                // Persist results in the database as local semantic cache
                if (db && results && results !== 'SENTINEL_NULL_DATA' && results !== 'NO_DATA') {
                  try {
                    const { createKnowledgeManager } = await import('../lib/KnowledgeManager');
                    const km = createKnowledgeManager(db);
                    await km.saveFact({
                      category: 'Sabiduría',
                      fact: `[Búsqueda: ${toolQueryRef.current}]: ${results.replace(/\s+/g, ' ').substring(0, 500)}`,
                      confidence: 0.9,
                      source: 'WebSearch'
                    });
                    console.log(`[AGENT_ENGINE] 💾 Semantic cache saved for: "${toolQueryRef.current}"`);
                  } catch (e) {
                    console.warn('[AGENT_ENGINE] Error saving search semantic cache:', e);
                  }
                }

                const injectedContext = {
                  query: toolQueryRef.current,
                  liveData: results || 'SENTINEL_NULL_DATA',
                  timestamp: new Date().toISOString().split('T')[0]
                };

                pendingToolResponse = SentinelService.buildHandshakeInjection(injectedContext, userText, arch, lang);
                searchPromiseRef.current = null;
              }
              return;
            }

            roundResponse += cleanPartial;
            fullResponse += cleanPartial;
            tokenCountRef.current++;

            // 🛡️ N-Gram Repetition Guard: detect repetitive loops in Llama/Gemma (throttled every 20 tokens)
            if (tokenCountRef.current > 40 && tokenCountRef.current % 20 === 0 && detectNGramRepetition(roundResponse)) {
              await abortGeneration();
              return;
            }

            // Gemma 4 Thinking Indicator: detect <|think|> open/close tags in the streamed response.
            // When the think block opens, raise isThinking so the UI can show a reasoning indicator.
            // When it closes (or first real text arrives after the block), lower isThinking.
            if (arch === 'gemma4') {
              const hasThinkOpen = /<(?:\|?\s*think\s*\|?|\|?thought\|?)>|<\|channel>thought/i.test(fullResponse);
              const hasThinkClose = /<\/(?:\|?think\|?|\|?thought\|?)>|<(?:think|thought|channel)\|>/i.test(fullResponse);
              const thinkingNow = hasThinkOpen && !hasThinkClose;
              if (thinkingNow !== isThinkingRef.current) {
                isThinkingRef.current = thinkingNow;
                setIsThinking(thinkingNow);
              }
            }

            // 🛡️ Incremental Clean Text calculation for both UI and Sentence Splitting
            let fullFiltered = roundResponse;
            if (!roundSearchTriggered) {
              const safeEnd = Math.max(0, roundResponse.length - LOOKBEHIND);
              if (safeEnd > filterCursor) {
                const chunk = roundResponse.substring(filterCursor, safeEnd);
                incrementalCleanText += SentinelService.filterUI(chunk, arch);
                filterCursor = safeEnd;
              }
              const tail = roundResponse.substring(filterCursor);
              const filteredTail = SentinelService.filterUI(tail, arch);
              fullFiltered = incrementalCleanText + filteredTail;
            }

            // Sentence splitting logic for real-time speech (pipelining)
            if (activeOnSentenceGenerated && !isThinkingRef.current && !roundSearchTriggered) {
              const cleanText = previousRoundsCleanText + fullFiltered;
              const pending = cleanText.substring(globalSentenceOffset);

              // ═══ Semantic Boundary Detection (SBD) ═══
              // If using Cloud TTS, do not split on commas since SSML wraps commas in break tags.
              const delimiters = (isVoice && useCloudTTS)
                ? ['.', '?', '!', '\n']
                : ['.', '?', '!', '\n', ','];
              let idx = globalSentenceOffset;
              while (idx < cleanText.length) {
                const char = cleanText[idx];
                const isNumberSeparator = (char === '.' || char === ',') &&
                  idx > 0 && /\d/.test(cleanText[idx - 1]) &&
                  idx + 1 < cleanText.length && /\d/.test(cleanText[idx + 1]);
                const isEllipsisInProgress = char === '.' && idx + 1 < cleanText.length && cleanText[idx + 1] === '.';

                if (delimiters.includes(char) && !isNumberSeparator && !isEllipsisInProgress) {
                  const sentence = cleanText.substring(globalSentenceOffset, idx + 1).trim();
                  if (sentence.length > 0) {
                    activeOnSentenceGenerated(sentence);
                    lastSentenceEmitTime = Date.now();
                    resetFlushTimer();
                    isFirstSpeechChunk = false;

                    // 🔮 Preload predictivo: si hay más texto pendiente, precargar
                    if (onPreloadSpeech && idx + 1 < cleanText.length) {
                      const pendingNext = cleanText.substring(idx + 1).trim();
                      if (pendingNext.length > 0) {
                        onPreloadSpeech(pendingNext);
                      }
                    }
                  }
                  globalSentenceOffset = idx + 1;
                }
                idx++;
              }
            }

            if (!roundSearchTriggered && roundResponse.length > 20) {
              const hasFormalToolCall = /<\|tool_call>|!!SEARCH|\[SEARCH:|<call:hybrid_search|\{query:|\[SENTINEL_QUERY\]/i.test(roundResponse);
              if (hasFormalToolCall || roundResponse.length - lastProcessInboundLength > 25) {
                lastProcessInboundLength = roundResponse.length;
                const textForSentinel = hasFormalToolCall
                  ? roundResponse
                  : roundResponse.replace(/<(?:\|?thought\|?|\|?think\|?)>[\s\S]*?(?:<\/(?:\|?thought\|?|\|?think\|?)>|$)/gi, '');

                if (textForSentinel.length > 20) {
                const inbound = SentinelService.processInbound(textForSentinel, userText);

                // 🛡️ Prevent proactive search loop: only allow PROACTIVE_CURRENCY_CHECK on the first round (toolRounds === 0)
                const shouldTrigger = !isZenMode && inbound.detected &&
                   (inbound.dialect !== 'PROACTIVE_CURRENCY_CHECK' || toolRounds === 0);

                if (shouldTrigger) {
                  console.log(`[SENTINEL_RACING] 🏎️ Round ${toolRounds + 1} - Probe started [${inbound.stream}]: "${inbound.query}"`);
                  roundSearchTriggered = true;
                  toolQueryRef.current = inbound.query;

                  searchPromiseRef.current = (async () => {
                    try {
                      setIsSearchingWeb(true);
                      const res = await executeSearchWithTimeout(inbound.stream, inbound.query, lang);
                      searchResult = res;
                      return res;
                    } catch (e) {
                      searchResult = "SENTINEL_NULL_DATA";
                      return "SENTINEL_NULL_DATA";
                    }
                    finally { setIsSearchingWeb(false); }
                  })();
                }
              }
            }
            } // Added missing closing brace here

            // Round synchronization (Hybrid: by search completion or explicit tokens)
            if (roundSearchTriggered && !hasAborted && (searchResult !== null || /<\/thought>|<start_function_call>|<call:|!!SEARCH|<\|tool_call>|\[SEARCH:/i.test(roundResponse))) {
              hasAborted = true;
              await abortGeneration();

              if (isThinkingRef.current) {
                isThinkingRef.current = false;
                setIsThinking(false);
              }

              if (onClearSpeechQueue) {
                onClearSpeechQueue();
              }

              const results = searchResult !== null ? searchResult : await searchPromiseRef.current;

              // Persist results in the database as local semantic cache
              if (db && results && results !== 'SENTINEL_NULL_DATA' && results !== 'NO_DATA') {
                try {
                  const { createKnowledgeManager } = await import('../lib/KnowledgeManager');
                  const km = createKnowledgeManager(db);
                  await km.saveFact({
                    category: 'Sabiduría',
                    fact: `[Búsqueda: ${toolQueryRef.current}]: ${results.replace(/\s+/g, ' ').substring(0, 500)}`,
                    confidence: 0.9,
                    source: 'WebSearch'
                  });
                  console.log(`[AGENT_ENGINE] 💾 Semantic cache saved for: "${toolQueryRef.current}"`);
                } catch (e) {
                  console.warn('[AGENT_ENGINE] Error saving search semantic cache:', e);
                }
              }

              const injectedContext = {
                query: toolQueryRef.current,
                liveData: results || 'SENTINEL_NULL_DATA',
                timestamp: new Date().toISOString().split('T')[0]
              };

              pendingToolResponse = SentinelService.buildHandshakeInjection(injectedContext, userText, arch, lang);
              searchPromiseRef.current = null;
            }

            textBufferRef.current = roundResponse;

            // Throttled UI update
            if (!roundSearchTriggered) {
              const now = Date.now();
              if (now - lastUiUpdateTime >= 150) {
                lastUiUpdateTime = now;
                const thoughts = SentinelService.purifyThoughts(roundResponse);

                setMessagesUI((prev: any) => {
                  const last = prev[prev.length - 1];
                  if (!last) return prev;
                  if (isThinkingRef.current && !fullFiltered && last.text) return prev;
                  if (last.text === fullFiltered && last.thoughts === thoughts) return prev;
                  return [...prev.slice(0, -1), {
                    ...last,
                    text: fullFiltered,
                    tool_query: toolQueryRef.current,
                    thoughts: thoughts
                  }];
                });
              }
            }
          },
          (err: any) => console.error("[ENGINE ERROR]", err),
          processedImages && processedImages.length > 0 ? processedImages : (attachedFile?.type === 'image' ? attachedFile.uri : undefined),
          undefined,
          attachedFile?.type === 'image' ? attachedFile.binaryBuffer : undefined,
          consciousness,
          false,
          toolRounds > 0 || preemptiveCheck.stream === 'FAST_FACT', // forceDeterminism
          isVoice
        );

        if (flushTimerId) {
          clearTimeout(flushTimerId);
          flushTimerId = null;
        }

        // Final UI flush of the round's accumulated text
        if (!roundSearchTriggered) {
          const finalRoundText = textBufferRef.current;
          const filteredText = SentinelService.filterUI(finalRoundText, arch);
          const thoughts = SentinelService.purifyThoughts(finalRoundText);
          setMessagesUI((prev: any) => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            return [...prev.slice(0, -1), {
              ...last,
              text: filteredText,
              tool_query: toolQueryRef.current,
              thoughts: thoughts
            }];
          });
        }

        // At the end of the round, flush any remaining un-sent text fragment.
        // Fix #5: Use globalSentenceOffset (not local lastSentIndex) to correctly
        // reference the full accumulated clean text position.
        if (!roundSearchTriggered && activeOnSentenceGenerated) {
          const roundClean = SentinelService.filterUI(roundResponse, arch);
          const fullClean = previousRoundsCleanText + roundClean;
          const remaining = fullClean.substring(globalSentenceOffset).trim();
          if (remaining.length > 0) {
            activeOnSentenceGenerated(remaining);
            globalSentenceOffset = fullClean.length;
          }
        }

        // Accumulate this round's clean text into previousRoundsCleanText for the next round
        const roundClean = SentinelService.filterUI(roundResponse, arch);
        previousRoundsCleanText += roundClean;

        if (roundSearchTriggered) {
          toolRounds++;
          setSearchingStep('synthesizing');

          if (searchPromiseRef.current) {
            console.log('[AGENT_ENGINE] ⏳ Awaiting background search results before next round...');
            const results = await searchPromiseRef.current;
            console.log('[AGENT_ENGINE] 🏁 Background search resolved.');
            if (!pendingToolResponse) {
              const injectedContext = {
                query: toolQueryRef.current,
                liveData: results || 'SENTINEL_NULL_DATA',
                timestamp: new Date().toISOString().split('T')[0]
              };
              pendingToolResponse = SentinelService.buildHandshakeInjection(injectedContext, userText, arch, lang);
            }
          }

          if (!pendingToolResponse) {
            const injectedContext = {
              query: toolQueryRef.current || userText,
              liveData: 'SENTINEL_NULL_DATA',
              timestamp: new Date().toISOString().split('T')[0]
            };
            pendingToolResponse = SentinelService.buildHandshakeInjection(injectedContext, userText, arch, lang);
          }

          // The Handshake (pendingToolResponse) completely replaces the aborted response.
          // We overwrite the original prompt to start with a clean and deterministic mental state.
          const cleanPromptBase = formattedPrompt
            .replace(/<(?:start_of_turn|\|turn)>model\n?$/i, '')
            .replace(/<\|start_header_id\|>assistant<\|end_header_id\|>\n*\n*$/i, '');
          currentPrompt = cleanPromptBase + pendingToolResponse;

          if (fullResponse.includes('<call:') || fullResponse.includes('hybrid_search') || fullResponse.includes('!!SEARCH') || fullResponse.includes('<|tool_call>') || fullResponse.includes('[SEARCH:')) {
            // LOGIC-02 FIX: Line-scoped [^\n]* instead of greedy [\s\S]*.
            // The greedy version deleted from the first tool marker to end-of-string,
            // potentially wiping the model's real answer generated in later rounds.
            fullResponse = fullResponse
              .replace(/<call:[^\n]*/gi, '')
              .replace(/!!SEARCH[^\n]*/gi, '')
              .replace(/\{query:[^\n]*/gi, '')
              .replace(/<\|tool_call>[^\n]*/gi, '')
              .replace(/\[SEARCH:[^\n]*/gi, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          }
          continue;
        } else {
          break;
        }
      }
    } finally {
      setIsProcessing(false);
      isTypingRef.current = false;
      setIsSearchingWeb(false);
      setSearchingStep('idle');
      setProcessingPhase('idle');
      // Always clear the thinking indicator when generation ends
      if (isThinkingRef.current) {
        isThinkingRef.current = false;
        setIsThinking(false);
      }

      // Clean up flush timer at end of generation round
      if (flushTimerId) {
        clearTimeout(flushTimerId);
        flushTimerId = null;
      }


      let finalText = '';
      if (db && fullResponse.length > 0) {
        try {
          const arch = getSanctuaryArchitecture();

          let finalThoughts = '';
          if (arch === 'gemma4') {
            finalThoughts = SentinelService.purifyThoughts(fullResponse);
          }

          // 🌿 Parse Zen Garden payload
          let zenPayload: any = null;
          const zenMatch = fullResponse.match(/<zen>([\s\S]*?)<\/zen>/i);
          if (zenMatch) {
            try {
              zenPayload = JSON.parse(zenMatch[1].trim());
            } catch (e) {
              console.warn('[AGENT_ENGINE] Failed to parse Zen Garden JSON:', e);
            }
            // Strip the <zen> block from the fullResponse so it's completely hidden
            fullResponse = fullResponse.replace(/<zen>[\s\S]*?<\/zen>/gi, '');
          }

          finalText = SentinelService.filterUI(fullResponse, arch);



          // FIX BUG: Push the final completed text to the UI to overwrite the typing stream!
          setMessagesUI((prev: any) => {
            const last = prev[prev.length - 1];
            if (!last || last.id !== modelResponseId) return prev;
            return [...prev.slice(0, -1), {
              ...last,
              text: finalText,
              tool_query: toolQueryRef.current,
              thoughts: finalThoughts
            }];
          });

          await DatabaseService.insertMessage(
            db,
            modelResponseId,
            'ai',
            finalText,
            finalThoughts,
            toolQueryRef.current
          );
          console.log(`[AGENT_ENGINE] 💾 Forensic Memory Saved (${arch}): ${modelResponseId}`);
        } catch (e) {
          console.error('[AGENT_ENGINE] Error persisting AI response:', e);
        }
      }

      // Fix #1: Dispatch TTS concurrently with DB write — do NOT wait for the
      // await db.runAsync() before speaking. This prevents the perceptible gap
      // where the user sees the full text on screen before the voice starts.
      if (voiceState === 'IDLE' && finalText && !onSentenceGenerated && !sentenceWasEmitted) {
        console.log('[AGENT_ENGINE] 🔊 TTS dispatched concurrently (before DB write).');
        speak(finalText, psyProfile);
      }

      // Extract facts and fold context sequentially in a single clean async task to prevent concurrency locks
      if (llamaContextRef?.current && finalText && db) {
        (async () => {
          try {
            // Defer background tasks to allow the device to return to complete idle and prioritize TTS/User read time.
            const deferTime = isVoice ? 12000 : 8000;
            console.log(`[AGENT_ENGINE] ⏳ Deferring background tasks by ${deferTime}ms to prioritize user interaction and clear TTS path...`);
            await new Promise(resolve => setTimeout(resolve, deferTime));
             console.log('[AGENT_ENGINE] 🧠 Starting background fact extraction...');
             await factExtractionService.extractFacts(llamaContextRef.current, userText, finalText, db, arch, generateEmbeddings);
 
             console.log('[AGENT_ENGINE] 🏆 Checking communication badge...');
             const { badgeService } = await import('../lib/BadgeService');
             const result = await badgeService.recordAction(db, 'communication');
             if (result && result.awarded) {
               setEarnedBadge({
                 emoji: result.emoji || '💬',
                 name: lang === 'es' ? 'Comunicación' : 'Communication',
                 count: result.badgeCount || 1
               });
               setTimeout(() => setEarnedBadge(null), 6000);
               const congrats = lang === 'es' ? result.spanishCongrats : result.englishCongrats;
               if (congrats) {
                 speak(congrats);
               }
             }

            // 🗜️ Context Folding: If messages dropped, compress them in episodic memory
            if (messagesToDrop.length > 0) {
              console.log('[AGENT_ENGINE] 🗜️ Starting background context folding...');
              const { contextFoldingService } = await import('../lib/ContextFoldingService');
              await contextFoldingService.foldHistoryThreshold(llamaContextRef.current, messagesToDrop, db, arch);
            }
          } catch (err) {
            console.warn('[AGENT_ENGINE] Error in background tasks:', err);
          }
        })();
      }

      return finalText;
    }
  };

  return {
    isTyping: isProcessing,
    isSearchingWeb,
    searchingStep,
    processingPhase,
    isThinking,
    processMessage,
    prefillContext,
    isTypingRef,
    queueRef,
    stopGeneration,
    registerInterruption,
    earnedBadge
  };
};

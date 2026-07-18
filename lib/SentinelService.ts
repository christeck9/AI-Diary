/**
 * SentinelService.ts
 * 
 * Handles input/output dialect detection, intent analysis, and model-specific prompt formatting.
 */

import { purifyQuery, sanitizeWebText } from './TextUtils';

export type SentinelStage = 'INBOUND' | 'PROCESS' | 'OUTBOUND' | 'UI_FILTER';
export type SentinelStream = 'FAST_FACT' | 'DEEP_RESEARCH' | 'KNOWLEDGE' | 'BIBLIOGRAPHIC' | 'LOCAL_VAULT' | 'NONE';

export interface InboundDetection {
  detected: boolean;
  query: string;
  dialect: string;
  stream: SentinelStream;
}

interface DialectDefinition {
  id: string;
  regex: RegExp;
  stream: SentinelStream;
}

const DIALECTS: DialectDefinition[] = [
  { id: 'LLAMA3_NATIVE', regex: /\{\s*"?query"?\s*:\s*["']?([^"'}]+)["']?\s*\}/i, stream: 'DEEP_RESEARCH' },
  { id: 'GEMMA4_NATIVE', regex: /<\|tool_call>\s*search\s*\{\s*"?query"?\s*:\s*(?:<\|"\|>|["']|)?([^"'<>{}]+?)(?:<\|"\|>|["']|)\s*\}\s*(?:<tool_call\|>)?/i, stream: 'DEEP_RESEARCH' },
  { id: 'GEMMA3_SLIM', regex: /\[SEARCH:\s*["']?([^"\]]+)["']?\]/i, stream: 'DEEP_RESEARCH' },
  { id: 'XML_STRICT', regex: /<call:hybrid_search\{query:["']?([^"'>}]+)["']?\}?\/?>/i, stream: 'DEEP_RESEARCH' },
  { id: 'JSON_INTENT', regex: /\{query:["']?([^"'}]+)["']?\}/i, stream: 'DEEP_RESEARCH' },
  { id: 'PROTOCOL_TAG', regex: /(?:<start_function_call>|<tool_code>|!!SEARCH)\(?["']?([^"')]*)["']?\)?/i, stream: 'DEEP_RESEARCH' },
  { id: 'SENTINEL_QUERY', regex: /\[SENTINEL_QUERY\]:?\s*(.+)/i, stream: 'DEEP_RESEARCH' }
];

const POST_RECENT_REGEX = /(?:^|\s)(news|noticias|latest|hoy|today|esta semana|this week|actualidad|actualizado|actualizada|lo [uú]ltimo|novedades|tendencias|trends)(?:\s|$)/i;
const FACTUAL_FORCE_REGEX = /(?:^|\s)(who is the current|what is the current|president of|prime minister of|presidente de|primer ministro de)(?:\s|$)/i;
const QUICK_FACT_REGEX = /(?:^|\s)(precio|clima|weather|age|born|valor|cotizaci[oó]n|d[oó]lar|euro|bitcoin|acciones de|partido de|resultado de|score of|match of)(?:\s|$)/i;
const EXPLICIT_SEARCH_REGEX = /(?:^|\s)(invest[ií]ga(?:lo|la|los|las|me|nos|se|te|les|le)?|investigar(?:lo|la|los|las|me|nos|se|te|les|le)?|investigaci[oó]n|research|search for|buscar(?:lo|la|los|las|me|nos|se|te|les|le)?|b[uú]sca(?:lo|la|los|las|me|nos|se|te|les|le)?|b[uú]sque(?:lo|la|los|las|me|nos|se|te|les|le)?|find out|googl[eé]a(?:lo|la|los|las|me|nos|se|te|les|le)?|google|websearch|consultar(?:lo|la|los|las|me|nos|se|te|les|le)?|cons[uú]lta(?:lo|la|los|las|me|nos|se|te|les|le)?)(?:\s|$)/i;

const LLAMA_FACTUAL_FORCE_REGEX = /(?:^|\s)(who is the current|what is the current|president of|prime minister of|presidente de|primer ministro de|qui[eé]n es|qui[eé]n fue|cu[aá]ndo|cu[aá]l es|what is|when did|how many)(?:\s|$)/i;
const LLAMA_QUICK_FACT_REGEX = /(?:^|\s)(precio|clima|weather|age|born|valor|cotizaci[oó]n|d[oó]lar|euro|bitcoin|acciones de|partido de|resultado de|score of|match of|lanzamiento|estreno|fecha de|date of)(?:\s|$)/i;

/**
 * processInbound - Detects intent across multiple dialects (v6.3 Cutoff-Aware)
 */
export const processInbound = (text: string, userQuery: string, arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4'): InboundDetection => {
  // Fast pre-scan check: exit early if text contains no trigger characters or keywords,
  // bypassing expensive sequential regex matches on every token chunk.
  const hasPossibleTrigger =
    text.includes('<') ||
    text.includes('[') ||
    text.includes('{') ||
    text.includes('!') ||
    /\b(cutoff|cannot|don't|not sure|unsure|definitive|no info|information|frozen|parametric|memory|data|born|quien|quién|que|qué|donde|dónde|who|what|where|precio|clima|weather|capital|age|book|libro|tratado|treatise|author|autor|bibliography|bibliografia|codex)\b/i.test(text);

  const isLlama = arch === 'llama';
  const effectiveFactualRegex = isLlama ? LLAMA_FACTUAL_FORCE_REGEX : FACTUAL_FORCE_REGEX;
  const effectiveQuickFactRegex = isLlama ? LLAMA_QUICK_FACT_REGEX : QUICK_FACT_REGEX;

  if (!hasPossibleTrigger) {
    const isFactualForce = effectiveFactualRegex.test(userQuery);
    const isCurrentEvent = POST_RECENT_REGEX.test(userQuery);
    const isExplicitSearch = EXPLICIT_SEARCH_REGEX.test(userQuery);

    if ((isCurrentEvent || isFactualForce || isExplicitSearch) && !text.includes("!!SEARCH")) {
      return {
        detected: true,
        query: purifyQuery(userQuery),
        dialect: 'PROACTIVE_CURRENCY_CHECK',
        stream: (isFactualForce || effectiveQuickFactRegex.test(userQuery)) ? 'FAST_FACT' : 'DEEP_RESEARCH'
      };
    }
    return { detected: false, query: '', dialect: 'NONE', stream: 'NONE' };
  }

  console.log(`[SENTINEL_SCAN] Analizando rastro (${text.length} chars)...`);

  for (const d of DIALECTS) {
    const match = text.match(d.regex);
    if (match) {
      const extracted = match[1] || userQuery;
      return { detected: true, query: purifyQuery(extracted), dialect: d.id, stream: d.stream };
    }
  }

  const isFactualForce = effectiveFactualRegex.test(userQuery);
  const isCurrentEvent = POST_RECENT_REGEX.test(userQuery);
  const isExplicitSearch = EXPLICIT_SEARCH_REGEX.test(userQuery);

  if ((isCurrentEvent || isFactualForce || isExplicitSearch) && !text.includes("!!SEARCH")) {
    return {
      detected: true,
      query: purifyQuery(userQuery),
      dialect: 'PROACTIVE_CURRENCY_CHECK',
      stream: (isFactualForce || effectiveQuickFactRegex.test(userQuery)) ? 'FAST_FACT' : 'DEEP_RESEARCH'
    };
  }

  return { detected: false, query: '', dialect: 'NONE', stream: 'NONE' };
};

export interface InjectedContext {
  query: string;
  liveData: string;
  timestamp: string;
}

/**
 * buildHandshakeInjection - Construye el bloque de "Override de Autoridad".
 * Minimiza el ruido de tokenización y maximiza la aceptación matemática del dato.
 */
export const buildHandshakeInjection = (
  context: InjectedContext,
  userMessage: string,
  arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4',
  lang: string = 'es'
): string => {
  const normalizedLang = lang.toLowerCase() === 'en' ? 'en' : 'es';
  const isNull = !context.liveData || context.liveData === "SENTINEL_NULL_DATA" || context.liveData.includes("SENTINEL_NULL_DATA") || context.liveData === "NO_DATA";
  
  // 🛡️ Prevenir Prompt Injection: Sanitizar data de internet de cualquier secuencia de control
  const safeLiveData = isNull ? "" : sanitizeWebText(context.liveData).replace(/<\|?.*?\|?>/g, '').replace(/<(?:start|end)_of_[^>]+>/g, '');

  const verifiedData = isNull
    ? (normalizedLang === 'en' 
        ? "No verified external data found. If the query is about general knowledge, history, or science, answer directly using your internal knowledge. Otherwise, state that no verified information is available." 
        : "No se encontró información externa verificada. Si la consulta es sobre conocimiento general, historia o ciencia, responde directamente usando tu conocimiento interno. De lo contrario, indica que no hay información disponible.")
    : safeLiveData;

  const bypassPhrase = isNull
    ? (normalizedLang === 'en' ? "Regarding your query, " : "Con respecto a tu consulta, ")
    : (normalizedLang === 'en'
        ? "Reviewing the updated data for this specific query, I confirm that "
        : "Revisando los datos actualizados para esta consulta específica, confirmo que ");

  if (arch === 'llama') {
    // Llama 3.2 1B Instruct: Epistemological tool boundary in ipython role to eliminate RAG dissonance
    return `<|start_header_id|>ipython<|end_header_id|>\n\n${JSON.stringify({
      status: isNull ? 'failed' : 'success',
      query: context.query,
      verified_environment_data: verifiedData
    })}<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n\n${bypassPhrase}`;
  }

  if (arch === 'gemma4') {
    // GEMMA 4 (E2B): Inyección Preemptiva de Función + Bypass de Negación Paramétrica
    // Se elimina el `<|turn>model` redundante ya que PromptService ya cerró el contexto.
    return `<|tool_call>search{query:<|"|>${context.query}<|"|>}<tool_call|><turn|>\n<|turn>tool\n<|tool_response>\n{\n  "name": "search",\n  "status": "${isNull ? 'failed' : 'success'}",\n  "verified_environment_data": ${JSON.stringify(verifiedData)}\n}\n<tool_response|><turn|>\n<|turn>model\n${bypassPhrase}`;
  }

  // GEMMA 3 (4B): Inversión de Autoridad (Role-Swapping) + Bypass de Negación Paramétrica
  // Avoid consecutive user turns by starting the handshake sequence directly in the model turn.
  const memoryHeader = normalizedLang === 'en'
    ? `[Consolidated and Verified Internal Memory - Date: ${context.timestamp}]:`
    : `[Memoria Interna Consolidada y Verificada - Fecha: ${context.timestamp}]:`;

  const verificationText = normalizedLang === 'en'
    ? `I have verified that the irrefutable and exact records indicate the following: ${verifiedData}`
    : `He validado que los registros irrefutables y exactos indican lo siguiente: ${verifiedData}`;

  const authorityOverride = normalizedLang === 'en'
    ? "I establish this information as the factual premise to answer the previous query only. Do not mix this context with future unrelated questions."
    : "Utilizo esta información exclusivamente para responder a la consulta anterior. Este contexto no debe mezclarse con preguntas futuras.";

  const transitionQuestion = normalizedLang === 'en'
    ? `Based on the factual premise you just consolidated, answer my question: ${userMessage}`
    : `Basándote en la premisa factual que acabas de consolidar, responde a mi pregunta: ${userMessage}`;

  return `${memoryHeader}
${verificationText}
${authorityOverride}<end_of_turn>
<start_of_turn>user
${transitionQuestion}<end_of_turn>
<start_of_turn>model\n${bypassPhrase}`;
};

/**
 * purifyThoughts - Extracts and cleans thought blocks from model responses.
 * Handles explicit thought tags (<thought>, <think>, <|think|>) and heuristic patterns.
 */
export const purifyThoughts = (text: string): string => {
  if (!text) return '';

  const extractBounded = (startRegex: RegExp, endRegex: RegExp): string | null => {
    const startMatch = text.match(startRegex);
    if (!startMatch) return null;
    const startIndex = startMatch.index! + startMatch[0].length;
    const remainder = text.slice(startIndex);
    const endMatch = remainder.match(endRegex);
    
    if (endMatch) {
      return text.substring(startIndex, startIndex + endMatch.index!).replace(/^\s*>\s*/gm, '').trim();
    }
    return text.substring(startIndex).replace(/^\s*>\s*/gm, '').trim();
  };

  // 1. Explicit tags (Angle Brackets) including Gemma 4 asymmetric delimiters
  let extracted = extractBounded(
    /<(?:\|?thought\|?|\|?think\|?|\|channel>thought)>/i,
    /<\/(?:\|?thought\|?|\|?think\|?)>|<(?:thought|think|channel)\|?>/i
  );
  if (extracted) return extracted;

  // 2. Explicit tags (Square Brackets used by some Gemma 4 instances)
  extracted = extractBounded(
    /\[(?:thought|think|reasoning)\]/i,
    /\[\/(?:thought|think|reasoning)\]/i
  );
  if (extracted) return extracted;

  // 3. Heuristic patterns (AI Slop detection/extraction)
  const heuristicStart = text.match(/^(?:> )?(?:\d+\.\s+)?(?:\*\*)?(?:Reason|Thought|Thinking(?: [pP]rocess)?|Analysis|Analyze|Explanation|Process|Step|Objective)(?:\*\*)?:?\s*/im);
  if (heuristicStart) {
    const startIndex = heuristicStart.index! + heuristicStart[0].length;
    const remainder = text.slice(startIndex);
    const endMatch = remainder.match(/<start_function|<call:|!!SEARCH|\{query:|\[SENTINEL_QUERY\]/i);
    if (endMatch) {
      return text.substring(startIndex, startIndex + endMatch.index!).replace(/^\s*>\s*/gm, '').trim();
    }
    return text.substring(startIndex).replace(/^\s*>\s*/gm, '').trim();
  }

  return '';
};

/**
 * filterUI - Filters streaming output for display in the chat UI.
 * Removes all system tags, thought blocks, tool call syntax, and AI slop
 * that should never be shown to the user.
 */
export const filterUI = (text: string, arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4'): string => {
  if (!text) return '';

  let filtered = text
    // ── Vocabulary bleed-through guard ──────────────────────────────────────
    .replace(/\[multimodal\]/gi, '')
    .replace(/<unused\d+>/gi, '')
    .replace(/<pad>/gi, '')
    .replace(/<bos>/gi, '')
    .replace(/<eos>/gi, '')
    .replace(/\b(?:unused\d{1,3}|pad|bos|eos)\b/gi, '')
    .replace(/<(?:start_of_image|end_of_image|image_soft_token|unk|mask)>/gi, '')
    // ────────────────────────────────────────────────────────────────────────
    // Llama 3: strip header markers, EOT/EOM boundaries, and raw formatting
    .replace(/<\|begin_of_text\|>/gi, '')
    .replace(/<\|start_header_id\|>\s*(?:system|user|assistant|ipython)\s*<\|end_header_id\|>\s*\n?/gi, '')
    .replace(/<\|eot_id\|>|<\|eom_id\|>/gi, '')
    // Gemma 3 & 4: strip turn-marker + role label combos
    .replace(/<start_of_turn>\s*(?:model|user|system)\s*\n?/gi, '')
    .replace(/<end_of_turn>\s*\n?/gi, '')
    .replace(/<\|turn>\s*(?:model|user|system|tool)\s*\n?/gi, '')
    .replace(/<turn\|>\s*\n?/gi, '')
    // Generic turn/boundary token stripper
    .replace(/<\|?start_of_(?:of_)?turn\|?>|<\|?end_of_(?:of_)?turn\|?>|<\|?im_(?:start|end)\|?>|<\|eot_id\|>|<\|?turn\|?>|<turn\|>/gi, '')
    .replace(/<(?:start_function_call|end_function_call|start_function_response|end_function_response)>/gi, '')
    // Tool calls - single line bounds
    .replace(/!!SEARCH[^\n]*/gi, '')
    .replace(/\[SEARCH:\s*[^\]]*\]?/gi, '')
    .replace(/\[SENTINEL_QUERY\]:?[^\n]*/gi, '')
    .replace(/\{query:[^\n]*/gi, '')
    .replace(/call:hybrid_search[^\n]*/gi, '');

  // Helper for bounded blocks avoiding catastrophic backtracking
  const stripBoundedBlock = (startR: RegExp, endR: RegExp, fallbackToEnd: boolean) => {
    while (true) {
      const startMatch = filtered.match(startR);
      if (!startMatch) break;
      const blockStart = startMatch.index!;
      const afterStart = blockStart + startMatch[0].length;
      
      const endMatch = filtered.slice(afterStart).match(endR);
      if (endMatch) {
        const blockEnd = afterStart + endMatch.index! + endMatch[0].length;
        filtered = filtered.substring(0, blockStart) + filtered.substring(blockEnd);
      } else {
        if (fallbackToEnd) {
          filtered = filtered.substring(0, blockStart);
        }
        break;
      }
    }
  };

  // Strip multiline tool blocks
  stripBoundedBlock(/<\|tool_call>/i, /<tool_call\|>/, true);
  stripBoundedBlock(/<\|tool_response>/i, /<tool_response\|>/, true);
  stripBoundedBlock(/\[TOOL_RESULT\]:/i, /\n\n/, true);
  stripBoundedBlock(/\[\[RULE:/i, /\]\]/, true);

  // Remove thought blocks safely
  stripBoundedBlock(/<(?:\|?\s*(?:thought|think|reasoning)\s*\|?|\|channel>thought)>/i, /<\/(?:\|?thought\|?|\|?think\|?)>|<(?:thought|think|channel)\|?>/i, true);
  stripBoundedBlock(/\[(?:thought|think|reasoning)\]/i, /\[\/(?:thought|think|reasoning)\]/i, true);

  // Strip heuristic blocks to triggers
  const stripHeuristicToTrigger = (heuristicR: RegExp) => {
    const triggerRegex = /\b!!SEARCH\b|\bcall:\b|\{query:|\[SENTINEL_QUERY\]/i;
    while (true) {
      const startMatch = filtered.match(heuristicR);
      if (!startMatch) break;
      const blockStart = startMatch.index!;
      const afterStart = blockStart + startMatch[0].length;
      
      const endMatch = filtered.slice(afterStart).match(triggerRegex);
      if (endMatch) {
        const blockEnd = afterStart + endMatch.index!;
        filtered = filtered.substring(0, blockStart) + filtered.substring(blockEnd);
      } else {
        break; // Leave as is if no trigger
      }
    }
  };

  // 1. Regla Inequívoca
  stripHeuristicToTrigger(/^\s*(?:\s*>\s*)?(?:\d+\.\s+)?(?:\*\*)?(?:Reason|Thought|Thinking(?: [pP]rocess)?|Analysis|Analyze|Explanation)(?:\*\*)?:?/mi);
  // 2. Regla Condicionada
  stripHeuristicToTrigger(/^\s*(?:\s*>\s*)?(?:\d+\.\s+)?(?:\*\*)?(?:Acknowledge|Plan|Search|Verify|Report|Goal|Step|Process|Objective)(?:\*\*)?:?/mi);

  // Remove any leading markdown blockquote character or bullet left behind after stripping thought process
  filtered = filtered.trim().replace(/^(\s*>\s*)+/, '');

  return filtered.replace(/\n{3,}/g, '\n\n').trim();
};

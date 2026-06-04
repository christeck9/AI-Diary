/**
 * SentinelService.ts
 * 
 * Handles input/output dialect detection, intent analysis, and model-specific prompt formatting.
 */

import { purifyQuery } from './TextUtils';

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
  { id: 'GEMMA4_NATIVE', regex: /<\|tool_call\|>\s*search\s*\{\s*query\s*:\s*["']?([^"'}]+)["']?\s*\}\s*(?:<\/\|tool_call\|>|<\/tool_call>)?/i, stream: 'DEEP_RESEARCH' },
  { id: 'GEMMA3_SLIM', regex: /\[SEARCH:\s*["']?([^"\]]+)["']?\]/i, stream: 'DEEP_RESEARCH' },
  { id: 'XML_PARTIAL', regex: /<call:[\w_]*/i, stream: 'DEEP_RESEARCH' },
  { id: 'XML_STRICT', regex: /<call:hybrid_search\{query:["']?([^"'>}]+)["']?\}?\/?>/i, stream: 'DEEP_RESEARCH' },
  { id: 'JSON_INTENT', regex: /\{query:["']?([^"'}]+)["']?\}/i, stream: 'DEEP_RESEARCH' },
  // Se cambia a grupos de no captura (?:...) para forzar el uso de userQuery
  { id: 'KNOWLEDGE_GAP', regex: /\b(?:knowledge cutoff|cannot provide|don't know|not sure|unsure|definitive answer|no internal information|no tengo información actualizada|frozen knowledge|parametric memory|beyond my training|training data cutoff|parametric knowledge|cutoff date|as of my training)\b/i, stream: 'FAST_FACT' },
  { id: 'PROTOCOL_TAG', regex: /(?:<start_function_call>|<tool_code>|!!SEARCH)\(?["']?([^"')]*)["']?\)?/i, stream: 'DEEP_RESEARCH' },
  { id: 'SENTINEL_QUERY', regex: /\[SENTINEL_QUERY\]:?\s*(.+)/i, stream: 'DEEP_RESEARCH' },
  // Se cambia a grupos de no captura (?:...) para forzar el uso de userQuery
  { id: 'FACT_TRIGGER', regex: /\b(?:who is|what is|precio de|clima en|weather in|capital of|age of|born in|quien es|que es|donde esta)\b/i, stream: 'FAST_FACT' },
  { id: 'BIBLIOGRAPHIC', regex: /\b(?:book|libro|tratado|treatise|author|autor|bibliography|bibliografia|codex)\b/i, stream: 'BIBLIOGRAPHIC' }
];

const currentYear = new Date().getFullYear();
const POST_RECENT_REGEX = new RegExp(`\\b(actual|news|current|hoy|today|${currentYear - 2}|${currentYear - 1}|${currentYear}|${currentYear + 1}|precio|clima|weather|status|ahora|noticias|latest)\\b`, 'i');
const FACTUAL_FORCE_REGEX = /\b(who is the current|what is the current|president of|prime minister of)\b/i;
const QUICK_FACT_REGEX = /\b(precio|clima|weather|age|born)\b/i;

/**
 * processInbound - Detects intent across multiple dialects (v6.3 Cutoff-Aware)
 */
export const processInbound = (text: string, userQuery: string): InboundDetection => {
  // Fast pre-scan check: exit early if text contains no trigger characters or keywords,
  // bypassing expensive sequential regex matches on every token chunk.
  const hasPossibleTrigger = 
    text.includes('<') || 
    text.includes('[') || 
    text.includes('{') || 
    text.includes('!') || 
    /\b(cutoff|cannot|don't|not sure|unsure|definitive|no info|information|frozen|parametric|memory|data|born|quien|quién|que|qué|donde|dónde|who|what|where|precio|clima|weather|capital|age|book|libro|tratado|treatise|author|autor|bibliography|bibliografia|codex)\b/i.test(text);

  if (!hasPossibleTrigger) {
    const isFactualForce = FACTUAL_FORCE_REGEX.test(userQuery);
    const isCurrentEvent = POST_RECENT_REGEX.test(userQuery);

    if ((isCurrentEvent || isFactualForce) && !text.includes("!!SEARCH")) {
      return { 
        detected: true, 
        query: purifyQuery(userQuery), 
        dialect: 'PROACTIVE_CURRENCY_CHECK', 
        stream: (isFactualForce || QUICK_FACT_REGEX.test(userQuery)) ? 'FAST_FACT' : 'DEEP_RESEARCH' 
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

  const isFactualForce = FACTUAL_FORCE_REGEX.test(userQuery);
  const isCurrentEvent = POST_RECENT_REGEX.test(userQuery);

  if ((isCurrentEvent || isFactualForce) && !text.includes("!!SEARCH")) {
    return { 
      detected: true, 
      query: purifyQuery(userQuery), 
      dialect: 'PROACTIVE_CURRENCY_CHECK', 
      stream: (isFactualForce || QUICK_FACT_REGEX.test(userQuery)) ? 'FAST_FACT' : 'DEEP_RESEARCH' 
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
  const isNull = context.liveData === "SENTINEL_NULL_DATA";
  const verifiedData = isNull
    ? (normalizedLang === 'en' ? "No verified external data found. Report that no verified information is available." : "No se encontró información externa verificada. Informa que no hay información verificada disponible.")
    : context.liveData;

  const bypassPhrase = normalizedLang === 'en'
    ? "Reviewing the updated data for this specific query, I confirm that "
    : "Revisando los datos actualizados para esta consulta específica, confirmo que ";

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
    // Restores the `<|turn|>model` prefix so the tool call is correctly inside a model turn.
    return `<|turn|>model\n<|tool_call|>search{query:<|"|>${context.query}<|"|>}</|tool_call|><|turn|>\n<|turn|>tool\n<|tool_response|>\n{\n  "name": "search",\n  "status": "${isNull ? 'failed' : 'success'}",\n  "verified_environment_data": ${JSON.stringify(verifiedData)}\n}\n</|tool_response|><|turn|>\n<|turn|>model\n${bypassPhrase}`;
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

  return `<start_of_turn>model
${memoryHeader}
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

  // 1. Explicit tags (Angle Brackets)
  const tagMatch = text.match(/<(?:\|?thought\|?|\|?think\|?)>([\s\S]*?)(?:<\/(?:\|?thought\|?|\|?think\|?)>|$)/i);
  if (tagMatch) {
    return tagMatch[1].replace(/^\s*>\s*/gm, '').trim();
  }

  // 2. Explicit tags (Square Brackets used by some Gemma 4 instances)
  const bracketMatch = text.match(/\[(?:thought|think|reasoning)\]([\s\S]*?)(?:\[\/(?:thought|think|reasoning)\]|$)/i);
  if (bracketMatch) {
    return bracketMatch[1].replace(/^\s*>\s*/gm, '').trim();
  }

  // 3. Heuristic patterns (AI Slop detection/extraction)
  const heuristicMatch = text.match(/^(?:> )?(?:\d+\.\s+)?(?:\*\*)?(?:Reason|Thought|Thinking(?: [pP]rocess)?|Analysis|Analyze|Explanation|Process|Step|Objective)(?:\*\*)?:?[\s\S]*?(?=<start_function|<call:|!!SEARCH|\{query:|\[SENTINEL_QUERY\]|$)/im);
  if (heuristicMatch) {
    return heuristicMatch[0].replace(/^\s*>\s*/gm, '').trim();
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
    // Gemma 3 multimodal projector can emit raw tile tokens ([multimodal],
    // <unused12>, <pad>, etc.) during Round 2 when mmproj is initialized but
    // no image is attached. Strip these before any other processing.
    .replace(/\[multimodal\]/gi, '')
    .replace(/<unused\d+>/gi, '')
    .replace(/<pad>/gi, '')
    .replace(/<bos>/gi, '')
    .replace(/<eos>/gi, '')
    // ────────────────────────────────────────────────────────────────────────
    // Llama 3: strip header markers, EOT/EOM boundaries, and raw formatting
    .replace(/<\|begin_of_text\|>/gi, '')
    .replace(/<\|start_header_id\|>\s*(?:system|user|assistant|ipython)\s*<\|end_header_id\|>\s*\n?/gi, '')
    .replace(/<\|eot_id\|>|<\|eom_id\|>/gi, '')
    // Gemma 3: strip full turn-marker + role label combos to prevent control token residue in TTS.
    // Pattern: <start_of_turn>model, <start_of_turn>user, <end_of_turn> — including the newline.
    // These must be removed BEFORE the generic tag stripper, which only removes the tag itself.
    .replace(/<start_of_turn>\s*(?:model|user|system)\s*\n?/gi, '')
    .replace(/<end_of_turn>\s*\n?/gi, '')
    // Generic turn/boundary token stripper (covers Gemma 4 |turn| variants and leftovers)
    .replace(/<\|?start_of_(?:of_)?turn\|?>|<\|?end_of_(?:of_)?turn\|?>|<\|?im_(?:start|end)\|?>|<\|eot_id\|>|<\|?turn\|?>/gi, '')
    .replace(/<(?:start_function_call|end_function_call|start_function_response|end_function_response)>/gi, '')
    .replace(/!!SEARCH[\s\S]*?(?=\n|$)/gi, '')
    .replace(/\[SEARCH:\s*[^\]]*\]?/gi, '') // Strips Gemma 3 slim search tag
    .replace(/<\|tool_call\|>[\s\S]*?(?:<\/\|tool_call\|>|<\/tool_call>|$)/gi, '') // Strips Gemma 4 tool call tag
    .replace(/\[SENTINEL_QUERY\]:?[\s\S]*?(?=\n|$)/gi, '')
    .replace(/\{query:[\s\S]*?(?=\n|$)/gi, '')
    .replace(/call:hybrid_search[\s\S]*?(?=\n|$)/gi, '')
    .replace(/\[TOOL_RESULT\]:[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/<\|tool_response\|>[\s\S]*?(?:<\/\|tool_response\|>|<\/tool_response>|$)/gi, '');

  // Remove thought blocks (complete angle brackets)
  filtered = filtered.replace(/<(?:\|?\s*(?:thought|think|reasoning)\s*\|?)>[\s\S]*?<\/(?:\|?thought\|?|\|?think\|?)>/gi, '');
  // Remove thought blocks (complete square brackets)
  filtered = filtered.replace(/\[(?:thought|think|reasoning)\][\s\S]*?\[\/(?:thought|think|reasoning)\]/gi, '');

  // Remove unclosed thought blocks (model cut off mid-thought)
  filtered = filtered.replace(/<(?:\|?\s*(?:thought|think|reasoning)\s*\|?)>[\s\S]*$/gi, '');
  filtered = filtered.replace(/\[(?:thought|think|reasoning)\][\s\S]*$/gi, '');

  // Remove heuristic reasoning headers (AI slop) globally for both architectures
  filtered = filtered.replace(/^(?:\s*>\s*)?(?:\d+\.\s+)?(?:\*\*)?(?:Reason|Thought|Thinking(?: [pP]rocess)?|Analysis|Analyze|Explanation|Acknowledge|Plan|Search|Verify|Report|Goal|Step|Process|Objective)(?:\*\*)?:?[\s\S]*?(?=\b!!SEARCH\b|\bcall:\b|\{query:|\[SENTINEL_QUERY\]|$)/gim, '');

  // Remove rule injections (persona leaks)
  filtered = filtered.replace(/\[\[RULE:[\s\S]*?\]\]/gi, '');

  // Remove any leading markdown blockquote character or bullet left behind after stripping thought process
  filtered = filtered.trim().replace(/^(\s*>\s*)+/, '');

  return filtered.replace(/\n{3,}/g, '\n\n').trim();
};

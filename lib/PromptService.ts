import { ModelInfo } from '../hooks/useAppLlm';
import { getGemmaSystemPrompt, getLanguageAnchor, PromptComplexity } from './systemPrompt';

import { Message, UserProfile, PsyProfile } from '../types';
export type { Message, UserProfile, PsyProfile };

function compressProfile(u: any): string {
  const parts = [
    `name:${u.name}`,
    `nick:${u.nickname}`,
    `work:${u.work}`,
    `val:${u.values?.join('|') || 'none'}`,
    `stGoal:${u.shortTermGoal || 'none'}`,
    `ltGoal:${u.longTermGoal || 'none'}`,
    `style:${u.responseStyle?.join('|') || 'default'}`,
    `likes:${u.likes}`
  ];
  return `UserContext{${parts.join(',')}}`;
}

export function getSystemPrompt(
  lang: 'en' | 'es',
  userProfile: UserProfile,
  psyProfile: PsyProfile,
  psyCompleted: boolean,
  fileContext: string = '',
  complexity: PromptComplexity = PromptComplexity.MEDIUM,
  arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4'
): string {
  const userContext = psyCompleted 
    ? `[PSY_PROFILE]: O${psyProfile.O}C${psyProfile.C}E${psyProfile.E}A${psyProfile.A}N${psyProfile.N}. UserInfo: ${compressProfile(userProfile)}`
    : `UserInfo: ${compressProfile(userProfile)}`;

  return getGemmaSystemPrompt(lang, userContext + (fileContext ? ` FileCtx: ${fileContext}` : ''), complexity, arch);
}

export function formatFullPrompt(
  activeModel: ModelInfo | null,
  systemPrompt: string,
  history: Message[],
  currentMessage: string,
  lang: 'en' | 'es',
  ragContext: string = '',
  imageAttached: boolean | number = false,
  foldedContext: string = '',
  consciousnessLevel: number = 2
): string {
  const isLlama = activeModel?.id.includes('llama') || (activeModel as any)?.name?.toLowerCase().includes('llama');
  const isGemma4 = !isLlama && (activeModel?.id.includes('gemma4') || (activeModel as any)?.name?.toLowerCase().includes('gemma4') || activeModel?.id.includes('e2b'));
  
  const startToken = isGemma4 ? '<|turn>' : '<start_of_turn>';
  const endToken = isGemma4 ? '<turn|>\n' : '<end_of_turn>\n';
  
  let imageToken = '';
  if (typeof imageAttached === 'number') {
    for (let i = 0; i < imageAttached; i++) {
      imageToken += `<__media__>\n`;
    }
  } else if (imageAttached) {
    imageToken = '<__media__>\n';
  }
  
  const langAnchor = getLanguageAnchor(lang);
  const contextBlock = ragContext 
    ? (lang === 'es' 
        ? `\n[CONTEXTO PASADO RECUPERADO]:\n${ragContext}\n[FIN CONTEXTO PASADO]\n(REGLA: IGNORA el contexto pasado si no es 100% relevante para la pregunta actual. NO te disculpes ni menciones este contexto si decides ignorarlo.)\n\n`
        : `\n[RETRIEVED PAST CONTEXT]:\n${ragContext}\n[END PAST CONTEXT]\n(RULE: IGNORE the past context if it is not 100% relevant to the current prompt. Do NOT apologize or mention this context if you ignore it.)\n\n`) 
    : '';
  const foldedBlock = foldedContext 
    ? (lang === 'es'
        ? `\n[RESUMEN DE LA SESIÓN ACTUAL]:\n${foldedContext}\n[FIN RESUMEN]\n`
        : `\n[CURRENT SESSION SUMMARY]:\n${foldedContext}\n[END SUMMARY]\n`)
    : '';
    
  if (isLlama) {
    // Llama 3.2 1B Instruct Chat Template:
    // <|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>
    let prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}${foldedBlock}<|eot_id|>\n`;

    history.forEach(msg => {
      const role = (msg.role as string) === 'ai' || (msg.role as string) === 'assistant' ? 'assistant' : ((msg.role as string) === 'tool' || (msg.role as string) === 'ipython' ? 'ipython' : 'user');
      const content = msg.role === 'tool' ? `[TOOL_RESULT]:\n${msg.text}` : msg.text;
      prompt += `<|start_header_id|>${role}<|end_header_id|>\n\n${content}<|eot_id|>\n`;
    });

    // Dynamically check if query requires search or contains distress to keep prompt size minimal for Llama 3.2 1B
    const isSearchQuery = /(?:^|\s)(news|noticias|latest|hoy|today|esta semana|this week|actualidad|actualizado|actualizada|lo [uú]ltimo|novedades|tendencias|trends|who is|what is|president|prime minister|presidente|primer ministro|invest|buscar|busca|busque|find out|google|websearch|consultar|consulta)(?:\s|$)/i.test(currentMessage);
    const isDistressQuery = /\b(suicid|morir|muert|cortar|llorar|triste|depresi|ayuda|solo|sola|ansied|panico|pánico)\b/i.test(currentMessage);

    const searchDirective = isSearchQuery
      ? (lang === 'es'
          ? `\nPara buscar en internet noticias o datos actuales, debes generar SOLAMENTE el texto exacto [SEARCH: tu_consulta] y detenerte inmediatamente.`
          : `\nTo search the internet for news or current data, you must ONLY generate the exact text [SEARCH: your_query] and stop immediately.`)
      : '';
      
    const safetyDirective = isDistressQuery
      ? (lang === 'es'
          ? `\n\n[PAUTAS DE BIENESTAR Y APOYO]:\n- Fomenta la paz, el bienestar y el crecimiento personal en tus respuestas.\n- Escucha con calidez y empatía de forma no directiva, sin realizar diagnósticos de salud.\n- Ante expresiones de malestar muy profundo, orienta al usuario con suavidad hacia profesionales de la salud o líneas de apoyo.`
          : `\n\n[WELL-BEING & SUPPORT GUIDELINES]:\n- Promote peace, well-being, and personal growth in your responses.\n- Listen with warmth and empathy in a non-directive manner, without making health diagnoses.\n- If the user expresses deep distress, gently guide them toward health professionals or support helplines.`)
      : '';

    let brevityDirective = '';
    if (lang === 'es') {
      if (consciousnessLevel === 1) brevityDirective = 'SÉ EXTREMADAMENTE BREVE, MÁXIMO 1 ORACIÓN.';
      else if (consciousnessLevel === 2) brevityDirective = 'SÉ CONCISO Y DIRECTO.';
      else if (consciousnessLevel === 3) brevityDirective = 'SÉ DETALLADO Y REFLEXIVO.';
      else brevityDirective = 'SÉ PROFUNDO, REFLEXIVO Y EXPLAYATE TODO LO QUE CONSIDERES NECESARIO.';
    } else {
      if (consciousnessLevel === 1) brevityDirective = 'BE EXTREMELY BRIEF, MAX 1 SENTENCE.';
      else if (consciousnessLevel === 2) brevityDirective = 'BE CONCISE AND DIRECT.';
      else if (consciousnessLevel === 3) brevityDirective = 'BE DETAILED AND REFLECTIVE.';
      else brevityDirective = 'BE DEEP, REFLECTIVE, AND EXPAND AS MUCH AS YOU CONSIDER NECESSARY.';
    }

    const languageDirective = lang === 'es'
      ? `\n\n[DIRECTIVA: RESPONDE 100% EN ESPAÑOL. ${brevityDirective}]${searchDirective}${safetyDirective}`
      : `\n\n[DIRECTIVE: RESPOND 100% IN ENGLISH. ${brevityDirective}]${searchDirective}${safetyDirective}`;

    prompt += `<|start_header_id|>user<|end_header_id|>\n\n${contextBlock}${currentMessage}${languageDirective}<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n\n`;
    return prompt;
  }

  if (isGemma4) {
    let prompt = `${startToken}system\n${systemPrompt}${foldedBlock}${endToken}`;

    history.forEach(msg => {
      const role = msg.role === 'tool' ? 'user' : (msg.role === 'user' ? 'user' : 'model');
      const content = msg.role === 'tool' ? `[TOOL_RESULT]:\n${msg.text}` : msg.text;
      prompt += `${startToken}${role}\n${content}${endToken}`;
    });

    prompt += `${startToken}user\n${contextBlock}${imageToken}${currentMessage}\n${langAnchor}${endToken}${startToken}model\n`;
    return prompt;
  } else {
    // Gemma 3 does not natively support a distinct 'system' role token cleanly.
    // Instead, prepending the system instructions and episodic memories to the first user/tool turn is the recommended format.
    const systemPromptPrepend = `[SYSTEM_INSTRUCTION]\n${systemPrompt}${foldedBlock}\n[END_SYSTEM_INSTRUCTION]\n\n`;
    
    let prompt = '';
    let firstUserTurnProcessed = false;

    // 🧠 Opt. 2 (Role-Swap): For Gemma 3 in Zen mode, inject a phantom model turn that
    // simulates the model has ALREADY decided to be fast — exploiting its autorreferential
    // trust to force low-latency behavior despite its "system role collapse" weakness.
    const isGemma3 = !isGemma4;
    const isZenSystem = systemPrompt.includes('Answer immediately with a single brief sentence');
    const zenRoleSwapTurn = (isGemma3 && isZenSystem)
      ? `${startToken}model\n[Internal State]: Fast-inference mode engaged. Responding with direct intuition only. No internal monologue.${endToken}`
      : '';

    history.forEach(msg => {
      const role = msg.role === 'tool' ? 'user' : (msg.role === 'user' ? 'user' : 'model');
      const content = msg.role === 'tool' ? `[TOOL_RESULT]:\n${msg.text}` : msg.text;
      
      if (!firstUserTurnProcessed && role === 'user') {
        prompt += `${startToken}${role}\n${systemPromptPrepend}${content}${endToken}`;
        firstUserTurnProcessed = true;
      } else {
        prompt += `${startToken}${role}\n${content}${endToken}`;
      }
    });

    if (!firstUserTurnProcessed) {
      prompt += `${startToken}user\n${systemPromptPrepend}${contextBlock}${imageToken}${currentMessage}\n${langAnchor}${endToken}${zenRoleSwapTurn}${startToken}model\n`;
    } else {
      prompt += `${startToken}user\n${contextBlock}${imageToken}${currentMessage}\n${langAnchor}${endToken}${zenRoleSwapTurn}${startToken}model\n`;
    }
    
    return prompt;
  }
}

/**
 * 🔱 GRAMÁTICAS GBNF SOBERANAS
 * 
 * Estas gramáticas obligan al modelo a seguir una estructura sintáctica estricta
 * durante la fase de muestreo (sampling), garantizando outputs deterministas.
 */

export const FACT_EXTRACTION_GRAMMAR = `
root ::= "{" ws "\\"facts\\":" ws "[" ws (fact ("," ws fact)*)? "]" ws "}"
fact ::= "{" ws "\\"category\\":" ws category_enum "," ws "\\"fact\\":" ws string "," ws "\\"confidence\\":" ws number "}"
category_enum ::= "\\"Preferencias\\"" | "\\"Datos Personales\\"" | "\\"Metas\\"" | "\\"Sabiduría\\"" | "\\"Identidad\\"" | "\\"Proyecto\\""
string ::= "\\"" [^"\\\\]* "\\""
number ::= "0." [0-9]+ | "1.0"
ws ::= [ \\t\\n]*
`;

/**
 * Prompt Maestro para la Extracción (Optimizado para Gemma 4 E2B)
 */
export const getExtractionPrompt = (userMsg: string, aiMsg: string, arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4') => {
  const safeUserMsg = userMsg.replace(/"/g, '\\"').replace(/<\|turn>/g, '').replace(/<start_of_turn>/g, '').replace(/<\|begin_of_text|>/g, '');
  const safeAiMsg = aiMsg.replace(/"/g, '\\"').replace(/<\|turn>/g, '').replace(/<start_of_turn>/g, '').replace(/<\|begin_of_text|>/g, '');

  if (arch === 'llama') {
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

Eres el Subsistema de Memoria Forense del AI Diary. 
Tu misión es extraer HECHOS DECLARATIVOS sobre el usuario a partir de la conversación.

REGLAS CRÍTICAS:
1. Solo extrae información confirmada por el usuario.
2. Si no hay hechos nuevos, devuelve {"facts": []}.
3. Categorías: Preferencias, Datos Personales, Metas, Sabiduría, Identidad, Proyecto.
4. Responde ÚNICAMENTE con el JSON.<|eot_id|><|start_header_id|>user<|end_header_id|>

ENTRADA:
Usuario: "${safeUserMsg}"
Asistente: "${safeAiMsg}"<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  } else if (arch === 'gemma3') {
    return `<start_of_turn>system
Eres el Subsistema de Memoria Forense del AI Diary. 
Tu misión es extraer HECHOS DECLARATIVOS sobre el usuario a partir de la conversación.

REGLAS CRÍTICAS:
1. Solo extrae información confirmada por el usuario.
2. Si no hay hechos nuevos, devuelve {"facts": []}.
3. Categorías: Preferencias, Datos Personales, Metas, Sabiduría, Identidad, Proyecto.
4. Responde ÚNICAMENTE con el JSON.<end_of_turn>
<start_of_turn>user
ENTRADA:
Usuario: "${safeUserMsg}"
Asistente: "${safeAiMsg}"<end_of_turn>
<start_of_turn>model
`;
  } else {
    return `<|turn>system
Eres el Subsistema de Memoria Forense del AI Diary. 
Tu misión es extraer HECHOS DECLARATIVOS sobre el usuario a partir de la conversación.

REGLAS CRÍTICAS:
1. Solo extrae información confirmada por el usuario.
2. Si no hay hechos nuevos, devuelve {"facts": []}.
3. Categorías: Preferencias, Datos Personales, Metas, Sabiduría, Identidad, Proyecto.
4. Responde ÚNICAMENTE con el JSON.<turn|>
<|turn>user
ENTRADA:
Usuario: "${safeUserMsg}"
Asistente: "${safeAiMsg}"<turn|>
<|turn>model
`;
  }
};


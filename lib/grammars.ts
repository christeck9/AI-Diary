/**
 * 🔱 GRAMÁTICAS GBNF SOBERANAS
 * 
 * Estas gramáticas obligan al modelo a seguir una estructura sintáctica estricta
 * durante la fase de muestreo (sampling), garantizando outputs deterministas.
 */

export const FACT_EXTRACTION_GRAMMAR = `
root ::= "{" ws "\\"facts\\":" ws "[" ws fact ("," ws fact)* "]" ws "}"
fact ::= "{" ws "\\"category\\":" ws category_enum "," ws "\\"fact\\":" ws string "," ws "\\"confidence\\":" ws number "}"
category_enum ::= "\\"Preferencias\\"" | "\\"Datos Personales\\"" | "\\"Metas\\"" | "\\"Sabiduría\\"" | "\\"Identidad\\"" | "\\"Proyecto\\""
string ::= "\\"" [^"\\\\]* "\\""
number ::= "0." [0-9]+ | "1.0"
ws ::= [ \\t\\n]*
`;

/**
 * Prompt Maestro para la Extracción (Optimizado para Gemma 4 E2B)
 */
export const getExtractionPrompt = (userMsg: string, aiMsg: string) => `<|turn>system
Eres el Subsistema de Memoria Forense del AI Diary. 
Tu misión es extraer HECHOS DECLARATIVOS sobre el usuario a partir de la conversación.

REGLAS CRÍTICAS:
1. Solo extrae información confirmada por el usuario.
2. Si no hay hechos nuevos, devuelve {"facts": []}.
3. Categorías: Preferencias, Datos Personales, Metas, Sabiduría, Identidad, Proyecto.
4. Responde ÚNICAMENTE con el JSON.<turn|>
<|turn>user
ENTRADA:
Usuario: "${userMsg}"
Asistente: "${aiMsg}"<turn|>
<|turn>model
`;

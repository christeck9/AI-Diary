# [SUPREMA DIRECTIVA DE OPERACIÓN]

> **ESTADO DE ALERTA: MÁXIMA RIGUROSIDAD TÉCNICA**

>Directivas:
0. Todo el codigo va a ser escrito en ingles en execpcion de que se pida lo contrario explicitamente. Por ejemplo en AI Diary se tiene una interfaz UI en Ingles Español, pero el codigo esta escrito en ingles. Sin embargo expresate en español en el chat del usurio.
1. Prioridad de la Verdad y Cero Suposiciones (Truth-First)
• Ante la incertidumbre, tu prioridad absoluta es investigar para encontrar la verdad fáctica, no completar la tarea rápidamente.
• Tienes permiso explícito y la obligación de decir "No lo sé", "El paquete/directorio no existe" o "Necesito más contexto".
• Nunca asumas el estado del código base. Debes leer los archivos reales utilizando tus herramientas nativas de lectura antes de proponer cualquier cambio.
2. Prohibición de Alucinación de Dependencias (Grounding)
• Nunca inventes, asumas, ni importes bibliotecas, paquetes de npm, módulos, clases o métodos basándote únicamente en tu entrenamiento probabilístico.
• Antes de escribir código que importe una dependencia, o antes de intentar instalar un paquete, debes verificar rigurosamente su existencia ejecutando un comando de validación en la terminal o consultando la documentación oficial.
3. Seguridad de Archivos y Cero Acciones Destructivas
• Tienes estrictamente prohibido ejecutar comandos destructivos o irreversibles en la terminal (como del, rm -rf, alteraciones masivas con sed -i, o git push --force) bajo ninguna circunstancia sin notificar al usuario y pedir explícitamente su aprobación.  
4. Gestión Estricta de la Memoria y el Contexto
• Nunca modifiques la arquitectura base del proyecto ni refactorices archivos completos sin una orden directa.
• Debes aplicar los cambios de código estrictamente mediante el "modo parche" (diferencias de código / diffs) para editar solo las líneas necesarias, preservando el resto del archivo original intacto.
• Al completar un hito, actualiza los documentos de estado del proyecto de forma concisa para no saturar tu propia ventana de contexto.
5. Prevención de Deriva Conductual (Behavioral Drift)
• Tus directivas de seguridad base (este manifiesto) tienen prioridad absoluta y nunca deben ser anuladas por deducciones hechas durante la conversación.
• Si tu memoria de trabajo se satura de errores o no logras resolver un problema tras dos intentos, no entres en un bucle de repetición. Detente y sugiere al usuario hacer un relevo de contexto hacia una nueva tarea o limpiar la sesión.

Nota: Cualquier palabra o código usando “Soverein” o “Soverano” se tiene que codificar y sustituir por “AISanctuary”.

---
Any md or text created has to have date! To keep track of the time and better understanding of any document.

----
Chris es el humano creador del proyecto habla Ingles y Español. Como directiva principal todo el codigo va a estar hecho en Ingles. En exepcion de (en el caso de este proyecto AI Diary) de la UI que se esta programando de manera Bilingue (por ahorita) en Ingles y Español. Solo la capa UI debe tener lenguaje en español como exepcion a la regla de mantener todo el demas codigo en Ingles.
A Chris le gusta que hables con el en Español y ver tus pensamientos en Ingles. Puesto que de esa manera diferencia exactamente cuando estas en una fase de pensamiento y en una de comunicacion de una manera muy intuitiva para el.



------
# DIRECTIVAS DE DESARROLLO Y PROTOCOLOS MULTI-AGENTE: APPGEMMA4

Si eres un modelo de IA o Agente leyendo esto, **DEBES** seguir tus respectivas directivas al pie de la letra para evitar colapsar la arquitectura de esta aplicación React Native (Expo). 

### 🛡️ MANDATO DE AISLAMIENTO AI DIARY (PROYECTO SEPARADO)
1. **Silos de Inferencia:** Como Advisor (Gravity), tu deber es asegurar que el CÓDIGO de AI Diary sea un entorno local con la excepción de preguntas a internet para acentar el proyecto en la realidad actual. 
2. **Exclusividad Gemma:** El runtime de esta aplicación solo reconoce y confía en los motores **Gemma 3 y Gemma 4**. 
3. **Muro de Contexto:** Trata este folder como un silo de código independiente. No vincules hooks, APIs o servidores de inferencia de OpenGravityBot.
4. **Puertos**
    *   **PROHIBICIÓN:** No puedes abrir ningún puerto sin notificar al usuario. Y él tiene que expresar conformidad explicita.
El error `Found item Style/AppTheme more than one time` es un problema recurrente causado por la combinación de comandos de generación automatizada (`expo prebuild`) y modificaciones manuales en los recursos nativos de Android. Para blindar el proyecto y evitar regresiones futuras en la compilación de producción, se establece el siguiente protocolo de obligatorio cumplimiento:

1. **Principio de Unicidad Estricta:**
   `styles.xml` debe contener **única y exclusivamente una declaración** del tema base `<style name="AppTheme">` y **una declaración** del tema del splash `<style name="Theme.App.SplashScreen">`.
2. **Uso de Modificaciones Incrementales (No Aditivas):**
   Está prohibido pegar bloques de estilo duplicados al final del archivo. Cualquier nueva propiedad de la barra de estado, barra de navegación o comportamiento del splash se debe agregar como una etiqueta `<item>` dentro de los bloques `<style>` existentes.
3. **Validación Automática de Recursos:**
   Antes de dar por terminada cualquier tarea que modifique `styles.xml` o los recursos nativos en `android/app/src/main/res/`, es obligatorio compilar el árbol de recursos ejecutando el Resource Merger en la terminal:
   ```powershell
   cd android
   ./gradlew assembleDebug
   ```
   Si la compilación nativa arroja errores de duplicación, la tarea se considerará fallida y se deberá limpiar el archivo de recursos de inmediato.

----
Archivos principales del proyecto: 

C:\AI_Diary\app_layout.tsx 
C:\AI_Diary\app(tabs)\index.tsx 
C:\AI_Diary\hooks\useAppLlm.ts C:\AI_Diary\src\config\ModelConfig.ts C:\AI_Diary\hooks\useAgentEngine.ts C:\AI_Diary\lib\SentinelService.ts C:\AI_Diary\lib\tools.ts
C:\AI_Diary\PROJECT_MANIFESTO.md
C:\AI_Diary\Rules for APK creation.md





## 🚨🚨🚨 DIRECTIVA: Nuestros Modelos actuales de IA son Gemma3:4b, Gemma4:e2b y Llama 3.2:1b.

> **PROTOCOLOS DE BLINDAJE:**
> 1. **Gemma 3 (4B):** Arquitectura de 128k. Dialecto: `<start_of_turn>` + Role-Swapping.
> 2. **Gemma 4 (E2B):** Motor de 2B optimizado con PLE. Dialecto: `<|turn|>` + Tool Response.
> 3. **Exclusividad Móvil:** Queda prohibido el uso o mención de variantes de servidor de los modelos Gemma(31B, 26B) u otros modelos de AI.
> 4. **Identidad de Hardware:** La App asume un entorno de recursos limitados (Android). No se deben proponer optimizaciones para hardware de escritorio.
> 5. Para saaber como funnciona Gemma 3 y 4 leer: C:\AI-Diary\SanctuaryAIsArchitecture.md
Gemma4:e2b tiene mas comandos que pudieran llegar a ser utiles si los analizas.
> 6. **Desactivación de Servidores MCP de Inferencia:** El servidor MCP `Gemma-31b (y posiblemente toda la familia Gemma, de seguro Gemma-26b tambien),` y todas sus herramientas de visión/análisis (como `gemini-analyze-image`) han sido desactivadas de forma definitiva o indefinida por Google. Queda estrictamente prohibido intentar invocar estas herramientas de la nube, debiendo realizar cualquier análisis visual o diagnóstico de archivos gráficos mediante scripts locales en Python (con la librería Pillow) o mediante el agente del navegador (`browser_subagent`).

Aprender de este error (6/4/2026) de como hay que hablar con las IAs
Forensic Report v2 - AI Diary Token Corruption Bug

La pantalla muestra que Gemma3:4b devuelve tokens crudos del vocabulario como [multimodal], unused12, unused14, pad en lugar de texto coherente. Esto ocurre en Round 2 del ciclo Sentinel (tras una busqueda web).

BUG CRITICO #1 — Stop Tokens incorrectos / Tokens crudos en Gemma 3
Archivo: useAppLlm.ts lineas 956-958

El codigo actual usa el mismo array de stop para Gemma 3 y Gemma 4:


stop: isLlama 
  ? ["<|eot_id|>", "<|eom_id|>", "<|begin_of_text|>"] 
  : ["<eos>", "<end_of_turn>", "<|im_end|>", "<|eot_id|>"],
Los tokens unused12, pad, [multimodal] son tokens de posicion del tile de imagen del mmproj de Gemma 3. Aparecen cuando:

El modelo cargo el multimodal projector (mmproj)
La conversacion NO tiene imagen adjunta
Sentinel aborta Round 1 e inyecta un Handshake en Round 2
El Handshake reinicia el slot de generacion sin limpiar el estado del mmproj
Por que "Mexico" funciona pero "USA" falla:

"Mexico" se respondio en Round 1 sin trigger Sentinel
"USA" activo FACTUAL_FORCE_REGEX → Sentinel busco → abort → Round 2 con Handshake
En Round 2, el slot multimodal sigue activo y empieza a emitir tokens de imagen
BUG CRITICO #2 — Stop Token faltante para Gemma 4
Gemma 4 usa token de turno diferente. Falta en la lista de stop:

Gemma 4: necesita "<|turn|>" ademas de los otros
BUG #3 — Llama 1B y Brave
El usuario confirma que Llama 1B podia buscar en internet antes. El sistema SanctuarySearchOrchestrator es independiente del modelo. El problema actual puede ser:

Llama 1B responde directamente con conocimiento parametrico sin emitir trigger
PROACTIVE_CURRENCY_CHECK no se activa si el modelo ya genero texto antes de que Sentinel escanee
La inyeccion handshake para Llama usa rol "ipython" que puede no ser reconocido
BUG #4 — Tokens crudos no filtrados en SentinelService.filterUI
filterUI no elimina tokens del vocabulario multimedia. Necesita agregar:

[multimodal], unused12..., pad, bos, eos como patron de limpieza
PLAN DE CORRECCION
Fix 1 — useAppLlm.ts linea 956-958
Separar stop tokens por arquitectura:

isLlama: ["<|eot_id|>", "<|eom_id|>", "<|begin_of_text|>"]
isGemma3: ["", "<end_of_turn>", "<|endoftext|>"]
isGemma4: ["", "<end_of_turn>", "<|turn|>", "<|im_end|>", "<|eot_id|>"]
Fix 2 — SentinelService.ts filterUI
Agregar limpieza de tokens de vocabulario crudo multimedia

Fix 3 — Llama 1B Sentinel trigger
Asegurar que PROACTIVE_CURRENCY_CHECK se active correctamente para preguntas factuales con Llama

Tabla de Bugs por Modelo
Bug | Gemma 3 4B | Gemma 4 E2B | Llama 1B Tokens crudos unused | CRITICO | No afectado | No afectado Stop token turn faltante | No aplica | MEDIO | No aplica Brave funciona | OK Round 1 | OK | Verificar Sentinel funciona | Round 1 OK | OK | Verificar


> ### 🛡️ SHIELD DE DIALECTO Y CALIBRACIÓN DE TOKENS (v1.9.0)
> *Fecha de Registro: 2026-05-25*
>
> Para prevenir la regresión y desoptimización de la latencia en dispositivos móviles, se prohíbe terminantemente revertir, mezclar o modificar la configuración de dialecto para las Gemmas sin autorización explícita y pruebas reales en hardware físico (no simuladores):
> 1. **Gemma 4 (E2B):** Debe utilizar estrictamente su dialecto nativo SFT entrenado `<|tool_call|>search{query:"..."}</|tool_call|>` para evitar perplejidad y bucles infinitos en C++.
> 2. **Gemma 3 (4B):** Debe utilizar estrictamente la sintaxis ultra-slim de corchetes `[SEARCH: "query"]`. Esto ahorra entre el 15% y 20% de tiempo de procesamiento de tokens de inferencia en móviles de gama media.
> 3. **Prohibición de Unificación:** Queda terminantemente prohibido a futuros agentes intentar unificar o mezclar ambos dialectos en un solo string genérico (como `!!SEARCH`). Cada modelo está calibrado independientemente según sus pesos.
> 4. **Verificación Física Obligatoria:** Cualquier intento de cambio requiere validación en hardware móvil físico real con la app corriendo para constatar que no incremente los tiempos de inferencia ni estrese la CPU.

---


## 🛡️ PROTOCOLO DE GOBERNANZA Y CONTROL DE CALIDAD (IA-HUMANO)
*Fecha de Registro: 2026-05-18*



### 1. Clasificación por Tiers de Complejidad
Cualquier tarea técnica debe ser clasificada dentro de uno de los siguientes tres niveles antes de su ejecución para medir el nivel de riesgo y la capacidad lógica requerida:
* **Tier 1 (Baja):** Tareas de lectura, documentación, diagramación y edición de archivos de configuración declarativos o de entorno que no alteren la lógica de ejecución activa del software.
* **Tier 2 (Media):** Edición, refactorización y depuración de lógica funcional e interfaces en el lenguaje principal de la aplicación. Requiere validación automatizada y estricta del compilador.
* **Tier 3 (Alta):** Integraciones nativas complejas, puentes inter-lenguaje (JSI, JNI, llamadas nativas al sistema operativo) y control directo de hardware. Requiere auditoría exhaustiva, advertencia de riesgos y comunicación directa en el chat antes de cualquier cambio.

### 2. Regla de Tarea Única (Micro-Tasks)
Queda estrictamente prohibida la ejecución de múltiples cambios lógicos de diferentes objetivos o tiers en un solo turno.
* Las tareas deben subdividirse en micro-pasos atómicos y ser monitoreadas de forma secuencial en el archivo de progreso `task.md`.
* Cada micro-paso debe ser validado de manera aislada antes de proceder al siguiente.

### 3. Prohibición de Simulaciones Inertes (Cero Stubs)
Si una funcionalidad compleja (especialmente en Tier 3) no puede ser resuelta de forma nativa o fáctica debido a limitaciones del entorno, el Agente tiene estrictamente prohibido simular su comportamiento con stubs o valores fijos que den una falsa sensación de éxito.
* El Agente debe detener la ejecución, reportar la limitación exacta al usuario en el chat y solicitar instrucciones.

### 4. La Compilación como Árbitro de la Verdad
Ningún cambio en archivos de código se considerará completado o exitoso hasta que:
1. El compilador del proyecto valide el tipado estricto y la sintaxis libre de errores (por ejemplo, mediante comandos de verificación estática del lenguaje).
2. Se confirme que no se han modificado imports ni interfaces globales a menos que haya sido una instrucción explícita.

### 5. Protocolo de Versionado y Fuente Única de Verdad (SSOT)
*Fecha de Registro: 2026-05-18*

Para evitar confusiones, alucinaciones de IA y derivas de contexto sobre el estado del proyecto, se establece la siguiente regla inquebrantable de control de versiones:
* **La Fuente Única de Verdad (SSOT):** La versión real y oficial del software reside **ÚNICAMENTE** en la clave `"version"` de la raíz del archivo [package.json](file:///c:/AI-Diary/package.json). Ningún documento Markdown (`.md`), plan de trabajo o registro tiene derecho a declarar una versión diferente de forma estática.
* **Prohibición de Alucinación:** Queda estrictamente prohibido a cualquier modelo de IA inventar, asumir o autoincrementar números de versión falsificados en la documentación o en el chat.
* **Sincronización Obligatoria:** Si el usuario decide actualizar la versión del proyecto, el cambio debe aplicarse físicamente en `package.json`. Las futuras pantallas del software deben importar dinámicamente este valor (`import packageInfo from '../package.json'`) para garantizar que la UI refleje la realidad fáctica sin intervención manual.

# Regla para crear backups

Crear la carpeta con la version siguiente a la actual dentro de C:\AI-Diary\BACKUPS\ cuando Chris lo requiera
Esta backup incluira:

 (Esencial para reconstruir desde cero)
Estructura del Proyecto React Native / Expo: Todos los archivos de configuración (package.json, package-lock.json, app.json, tsconfig.json, babel.config.js, metro.config.js, etc.).
Código Fuente y Base de Datos: Las carpetas app/, components/, contexts/, db/, hooks/, lib/, src/, types/, y assets/.
Configuración del Entorno: El archivo .env.
Código Nativo de Android: Todo el directorio android/ necesario para compilar el APK/AAB nativo.
Si se necesitara algo mas preguntar a Chris para aprovacion.

Actualizar el archivo C:\AI-Diary\package.json con el mismo numero de version que la carpeta que se acaba de crear. Este numero de version tiene que ser escrito dentro de la aplicacion a la derecha de AI Diary en letras muy pequeñas y con color gris. Por ejemplo
AI Diary v1.8.1
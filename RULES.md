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
6. Uso Obligatorio de Git como Fuente de Verdad y Red de Seguridad:
• Al inicio de cada conversación o sesión, debes ejecutar obligatoriamente `git status` (y `git diff` si hay cambios pendientes) para entender el estado exacto del código en el que te encuentras, antes de proponer cualquier edición.
• Para deshacer o revertir cambios y recuperar código viejo, utiliza siempre comandos nativos de Git (`git checkout <archivo>`, `git restore`) en lugar de intentar reescribir o adivinar código de memoria.
• Al finalizar con éxito cualquier cambio significativo, tarea o hito, el Agente debe proponer y ejecutar de inmediato un commit de Git (ej: `git add . && git commit -m "mensaje"`) para consolidar los cambios y crear un punto de restauración seguro antes de proceder.

Nota: Cualquier palabra o código usando “Soverein” o “Soverano” se tiene que codificar y sustituir por “AISanctuary” (el antiguo nombre del proyecto) o mejor por su mas actual "AI-Diary" que es el nuevo nombre del proyecto y el nombre de lanzamiento. AI Sanctuary fue el nombre del prototipo asi que podemos tene muchas referencias de el en varias partes de nuestro codigo o Github. Pero siempre usando AI-Diary como el nombre del proyecto. "AISanctuary" solo se usaria en referencias historicas del proyecto.

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
3. **Validación Automática de Recursos y Compilación:**
   **PROHIBICIÓN de `./gradlew assembleDebug`:** Queda estrictamente prohibido que los agentes ejecuten `./gradlew assembleDebug` o comandos de Gradle de forma directa para validar la compilación.
   *Razón:* Al ser un proyecto basado en Expo (aunque con módulos nativos custom), la resolución de plugins (como `expo-module-gradle-plugin`) requiere las variables de entorno inyectadas por la CLI de Node.js. Usar Gradle directamente siempre arrojará falsos positivos de errores.
   *Alternativa permitida:* Para limpiar la caché de compilación sin romper dependencias, el único comando Gradle permitido es `.\gradlew clean`. Toda compilación o prueba debe sugerirse al usuario que la realice en su propia terminal mediante `npx expo run:android`.

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
> 7. **Prohibición de Unificación:** Queda terminantemente prohibido a futuros agentes intentar unificar o mezclar ambos dialectos en un solo string genérico (como `!!SEARCH`). Cada modelo está calibrado independientemente según sus pesos.

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

Crear la carpeta con la versión correspondiente dentro de C:\AI-Diary\BACKUPS\ cuando Chris lo requiera.
Esta backup incluirá:

* **Estructura del Proyecto React Native / Expo:** Todos los archivos de configuración (package.json, package-lock.json, app.json, tsconfig.json, babel.config.js, metro.config.js, react-native.config.js, eslint.config.js, etc.).
* **Código Fuente y Base de Datos:** Las carpetas app/, components/, contexts/, db/, hooks/, lib/, src/, types/, y assets/.
* **Configuración del Entorno:** El archivo .env.
* **Código Nativo de Android (Excluyendo Caché):** Todo el directorio android/ necesario para compilar el APK/AAB nativo, pero **excluyendo explícitamente** las carpetas de caché de compilación (`.gradle`, `.cxx` y carpetas `build/`) para evitar desperdicio de espacio.

Para realizar un respaldo limpio y rápido en Windows PowerShell, se recomienda usar el comando `robocopy` con exclusión de directorios:
```powershell
# Crear carpeta de destino
New-Item -ItemType Directory -Path "C:\AI-Diary\BACKUPS\<version>" -Force
# Copiar código fuente
robocopy "c:\AI-Diary\<carpeta>" "C:\AI-Diary\BACKUPS\<version>\<carpeta>" /E /NFL /NDL /NJH /NJS
# Copiar android excluyendo caché
robocopy "c:\AI-Diary\android" "C:\AI-Diary\BACKUPS\<version>\android" /E /XD .gradle .cxx build /NFL /NDL /NJH /NJS
```

Actualizar el archivo C:\AI-Diary\package.json con el mismo número de versión que la carpeta que se acaba de crear. Este número de versión tiene que ser escrito dentro de la aplicación a la derecha de AI Diary en letras muy pequeñas y con color gris. Por ejemplo:
AI Diary v1.8.1

### 6. Arquitectura de Overlays y Menús (Prevención de colapso WRAP_CONTENT en Android/Fabric)
*Fecha de Registro: 2026-06-11*

**Problema Histórico:**
Al migrar a React Native 0.74.1 (con la arquitectura Bridgeless/Fabric habilitada), el uso del componente `<Modal transparent={true}>` para renderizar menús desplegables pequeños causaba un colapso crítico de layout. El motor de Android evalúa inicialmente el Dialog nativo subyacente con `WRAP_CONTENT`, haciendo que el contenedor colapse al tamaño de su contenido y Android lo centre gravitacionalmente en la pantalla, destruyendo por completo las coordenadas absolutas de posicionamiento (`top`, `right`).

**Regla Estricta y Solución:**
Queda **estrictamente prohibido** usar `<Modal>` para crear menús desplegables, tooltips o popovers que requieran anclarse a coordenadas visuales específicas (como debajo de un botón). 
Todos los menús desplegables deben construirse usando un componente de capa superpuesta (Overlay) posicionado absolutamente y **renderizado fuera del flujo de `<SafeAreaView>`**.

*Implementación de Referencia Obligatoria:*
```tsx
return (
  <>
    <SafeAreaView style={styles.container}>
      {/* Contenido principal y botones que calculan las coordenadas */}
    </SafeAreaView>

    {/* OVERLAY RENDERIZADO COMO HERMANO ABSOLUTO EN LA RAÍZ */}
    <KebabMenuOverlay 
      visible={showMenu} 
      anchorTop={calculatedTop} 
      onClose={() => setShowMenu(false)} 
    />
  </>
);
```
Esta estrategia fuerza al overlay a compartir el mismo sistema de coordenadas de la ventana (Window) evitando los bugs nativos de los Modales en el nuevo motor de renderizado.

### 7. Prohibición de Comandos Destructivos de Expo (Prebuild)
*Fecha de Registro: 2026-06-11*

**Problema:**
Dado que este proyecto es una arquitectura híbrida avanzada (Bare Workflow modificado) que contiene código nativo escrito a mano directamente dentro de la carpeta `android/` (como `LlmForegroundService.kt` o puentes JNI como `vision_bridge.cpp` y `VisionBridge.kt`), el uso de comandos de Continuous Native Generation (CNG) de Expo es extremadamente peligroso.

**Regla Estricta:**
Queda **ESTRICTAMENTE PROHIBIDO** que cualquier agente de IA ejecute, recomiende o sugiera al usuario ejecutar `npx expo prebuild` o `npx expo prebuild --clean`.
*Razón:* Este comando aniquila y borra por completo la carpeta `android/` para regenerarla desde cero basándose en `app.json`. Esto resultará en la eliminación permanente e irreversible de todo el código fuente nativo hecho a medida para AI Diary.

*Flujo de compilación autorizado:*
1. Para limpiar cachés: Usar únicamente `.\gradlew clean` (Opcional, seguro, no borra código).
2. Para compilar la app y correr el entorno: Usar únicamente `npx expo run:android`.

### 8. Protocolo de Integridad de Código y Mapa Arquitectónico (Skill Graphipy)
*Fecha de Registro: 2026-06-12*

**Descripción:**
Para evitar que los modelos de IA exploren a ciegas el código base o realicen modificaciones destructivas que dejen código muerto u orfanen módulos, se ha implementado el Skill **Graphipy**. Este skill analiza la estructura sistémica del código mediante el algoritmo de Louvain, generando un mapa de dependencias y validando cambios.

**Regla de Oro:**
* **Consulta de Mapa (RAG-DB):** Al iniciar cualquier sesión de trabajo compleja o antes de refactorizaciones, el Agente **debe** consultar el mapa estructural generado en [codebase_rag_db.md](file:///c:/AI-Diary/SKILLS/Graphipy/resources/codebase_rag_db.md).
* **Ejecución y Regeneración del Grafo:** Tras cualquier cambio significativo en el código base, el Agente **debe** regenerar el mapa y ejecutar la validación de deltas con el comando:
  ```bash
  uv run python SKILLS/Graphipy/scripts/graphipy.py --root c:\AI-Diary
  ```
* **Acción ante Alertas de Integridad:** Si el reporte terminal arroja alguna alerta del tipo `[ALERT] COMPLETELY DISCONNECTED` o `[WARNING] UNUSED` en los archivos modificados, el Agente debe detenerse inmediatamente, analizar si la desconexión es legítima o si se ha roto un enlace del sistema, y proponer su corrección o eliminación al usuario.
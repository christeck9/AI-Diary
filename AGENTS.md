[NOTE]
Para todos los Agentes. Si encuentran que alguna de estas polizas esta obsolete, redundante, o les causa ruidos o entropia, por favor reportenlo en el chat para que la podamos analizar conjuntamente. Muchas veces cuando seguimos actulizando y avanzando en la aplicacion naturalmente algunas cosas quedan obsoletas. Reportar estas cosas sobre este archive nos permite optimizarlo conjuntamente.

[LANGUAGE_PROTOCOL]
# Protocolo de Comunicación para los Agentes
user_input = "English, Spanish or Mixed"
Agent Chat Speeach= "Spanish (Preferido para interacción)"
Agent Coding = "English (Estándar para desarrollo)"
instruction = "Agent hablará con Chris en Español pero escribirá todos los programas principalmente en Inglés a menos de que se necesite hacer en otro idioma por ejemplo interfaces o traducciones."

[USER_ENVIRONMENT]
name = Chris
preferred_language = Spanish
system_specs = "AMD Ryzen 7 4800H | 64GB RAM | NVIDIA GeForce GTX 1660 Ti (6GB VRAM)"
current_project = "AI-Diary"

# [SUPREMA DIRECTIVA DE OPERACIÓN]

> **ESTADO DE ALERTA: MÁXIMA RIGUROSIDAD TÉCNICA**

>Directivas:
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

---
Any md or text created has to have date! To keep track of the time and better understanding of any document.

----
Chris es el humano creador del proyecto habla Ingles y Español. Como directiva principal todo el codigo va a estar hecho en Ingles. En exepcion de (en el caso de este proyecto AI Diary) de la UI que se esta programando de manera Bilingue (por ahorita) en Ingles y Español. Solo la capa UI debe tener lenguaje en español como exepcion a la regla de mantener todo el demas codigo en Ingles.
A Chris le gusta que hables con el en Español y ver tus pensamientos en Ingles. Puesto que de esa manera diferencia exactamente cuando estas en una fase de pensamiento y en una de comunicacion de una manera muy intuitiva para el.



------
# DIRECTIVAS DE DESARROLLO Y PROTOCOLOS MULTI-AGENTE: APPGEMMA4

Si eres un modelo de IA o Agente leyendo esto, **DEBES** seguir tus respectivas directivas al pie de la letra para evitar colapsar la arquitectura de esta aplicación React Native (Expo). 

### 🛡️ MANDATO DE AISLAMIENTO AI DIARY (PROYECTO SEPARADO)
1. **Silos de Inferencia:** Como Advisor, tu deber es asegurar que el CÓDIGO de AI Diary sea un entorno local, y corroborar de vez en cuando en internet si tenemos las ultimas tecnicas de codigo para no quedarnos obsoletos. 
2. **Puertos**
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
Nota: Gemma 3:4b esta suspendida por el momento.
> **PROTOCOLOS DE BLINDAJE:**
> 1. **Gemma 3 (4B):** Arquitectura de 128k. Dialecto: `<start_of_turn>` + Role-Swapping.
> 2. **Gemma 4 (E2B):** Motor de 2B optimizado con PLE. Dialecto: `<|turn|>` + Tool Response.
> 3. **Exclusividad Móvil:** Queda prohibido el uso o mención de variantes de servidor de los modelos Gemma(31B, 26B) u otros modelos de AI.
> 4. **Identidad de Hardware:** La App asume un entorno de recursos limitados (Android). No se deben proponer optimizaciones para hardware de escritorio.
> 5. Para saaber como funnciona nuestras AIs y sus comandos y dialectos: C:\AI-Diary\AIsArchitecture.md
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

---

### 9. Arquitectura del Pipeline TTS: Gestor de Velocidad Adaptativo (Velocity Manager v3)
*Fecha de Registro: 2026-06-20*

**Contexto:**
El sistema TTS de AI Diary utiliza un **Gestor de Velocidad (Velocity Manager)** adaptativo en tiempo real. Este perfila los Tokens por Segundo (TPS) de los primeros 6 tokens generados por el LLM y ajusta dinámicamente los delimitadores y límites de acumulación de palabras para evitar tartamudeos (hiccups) sin introducir pausas artificiales molestas.

**Archivos protegidos por esta regla:**
- `hooks/useAgentEngine.ts` — Lógica de perfilado de TPS, reinicio de flush timer y segmentación dinámica (Modos: FLUID, SENTENCE_TO_SENTENCE, PUNCTUATION_TO_PUNCTUATION).
- `hooks/useVoice.ts` — Sanitización de texto nativo (`sanitizeForNativeTTS`).
- `lib/CloudTTSService.ts` — Configuración de API de Google TTS (SSML + audioConfig).
- `lib/TTSSanitizer.ts` — Módulo de sanitización de texto para audio (**NO ELIMINAR**).

#### ✅ PERMITIDO
- Ajustar las reglas de asignación de velocidad (por ejemplo, los umbrales de TPS para cambiar entre modos) en `getSpeechChunkingMode` según feedback del usuario.
- Agregar nuevos patrones de sanitización o stripeo de caracteres a `TTSSanitizer.ts`.
- Ajustar el `speakingRate` o `pitch` en `CloudTTSService.ts` o en los coeficientes basados en `psyProfile` en `useVoice.ts`.
- Modificar el valor de `FLUSH_TIMEOUT_MS` (tiempo de espera de inactividad de tokens antes de vaciar) siempre y cuando se mantenga el reinicio en cada token.

#### 🚫 PROHIBIDO — NO HACER BAJO NINGUNA CIRCUNSTANCIA
1. **NO desactivar el reinicio del `flushTimer` en `onTokenReceived`** (`resetFlushTimer()`). Si no se reinicia con cada token, la frase se cortará arbitrariamente a la mitad cada 1.5 - 1.8 segundos durante el streaming.
2. **NO eliminar el perfilador de TPS ni los límites dinámicos.** Eliminar el umbral mínimo (dejando que baje a menos de 3 palabras en modo lento) provocará stutters/hiccups graves en el reproductor de voz de Android/iOS al procesar micro-frases de 1-2 palabras.
3. **NO reemplazar `sanitizeForNativeTTS(text)` con expresiones regex inline antiguas** en `useVoice.ts` (esto hace que lea los puntos finales como la palabra "punto").
4. **NO revertir `input: { ssml: ssmlText }` a `input: { text }`** en `CloudTTSService.ts` (Google TTS leerá los puntos y no interpretará las etiquetas de break).
5. **NO eliminar el Anima Glitch Guard** (`if (isThinkingRef.current && !filteredText && last.text) return prev;`) en `useAgentEngine.ts` ni bajar el intervalo del actualizador de la UI por debajo de 150ms.

#### ⚡ Diagnóstico Rápido — Si el TTS vuelve a fallar
Si en el futuro el TTS presenta fallas:
1. ¿Se eliminó `resetFlushTimer()` del flujo de tokens de `useAgentEngine.ts`? → Restablecer el reinicio por token.
2. ¿Los límites dinámicos de `FIRST_CHUNK_MIN_WORDS` o `MIN_SENTENCE_WORDS` bajan de 3 palabras? → Garantizar un umbral mínimo de al menos 3 palabras para evitar hiccups.
3. ¿Se eliminó `TTSSanitizer.ts` o se modificó su llamada? → Restaurar el sanitizador desde Git.
4. ¿El motor de Google TTS recibe texto plano en lugar de SSML? → Verificar `CloudTTSService.ts`.

### 10. Arquitectura de UI: Interacciones en Mensajes (Chat Bubbles)
*Fecha de Registro: 2026-06-20*

**Contexto y Problema Histórico:**
En Android (y React Native en general), envolver componentes de texto con la propiedad `selectable={true}` dentro de componentes táctiles (`TouchableWithoutFeedback`, `TouchableOpacity`, etc.) que escuchan eventos como `onLongPress`, provoca una severa colisión en el sistema de gestos. Esto resulta en el congelamiento completo de la aplicación (UI thread freeze) al intentar invocar la selección nativa de palabras, porque el Responder de React Native y el motor de texto nativo de Android compiten por el gesto de pulsación prolongada.

**Regla Estricta (Paradigma de Selección de Texto y Menús Contextuales con Swipeable):**
1. **Protección de Selección Nativa:** Queda **ESTRICTAMENTE PROHIBIDO** envolver las burbujas de chat o el contenido de texto (`<Text selectable={true}>`) con componentes `Touchable` que intercepten gestos de pulsación larga o corta. El texto debe ser libre para usar la configuración nativa de Android de selección de palabras, la cual es ideal, rápida y conocida por el usuario.
2. **Acceso al Menú Contextual (Slide Left / Swipeable):** Todas las acciones de mensaje (Copiar todo, Análisis Profundo, Reportar, Eliminar) **NO deben** invocarse interactuando con los Avatares ni con pulsaciones largas sobre los mensajes. El único mecanismo autorizado es **envolver el componente del mensaje con un `<Swipeable>`** de `react-native-gesture-handler` (Slide Left para revelar botones de acción). Esto optimiza la interfaz, previene toques accidentales y mantiene la burbuja de texto 100% limpia para la selección de texto.

---

### 11. Arquitectura de Modales y Overlayers (Estabilidad en Android 14)
*Fecha de Registro: 2026-07-05*

**Contexto y Problema Histórico:**
Bajo la nueva arquitectura de React Native (Fabric) y en modo sin puente (Bridgeless), los componentes `<Modal>` nativos de Android tienen un comportamiento inconsistente de cálculo de dimensiones cuando se montan en la raíz absoluta de la aplicación (fuera del árbol activo de React Navigation). Esto causa que el modal quede transparente, bloquee los gestos y sea inutilizable.
Históricamente se intentó parchar esto con un hack de redibujado (`layoutTicket` de 0.5px) y dimensiones absolutas mediante `Dimensions.get('screen')`, pero estas soluciones fallan en dispositivos físicos como el Pixel 7 Pro e introducen inestabilidad visual.

**Regla Estricta y Solución Definitiva:**
1. **Montaje dentro del Árbol de Navegación:** Queda **ESTRICTAMENTE PROHIBIDO** renderizar los componentes `<Modal>` globales directamente en el proveedor de la raíz (`GlobalModalsProvider` en `_layout.tsx`). En su lugar, el proveedor solo debe exponer el estado, y los modales deben ser renderizados físicamente dentro de la jerarquía activa de navegación (ej. junto al componente `<Tabs>` en `app/(tabs)/_layout.tsx`). Esto garantiza que Android asocie el modal con la actividad activa correcta y reciba dimensiones estables.
2. **Dimensionamiento Estándar:** Todos los modales deben configurarse con `width: '100%'` y `height: '100%'` (o `flex: 1`) en su contenedor principal en lugar de usar `Dimensions.get('screen')`.
3. **Eliminación de Hacks:** Queda prohibido el uso del hack de `layoutTicket` (timers de 50ms que cambian dimensiones por 0.5px) ya que es innecesario y propenso a errores de renderizado.

### 10. Prohibici�n Absoluta de Crear Keystores y Credenciales Sin Consentimiento Expl�cito
*Fecha de Registro: 2026-07-01*

**Incidente de origen:**
Un agente de IA cre� el archivo my-release-key.keystore el 1 de junio de 2026 para firmar el Release 21 de AI Diary en Google Play, sin notificar al usuario ni documentar la contrase�a utilizada. Esto caus� que el Release 22 (firmado con un keystore diferente creado por el usuario) fuera rechazado por Google Play por incompatibilidad de firmas, bloqueando completamente el ciclo de publicaci�n.

**Regla Estricta:**
Queda **TERMINANTEMENTE PROHIBIDO** que cualquier agente de IA:
1. Genere keystores (.keystore, .jks) o pares de llaves de firma mediante keytool -genkeypair o cualquier comando equivalente sin obtener **consentimiento verbal expl�cito** del usuario en el chat.
2. Defina o elija contrase�as para keystores sin comunicarlas inmediatamente y de forma destacada al usuario.
3. Reemplace, renombre (.old) o sobrescriba un keystore existente sin advertir al usuario de las consecuencias irreversibles para los releases publicados.
4. Configure variables de firma en gradle.properties, local.properties o cualquier archivo de build sin confirmar con el usuario qu� keystore se est� usando.

**Protocolo Obligatorio antes de cualquier operaci�n de keystore:**
- Comunicar en el chat: *"Voy a crear/modificar un keystore. La contrase�a ser� [X]. El alias ser� [Y]. �Confirmas?"*
- Esperar respuesta afirmativa expl�cita antes de ejecutar cualquier comando.
- Documentar la contrase�a y alias en Rules for APK creation.md inmediatamente despu�s de la creaci�n.

**Raz�n:** Los keystores de producci�n son credenciales irreversibles. Una vez que Google Play registra un SHA1, cualquier cambio requiere un proceso de soporte que puede tardar semanas o ser denegado permanentemente.ñ



## 11. Estructura de Planes de Implementacion

### [REGLA DE FORMATO] Estructura Estricta para Planes de Implementación

Cada vez que se requiera elaborar un Plan de Implementación (`implementation_plan.md`) para refactorizaciones, creación de features o limpieza de deuda técnica, el Agente **debe obligatoriamente** estructurar cada fase/tarea utilizando el formato **B-R-M (Beneficio, Riesgo, Modelo)**.

Las tareas deben presentarse ordenadas de **menor a mayor riesgo/dificultad** para garantizar *quick wins* tempranos y aislar los cambios más peligrosos.

Por cada tarea en el plan, se debe incluir explícitamente:

1. **Beneficio (1-10):** 
   - Calificación del impacto directo en la UX, rendimiento o mantenibilidad del código base.
   - *Justificación breve.* (Ej. "Mejora dramáticamente los FPS al scrollear").

2. **Dificultad y Riesgo (1-10):**
   - Calificación del peligro arquitectónico o probabilidad de introducir bugs críticos (ej. crasheos, corrupción de DB, breaking changes).
   - *Justificación breve.* (Ej. "Modificar SQLite con datos existentes puede corromper tablas si la migración falla").

3. **Modelo Sugerido (Flash vs. Pro):**
   - El agente debe recomendar el modelo óptimo de IA para ejecutar la tarea de forma eficiente:
     - **Gemini 3.5 Flash ⚡:** Para tareas de riesgo bajo/medio (1-4), boilerplate, escritura repetitiva, formateos de UI y refactorización cosmética.
     - **Gemini 3.1 Pro 🧠:** Para tareas de riesgo alto (5-10), modificaciones nativas (Java/C++/Swift), migraciones de bases de datos, lógica de estado compleja (Hooks/Closures) y arquitectura crítica.

**Ejemplo de Formato Esperado por Tarea:**
> ### Tarea X: [Nombre de la Tarea]
> - **Acción:** [Descripción técnica de lo que se va a hacer]
> - **Beneficio:** [X]/10 - [Justificación]
> - **Riesgo:** [Y]/10 - [Justificación]
> - **Modelo Sugerido:** [Gemini 3.5 Flash / Gemini 3.1 Pro] - [Por qué]




### 9. Protección del Puente JSI (C++) de Audio (AnimaVoice)
*Fecha de Registro: 2026-07-10*

**Problema Histórico:**
Para evitar un supuesto cuelgue de 3 segundos en el emulador, un agente IA desactivó la ejecución del puente nativo de síntesis de audio (AnimaVoice.synthesizeNativeToPCM y nimaFeedAudioChunk / Oboe C++) de forma exclusiva en el emulador (!isEmulatorRef.current). Esto causó un fallo crítico, forzando a que la aplicación cayera a expo-speech, que al estar roto o silenciado de fábrica en muchas imágenes de Android Studio, dejó a la IA y al lector de libros sin sonido alguno.

**Regla Estricta:**
Queda **ESTRICTAMENTE PROHIBIDO** desconectar, hacer bypass (saltarse), o inhabilitar la ruta rápida de cero-latencia JSI de C++ (nimaFeedAudioChunk / AnimaVoice.synthesizeNativeToPCM) en NINGÚN ENTORNO, incluyendo emuladores. 
* El flujo de audio mediante el puente JSI y Oboe es mandatorio y jamás debe ser bloqueado con condicionales de entorno (como isEmulatorRef).
* Si el audio tiene lag en el emulador, es un sacrificio aceptable a cambio de garantizar que el sonido funcione, ya que depender de expo-speech en el emulador es inestable.

Este es nuestro ultimo esquema:

  LLM genera texto
    ↓
processSpeechQueue() [useInteractiveVoice]
    ↓
voice.speak(text) [useVoice]
    ├─ Mutex check (previene concurrent ops)
    ├─ AudioFocus reset (grabación → playback)
    ├─ JSI path con health check (Universal: Emulador y Físico)
    │   ├─ preloadedData o realtime synthesis
    │   └─ Falla → registra JSIFailure y Circuit Breaker
    ├─ Cloud TTS fallback
    └─ expo-speech fallback (con forceResetAudioMode)

Tab Blur / Modal Close → releaseResources({ keepJSI: true }) [useVoice]
    ├─ Solo cierra sessions de micrófono y audio buffers sueltos
    └─ NO destruye JSI. Preserva motor C++ vivo para cuando el usuario regrese.
    
App Unmount → releaseResources() [useVoice]  
    └─ Destruye JSI (Correcto para evitar memory leaks al cerrar la app)

### 10. Para Apple el comando eas build --platform ios --profile production --auto-submit
genera su propia version. No se necesita poner ninguna nueva en el app.json. Tu solo repara, no cambies la version si estamos programando para Apple.
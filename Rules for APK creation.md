# Documento de Referencia y Lecciones Aprendidas: Compilación C++20 (React Native 0.74 / Expo 51)

Este documento registra los hallazgos técnicos, configuraciones de compilación y parches requeridos para generar exitosamente el APK de desarrollo (`app-debug.apk`) bajo la versión de **React Native 0.74.1** y **Expo 51**, utilizando el estándar **C++20** sobre un entorno de desarrollo Windows.

---

## 🛠️ Especificaciones de la Cadena de Herramientas (Toolchain)

| Componente | Configuración Requerida | Propósito y Notas |
| :--- | :--- | :--- |
| **NDK Version** | `26.1.10909125` | Garantiza estabilidad del ABI nativo y coherencia con dependencias como Hermes. |
| **C++ Standard** | `C++20` (`-std=c++20` / `20`) | Obligatorio. Encabezados del motor Fabric (`RawProps.h`) requieren sentencias de restricción (concepts/requires) nativas de C++20. |
| **STL Linkage** | `c++_shared` | Enlaza dinámicamente contra `libc++_shared.so` en todos los módulos nativos para prevenir fallas `CXX1212` y fugas de memoria. |

---

## ⚠️ Diagnósticos y Ajustes Aplicados

### 1. Descarte de la Degradación a C++17
* **Hallazgo:** Se investigó la posibilidad de compilar con C++17 para simplificar la compatibilidad con dependencias antiguas.
* **Resultado:** Fue **rechazado**. Al activar la Nueva Arquitectura (Fabric) en React Native 0.74.1, los encabezados principales del framework (`RawProps.h`) introducen sintaxis de C++20. Bajar a C++17 rompe la compilación principal. La aplicación debe compilarse bajo **C++20**.

### 2. Error de Python3 en Windows (NDK/CMake)
* **Hallazgo:** Durante la fase de configuración de CMake para `llama.rn`, `find_package(Python3 REQUIRED)` fallaba debido a que Windows NDK no lograba resolver correctamente los alias de ejecución de la Microsoft Store (los cuales abren la tienda en lugar de ejecutar Python en entornos NDK).
* **Solución:** Se modificó [node_modules/llama.rn/android/src/main/rnllama/CMakeLists.txt](file:///c:/AI-Diary/node_modules/llama.rn/android/src/main/rnllama/CMakeLists.txt) eliminando la instrucción `REQUIRED` de Python3.

### 3. Exclusión de Target OpenCL (Hexagon)
* **Hallazgo:** Al no resolver la ruta completa de Python3 durante la configuración de CMake, la compilación de Ninja fallaba al intentar procesar comandos personalizados (`embed_kernel.py`) requeridos únicamente por el target GPU `rnllama_v8_2_dotprod_i8mm_hexagon_opencl`.
* **Solución:** Comentamos el target OpenCL en la configuración de CMake de `llama.rn` tanto en su subproyecto como en el JNI principal:
  * [CMakeLists.txt (rnllama)](file:///c:/AI-Diary/node_modules/llama.rn/android/src/main/rnllama/CMakeLists.txt#L385)
  * [CMakeLists.txt (JNI)](file:///c:/AI-Diary/node_modules/llama.rn/android/src/main/CMakeLists.txt#L156)
* **Comportamiento en Runtime:** Al no estar disponible `rnllama_jni_v8_2_dotprod_i8mm_hexagon_opencl`, el cargador dinámico en Java ([RNLlama.java](file:///c:/AI-Diary/node_modules/llama.rn/android/src/main/java/com/rnllama/RNLlama.java#L201-L213)) realiza un fallback limpio y automático hacia `rnllama_jni_v8_2_dotprod_i8mm` u otras implementaciones CPU optimizadas, que compilan de manera totalmente estable.

### 4. Error de Compilación Kotlin en `@dr.pogodin/react-native-fs`
* **Hallazgo:** Al compilar para la versión de producción o release de Android, la compilación de Kotlin fallaba en `ReactNativeFsPackage.kt` al invocar el constructor `ReactModuleInfo` debido a firmas de parámetros con nombres no coincidentes (el compilador de Kotlin espera encontrar nombres de variables de metadatos en Java que se han perdido, representados internamente como `p2`, `p3`, etc.).
* **Solución:** Modificamos [ReactNativeFsPackage.kt](file:///C:/AI-Diary/node_modules/@dr.pogodin/react-native-fs/android/src/main/java/com/drpogodin/reactnativefs/ReactNativeFsPackage.kt) para invocar al constructor de `ReactModuleInfo` utilizando parámetros posicionales en vez de nominales (eliminando los nombres como `canOverrideExistingModule =`, etc.).

### 5. Error de Bloqueo de Archivos en Gradle Clean (`:react-native-sherpa-onnx:clean`)
* **Hallazgo:** En entornos de desarrollo Windows, al ejecutar `.\gradlew clean`, el build fallaba indicando que no se podía eliminar el directorio de construcción de `react-native-sherpa-onnx` debido a un bloqueo de archivo en `expanded.lock`. Esto sucedía porque las tareas nativas de limpieza (`externalNativeBuildCleanDebug` y `externalNativeBuildCleanRelease`) dependían erróneamente de tareas de extracción de dependencias AAR (`extractSherpaOnnxClasses` y `extractOnnxruntimeClasses`), lo que generaba y abría las dependencias nativas durante el propio proceso de borrado.
* **Solución:** Modificamos el script de construcción de la librería en `node_modules/react-native-sherpa-onnx/android/build.gradle` para filtrar y excluir de manera explícita todas las tareas que contengan `"clean"` en su nombre de este flujo de dependencias.
* **Persistencia:** Guardamos y registramos este cambio mediante un parche local en [patches/react-native-sherpa-onnx+0.4.3.patch](file:///c:/AI-Diary/patches/react-native-sherpa-onnx+0.4.3.patch) usando `patch-package` para su aplicación automática.

### 6. Error de Fusión de Recursos (Estilos Duplicados en `styles.xml`)
* **Hallazgo:** Al realizar el empaquetado de producción (`assembleRelease`), la tarea `:app:mergeReleaseResources` fallaba debido a declaraciones duplicadas de `AppTheme` y `Theme.App.SplashScreen` en [styles.xml](file:///C:/AI-Diary/android/app/src/main/res/values/styles.xml). Además, el tema moderno del splash screen hacía referencia a `@color/splashscreen_background`, el cual estaba ausente en el diccionario del proyecto.
* **Solución:** 
  1. Se simplificó `styles.xml` purgando la versión duplicada del tema heredado, conservando la integración con `Theme.SplashScreen` y `Theme.AppCompat.DayNight.NoActionBar`.
  2. Se declaró el color `<color name="splashscreen_background">#ffffff</color>` en [colors.xml](file:///C:/AI-Diary/android/app/src/main/res/values/colors.xml) para unificar la paleta gráfica del cargador y la del fondo del icono adaptativo de Android.
* **Resultado:** Ejecución exitosa de `.\gradlew assembleRelease` con la generación del paquete definitivo.

---

## 🚀 Instrucciones de Compilación Seguras

A diferencia de versiones experimentales anteriores, el entorno actual es **estable**. Es completamente seguro ejecutar limpiezas de caché nativas sin romper la configuración del compilador.

Para realizar un build limpio de los APKs de desarrollo o producción, ejecuta desde PowerShell en la carpeta raíz del proyecto:

```powershell
# Acceder a la carpeta de Android
cd android

# Limpiar compilaciones y cachés nativas previas
.\gradlew clean

# Generar el APK de desarrollo (Debug)
.\gradlew assembleDebug

# Generar el APK de producción (Release)
.\gradlew assembleRelease
```

**Ubicación de los APKs generados con éxito:**
* **APK de Desarrollo (Debug):** `c:\AI-Diary\android\app\build\outputs\apk\debug\app-debug.apk`
* **APK de Producción (Release):** `c:\AI-Diary\android\app\build\outputs\apk\release\app-release.apk`

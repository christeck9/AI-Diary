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

### 7. Optimización de Migraciones y Robustez del SQLiteProvider
* **Hallazgo:** Ejecutar secuencialmente múltiples sentencias `ALTER TABLE` que fallan de forma controlada pero arrojan excepciones JSI nativas síncronas en cada arranque de la app causa una sobrecarga innecesaria y ralentiza la inicialización en Android. Además, si la base de datos se corrompe en el cliente, la falta de captura de excepciones en el componente de inicialización de la base de datos (`SQLiteProvider`) puede causar bucles infinitos de re-renderizado en la aplicación.
* **Solución:**
  1. Se implementó una verificación previa del esquema de la tabla usando `PRAGMA table_info` en [db.ts](file:///c:/AI-Diary/lib/db.ts) dentro de la función `safeAddColumn`, asegurando que la sentencia `ALTER TABLE` solo se ejecute si la columna no existe. Esto ahorra valioso tiempo de ejecución en el hilo nativo.
  2. Se configuró la propiedad `onError` de `<SQLiteProvider>` en [MemoryProvider.tsx](file:///c:/AI-Diary/components/MemoryProvider.tsx) para canalizar errores de la base de datos de manera limpia hacia el estado local (`dbError`). De esta forma, si la base de datos no se puede abrir o está corrupta, se previene el crash de renderizado infinito y se ofrece al usuario una opción para restablecer la base de datos y reiniciar la aplicación de manera segura.

---

## 🚀 Instrucciones de Compilación Seguras

A diferencia de versiones experimentales anteriores, el entorno actual es **estable**. Es completamente seguro ejecutar limpiezas de caché nativas sin romper la configuración del compilador.

Para realizar un build limpio de los paquetes (APKs para prueba o AAB para Google Play), ejecuta desde PowerShell en la carpeta raíz del proyecto:

```powershell
# 1. Acceder a la carpeta de Android
cd android

# 2. Limpiar compilaciones y cachés nativas previas (obligatorio si cambias códigos de versión)
.\gradlew clean

# 3. Generar el binario correspondiente:

# Para generar el APK de desarrollo (Debug)
.\gradlew assembleDebug

# Para generar el APK de producción/instalación manual (Release)
.\gradlew assembleRelease

# Para generar el App Bundle (.aab) para subir a Google Play Store
.\gradlew bundleRelease
```

**Ubicación de los binarios generados con éxito:**
* **APK de Desarrollo (Debug):** `c:\AI-Diary\android\app\build\outputs\apk\debug\app-debug.apk`
* **APK de Producción (Release):** `c:\AI-Diary\android\app\build\outputs\apk\release\app-release.apk`
* **App Bundle para Google Play (Release AAB):** `c:\AI-Diary\android\app\build\outputs\bundle\release\app-release.aab`

---

## 📦 Gobernanza de Versiones para Google Play Store

Cuando desees subir una nueva actualización a Google Play Console, ten en cuenta el siguiente protocolo estricto de versionado para evitar rechazos:

### 1. Conceptos Clave de Versión
* **`versionName` (Nombre de la versión):** Es la versión comercial visible para el público (ej. `"1.9.5"`). Se puede repetir entre compilaciones si estás corrigiendo un error del mismo lanzamiento.
* **`versionCode` (Código de versión):** Es un número entero incremental único de uso interno (ej. `11`). **Nunca** se puede repetir o bajar. Si subes un `.aab` a Google Play y este falla (o "no queda bien"), no puedes borrarlo y volverlo a subir con el mismo código. Google Play Console registrará ese código permanentemente. Debes compilar de nuevo incrementando este valor a `versionCode + 1`.

### 2. Dónde actualizar el versionado
Dado que compilamos nativamente con Gradle desde la carpeta `android`, el build local **no lee automáticamente `app.json`** a menos que regeneres la carpeta nativa (prebuild). Por lo tanto, debes modificar el número de versión e incrementar el código en **dos ubicaciones**:

1. En el archivo de configuración de Expo: [**`app.json`**](file:///c:/AI-Diary/app.json)
   ```json
   "version": "1.9.5",       // versionName
   "android": {
     "versionCode": 11,      // versionCode
     ...
   }
   ```
2. En el archivo nativo de compilación: [**`android/app/build.gradle`**](file:///c:/AI-Diary/android/app/build.gradle) (dentro del bloque `defaultConfig`):
   ```groovy
   defaultConfig {
       versionCode 11        // Debe coincidir con app.json
       versionName "1.9.5"   // Debe coincidir con app.json
       ...
   }
   ```

### 3. Protocolo de Compilación tras cambio de Versión
Cada vez que incrementes el `versionCode` en los archivos anteriores, ejecuta siempre un `.\gradlew clean` antes del build para purgar el manifiesto compilado en caché de Gradle y forzar la inyección del nuevo número:
```powershell
cd android
.\gradlew clean
.\gradlew bundleRelease
```

### 4. Advertencia de Google Play: "There is no deobfuscation file associated with this App Bundle"
* **Qué significa la advertencia:** Google Play Console advierte que no se ha subido un archivo de desofuscación (`mapping.txt`). Este archivo traduce las clases y métodos ofuscados de vuelta a nombres de código legibles en los reportes de crash.
* **Por qué ocurre y qué hacer:**
  1. En este proyecto, la optimización y ofuscación de código R8/ProGuard está **desactivada de manera intencional** en [**`android/gradle.properties`**](file:///c:/AI-Diary/android/gradle.properties):
     ```properties
     android.enableMinifyInReleaseBuilds=false
     android.enableShrinkResourcesInReleaseBuilds=false
     ```
  2. **Razón de desactivación:** La aplicación hace uso intensivo de librerías nativas con JNI en C++ (`llama.rn` y `react-native-sherpa-onnx`). Habilitar la ofuscación R8 corre el riesgo de que el compilador purgue o altere las firmas y métodos de comunicación de Java con C++, provocando caídas de la app con errores `UnsatisfiedLinkError`.
  3. **Acción requerida:** **Ignora la advertencia y procede con la publicación.** Dado que la ofuscación está desactivada, el código final compilado no está ofuscado. Por lo tanto, no existe ningún archivo `mapping.txt` y, en caso de algún crash, la traza de error ya será legible en la consola de Google Play de forma predeterminada sin necesidad de cargarlo.

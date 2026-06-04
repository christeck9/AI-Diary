# Documento de Referencia y Lecciones Aprendidas: Compilación C++20 para iOS (React Native 0.74 / Expo 51)

Este documento registra los hallazgos técnicos, configuraciones de compilación y parches requeridos para generar exitosamente la aplicación empaquetada de iOS (`.ipa`) bajo la versión de **React Native 0.74.1** y **Expo 51**, utilizando el estándar **C++20** sobre el servicio **EAS Build**.

---

## 🛠️ Especificaciones de la Cadena de Herramientas (Toolchain)

| Componente | Configuración Requerida | Propósito y Notas |
| :--- | :--- | :--- |
| **C++ Standard** | `C++20` (`gnu++20`) | Obligatorio. Los encabezados del motor Fabric (`RawProps.h`) introducen sintaxis de restricciones (concepts/requires) nativas de C++20 que rompen en C++17 o inferior. |
| **Destino de inyección** | Xcode Project + Podfile Targets | Se debe aplicar tanto a los Pods de dependencias externas como al target principal del proyecto Xcode (`AIDiary.xcodeproj`) para compilar correctamente `AppDelegate.mm`. |
| **Manejo de Assets en EAS** | Exclusión Explicita de Ignore | Los modelos binarios pesados (como Whisper `.bin`) deben exceptuarse de las exclusiones de subida en `.easignore` para estar disponibles durante el bundling de Metro. |

---

## ⚠️ Ajustes Aplicados y Soluciones

### 1. Modificación de Estándar C++ en Xcode y CocoaPods
* **Problema:** Al habilitar la Nueva Arquitectura (Fabric) en React Native 0.74, el compilador genera errores como `no type named 'identity' in namespace 'std'` y `unknown type name 'concept'` al compilar `AppDelegate.mm` y dependencias nativas.
* **Solución:** Creamos el Config Plugin local [withIosCxxStandard.js](file:///c:/AI-Diary/plugins/withIosCxxStandard.js) y lo registramos en [app.json](file:///c:/AI-Diary/app.json).
  
  Este plugin realiza dos acciones complementarias durante el prebuild de Expo:
  
  1. **Xcode Project Configuration (`withXcodeProject`):** Modifica directamente las configuraciones de compilación de todos los targets en el proyecto Xcode (`.xcodeproj`) para inyectar la propiedad:
     ```javascript
     buildSettings['CLANG_CXX_LANGUAGE_STANDARD'] = '"gnu++20"';
     ```
  2. **Podfile Modification (`withDangerousMod`):** Busca la directiva `post_install` en el archivo `Podfile` generado e inyecta un loop para establecer `gnu++20` en cada configuración de compilación de los Pods de CocoaPods:
     ```ruby
     installer.pods_project.targets.each do |target|
       target.build_configurations.each do |config|
         config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'
       end
     end
     ```

---

### 2. Error de Resolución de Codegen en `whisper.rn` (`RNWhisperSpec.h` no encontrado)
* **Problema:** El compilador fallaba indicando que `'RNWhisperSpec/RNWhisperSpec.h' file not found`. En React Native 0.74, la herramienta de autolinking/Codegen de iOS requiere leer el `package.json` de cada dependencia para generar sus especificaciones de TurboModules. Sin embargo, `whisper.rn` omitía `"./package.json"` de su mapeo de `exports` en `package.json`, provocando que Node.js lanzara un error `ERR_PACKAGE_PATH_NOT_EXPORTED` y silenciando la generación del archivo de cabecera.
* **Solución:** Parcheamos el `package.json` de la biblioteca agregando la exportación correspondiente:
  ```json
  "exports": {
    "./package.json": "./package.json",
    ...
  }
  ```
* **Persistencia:** Guardamos esta corrección mediante un parche local en [patches/whisper.rn+0.5.5.patch](file:///c:/AI-Diary/patches/whisper.rn+0.5.5.patch) usando `patch-package`, garantizando su aplicación automática tras cada `npm install`.

---

### 3. Exclusión del Modelo Whisper en EAS Build (`ggml-tiny.bin`)
* **Problema:** El bundler de Metro fallaba durante el build en EAS con: `Unable to resolve module ../assets/ggml-tiny.bin`. Esto se debía a que `.easignore` ignoraba globalmente la extensión `*.bin` para evitar subidas pesadas e innecesarias. Al ser requerido físicamente en `hooks/useVoice.ts` vía `require('../assets/ggml-tiny.bin')`, el compilador se detenía.
* **Solución:** Modificamos [.easignore](file:///c:/AI-Diary/.easignore) para añadir una regla de excepción específica después de ignorar los `.bin` generales:
  ```
  *.bin
  !assets/ggml-tiny.bin
  ```
  Esto permite que el archivo de modelo de Whisper (~77.7 MB) se cargue a los servidores de EAS durante la compresión del proyecto, sin subir otros archivos temporales o modelos redundantes.

---

### 4. Error de Compilación Swift en `expo-dev-menu` (`TARGET_IPHONE_SIMULATOR` no encontrado)
* **Problema:** Al compilar bajo **Xcode 15 / Swift 5.10 (o Xcode 16 / Swift 6)** en EAS Build, la compilación de la dependencia `expo-dev-menu` fallaba en `DevMenuViewController.swift` con: `cannot find 'TARGET_IPHONE_SIMULATOR' in scope`. Esto se debe a que Swift 6 ya no expone macros de preprocesador C en el contexto de Swift de forma automática.
* **Solución:** Modificamos el archivo nativo `DevMenuViewController.swift` para reemplazar la asignación directa de la macro por una validación de entorno compatible con el estándar moderno de Swift:
  ```swift
  #if targetEnvironment(simulator)
  let isSimulator = true
  #else
  let isSimulator = false
  #endif
  ```
* **Persistencia:** Almacenamos el parche resultante en [patches/expo-dev-menu+5.0.23.patch](file:///c:/AI-Diary/patches/expo-dev-menu+5.0.23.patch) usando `patch-package` para su aplicación automatizada en EAS.

---

### 5. Desbordamiento de Pila Nativa / Error en Migraciones de SQLite (Maximum call stack size exceeded)
* **Problema:** En dispositivos iOS, al iniciar la aplicación (instalada desde el `.ipa`), se producía un cierre inesperado con el error `Maximum call stack size exceeded (native stack depth)`. Esto se debía a dos factores:
  1. El archivo [db.ts](file:///c:/AI-Diary/lib/db.ts) intentaba ejecutar 8 sentencias de migración secuenciales (`ALTER TABLE`) directamente sobre la base de datos en cada inicio. Cuando las columnas ya existían, SQLite lanzaba excepciones que se propagaban a través de la interfaz nativa JSI de React Native. El motor JavaScriptCore (JSC) de iOS sufría un desbordamiento de pila al procesar tantas excepciones nativas consecutivas de manera síncrona.
  2. Si la base de datos fallaba al inicializarse, el componente `SQLiteProvider` lanzaba un error no controlado durante el renderizado, lo que provocaba un bucle infinito de re-renderizados y validaciones en la pila de React, desencadenando también el crash de profundidad de pila nativa.
* **Solución:**
  1. Se implementó la función auxiliar `safeAddColumn` en [db.ts](file:///c:/AI-Diary/lib/db.ts) que consulta la tabla usando `PRAGMA table_info(tableName)` para verificar si la columna ya existe antes de realizar el `ALTER TABLE`. Esto eliminó por completo las excepciones innecesarias en el arranque.
  2. Se configuró la propiedad `onError` de `<SQLiteProvider>` en [MemoryProvider.tsx](file:///c:/AI-Diary/components/MemoryProvider.tsx) para interceptar errores de inicialización y manejarlos a través de un estado local de React (`dbError`). Si la base de datos se detecta corrupta (por ejemplo, por una copia de seguridad incompatible), se detiene el renderizado del árbol principal y se presenta una pantalla limpia que permite al usuario restablecer y borrar la base de datos para recuperar la funcionalidad.

---

## 🚀 Instrucciones de Compilación Seguras para iOS

Para compilar la aplicación para iOS de manera remota a través de EAS, asegúrate primero de especificar la versión del stack de compilación más actualizada en tu [eas.json](file:///c:/AI-Diary/eas.json) (necesario para usar Xcode 15+ / iOS 17+ SDK):

```json
"production": {
  "autoIncrement": true,
  "ios": {
    "image": "latest"
  }
}
```

Luego, ejecuta desde PowerShell en el directorio raíz del proyecto:

```powershell
# Iniciar compilación para perfil de producción en iOS (genera el archivo .ipa)
eas build --platform ios --profile production
```

Una vez finalizado, EAS devolverá un enlace de descarga directa del instalador `.ipa`, el cual estará listo para distribución interna ad-hoc o App Store Connect.

---

## 📤 Subida a Apple App Store / TestFlight desde la Consola

Para subir tu archivo `.ipa` a TestFlight o la App Store por medio de la consola, tienes tres métodos disponibles según tu sistema operativo y flujo de trabajo:

### Método 1: Usando Expo EAS Submit (Recomendado, funciona en Windows/macOS/Linux sin requerir Mac)
Dado que el proyecto utiliza Expo y EAS Build, puedes delegar la subida a los servidores de Expo en la nube sin necesidad de descargar el archivo físicamente ni tener Xcode.

1. **Subida automática después del Build (Recomendado):**
   Puedes configurar EAS para que realice la compilación e inicie la subida inmediatamente al terminar:
   ```powershell
   eas build --platform ios --profile production --auto-submit
   ```
2. **Subir una compilación existente:**
   Si ya compilaste la app en EAS y quieres subirla a App Store Connect ejecuta:
   ```powershell
   eas submit --platform ios
   ```
   *Nota: La terminal te pedirá que inicies sesión en tu cuenta de Apple Developer y buscará las compilaciones recientes del proyecto en EAS para enviarlas.*

---

### Método 2: Usando `xcrun altool` (Requiere macOS con Xcode instalado)
Si descargaste el archivo `.ipa` localmente y estás en una Mac con Xcode, puedes utilizar la herramienta oficial de línea de comandos de Apple.

**Opción A: Usando Contraseña Específica de la Aplicación (App-Specific Password)**
1. Genera una contraseña específica para la app en [appleid.apple.com](https://appleid.apple.com).
2. Sube la app con tu Apple ID:
   ```bash
   xcrun altool --upload-app --type ios --file "ruta/a/tu/app.ipa" --username "tu-correo@apple.com" --password "abcd-efgh-ijkl-mnop"
   ```

**Opción B: Usando API Key de App Store Connect (Ideal para automatizaciones/CI/CD)**
1. Descarga el archivo de clave privada `.p8` desde App Store Connect (sección *Usuarios y Accesos* > *Claves*).
2. Guarda el archivo `.p8` en la ruta `~/.private_keys/`.
3. Sube la app usando los identificadores de la clave:
   ```bash
   xcrun altool --upload-app --type ios --file "ruta/a/tu/app.ipa" --apiKey "TU_KEY_ID" --apiIssuer "TU_ISSUER_UUID"
   ```

---

### Método 3: Usando Transporter CLI (iTMSTransporter) en Windows
Si tienes el archivo `.ipa` descargado en Windows y no quieres usar EAS, puedes utilizar el motor CLI de la aplicación **Transporter** de Apple:

1. Descarga e instala **Transporter** desde la Microsoft Store de Windows.
2. Ubica el ejecutable de consola de la aplicación (usualmente en `C:\Program Files (x86)\Griffin\Transporter\iTMSTransporter.cmd` o similar) y asegúrate de que esté agregado a tu variable de entorno `PATH`.
3. Ejecuta el comando de subida:
   ```powershell
   iTMSTransporter -m upload -u "tu-correo@apple.com" -p "tu-contraseña-especifica" -f "C:\ruta\a\tu\app.ipa" -v eXpress
   ```

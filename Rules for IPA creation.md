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

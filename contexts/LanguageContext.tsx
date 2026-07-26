import React, { createContext, useContext, useState } from 'react';
import { settingsService } from '../lib/SettingsService';

export type AppLanguage = 'en' | 'es';

// ─── DICCIONARIO COMPLETO ──────────────────────────────────────
const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    // Sanctuary AI (Chat)
    'header.title': 'AI Diary',
    'header.online': 'ONLINE',
    'chat.welcome': 'AI Diary is Ready.',
    'chat.placeholder.waiting': 'PREPARING YOUR DIARY...',
    'chat.placeholder.ready': 'WHAT IS ON YOUR MIND TODAY?',
    
    // Model Status
    'model.status': 'AI MODEL',
    'model.select': 'NEURAL CORE:',
    'model.download': 'DOWNLOAD AI',
    'model.continueDownload': 'Continue Download',
    'model.load': 'ACTIVATE AI',
    'model.downloading': 'Downloading',
    'model.loading': 'Activating Neural Core...',
    'model.downloaded': 'downloaded successfully. Press "ACTIVATE AI" to begin.',
    'model.startDownload': 'Downloading Diary Neural Core',
    'model.ready': 'NEURAL CORE ACTIVE — YOUR DIARY IS READY.',
    'model.system': '[DIARY]',
    
    // Model descriptions
    'model.2b.desc': 'Lightweight — ideal for 4GB+ RAM devices',
    'model.4b.desc': 'Powerful Anima Deepmind — requires 6GB+ RAM',
 
    // Diagnostics (Explore)
    'diag.title': 'SYSTEM_DIAGNOSTICS & PREFS',
    'diag.memory': '[LOCAL_MEMORY_SQLITE]',
    'diag.dbSync': 'Database Sync',
    'diag.optimize': '_OPTIMIZE_MEMORY_CACHE',
    'diag.uiParams': '[UI_PARAMETERS]',
    'diag.corePrefs': '[CORE_PREFERENCES]',
    'diag.modelSelection': 'Model Selection',
    'diag.analyticalPersonality': 'Analytical Personality',
    'diag.disconnect': '[DISCONNECT]',
    
    // Tab names
    'tab.personalAI': 'Personal AI',
    'tab.diagnostics': 'Diagnostics',
    'menu.amnesia': '🚩 Selective Amnesia: Delete specific messages to correct the AI\'s course, clearing erroneous memories, hallucinations, loops, or unwanted behaviors.',
     'manifesto.title': 'AI DIARY',
     'manifesto.subtitle': 'Offline AI',
     'manifesto.body': 'This is a personal and private diary for personal well-being with an ultra-private build up in its making. It can be used as a cognitive journal with some additions like psychological tests and capabilities for news and document summaries, plus picture recognition. You can get some output information of your diary and for your tests. Local AI (Anima Light is based on Llama 3.2 1B and Anima Deepmind on Gemma 4 E2B QAT) tries to keep a nice conversation and overall safety usage of the application.',
     'manifesto.disclaimer.title': 'LEGAL DISCLAIMER:',
     'manifesto.disclaimer.body': 'The conversational features of this application are powered by 100% local, on-device AI. To guarantee user safety, the system integrates proactive safeguards preventing the generation of prohibited content (such as abuse, harassment, scams, or self-harm), alongside a reactive reporting mechanism that allows you to instantly flag and delete any inappropriate responses by swiping left. Since this is a 100% offline, local-first application, this flagging action executes entirely on your device, immediately deleting the message from the local SQLite database and episodic memory without transmitting any data to external servers, ensuring absolute privacy. This Diary is a tool for personal reflection and does not substitute professional medical, psychological, or clinical advice. It is only for private self-reflection purposes, it doesn\'t have to be followed at any point as qualified advice for psychological, medical or technical information. Any words read here have to be always pondered under the best judgment of the person using it and verified if needed.',
     'manifesto.disclaimer.subtext': 'The use of natural voices requires external APIs subject to their own privacy policies.',
     'manifesto.footer': 'AI DIARY v1.9.6 | ANIMA LIGHT | ANIMA DEEPMIND',
  },
  es: {
    // Sanctuary AI (Chat)
    'header.title': 'AI Diary',
    'header.online': 'EN LÍNEA',
    'chat.welcome': 'AI Diary está Listo.',
    'chat.placeholder.waiting': 'PREPARANDO TU DIARIO...',
    'chat.placeholder.ready': '¿QUÉ TIENES EN MENTE HOY?',
 
    // Model Status
    'model.status': 'MODELO AI',
    'model.select': 'NÚCLEO NEURONAL:',
    'model.download': 'DESCARGAR AI',
    'model.continueDownload': 'Continuar Descarga',
    'model.load': 'ACTIVAR AI',
    'model.downloading': 'Descargando',
    'model.loading': 'Activando Núcleo Neuronal...',
    'model.downloaded': 'descargado exitosamente. Presiona "ACTIVAR AI" para comenzar.',
    'model.startDownload': 'Descargando Núcleo Neuronal Diary',
    'model.ready': 'NÚCLEO NEURONAL ACTIVO — TU DIARIO ESTÁ LISTO.',
    'model.system': '[DIARY]',
 
    // Model descriptions
    'model.2b.desc': 'Ligero — ideal para dispositivos con 4GB+ RAM',
    'model.4b.desc': 'Potente Anima Deepmind — requiere 6GB+ RAM',
 
    // Diagnostics (Explore)
    'diag.title': 'DIAGNÓSTICOS_SISTEMA & PREFS',
    'diag.memory': '[MEMORIA_LOCAL_SQLITE]',
    'diag.dbSync': 'Sincronización de Base de Datos',
    'diag.optimize': '_OPTIMIZAR_CACHÉ_MEMORIA',
    'diag.uiParams': '[PARÁMETROS_UI]',
    'diag.corePrefs': '[PREFERENCIAS_CENTRALES]',
    'diag.modelSelection': 'Selección de Modelo',
    'diag.analyticalPersonality': 'Personalidad Analítica',
    'diag.disconnect': '[DESCONECTAR]',
 
    // Tab names
    'tab.personalAI': 'Personal AI',
    'tab.diagnostics': 'Diagnósticos',
    'menu.amnesia': '🚩 Amnesia Selectiva: Elimina mensajes específicos para corregir el rumbo de la IA ante memorias erróneas, alucinaciones, bucles o comportamientos no deseados.',
    'manifesto.title': 'AI DIARY',
    'manifesto.subtitle': 'Offline AI',
    'manifesto.body': 'Este es un diario personal y privado para el bienestar personal con una construcción ultra-privada. Puede usarse como un diario cognitivo con algunas adiciones como pruebas psicológicas y capacidades de resúmenes de noticias y documentos, más reconocimiento de imágenes. Puedes obtener información de salida de tu diario y de tus pruebas. La IA Local (Anima Light está basada en Llama 3.2 1B y Anima Deepmind en Gemma 4 E2B QAT) intenta mantener una conversación agradable y un uso seguro de la aplicación en general.',
    'manifesto.disclaimer.title': 'AVISO LEGAL:',
    'manifesto.disclaimer.body': 'Las funciones conversacionales de esta aplicación son impulsadas por inteligencia artificial de ejecución 100% local en tu dispositivo. Para garantizar la seguridad del usuario, el sistema integra salvaguardas proactivas que impiden la generación de contenido prohibido (como abuso, acoso, estafas o autolesión), junto con un mecanismo de reporte reactivo que te permite marcar y eliminar de inmediato cualquier respuesta inapropiada deslizando hacia la izquierda. Al ser una aplicación 100% offline y local-first, esta acción de reporte se procesa de manera enteramente local en el dispositivo, eliminando el mensaje de la base de datos SQLite y memoria episódica al instante sin transmitir ningún dato a servidores externos, garantizando una privacidad absoluta. Este Diario es una herramienta para la reflexión personal y no sustituye el asesoramiento o tratamiento profesional médico, psicológico o clínico. Es solo para propósitos de autorreflexión privada, no tiene que seguirse en ningún momento como asesoría cualificada para información psicológica, médica o técnica. Cualquier palabra leída aquí tiene que ser siempre ponderada bajo el mejor juicio de la persona que la usa y verificada si es necesario.',
    'manifesto.disclaimer.subtext': 'El uso de voces naturales requiere APIs externas sujetas a sus propias políticas de privacidad.',
    'manifesto.footer': 'AI DIARY v1.9.6 | ANIMA LIGHT | ANIMA DEEPMIND',
  }
};

// ─── CONTEXT ────────────────────────────────────────────────────
interface LanguageContextType {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void | Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

const getInitialLanguage = (): AppLanguage => {
  try {
    // Check if the native module is registered to prevent Metro evaluation crash
    const hasNativeModule = typeof global !== 'undefined' && !!(
      (global as any).expo?.modules?.ExpoLocalization ||
      (global as any).ExpoModules?.ExpoLocalization
    );

    if (!hasNativeModule) {
      return 'en';
    }

    const Localization = require('expo-localization');
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const systemLang = locales[0].languageCode?.toLowerCase() || '';
      const romancePrefixes = ['es', 'pt', 'it', 'fr', 'ro', 'ca', 'gl'];
      if (romancePrefixes.some(prefix => systemLang.startsWith(prefix))) {
        return 'es';
      }
    }
  } catch (e) {
    // Silently fallback to English if auto-detect fails
  }
  return 'en';
};
 
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<AppLanguage>(getInitialLanguage());

  // On mount, restore persisted language preference (overrides system locale)
  React.useEffect(() => {
    const restoreLanguage = async () => {
      try {
        const saved = await settingsService.get<string>('app_language');
        if (saved === 'es' || saved === 'en') {
          setLangState(saved as AppLanguage);
        }
      } catch (e) {
        // Fallback silently — system locale already set
      }
    };
    restoreLanguage();
  }, []);

  const setLang = async (newLang: AppLanguage) => {
    try {
      await settingsService.set({ app_language: newLang });
    } catch (e) {
      console.warn('[LANG] Failed to persist language:', e);
    }
    setLangState(newLang);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

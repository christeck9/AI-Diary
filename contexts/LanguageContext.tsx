import React, { createContext, useContext, useState } from 'react';

export type AppLanguage = 'en' | 'es';

// ─── DICCIONARIO COMPLETO ──────────────────────────────────────
const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    // Sanctuary AI (Chat)
    'header.title': 'AI Diary',
    'header.online': 'ONLINE',
    'chat.welcome': 'AI Diary INITIALIZED. YOUR SAFE SPACE IS READY.',
    'chat.placeholder.waiting': 'PREPARING YOUR DIARY...',
    'chat.placeholder.ready': 'ASK ANYTHING...',
    
    // Model Status
    'model.status': 'AI STATUS',
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
    'model.2b.desc': 'Lightweight — ideal for 4GB RAM devices',
    'model.4b.desc': 'Powerful — requires 6GB+ RAM',
 
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
     'manifesto.subtitle': 'Private Journal',
     'manifesto.body': 'This is a personal and private diary for personal well-being with an ultra-private build up in its making. It can be used as a cognitive journal with some additions like psychological tests and capabilities for news and document summaries, plus picture recognition. You can get some output information of your diary and for your tests. Local AI (Balance Core is based on Gemma3:4b and Deep Mind Core on Gemma4:e2b) tries to keep a nice conversation and overall safety usage of the application.',
     'manifesto.disclaimer.title': 'LEGAL DISCLAIMER:',
     'manifesto.disclaimer.body': 'The conversational features of this application are powered by 100% local, on-device AI. To guarantee user safety, the system integrates proactive safeguards preventing the generation of prohibited content (such as abuse, harassment, scams, or self-harm), alongside a reactive reporting mechanism that allows you to instantly flag and delete any inappropriate responses by swiping left. This Diary is a tool for personal reflection and does not substitute professional medical, psychological, or clinical advice. It is only for private self-reflection purposes, it doesn\'t have to be followed at any point as qualified advice for psychological, medical or technical information. Any words read here have to be always pondered under the best judgment of the person using it and verified if needed.',
     'manifesto.disclaimer.subtext': 'The use of natural voices requires external APIs subject to their own privacy policies.',
     'manifesto.footer': 'AI DIARY v1.9.5 | AI BALANCE CORE | AI DIARY DEEP MIND CORE',
    'inference.title': 'PHILOSOPHY INFERENCE',
    'inference.reloadHint': '* Requires model reload to apply changes.',
    'inference.reloadCore': 'RELOAD CORE',
  },
  es: {
    // Sanctuary AI (Chat)
    'header.title': 'AI Diary',
    'header.online': 'EN LÍNEA',
    'chat.welcome': 'AI Diary INICIALIZADO. TU ESPACIO SEGURO ESTÁ LISTO.',
    'chat.placeholder.waiting': 'PREPARANDO TU DIARIO...',
    'chat.placeholder.ready': 'PREGUNTA CUALQUIER COSA...',
 
    // Model Status
    'model.status': 'ESTADO AI',
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
    'model.2b.desc': 'Ligero — ideal para dispositivos con 4GB RAM',
    'model.4b.desc': 'Potente — requiere 6GB+ RAM',
 
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
    'manifesto.subtitle': 'Diario Privado',
    'manifesto.body': 'Este es un diario personal y privado para el bienestar personal con una construcción ultra-privada. Puede usarse como un diario cognitivo con algunas adiciones como pruebas psicológicas y capacidades de resúmenes de noticias y documentos, más reconocimiento de imágenes. Puedes obtener información de salida de tu diario y de tus pruebas. La IA Local (Balance Core está basada en Gemma3:4b y Deep Mind Core en Gemma4:e2b) intenta mantener una conversación agradable y un uso seguro de la aplicación en general.',
    'manifesto.disclaimer.title': 'AVISO LEGAL:',
    'manifesto.disclaimer.body': 'Las funciones conversacionales de esta aplicación son impulsadas por inteligencia artificial de ejecución 100% local en tu dispositivo. Para garantizar la seguridad del usuario, el sistema integra salvaguardas proactivas que impiden la generación de contenido prohibido (como abuso, acoso, estafas o autolesión), junto con un mecanismo de reporte reactivo que te permite marcar y eliminar de inmediato cualquier respuesta inapropiada deslizando hacia la izquierda. Este Diario es una herramienta para la reflexión personal y no sustituye el asesoramiento o tratamiento profesional médico, psicológico o clínico. Es solo para propósitos de autorreflexión privada, no tiene que seguirse en ningún momento como asesoría cualificada para información psicológica, médica o técnica. Cualquier palabra leída aquí tiene que ser siempre ponderada bajo el mejor juicio de la persona que la usa y verificada si es necesario.',
    'manifesto.disclaimer.subtext': 'El uso de voces naturales requiere APIs externas sujetas a sus propias políticas de privacidad.',
    'manifesto.footer': 'AI DIARY v1.9.5 | AI BALANCE CORE | AI DIARY DEEP MIND CORE',
    'inference.title': 'INFERENCIA DE FILOSOFÍA',
    'inference.reloadHint': '* Requiere recargar el núcleo para aplicar cambios.',
    'inference.reloadCore': 'RECARGAR NÚCLEO',
  }
};

// ─── CONTEXT ────────────────────────────────────────────────────
interface LanguageContextType {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<AppLanguage>('en');

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

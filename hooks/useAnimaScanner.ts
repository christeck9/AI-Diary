import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { MODEL_LIST } from '../src/config/ModelConfig';
import { useTodos } from './useTodos';
import { useLanguage } from '../contexts/LanguageContext';

export function useAnimaScanner() {
  const { lang } = useLanguage();
  const { todos } = useTodos();
  
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const scan = async () => {
      try {
        const caps: string[] = [];
        
        // 1. Scan models and vision
        const downloadedModels: string[] = [];
        let hasVision = false;
        const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
        
        for (const model of MODEL_LIST) {
          const fileInfo = await FileSystem.getInfoAsync(`${baseDir}/${model.fileName}`);
          if (fileInfo.exists) {
            downloadedModels.push((model.id.includes('1b') || model.id.includes('llama')) ? 'Light' : model.id.includes('3-4b') ? 'Balanced' : 'Deep');
            if (model.mmprojFileName) {
              const mmprojInfo = await FileSystem.getInfoAsync(`${baseDir}/${model.mmprojFileName}`);
              if (mmprojInfo.exists) {
                hasVision = true;
              }
            }
          }
        }
        
        if (downloadedModels.length > 0) {
          caps.push(lang === 'es' ? `🧠 Modelos instalados: ${downloadedModels.join(', ')}` : `🧠 Installed models: ${downloadedModels.join(', ')}`);
        } else {
          caps.push(lang === 'es' ? `⚠️ Ningún modelo descargado` : `⚠️ No models downloaded`);
        }

        if (hasVision) {
          caps.push(lang === 'es' ? '👁️ Tengo capacidad de visión activa' : '👁️ I have active vision capabilities');
        }

        // 2. Scan tools
        caps.push(lang === 'es' ? '🛠️ Herramientas: Listas, Rastreador de Cripto, etc.' : '🛠️ Tools: To-Do lists, Crypto Tracker, etc.');
        
        // 3. Scan pending tasks
        if (todos && todos.length > 0) {
          caps.push(lang === 'es' ? `📋 Tienes ${todos.length} tareas pendientes` : `📋 You have ${todos.length} pending tasks`);
        } else {
          caps.push(lang === 'es' ? `✅ No tienes tareas pendientes hoy` : `✅ You have no pending tasks today`);
        }
        
        if (isMounted) {
          setCapabilities(caps);
          // If we added or removed items, keep index in bounds
          setCurrentIndex(prev => prev >= caps.length ? 0 : prev);
        }
      } catch (e) {
        console.warn('[useAnimaScanner] error:', e);
      }
    };
    
    scan();
    
    // Rescan every 60 seconds
    const interval = setInterval(scan, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [todos.length, lang]);

  useEffect(() => {
    if (capabilities.length <= 1) return;
    const rotate = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % capabilities.length);
    }, 12000); // Rotate every 12 seconds
    return () => clearInterval(rotate);
  }, [capabilities.length]);

  return capabilities.length > 0 ? capabilities[currentIndex] : '';
}

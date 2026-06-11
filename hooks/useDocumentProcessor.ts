import { useCallback } from 'react';
import { Message } from '../lib/PromptService';
import { AttachedFile } from './useFileAttachment';
import { getTotalRAM } from '../lib/hardware';

/**
 * useDocumentProcessor — Hook especializado en la ingesta, síntesis y procesamiento
 * de archivos adjuntos (PDF, DOCX, Imágenes).
 * Implementa las recomendaciones de Null Safety y desacoplamiento de Gemma 4.
 */
export function useDocumentProcessor(
  lang: string,
  generateStreamingResponse: Function,
  buildFileContext: Function,
  extractTextInChunks: Function,
  db?: any,
  generateEmbeddings?: (texts: string[]) => Promise<number[][]>
) {

  const internalLLMCall = useCallback(async (prompt: string): Promise<string> => {
    try {
      const response = await generateStreamingResponse(prompt, () => {}, () => {});
      
      // 🛡️ Strict Null & Type Safety (P0 Fix)
      if (!response || typeof response !== 'string') {
        console.log("[DOC_PROCESSOR] Respuesta de LLM no válida o nula para síntesis:", response);
        return "";
      }
      
      return response.trim();
    } catch (e) {
      console.error("[DOC_PROCESSOR] Error en llamada interna:", e);
      return "";
    }
  }, [generateStreamingResponse]);

  const internalLLMVisionCall = useCallback(async (prompt: string, imagePath: string): Promise<string> => {
    try {
      const response = await generateStreamingResponse(
        prompt,
        () => {},
        () => {},
        imagePath,
        undefined,
        undefined,
        2,
        false,
        true
      );
      
      // 🛡️ Strict Null & Type Safety (P0 Fix)
      if (!response || typeof response !== 'string') {
        console.log("[DOC_PROCESSOR] Respuesta de LLM no válida o nula para visión:", response);
        return "";
      }
      
      return response.trim();
    } catch (e) {
      console.error("[DOC_PROCESSOR] Error en llamada interna de visión:", e);
      return "";
    }
  }, [generateStreamingResponse]);

  /**
   * Procesa los adjuntos y decide si requiere visión (JSI) o lectura de texto (Síntesis).
   */
  const processAttachments = useCallback(async (
    file: AttachedFile | null, 
    userQuery: string, 
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    // 🛡️ Null Safety Inicial
    if (!file) return { context: '', imageContent: null };

    // --- MODO VISIÓN (Optimizado Sanctuary v4.0 Zero-Copy) ---
    if (file.type === 'image' || (file.type as any) === 'image/vision-optimized') {
      // Prioridad 1: Buffer Binario (JSI) si ya existe
      if (file.binaryBuffer) {
        return {
          context: await buildFileContext(file),
          imageContent: { 
            type: 'image_url', 
            image_url: { url: `buffer`, buffer: file.binaryBuffer }
          }
        };
      }

      // Prioridad 2: Zero-Copy URI (Nativo)
      // Pasamos la URI directamente para que el motor de C++ la lea del disco
      console.log(`[SANCTUARY] ⚡ Zero-Copy: Inyectando URI nativa: ${file.uri}`);
      return {
        context: await buildFileContext(file),
        imageContent: { 
          type: 'image_url', 
          image_url: { url: file.uri } 
        }
      };
    }

    const ram = await getTotalRAM();
    
    // 🛡️ RECALIBRACIÓN v4.2: Límite dinámico para evitar "Context is full"
    // Con límite de 1 página, reducimos el presupuesto ya que menos contenido necesario
    // Si la RAM es baja (<8GB), el presupuesto es menor (3000) para no saturar el n_ctx de 2048/4096.
    const MEMORY_BUDGET = ram >= 8000 ? 8000 : 3000;
    
    let blocks: string[] = [];

    // --- MODO DOCUMENTO ESCANEADO (VISIÓN NATIVA MULTIPÁGINA PROGRESIVA) ---
    if (file.type === 'pdf' && file.metadata?.pdfImages && file.metadata.pdfImages.length > 0) {
      console.log(`[SANCTUARY] ⚡ Scanned PDF Vision: Processing ${file.metadata.pdfImages.length} pages sequentially.`);
      const totalPages = file.metadata.pdfImages.length;
      
      for (let i = 0; i < totalPages; i++) {
        const pageUri = file.metadata.pdfImages[i];
        
        // Visual feedback to the user
        setMessages(prev => prev.map(m => 
          m.role === 'ai' && (m.text.includes('Analizando') || m.text.includes('Procesando') || m.text.includes('Transcribiendo') || m.text === '')
            ? { 
                ...m, 
                text: lang === 'es' 
                  ? `📄 [SÍNTESIS VISUAL]: Transcribiendo página ${i + 1} de ${totalPages} (${Math.round(((i + 1) / totalPages) * 100)}%)...` 
                  : `📄 [VISUAL SYNTHESIS]: Transcribing page ${i + 1} of ${totalPages} (${Math.round(((i + 1) / totalPages) * 100)}%)...` 
              } 
            : m
        ));

        const visionPrompt = lang === 'es'
          ? `[SYSTEM]: Eres un extractor visual de documentos de alta precisión.\n<__media__>\nPor favor, transcribe de forma exacta todo el texto visible, tablas y contenido relevante de esta página de documento.`
          : `[SYSTEM]: You are a high-precision document visual extractor.\n<__media__>\nPlease extract exactly all visible text, tables, and relevant content from this document page.`;

        const pageText = await internalLLMVisionCall(visionPrompt, pageUri);
        if (pageText && pageText.trim().length > 0) {
          blocks.push(`--- PÁGINA ${i + 1} ---\n${pageText}`);
        } else {
          console.warn(`[DOC_PROCESSOR] No text extracted for page ${i + 1}`);
          blocks.push(`--- PÁGINA ${i + 1} ---\n[No se pudo extraer texto visualmente de esta página]`);
        }
      }
    } else {
      // Extracción de bloques estándar para documentos con texto
      const extractedBlocks = await extractTextInChunks(file, (progress: number, current: number, total: number) => {
        // Feedback visual solo si hay más de 1 bloque para evitar parpadeos
        if (total > 1) {
          setMessages(prev => prev.map(m => 
            m.role === 'ai' && (m.text.includes('Procesando') || m.text === '')
              ? { ...m, text: lang === 'es' 
                  ? `📄 [LECTURA]: Procesando bloque ${current} de ${total} (${progress}%)...` 
                  : `📄 [READING]: Processing block ${current} of ${total} (${progress}%)...` } 
              : m
          ));
        }
      });
      if (extractedBlocks) {
        blocks = extractedBlocks;
      }
    }

    if (!blocks || blocks.length === 0) {
      return { context: await buildFileContext(file), imageContent: null };
    }

    const fullText = blocks.join('\n');
    let immediateContext = '';

    if (db && generateEmbeddings) {
      try {
        setMessages(prev => prev.map(m => 
          m.role === 'ai' && (m.text === '')
            ? { ...m, text: lang === 'es' ? `📄 [SÍNTESIS]: Vectorizando documento profundo...` : `📄 [SYNTHESIS]: Vectorizing deep document...` } 
            : m
        ));

        const docId = file.uri.split('/').pop() || `doc_${Date.now()}`;
        
        const RAG_CHUNK_SIZE = 1000;
        const ragChunks: string[] = [];
        for (const bigBlock of blocks) {
          for (let i = 0; i < bigBlock.length; i += RAG_CHUNK_SIZE) {
            ragChunks.push(bigBlock.substring(i, i + RAG_CHUNK_SIZE));
          }
        }

        console.log(`[DOC_PROCESSOR] Vectorizing ${ragChunks.length} chunks for ${docId}`);

        // Vectorizar en lotes (batching) para no colapsar la RAM
        const BATCH_SIZE = 10;
        const allEmbeddings: number[][] = [];
        for (let i = 0; i < ragChunks.length; i += BATCH_SIZE) {
          const batch = ragChunks.slice(i, i + BATCH_SIZE);
          const batchEmbeddings = await generateEmbeddings(batch);
          allEmbeddings.push(...batchEmbeddings);
        }

        // Guardar en SQLite
        await db.withTransactionAsync(async () => {
          for (let i = 0; i < ragChunks.length; i++) {
            await db.runAsync(
              `INSERT INTO document_chunks (document_id, chunk_index, text, embedding) VALUES (?, ?, ?, ?)`,
              [docId, i, ragChunks[i], JSON.stringify(allEmbeddings[i])]
            );
          }
        });

        console.log(`[DOC_PROCESSOR] Guardados ${ragChunks.length} fragmentos en SQLite.`);

        if (fullText.length < MEMORY_BUDGET) {
          immediateContext = fullText;
        } else {
          immediateContext = `[SISTEMA]: El documento "${file.name}" ha sido procesado y guardado en la Memoria Profunda RAG. Por favor, realiza búsquedas sobre él según lo solicite el usuario.`;
        }
      } catch (e) {
        console.error('[DOC_PROCESSOR] Error en vectorización RAG:', e);
        immediateContext = '';
      }
    }

    if (!immediateContext) {
      if (fullText.length < MEMORY_BUDGET) {
        immediateContext = fullText;
      } else {
        // --- SÍNTESIS DE MEMORIA (Map-Reduce Style) ---
        let accumulatedSummary = "";
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i] || "";
          if (block.length < 5) continue;

          // 🚀 v4.3: Optimized synthesis prompt for faster processing
          const synthesisPrompt = accumulatedSummary
            ? `[SYSTEM]: Integra el siguiente bloque al resumen existente, preservando nombres, fechas y valores numéricos clave. Resumen: "${accumulatedSummary}"\nBloque: "${block}"`
            : `[SYSTEM]: Extrae los datos clave (nombres, fechas, valores) del siguiente contenido: "${block}"`;

          const blockSummary = await internalLLMCall(synthesisPrompt);
          
          // 🛡️ Null Safety y Validación de Contenido
          if (blockSummary && blockSummary.length > 0) {
            accumulatedSummary = blockSummary;
          } else {
            // Fallback: Si el modelo falla, guardamos un snippet crudo para no perder datos
            accumulatedSummary += `\n[SNIPPET]: ${block.substring(0, 500)}...`;
          }

          // Auto-Compresión si el resumen acumulado excede el presupuesto
          if (accumulatedSummary.length > MEMORY_BUDGET) {
            const compressPrompt = `[SYSTEM]: El resumen es muy largo. Comprímelo sin perder datos específicos:\n\n${accumulatedSummary}`;
            accumulatedSummary = await internalLLMCall(compressPrompt);
          }
        }
        immediateContext = accumulatedSummary;
      }
    }

    return { 
      context: immediateContext || await buildFileContext(file), 
      imageContent: null 
    };
  }, [buildFileContext, extractTextInChunks, internalLLMCall, internalLLMVisionCall, lang, db, generateEmbeddings]);

  return { processAttachments };
}

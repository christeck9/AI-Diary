import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { Alert, Image } from 'react-native';

let JSZip: any = null;
try { JSZip = require('jszip'); } catch(e) { console.warn('[FILE] jszip not available (DOCX extraction disabled)'); }

let PdfExtractor: any = null;
try { PdfExtractor = require('expo-pdf-text-extract'); } catch(e) { console.warn('[FILE] expo-pdf-text-extract not available'); }

// Lazy-load native pickers to avoid crash if native modules aren't compiled yet
let DocumentPicker: any = null;
let ImagePicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch(e) { console.warn('[FILE] expo-document-picker not available'); }
try { ImagePicker = require('expo-image-picker'); } catch(e) { console.warn('[FILE] expo-image-picker not available'); }

let ImageManipulator: any = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch(e) { console.warn('[FILE] expo-image-manipulator not available'); }

const getResolvedDocumentPicker = () => {
  if (!DocumentPicker) return null;
  return DocumentPicker.default && DocumentPicker.default.getDocumentAsync
    ? DocumentPicker.default
    : DocumentPicker;
};

const getResolvedImagePicker = () => {
  if (!ImagePicker) return null;
  return ImagePicker.default && (ImagePicker.default.launchImageLibraryAsync || ImagePicker.default.MediaTypeOptions)
    ? ImagePicker.default
    : ImagePicker;
};

const getResolvedImageManipulator = () => {
  if (!ImageManipulator) return null;
  return ImageManipulator.default && (ImageManipulator.default.manipulateAsync || ImageManipulator.default.SaveFormat)
    ? ImageManipulator.default
    : ImageManipulator;
};

const ensureLocalFileUri = async (uri: string): Promise<string> => {
  if (uri && uri.startsWith('content://')) {
    try {
      const fileName = uri.split('/').pop() || `temp_${Date.now()}`;
      const cleanName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9.-]/g, '_');
      const destination = `${FileSystem.cacheDirectory}${cleanName}`;
      console.log(`[FILE] Copying content URI to local cache: ${uri} -> ${destination}`);
      await FileSystem.copyAsync({
        from: uri,
        to: destination
      });
      return destination;
    } catch (err) {
      console.error('[FILE] failed to copy content URI to local cache:', err);
      return uri;
    }
  }
  return uri;
};

const getPdfPageLimit = async (): Promise<number> => {
  // 🛡️ OPTIMIZATION: Reduced to 1 page for faster processing on mobile
  // Each page requires a full LLM vision call which is slow on local models
  return 1;
};


export interface AttachedFile {
  name: string;
  type: 'text' | 'image' | 'pdf' | 'doc' | 'unknown';
  uri: string;
  extractedText: string;
  sizeKB: number;
  totalChars?: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    exif?: any;
    pdfImages?: string[];
  };
  binaryBuffer?: Uint8Array;
}


const MAX_FILE_SIZE_KB = 10240; // 🔱 A++: 10MB Limit (RAM Safety Limit)
const MAX_BASE64_MEM_KB = 5120; // 🔱 A++: 5MB Limit for direct RAM read

/**
 * useFileAttachment — Manages file picking, text extraction, and context injection.
 * Supports: .txt, .md, .json, .csv, .pdf (native), .docx (via JSZip), images (Vision-ready).
 */
export function useFileAttachment(lang: string) {
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Text Extraction Router ──
  const extractTextFromFile = async (uri: string, mimeType: string, fileSizeKB: number): Promise<string> => {
    try {
      // 1. Plain text-based files
      if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/xml' ||
        uri.match(/\.(md|txt|csv|json|xml|log|py|js|ts|html|css)$/i)
      ) {
        return await FileSystem.readAsStringAsync(uri);
      }

      // 2. PDF files
      if (mimeType === 'application/pdf' || uri.endsWith('.pdf')) {
        return await extractTextFromPdf(uri);
      }

      // 3. DOCX files
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        uri.endsWith('.docx')
      ) {
        if (fileSizeKB > MAX_BASE64_MEM_KB) {
           return `[${lang === 'es' ? 'Archivo DOCX demasiado grande para procesar localmente en memoria. El límite es 10MB.' : 'DOCX file too large to process locally in memory. Limit is 10MB.'}]`;
        }
        return await extractTextFromDocx(uri);
      }

      // 4. Legacy DOC
      if (mimeType === 'application/msword' || uri.endsWith('.doc')) {
        return `[${lang === 'es' ? 'Formato .doc no soportado. Por favor conviértelo a .docx o .pdf.' : '.doc format not supported. Please convert to .docx or .pdf.'}]`;
      }

      return `[${lang === 'es' ? 'Archivo binario — tipo' : 'Binary file — type'}: ${mimeType}]`;
    } catch (e: any) {
      console.error('[FILE] Extraction error:', e);
      return `[${lang === 'es' ? 'Error al leer archivo' : 'Error reading file'}: ${e.message}]`;
    }
  };

  // ── PDF text extraction via expo-pdf-text-extract (native only) ──
  // ── PDF text extraction via JSI Native (Bypass Bridge) ──
  const extractTextFromPdf = async (uri: string): Promise<string> => {
    try {
      const PdfExtractor = require('expo-pdf-text-extract');
      if (PdfExtractor && (PdfExtractor.isAvailable ? PdfExtractor.isAvailable() : true)) {
        console.log('[FILE] ⚡ PDF JSI Native Extraction start');
        
        // The engine reads the file directly from the URI on the native thread.
        const resolvedPdfExtractor = PdfExtractor.default && PdfExtractor.default.extractText ? PdfExtractor.default : PdfExtractor;
        const rawText = await resolvedPdfExtractor.extractText(uri);
        
        if (!rawText || rawText.trim().length === 0) {
          return `[${lang === 'es' ? 'Error: El documento PDF está vacío o es una imagen escaneada sin texto extraíble.' : 'Error: The PDF document is empty or a scanned image with no extractable text.'}]`;
        }

        // --- RAG-READY CLEANING (Gemma 4 Optimization) ---
        const cleanedText = rawText
          .replace(/(\w)-\n(\w)/g, '$1$2') // Une palabras cortadas por guiones al final de línea
          .replace(/\n(?=\w)/g, ' ')       // Une líneas rotas que no son párrafos nuevos
          .replace(/\s+/g, ' ')           // Normaliza espacios múltiples a uno solo
          .trim();

        console.log(`[FILE] PDF extracted & cleaned: ${cleanedText.length} chars`);
        return cleanedText;
      }
      return `[PDF Error: Native engine not available]`;
    } catch (e: any) {
      console.error('[FILE] PDF extraction error:', e);
      return '';
    }
  };

  // ── Image Optimization & Metadata Extraction ──
  const processImage = async (uri: string, fileName: string, knownWidth?: number, knownHeight?: number) => {
    try {
      console.log(`[FILE] Optimizing image: ${fileName}`);
      let processedResult = { uri, width: 0, height: 0 };
      const manipulator = getResolvedImageManipulator();
      if (manipulator) {
        const saveFormatJPEG = manipulator.SaveFormat?.JPEG || 'jpeg';
        
        let width = knownWidth || 0;
        let height = knownHeight || 0;
        
        if (width === 0 || height === 0) {
          try {
            const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
              Image.getSize(
                uri,
                (w, h) => resolve({ width: w, height: h }),
                (err) => reject(err)
              );
            });
            width = size.width;
            height = size.height;
            console.log(`[FILE] Image size resolved via Image.getSize: ${width}x${height}`);
          } catch (sizeErr) {
            console.warn('[FILE] Failed to get image size via Image.getSize, falling back to manipulateAsync:', sizeErr);
            // Fallback to empty manipulateAsync to get size
            const initial = await manipulator.manipulateAsync(uri, [], { format: saveFormatJPEG });
            width = initial.width || 0;
            height = initial.height || 0;
          }
        }

        const maxDim = 768;
        let scale = 1;
        if (width > 0 && height > 0) {
          if (width > maxDim || height > maxDim) {
            scale = maxDim / Math.max(width, height);
          }
        }
        
        processedResult = await manipulator.manipulateAsync(
          uri,
          [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }],
          { compress: 0.6, format: saveFormatJPEG }
        );
      }
      return { 
        uri: processedResult.uri, 
        metadata: {
          width: processedResult.width,
          height: processedResult.height,
          format: fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN'
        } 
      };
    } catch (e) {
      console.error('[FILE] Image processing error:', e);
      return { uri, metadata: {} };
    }
  };

  const extractTextFromImage = async (uri: string, metadata: any): Promise<string> => {
    return `[VISION_DATA] Image: ${metadata.format}, Resolution: ${metadata.width}x${metadata.height}. Content: [The image is attached. Please analyze the visual file directly.]`;
  };

  // ── DOCX text extraction via JSZip ──
  const extractTextFromDocx = async (uri: string): Promise<string> => {
    try {
      if (!JSZip) {
        console.warn('[FILE] Attempting to extract DOCX without jszip');
        return '';
      }
       // Read as ArrayBuffer for JSZip (more efficient than Base64)
       const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
       const zip = await JSZip.loadAsync(base64, { base64: true });
       const docXml = zip.file('word/document.xml') || zip.file(/document\.xml$/)?.[0];
       
       if (!docXml) return '';

      const xmlContent = await docXml.async('text');
      // Robust regex (v4.0 Protocol): Supports attributes and XML line breaks [\s\S]
      const matches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      
      const extracted = matches
        .map((val: string) => val.replace(/<[^>]+>/g, '')) // Cleans internal XML tags
        .join(' ');

      return (extracted || "").trim();
    } catch (e: any) {
      console.error('[FILE] DOCX error:', e);
      return '';
    }
  };

  const pickDocument = useCallback(async () => {
    const docPicker = getResolvedDocumentPicker();
    if (!docPicker) return null;
    setIsProcessing(true);
    try {
      const result = await docPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets) { setIsProcessing(false); return null; }

      const asset = result.assets[0];
      const fileUri = await ensureLocalFileUri(asset.uri);
      const fileSizeKB = Math.round((asset.size || 0) / 1024);
      const mimeType = asset.mimeType || 'application/octet-stream';
      const fileName = asset.name || 'unknown';

      let fileType: AttachedFile['type'] = 'unknown';
      if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)) fileType = 'image';
      else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) fileType = 'pdf';
      else if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) fileType = 'doc';
      else if (mimeType.startsWith('text/') || /\.(txt|md|csv|json|xml|js|ts)$/i.test(fileName)) fileType = 'text';

      if (fileType === 'unknown') {
        Alert.alert(
          lang === 'es' ? 'Error' : 'Error',
          lang === 'es'
            ? 'Este formato no es aceptado. Solo podemos procesar imágenes, documentos PDF y DOCX.'
            : 'This format is not accepted. We can only process images, docx, and PDF documents.'
        );
        setIsProcessing(false);
        return null;
      }

      if (fileSizeKB > MAX_FILE_SIZE_KB) {
        Alert.alert(lang === 'es' ? 'Archivo muy grande' : 'File too large');
        setIsProcessing(false); return null;
      }

      let extractedText = '';
      let imageMetadata = undefined;
      let finalUri = fileUri;

      if (fileType === 'image') {
        const processed = await processImage(fileUri, fileName, (asset as any).width, (asset as any).height);
        finalUri = processed.uri;
        imageMetadata = processed.metadata;
        extractedText = await extractTextFromImage(processed.uri, imageMetadata);
      } else {
        extractedText = await extractTextFromFile(fileUri, mimeType, fileSizeKB);
        if (fileType === 'pdf') {
          const isEmptyOrScanned = !extractedText || 
                                   extractedText.trim().length === 0 ||
                                   extractedText.includes('El documento PDF está vacío') || 
                                   extractedText.includes('The PDF document is empty') ||
                                   extractedText.startsWith('[PDF Error:');
          if (isEmptyOrScanned) {
            console.log('[FILE] 📸 Scanned/text-less PDF detected. Initiating Native PDF-to-Image conversion...');
            try {
              const { convertPdfToImages } = require('../lib/PdfToImage');
              const pageLimit = await getPdfPageLimit();
              const renderedPages = await convertPdfToImages(fileUri, pageLimit);
              if (renderedPages && renderedPages.length > 0) {
                console.log(`[FILE] Native PDF conversion succeeded: ${renderedPages.length} pages converted.`);
                imageMetadata = {
                  pdfImages: renderedPages,
                  format: 'JPEG',
                  width: 1008,
                  height: 1425
                };
                extractedText = `[VISION_DATA] PDF: "${fileName}", Pages: ${renderedPages.length}. Content: [This is a scanned PDF with no extractable text. It has been rendered to images. Please analyze the visual files directly.]`;
              }
            } catch (err) {
              console.error('[FILE] Native PDF-to-Image conversion failed:', err);
            }
          }
        }
      }

      const attached: AttachedFile = { name: fileName, type: fileType, uri: finalUri, extractedText, sizeKB: fileSizeKB, metadata: imageMetadata };
      setAttachedFile(attached);
      setIsProcessing(false);
      return attached;
    } catch (e) { setIsProcessing(false); return null; }
  }, [lang]);

  const pickImage = useCallback(async () => {
    const picker = getResolvedImagePicker();
    if (!picker) return null;
    setIsProcessing(true);
    try {
      const { status } = await picker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'es' ? 'Permiso requerido' : 'Permission required',
          lang === 'es' ? 'Se requiere permiso de galería para seleccionar imágenes.' : 'Media library permission is required to select images.'
        );
        setIsProcessing(false);
        return null;
      }

      const mediaTypesVal = picker.MediaTypeOptions?.Images || 'Images';
      const result = await picker.launchImageLibraryAsync({ 
        mediaTypes: mediaTypesVal, 
        quality: 0.6 
      });
      if (result.canceled || !result.assets) { setIsProcessing(false); return null; }
      const asset = result.assets[0];
      const fileUri = await ensureLocalFileUri(asset.uri);
      const fileName = fileUri.split('/').pop() || 'image.jpg';
      const processed = await processImage(fileUri, fileName, asset.width, asset.height);

      let sizeKB = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(processed.uri);
        if (fileInfo.exists) {
          sizeKB = Math.round(fileInfo.size / 1024);
        }
      } catch (err) {
        sizeKB = Math.round((asset.fileSize || 0) / 1024);
      }

      const attached: AttachedFile = { 
        name: fileName, type: 'image', uri: processed.uri, 
        extractedText: await extractTextFromImage(processed.uri, processed.metadata), 
        sizeKB, metadata: processed.metadata 
      };
      setAttachedFile(attached);
      setIsProcessing(false);
      return attached;
    } catch (e) { setIsProcessing(false); return null; }
  }, [lang]);

  const takePhoto = useCallback(async () => {
    const picker = getResolvedImagePicker();
    if (!picker) return null;
    setIsProcessing(true);
    try {
      const { status } = await picker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'es' ? 'Permiso requerido' : 'Permission required',
          lang === 'es' ? 'Se requiere permiso de cámara para tomar fotos.' : 'Camera permission is required to take photos.'
        );
        setIsProcessing(false);
        return null;
      }

      const result = await picker.launchCameraAsync({ quality: 0.6 });
      if (result.canceled || !result.assets) { setIsProcessing(false); return null; }
      const asset = result.assets[0];
      const fileUri = await ensureLocalFileUri(asset.uri);
      const fileName = `camera_${Date.now()}.jpg`;
      const processed = await processImage(fileUri, fileName, asset.width, asset.height);

      let sizeKB = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(processed.uri);
        if (fileInfo.exists) {
          sizeKB = Math.round(fileInfo.size / 1024);
        }
      } catch (err) {
        sizeKB = Math.round((asset.fileSize || 0) / 1024);
      }

      const attached: AttachedFile = { 
        name: fileName, type: 'image', uri: processed.uri, 
        extractedText: await extractTextFromImage(processed.uri, processed.metadata), 
        sizeKB, metadata: processed.metadata 
      };
      setAttachedFile(attached);
      setIsProcessing(false);
      return attached;
    } catch (e) { setIsProcessing(false); return null; }
  }, [lang]);

  const clearAttachment = useCallback(() => setAttachedFile(null), []);

  const extractTextInChunks = useCallback(async (
    file: AttachedFile, 
    onProgress?: (p: number, c: number, t: number) => void,
    returnFullText: boolean = false
  ): Promise<string[]> => {
    // SAFETY: If no text was extracted (common in images without OCR), we return the empty block or the vision tag
    const fullText = file.extractedText || '';
    
    if (returnFullText) return [fullText];
    const CHUNK_SIZE = 80000; // 🔱 A++: 80k Chars (~20k Tokens) in one go
    const blocks: string[] = [];
    
    if (fullText.length === 0) return [''];

    const totalBlocks = Math.ceil(fullText.length / CHUNK_SIZE);

    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      blocks.push(fullText.substring(i, i + CHUNK_SIZE));
      if (onProgress) {
        const currentBytes = Math.min(i + CHUNK_SIZE, fullText.length);
        const percent = Math.round((currentBytes / fullText.length) * 100);
        onProgress(percent, blocks.length, totalBlocks);
      }
    }
    return blocks;
  }, []);

  const buildFileContext = useCallback((file?: AttachedFile | null): string => {
    const targetFile = file !== undefined ? file : attachedFile;
    if (!targetFile) return '';
    return `\n\n--- ${lang === 'es' ? 'ARCHIVO' : 'FILE'}: "${targetFile.name}" ---\n${targetFile.extractedText}\n--- FIN ---\n`;
  }, [attachedFile, lang]);

  return { attachedFile, isProcessing, pickDocument, pickImage, takePhoto, clearAttachment, buildFileContext, extractTextInChunks };
}

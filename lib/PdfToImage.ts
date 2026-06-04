import { NativeModules } from 'react-native';

const { PdfToImageModule } = NativeModules;

/**
 * Invokes the native module to render PDF pages into JPEGs.
 * 
 * @param uri The local file URI (content:// or file://) of the PDF document.
 * @param maxPages The maximum number of pages to process.
 * @returns A promise that resolves to an array of local image URIs.
 */
export async function convertPdfToImages(uri: string, maxPages: number = 1): Promise<string[]> {
  if (!PdfToImageModule || typeof PdfToImageModule.convertPdfToImages !== 'function') {
    console.warn('[PDF_TO_IMAGE] PdfToImageModule is not available in this build environment.');
    return [];
  }

  try {
    console.log(`[PDF_TO_IMAGE] Converting PDF: ${uri} (max pages: ${maxPages})`);
    const result: string[] = await PdfToImageModule.convertPdfToImages(uri, maxPages);
    console.log(`[PDF_TO_IMAGE] Conversion complete. Generated ${result.length} images.`);
    return result;
  } catch (error) {
    console.error('[PDF_TO_IMAGE] Error converting PDF to images:', error);
    return [];
  }
}
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

/**
 * Invokes the native module to extract text from a scanned PDF page using OCR (ML Kit).
 * 
 * @param uri The local file URI (content:// or file://) of the PDF document.
 * @param pageIndex The 0-indexed page number to OCR.
 * @returns A promise that resolves to the recognized plain text.
 */
export async function extractTextFromPdfPage(uri: string, pageIndex: number): Promise<string> {
  if (!PdfToImageModule || typeof PdfToImageModule.extractTextFromPdfPage !== 'function') {
    console.warn('[PDF_TO_IMAGE] PdfToImageModule.extractTextFromPdfPage is not available in this build.');
    return '';
  }

  try {
    console.log(`[PDF_TO_IMAGE] Running Native OCR on page ${pageIndex} of: ${uri}`);
    const result: string = await PdfToImageModule.extractTextFromPdfPage(uri, pageIndex);
    return result;
  } catch (error) {
    console.log('[PDF_TO_IMAGE] Native OCR failed:', error);
    return '';
  }
}

/**
 * Invokes the native module to extract text from a local image file using OCR (ML Kit).
 * 
 * @param uri The local file URI (content:// or file://) of the image document.
 * @returns A promise that resolves to the recognized plain text.
 */
export async function extractTextFromImage(uri: string): Promise<string> {
  if (!PdfToImageModule || typeof PdfToImageModule.extractTextFromImage !== 'function') {
    console.warn('[PDF_TO_IMAGE] PdfToImageModule.extractTextFromImage is not available in this build.');
    return '';
  }

  try {
    console.log(`[PDF_TO_IMAGE] Running Native OCR on image: ${uri}`);
    const result: string = await PdfToImageModule.extractTextFromImage(uri);
    return result;
  } catch (error) {
    console.log('[PDF_TO_IMAGE] Native image OCR failed:', error);
    return '';
  }
}
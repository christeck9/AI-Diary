import * as FileSystem from 'expo-file-system';
import { SQLiteDatabase } from 'expo-sqlite';
import { sentinelFetch } from './IdentityRotator';
import { purifyQuery } from './TextUtils';

let PdfExtractor: any = null;
try {
  PdfExtractor = require('expo-pdf-text-extract');
} catch (e) {
  console.warn('[LIBRARY] expo-pdf-text-extract not available in service');
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  year: string;
  file_path: string;
  last_read_page: number;
  total_pages: number;
  is_indexed: number;
  created_at: number;
}

export interface SearchResult {
  title: string;
  author: string;
  year: string;
  pdfUrl: string;
  source: 'arxiv' | 'openlibrary';
  id: string;
}

export const LibraryManagerService = {
  /**
   * Search papers on arXiv using public Atom API
   */
  async searchArXiv(query: string): Promise<SearchResult[]> {
    const pureQuery = purifyQuery(query);
    if (!pureQuery) return [];

    try {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(pureQuery)}&max_results=6`;
      console.log(`[LIBRARY] Searching arXiv: ${url}`);
      const response = await sentinelFetch(url, {}, 15000);
      if (!response.ok) {
        console.log(`[LIBRARY] arXiv request failed: ${response.status}`);
        return [];
      }

      const xml = await response.text();
      const results: SearchResult[] = [];

      // Extract entry nodes via regex
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;
      while ((match = entryRegex.exec(xml)) !== null) {
        const entryContent = match[1];

        // 1. Extract Title
        const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entryContent);
        let title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
        title = title.replace(/\s+/g, ' '); // Clean newlines/spaces

        // 2. Extract Authors
        const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
        const authors: string[] = [];
        let authMatch;
        while ((authMatch = authorRegex.exec(entryContent)) !== null) {
          authors.push(authMatch[1].trim());
        }
        const author = authors.length > 0 ? authors.join(', ') : 'Unknown Author';

        // 3. Extract Year
        const publishedMatch = /<published>(\d{4})/.exec(entryContent);
        const year = publishedMatch ? publishedMatch[1] : 'N/A';

        // 4. Extract PDF Link
        let pdfUrl = '';
        const pdfLinkMatch = /<link[^>]*?href="([^"]+?)"[^>]*?type="application\/pdf"/i.exec(entryContent);
        if (pdfLinkMatch) {
          pdfUrl = pdfLinkMatch[1];
        } else {
          const fallbackMatch = /<link[^>]*?title="pdf"[^>]*?href="([^"]+?)"/i.exec(entryContent);
          if (fallbackMatch) {
            pdfUrl = fallbackMatch[1];
          }
        }

        // Convert http to https for iOS compatibility
        if (pdfUrl.startsWith('http://')) {
          pdfUrl = pdfUrl.replace('http://', 'https://');
        }

        // Extract ID
        const idMatch = /<id>([\s\S]*?)<\/id>/.exec(entryContent);
        const id = idMatch ? idMatch[1].split('/').pop()?.trim() || `arxiv_${Date.now()}` : `arxiv_${Date.now()}`;

        if (pdfUrl) {
          results.push({
            id,
            title,
            author,
            year,
            pdfUrl,
            source: 'arxiv'
          });
        }
      }

      return results;
    } catch (err) {
      console.log('[LIBRARY] Error searching arXiv:', err);
      return [];
    }
  },

  /**
   * Search books on OpenLibrary and resolve Internet Archive PDF download links
   */
  async searchOpenLibrary(query: string): Promise<SearchResult[]> {
    const pureQuery = purifyQuery(query);
    if (!pureQuery) return [];

    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(pureQuery)}&limit=6&fields=title,author_name,first_publish_year,ia,key,public_scan_b`;
      console.log(`[LIBRARY] Searching OpenLibrary: ${url}`);
      const response = await sentinelFetch(url, {}, 15000);
      if (!response.ok) {
        console.log(`[LIBRARY] OpenLibrary request failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.docs || data.docs.length === 0) return [];

      const results: SearchResult[] = [];
      for (const doc of data.docs) {
        // Internet Archive ID is needed to resolve direct PDF downloads
        if (!doc.ia || doc.ia.length === 0) continue;
        // Skip restricted/copyrighted books without public scans
        if (doc.public_scan_b !== true) continue;
        
        const iaId = doc.ia[0];
        // Build direct archive.org PDF download URL
        const pdfUrl = `https://archive.org/download/${iaId}/${iaId}.pdf`;
        const title = doc.title;
        const author = doc.author_name ? doc.author_name.join(', ') : 'Unknown Author';
        const year = doc.first_publish_year ? String(doc.first_publish_year) : 'N/A';
        const id = doc.key ? doc.key.split('/').pop() || iaId : iaId;

        results.push({
          id,
          title,
          author,
          year,
          pdfUrl,
          source: 'openlibrary'
        });
      }

      return results;
    } catch (err) {
      console.log('[LIBRARY] Error searching OpenLibrary:', err);
      return [];
    }
  },

  /**
   * Download a PDF and save to Library catalog
   */
  async downloadBook(
    db: SQLiteDatabase,
    title: string,
    author: string,
    year: string,
    pdfUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<LibraryBook | null> {
    try {
      console.log(`[LIBRARY] Starting download: ${pdfUrl}`);
      const libDir = `${FileSystem.documentDirectory}library/`;
      const dirInfo = await FileSystem.getInfoAsync(libDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(libDir, { intermediates: true });
      }

      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
      const localFilePath = `${libDir}${cleanTitle}_${Date.now()}.pdf`;

      const downloadRes = FileSystem.createDownloadResumable(
        pdfUrl,
        localFilePath,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
          }
        },
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (onProgress) {
            onProgress(Math.round(progress * 100));
          }
        }
      );

      const result = await downloadRes.downloadAsync();
      if (!result || !result.uri) {
        console.log('[LIBRARY] Download returned empty URI');
        return null;
      }

      // Validate that the file is actually a PDF (and not an HTML error page)
      try {
        const header = await FileSystem.readAsStringAsync(result.uri, {
          length: 1024,
          position: 0,
          encoding: FileSystem.EncodingType.UTF8
        });
        if (!header.includes('%PDF')) {
          console.log(`[LIBRARY] Downloaded file does not contain %PDF signature in first 1024 bytes`);
          await FileSystem.deleteAsync(result.uri);
          return null;
        }
      } catch (err) {
        console.log('[LIBRARY] Failed to read PDF header:', err);
        try { await FileSystem.deleteAsync(result.uri); } catch (e) {}
        return null;
      }

      console.log(`[LIBRARY] Saved PDF to: ${result.uri}`);

      // Count pages
      let pageCount = 0;
      if (PdfExtractor) {
        try {
          const resolvedPdfExtractor = PdfExtractor.default && PdfExtractor.default.getPageCount ? PdfExtractor.default : PdfExtractor;
          pageCount = await resolvedPdfExtractor.getPageCount(result.uri);
          console.log(`[LIBRARY] PDF has ${pageCount} pages`);
        } catch (e) {
          console.warn('[LIBRARY] Could not determine page count, defaulting to 0:', e);
        }
      }

      const bookId = `book_${Date.now()}`;
      const createdAt = Date.now();

      await db.runAsync(
        `INSERT INTO library_books (id, title, author, year, file_path, last_read_page, total_pages, is_indexed, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)`,
        [bookId, title, author, year, result.uri, pageCount, createdAt]
      );

      return {
        id: bookId,
        title,
        author,
        year,
        file_path: result.uri,
        last_read_page: 1,
        total_pages: pageCount,
        is_indexed: 0,
        created_at: createdAt
      };
    } catch (err) {
      console.log('[LIBRARY] Failed to download book:', err);
      return null;
    }
  },

  /**
   * Import a local PDF file into the catalog
   */
  async importLocalPdf(
    db: SQLiteDatabase,
    sourceUri: string,
    fileName: string
  ): Promise<LibraryBook | null> {
    try {
      const libDir = `${FileSystem.documentDirectory}library/`;
      const dirInfo = await FileSystem.getInfoAsync(libDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(libDir, { intermediates: true });
      }

      const cleanName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
      const localFilePath = `${libDir}${Date.now()}_${cleanName}`;

      console.log(`[LIBRARY] Copying local file: ${sourceUri} -> ${localFilePath}`);
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localFilePath
      });

      // Count pages
      let pageCount = 0;
      if (PdfExtractor) {
        try {
          const resolvedPdfExtractor = PdfExtractor.default && PdfExtractor.default.getPageCount ? PdfExtractor.default : PdfExtractor;
          pageCount = await resolvedPdfExtractor.getPageCount(localFilePath);
          console.log(`[LIBRARY] Imported PDF has ${pageCount} pages`);
        } catch (e) {
          console.warn('[LIBRARY] Could not determine page count on import:', e);
        }
      }

      const bookId = `book_${Date.now()}`;
      const title = fileName.replace(/\.[^/.]+$/, ""); // Strip extension
      const createdAt = Date.now();

      await db.runAsync(
        `INSERT INTO library_books (id, title, author, year, file_path, last_read_page, total_pages, is_indexed, created_at)
         VALUES (?, ?, 'Local Import', 'N/A', ?, 1, ?, 0, ?)`,
        [bookId, title, localFilePath, pageCount, createdAt]
      );

      return {
        id: bookId,
        title,
        author: 'Local Import',
        year: 'N/A',
        file_path: localFilePath,
        last_read_page: 1,
        total_pages: pageCount,
        is_indexed: 0,
        created_at: createdAt
      };
    } catch (err) {
      console.log('[LIBRARY] Failed to import local PDF:', err);
      return null;
    }
  },

  /**
   * Fetch books from DB
   */
  async getBooks(db: SQLiteDatabase): Promise<LibraryBook[]> {
    try {
      return await db.getAllAsync<LibraryBook>(
        'SELECT id, title, author, year, file_path, last_read_page, total_pages, is_indexed, created_at FROM library_books ORDER BY created_at DESC'
      );
    } catch (err) {
      console.error('[LIBRARY] Failed to fetch books:', err);
      return [];
    }
  },

  /**
   * Update last read page
   */
  async updateReadingProgress(db: SQLiteDatabase, bookId: string, page: number): Promise<void> {
    try {
      await db.runAsync('UPDATE library_books SET last_read_page = ? WHERE id = ?', [page, bookId]);
    } catch (err) {
      console.error('[LIBRARY] Failed to update progress:', err);
    }
  },

  /**
   * Extract page content dynamically
   */
  async getPageContent(filePath: string, pageNumber: number): Promise<string> {
    try {
      let text = '';
      if (PdfExtractor) {
        try {
          const resolvedPdfExtractor = PdfExtractor.default && PdfExtractor.default.extractTextFromPage ? PdfExtractor.default : PdfExtractor;
          text = await resolvedPdfExtractor.extractTextFromPage(filePath, pageNumber);
        } catch (err) {
          console.log(`[LIBRARY] Text extractor failed for page ${pageNumber}, trying OCR:`, err);
        }
      }

      // If text is empty, run Google ML Kit Native OCR as a low-cost fallback!
      if (!text || text.trim().length === 0) {
        console.log(`[LIBRARY] 📸 Scanned PDF page detected. Running Native OCR on page ${pageNumber}...`);
        try {
          const { extractTextFromPdfPage } = require('./PdfToImage');
          text = await extractTextFromPdfPage(filePath, pageNumber - 1);
        } catch (ocrErr) {
          console.log(`[LIBRARY] Native OCR failed for page ${pageNumber}:`, ocrErr);
        }
      }

      if (!text || text.trim().length === 0) {
        return `[Página ${pageNumber} - Documento escaneado o sin texto legible]`;
      }

      // Cleanup formatting
      return text
        .replace(/(\w)-\n(\w)/g, '$1$2')
        .replace(/\n(?=\w)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (err) {
      console.log(`[LIBRARY] Failed to extract page ${pageNumber}:`, err);
      return `[Error al extraer página ${pageNumber}]`;
    }
  },

  /**
   * Index book page-by-page into document_chunks for RAG
   */
  async indexBook(
    db: SQLiteDatabase,
    bookId: string,
    generateEmbeddings: (texts: string[]) => Promise<number[][]>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<boolean> {
    try {
      const book = await db.getFirstAsync<LibraryBook>('SELECT * FROM library_books WHERE id = ?', [bookId]);
      if (!book) return false;

      const total = book.total_pages;
      if (total === 0) return false;

      console.log(`[LIBRARY] Indexing book: ${book.title} (${total} pages)`);
      const docId = `book-${bookId}`;

      // Clean up previous chunks for this book if any
      await db.runAsync('DELETE FROM document_chunks WHERE document_id = ?', [docId]);

      const RAG_CHUNK_SIZE = 1000;
      const BATCH_SIZE = 5;

      for (let page = 1; page <= total; page++) {
        const pageText = await this.getPageContent(book.file_path, page);
        if (!pageText || pageText.startsWith('[Error') || pageText.startsWith('[Página')) {
          continue;
        }

        // Slice page content into chunks
        const chunks: string[] = [];
        for (let i = 0; i < pageText.length; i += RAG_CHUNK_SIZE) {
          chunks.push(`[Libro: ${book.title} - Pág ${page}] ` + pageText.substring(i, i + RAG_CHUNK_SIZE));
        }

        if (chunks.length === 0) continue;

        // Generate embeddings in small batches
        const embeddings = await generateEmbeddings(chunks);

        // Store chunks and vectors
        await db.withTransactionAsync(async () => {
          for (let i = 0; i < chunks.length; i++) {
            await db.runAsync(
              'INSERT INTO document_chunks (document_id, chunk_index, text, embedding) VALUES (?, ?, ?, ?)',
              [docId, (page * 100) + i, chunks[i], JSON.stringify(embeddings[i])]
            );
          }
        });

        if (onProgress) {
          onProgress(page, total);
        }
      }

      await db.runAsync('UPDATE library_books SET is_indexed = 1 WHERE id = ?', [bookId]);
      console.log(`[LIBRARY] Successfully indexed book: ${book.title}`);
      return true;
    } catch (err) {
      console.error('[LIBRARY] Failed to index book:', err);
      return false;
    }
  },

  /**
   * Delete book from system
   */
  async deleteBook(db: SQLiteDatabase, bookId: string): Promise<boolean> {
    try {
      const book = await db.getFirstAsync<LibraryBook>('SELECT * FROM library_books WHERE id = ?', [bookId]);
      if (!book) return false;

      // Delete file
      try {
        const fileInfo = await FileSystem.getInfoAsync(book.file_path);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(book.file_path);
        }
      } catch (err) {
        console.warn(`[LIBRARY] Could not delete physical file: ${book.file_path}`, err);
      }

      // Delete records
      await db.runAsync('DELETE FROM library_books WHERE id = ?', [bookId]);
      await db.runAsync('DELETE FROM document_chunks WHERE document_id = ?', [`book-${bookId}`]);

      console.log(`[LIBRARY] Deleted book: ${book.title}`);
      return true;
    } catch (err) {
      console.error('[LIBRARY] Failed to delete book:', err);
      return false;
    }
  }
};

import 'react-native-get-random-values';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';


// 🔐 Instancia del motor criptográfico seguro local (Web Crypto API)
const cryptography_engine = (global as any).crypto;

// Tipo seguro para las claves de cifrado
type CryptoKey = any;


/**
 * lib/vault.ts — Handles the Sanctuary Archive file operations with AES-256 encryption.
 * Naming convention: M-D-YY.HH-mm.SOAP or .REPORT
 */

export const VAULT_DIR = `${FileSystem.documentDirectory}Sanctuary_Vault/`;
const MASTER_KEY_STORAGE_KEY = 'vault_master_encryption_key';
const PIN_KEY = 'vault_pin_code';

/**
 * Retrieves the master encryption key from SecureStore.
 * If no key exists, it generates a cryptographically strong one using crypto.getRandomValues.
 */
async function getVaultMasterKey(): Promise<string> {
  let key: string | null = null;

  // Isolated SecureStore read: if Android KeyStore throws (e.g., after a system
  // update invalidates keys), we clean up the entry and generate a new key.
  // NOTE: existing vault files encrypted with the old key will become unreadable,
  // but the app will continue to function and new files will be encrypted correctly.
  try {
    key = await SecureStore.getItemAsync(MASTER_KEY_STORAGE_KEY);
  } catch (e) {
    console.error('[VAULT] KeyStore error reading master key — generating new key. Old vault files are now inaccessible:', e);
    try { await SecureStore.deleteItemAsync(MASTER_KEY_STORAGE_KEY); } catch (_) {}
  }

  if (!key) {
    // Generate a cryptographically secure 32-byte key
    const randomValues = new Uint8Array(32);
    cryptography_engine.getRandomValues(randomValues);
    key = Array.from(randomValues)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    try {
      await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, key);
    } catch (e) {
      console.error('[VAULT] Could not persist new master key to SecureStore:', e);
    }
  }
  return key;
}

// --- Web Crypto API Helpers ---
async function digestSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await cryptography_engine.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCryptoKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return await cryptography_engine.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}
// ------------------------------

export async function setVaultPin(pin: string): Promise<void> {
  const hashedPin = await digestSHA256(pin);
  try {
    await SecureStore.setItemAsync(PIN_KEY, hashedPin);
  } catch (e) {
    console.error('[VAULT] Could not save PIN to SecureStore:', e);
    throw e; // Re-throw: caller must know the PIN was NOT persisted
  }
}

export async function getVaultPin(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PIN_KEY);
  } catch (e) {
    // KeyStore error: return null so hasVaultPin() returns false
    // and the user is prompted to set a new PIN instead of being locked out.
    console.error('[VAULT] KeyStore error reading PIN — clearing corrupted entry:', e);
    try { await SecureStore.deleteItemAsync(PIN_KEY); } catch (_) {}
    return null;
  }
}

export async function verifyVaultPin(pin: string): Promise<boolean> {
  const storedPin = await getVaultPin();
  if (!storedPin) return false;
  
  const hashedInput = await digestSHA256(pin);
  
  // Si coincide con el hash, es correcto
  if (storedPin === hashedInput) return true;
  
  // Legacy fallback: si coincide en texto plano (viejo), lo actualizamos silenciosamente al hash
  if (storedPin === pin) {
    await setVaultPin(pin);
    return true;
  }
  
  return false;
}

export async function hasVaultPin(): Promise<boolean> {
  const pin = await getVaultPin();
  return pin !== null;
}

export async function ensureVaultDir() {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
}

export async function encryptContent(content: string): Promise<string> {
  const hexKey = await getVaultMasterKey();
  const cryptoKey = await getCryptoKey(hexKey);
  
  const iv = cryptography_engine.getRandomValues(new Uint8Array(12));
  const encodedContent = new TextEncoder().encode(content);
  
  const encryptedBuffer = await cryptography_engine.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedContent
  );
  
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const encryptedHex = encryptedArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map((b: any) => b.toString(16).padStart(2, '0')).join('');
  
  return `[VAULT_v2]\n${ivHex}:${encryptedHex}`;
}

export async function decryptContent(encryptedData: string): Promise<string | null> {
  if (!encryptedData.startsWith('[VAULT_v2]')) return encryptedData; // Legacy unencrypted or VAULT_v1
  
  try {
    const hexKey = await getVaultMasterKey();
    const cryptoKey = await getCryptoKey(hexKey);
    
    const rawData = encryptedData.replace('[VAULT_v2]\n', '');
    const [ivHex, encryptedHex] = rawData.split(':');
    
    if (!ivHex || !encryptedHex) return null;
    
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const decryptedBuffer = await cryptography_engine.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBytes
    );
    
    const decrypted = new TextDecoder().decode(decryptedBuffer);
    
    if (!decrypted) {
      console.error('[VAULT] Decryption failed: Invalid key or corrupted data.');
      return null;
    }
    
    return decrypted;
  } catch (e) {
    console.error('[VAULT] Decryption error:', e);
    return null;
  }
}

export function generateVaultFileName(type: 'SOAP' | 'REPORT'): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const y = now.getFullYear().toString().slice(-2);
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  
  return `${m}-${d}-${y}.${hh}-${mm}.${type}`;
}

export async function saveToVault(content: string, type: 'SOAP' | 'REPORT'): Promise<string> {
  try {
    await ensureVaultDir();
    const fileName = generateVaultFileName(type);
    const path = `${VAULT_DIR}${fileName}`;
    
    const encryptedContent = await encryptContent(content);
    
    await FileSystem.writeAsStringAsync(path, encryptedContent);
    console.log(`[VAULT] Securely saved: ${fileName}`);
    return fileName;
  } catch (e: any) {
    console.error('[VAULT] Save error:', e);
    throw e;
  }
}

export async function listVaultFiles(): Promise<string[]> {
  try {
    await ensureVaultDir();
    return await FileSystem.readDirectoryAsync(VAULT_DIR);
  } catch (e) {
    console.error('[VAULT] List error:', e);
    return [];
  }
}

/**
 * Searches through all encrypted files in the vault for a specific query.
 * Decrypts files in memory to perform the search.
 */
export async function searchVault(query: string): Promise<{fileName: string, content: string}[]> {
  try {
    // Sort files descending (newest first based on naming convention M-D-YY.HH-mm)
    const files = (await listVaultFiles()).sort().reverse();
    const results: {fileName: string, content: string}[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Batch processing: 3 at a time
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(batch.map(async (fileName) => {
        const path = `${VAULT_DIR}${fileName}`;
        const encryptedContent = await FileSystem.readAsStringAsync(path);
        const decrypted = await decryptContent(encryptedContent);
        
        if (decrypted && decrypted.toLowerCase().includes(lowerQuery)) {
          return { fileName, content: decrypted };
        }
        return null;
      }));
      
      for (const res of batchResults) {
        if (res) results.push(res);
      }
      
      // Memory safeguard: break early after 5 matches to prevent OOM
      if (results.length >= 5) break;
    }
    
    // Return max 5 items
    return results.slice(0, 5);
  } catch (e) {
    console.error('[VAULT] Search error:', e);
    return [];
  }
}
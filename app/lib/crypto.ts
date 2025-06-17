// Encryption utilities for local API key storage
// Using Web Crypto API for secure local encryption

class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

// Generate a key from a password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Generate a random IV
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

// Encrypt data with a password
export async function encrypt(data: string, password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(data)
    );

    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    throw new CryptoError('Failed to encrypt data');
  }
}

// Decrypt data with a password
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  try {
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new CryptoError('Failed to decrypt data - invalid password or corrupted data');
  }
}

// Generate a device-specific encryption key
export function getDeviceKey(): string {
  // Use localStorage to store/retrieve a device-specific key
  const DEVICE_KEY_STORAGE = 'orion_device_key';
  
  let deviceKey = localStorage.getItem(DEVICE_KEY_STORAGE);
  
  if (!deviceKey) {
    // Generate a new device key
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    deviceKey = btoa(String.fromCharCode(...randomBytes));
    localStorage.setItem(DEVICE_KEY_STORAGE, deviceKey);
  }
  
  return deviceKey;
} 
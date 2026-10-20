import * as crypto from 'crypto';

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

function getKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY || 'iklim_secure_aes_encryption_key32';
  // Enforce 32 bytes key length for AES-256
  return Buffer.from(keyStr.padEnd(32, '0').substring(0, 32), 'utf-8');
}

/**
 * Encrypts plaintext using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:encryptedData:authTag
  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

/**
 * Decrypts ciphertext format (iv:encryptedData:authTag) using AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return '[ENCRYPTED_DATA_DECRYPTION_ERROR]';
  }
}

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  // Hash the key to ensure it's 32 bytes for AES-256
  return createHash('sha256').update(key).digest();
}

/**
 * Encrypt text using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted text with IV, salt, and auth tag (format: iv:salt:tag:encrypted)
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, salt, authTag, and encrypted data
    return [
      iv.toString('hex'),
      salt.toString('hex'),
      authTag.toString('hex'),
      encrypted,
    ].join(':');
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt text using AES-256-GCM
 * @param encryptedData - Encrypted text (format: iv:salt:tag:encrypted)
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    // const salt = Buffer.from(parts[1], 'hex'); // Reserved for future use
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Hash sensitive data (one-way)
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

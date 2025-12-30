import { encrypt, decrypt, hash } from '../encryption';

describe('Encryption Utility', () => {
  describe('encrypt', () => {
    it('should encrypt a string successfully', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(4); // iv:salt:tag:encrypted
    });

    it('should produce different ciphertext for same input (different IV)', () => {
      const plaintext = 'Hello, World!';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string successfully', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt Unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا بالعالم';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', () => {
      const invalidData = 'invalid:encrypted:data';
      
      expect(() => decrypt(invalidData)).toThrow();
    });

    it('should throw error for corrupted encrypted data', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const corrupted = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
      
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('should throw error for empty string', () => {
      expect(() => decrypt('')).toThrow();
    });
  });

  describe('hash', () => {
    it('should hash a string successfully', () => {
      const input = 'password123';
      const hashed = hash(input);
      
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hash for same input', () => {
      const input = 'password123';
      const hash1 = hash(input);
      const hash2 = hash(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      const hash1 = hash('password123');
      const hash2 = hash('password124');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', () => {
      const hashed = hash('');
      
      expect(hashed).toBeDefined();
      expect(hashed).toHaveLength(64);
    });

    it('should hash long strings', () => {
      const input = 'a'.repeat(10000);
      const hashed = hash(input);
      
      expect(hashed).toBeDefined();
      expect(hashed).toHaveLength(64);
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should maintain data integrity through multiple encryptions', () => {
      const plaintext = 'Sensitive data';
      
      const encrypted1 = encrypt(plaintext);
      const decrypted1 = decrypt(encrypted1);
      
      const encrypted2 = encrypt(decrypted1);
      const decrypted2 = decrypt(encrypted2);
      
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle JSON data', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        balance: 1000.50,
      };
      const plaintext = JSON.stringify(data);
      
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      const parsed = JSON.parse(decrypted);
      
      expect(parsed).toEqual(data);
    });
  });
});

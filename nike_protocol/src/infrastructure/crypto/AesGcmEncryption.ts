// AES-256-GCM Encryption Service
// Implements IEncryptionService interface

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { IEncryptionService } from '../../core/interfaces.js';

export class AesGcmEncryption implements IEncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(keyMaterial: string) {
    if (!keyMaterial || keyMaterial.length < 16) {
      throw new Error('Encryption key must be at least 16 characters');
    }
    // Derive 32-byte key using SHA-256
    this.key = createHash('sha256').update(keyMaterial).digest();
  }

  encrypt(plaintext: Buffer): Buffer {
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes
    // Format: [iv (12)][authTag (16)][ciphertext]
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  decrypt(ciphertext: Buffer): Buffer {
    if (ciphertext.length < 28) {
      throw new Error('Invalid encrypted data: too short');
    }
    const iv = ciphertext.subarray(0, 12);
    const authTag = ciphertext.subarray(12, 28);
    const encrypted = ciphertext.subarray(28);
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

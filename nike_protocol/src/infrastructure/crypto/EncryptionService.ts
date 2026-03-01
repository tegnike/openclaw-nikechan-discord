// Encryption Interface and Implementations

export interface IEncryptionService {
  encrypt(plaintext: Buffer): Buffer;
  decrypt(ciphertext: Buffer): Buffer;
}

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export class AesGcmEncryptionService implements IEncryptionService {
  private readonly key: Buffer;

  constructor(keyMaterial: string) {
    this.key = createHash('sha256').update(keyMaterial).digest();
  }

  encrypt(plaintext: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  decrypt(encrypted: Buffer): Buffer {
    if (encrypted.length < 28) {
      throw new Error('Invalid encrypted data: too short');
    }
    const iv = encrypted.subarray(0, 12);
    const authTag = encrypted.subarray(12, 28);
    const ciphertext = encrypted.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

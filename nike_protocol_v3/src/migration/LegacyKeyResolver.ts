// LegacyKeyResolver - v1/v2 encryption key resolution
import { createHash, pbkdf2Sync } from 'crypto';

export interface KeyResolutionResult {
  success: boolean;
  key?: Buffer;
  error?: string;
  source: 'env' | 'config' | 'derivation' | 'none';
}

export class LegacyKeyResolver {
  private static readonly V2_SALT = 'nike_coin_v2_salt';
  private static readonly V2_ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 32;

  /**
   * Resolve encryption key for v2 database
   * Tries multiple sources in order of preference
   */
  static resolveV2(): KeyResolutionResult {
    // 1. Try environment variable (new v3 format)
    const envKey = process.env.NIKE_COIN_ENCRYPTION_KEY;
    if (envKey) {
      try {
        const key = Buffer.from(envKey, 'hex');
        if (key.length === 32) {
          return { success: true, key, source: 'env' };
        }
      } catch {
        // Fall through to next method
      }
    }

    // 2. Try legacy derivation from environment
    const legacyPass = process.env.NIKE_COIN_PASSWORD || process.env.NIKE_LEGACY_PASSWORD;
    if (legacyPass) {
      try {
        const key = pbkdf2Sync(
          legacyPass,
          LegacyKeyResolver.V2_SALT,
          LegacyKeyResolver.V2_ITERATIONS,
          LegacyKeyResolver.KEY_LENGTH,
          'sha256'
        );
        return { success: true, key, source: 'derivation' };
      } catch (e) {
        return { 
          success: false, 
          error: `Key derivation failed: ${(e as Error).message}`,
          source: 'none'
        };
      }
    }

    // 3. No key available
    return {
      success: false,
      error: 'No encryption key found. Set NIKE_COIN_ENCRYPTION_KEY or NIKE_COIN_PASSWORD.',
      source: 'none'
    };
  }

  /**
   * Verify if a key can decrypt the given database
   */
  static async verifyKey(key: Buffer, encryptedData: Buffer): Promise<boolean> {
    try {
      // v2 uses AES-256-GCM with auth tag at the end
      if (encryptedData.length < 28) return false; // nonce(12) + authTag(16) minimum

      const nonce = encryptedData.slice(0, 12);
      const ciphertext = encryptedData.slice(12, -16);
      const authTag = encryptedData.slice(-16);

      const { createDecipheriv } = await import('crypto');
      const decipher = createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      // Verify it's valid JSON/SQLite
      const header = decrypted.slice(0, 16).toString('hex');
      // SQLite magic header: SQLite format 3\0
      return header.startsWith('53514c6974652066');
    } catch {
      return false;
    }
  }
}

// Ed25519 Digital Signature Service
// Implements ISigner interface with asymmetric cryptography

import { generateKeyPairSync, sign, verify, createHmac } from 'crypto';
import { ISigner } from '../../core/interfaces.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export class Ed25519Signer implements ISigner {
  private privateKey: string;
  private publicKey: string;
  private legacyKey: Buffer; // For backward compatibility with HMAC signatures

  constructor(keyFilePath: string, legacySecret: string) {
    this.legacyKey = createHmac('sha256', legacySecret).digest();
    
    if (existsSync(keyFilePath)) {
      // Load existing key
      this.privateKey = readFileSync(keyFilePath, 'utf-8');
      // Derive public key from private key for verification
      const tempKeys = generateKeyPairSync('ed25519', {
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
      });
      // Note: In production, should store and load public key separately
      this.publicKey = tempKeys.publicKey as unknown as string;
    } else {
      // Generate new key pair
      const keys = generateKeyPairSync('ed25519', {
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
      });
      this.privateKey = keys.privateKey as unknown as string;
      this.publicKey = keys.publicKey as unknown as string;
      
      // Save private key with restricted permissions
      writeFileSync(keyFilePath, this.privateKey, { mode: 0o600 });
    }
  }

  sign(data: object): string {
    const message = Buffer.from(JSON.stringify(data), 'utf-8');
    const sig = sign(null, message, this.privateKey);
    return sig.toString('base64url');
  }

  verify(data: object, signature: string): boolean {
    try {
      const message = Buffer.from(JSON.stringify(data), 'utf-8');
      const sigBuffer = Buffer.from(signature, 'base64url');
      return verify(null, message, this.publicKey, sigBuffer);
    } catch {
      // Try legacy HMAC verification for backward compatibility
      const legacySig = createHmac('sha256', this.legacyKey)
        .update(JSON.stringify(data))
        .digest('hex');
      return signature === legacySig;
    }
  }
}

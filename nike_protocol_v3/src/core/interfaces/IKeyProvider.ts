// Key Provider Interface for encryption key abstraction
export interface IKeyProvider {
  readonly name: string;
  getKey(purpose: 'db-encryption' | 'signing'): Promise<Buffer> | Buffer;
}

export class EnvKeyProvider implements IKeyProvider {
  readonly name = 'EnvKeyProvider';
  
  getKey(purpose: 'db-encryption' | 'signing'): Buffer {
    const envVar = purpose === 'db-encryption' 
      ? 'NIKECOIN_DB_KEY' 
      : 'NIKECOIN_SECRET';
    
    const key = process.env[envVar];
    if (!key) {
      throw new Error(`Environment variable ${envVar} not set`);
    }
    
    const crypto = require('crypto');
    return crypto.scryptSync(key, `nike-protocol-${purpose}-salt`, 32);
  }
}

// NikeCoin v2 - Soul-Bound Token System with Encrypted SQLite
// Discord-linked, server-side signed, group-chat native
// Security: AES-256-GCM file encryption + Ed25519 signatures + in-memory operations

import { createHash, randomUUID, createCipheriv, createDecipheriv, randomBytes, generateKeyPairSync, sign, verify, createHmac } from 'crypto';
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs';

export interface CoinTransaction {
  id: string;
  from_did: string;
  to_did: string;
  amount: number;
  timestamp: number;
  signature: string;
  memo?: string;
}

export interface CoinAccount {
  did: string;
  discord_id: string;
  username?: string;
  balance: number;
  total_received: number;
  total_sent: number;
  created_at: number;
  updated_at: number;
}

const DATA_DIR = join(homedir(), '.nike');
const DB_FILE_ENC = join(DATA_DIR, 'coin_v2.db.enc'); // Encrypted file
const DB_FILE_OLD = join(DATA_DIR, 'coin_v2.db');     // Legacy plaintext
const SIGNING_KEY_FILE = join(DATA_DIR, 'signing_key.pem'); // Ed25519 private key
const SERVER_SECRET = process.env.NIKECOIN_SECRET;
const DB_KEY_ENV = process.env.NIKECOIN_DB_KEY;

if (!SERVER_SECRET) {
  throw new Error('NIKECOIN_SECRET environment variable is required');
}

if (!DB_KEY_ENV) {
  throw new Error('NIKECOIN_DB_KEY environment variable is required for database encryption');
}

// Ed25519 Key Management
interface SigningKeyPair {
  privateKey: Buffer;
  publicKey: Buffer;
}

function loadOrCreateSigningKey(): SigningKeyPair {
  if (existsSync(SIGNING_KEY_FILE)) {
    const pem = readFileSync(SIGNING_KEY_FILE, 'utf-8');
    // Parse PEM format
    const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                      .replace(/-----END PRIVATE KEY-----/, '')
                      .replace(/\s/g, '');
    const privateKey = Buffer.from(base64, 'base64');
    // Derive public key from private key (last 32 bytes of Ed25519 private key)
    const { createPublicKey } = require('crypto');
    const keyObj = createPublicKey({ key: pem, format: 'pem', type: 'pkcs8' });
    const publicKey = keyObj.export({ format: 'der', type: 'spki' });
    return { privateKey, publicKey };
  }
  
  // Generate new Ed25519 key pair
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' }
  });
  
  writeFileSync(SIGNING_KEY_FILE, privateKey, { mode: 0o600 }); // Restrict permissions
  console.log('[NikeCoin] Generated new Ed25519 signing key:', SIGNING_KEY_FILE);
  
  return loadOrCreateSigningKey();
}

// Derive 32-byte key from env
function deriveKey(keyMaterial: string): Buffer {
  return createHash('sha256').update(keyMaterial).digest();
}

// Encrypt buffer with AES-256-GCM
function encryptBuffer(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

// Decrypt buffer with AES-256-GCM
function decryptBuffer(ciphertext: Buffer, key: Buffer): Buffer {
  if (ciphertext.length < 28) {
    throw new Error('Invalid encrypted data: too short');
  }
  const iv = ciphertext.subarray(0, 12);
  const authTag = ciphertext.subarray(12, 28);
  const encrypted = ciphertext.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

class NikeCoinV2Storage {
  private db: Database.Database;
  private serverKey: Buffer;
  private dbKey: Buffer;
  private signingKey: SigningKeyPair;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.serverKey = createHash('sha256').update(SERVER_SECRET).digest();
    this.dbKey = deriveKey(DB_KEY_ENV);
    this.signingKey = loadOrCreateSigningKey();
    
    mkdirSync(DATA_DIR, { recursive: true });
    
    // Load database (migrate from old format if needed)
    const dbBuffer = this.loadOrMigrateDatabase();
    
    // Open as in-memory database
    this.db = new Database(':memory:');
    
    // Restore data if exists
    if (dbBuffer.length > 0) {
      this.restoreFromBuffer(dbBuffer);
    }
    
    this.initTables();
    this.startAutoSave();
  }

  // Load encrypted DB or migrate from old plaintext DB
  private loadOrMigrateDatabase(): Buffer {
    // Priority 1: Check for encrypted DB
    if (existsSync(DB_FILE_ENC)) {
      const encrypted = readFileSync(DB_FILE_ENC);
      try {
        return decryptBuffer(encrypted, this.dbKey);
      } catch (err) {
        throw new Error(`Failed to decrypt database. Wrong key or corrupted file: ${err.message}`);
      }
    }
    
    // Priority 2: Migrate from old plaintext DB
    if (existsSync(DB_FILE_OLD)) {
      console.log('[NikeCoin] Migrating from legacy plaintext DB to encrypted format...');
      const plaintext = readFileSync(DB_FILE_OLD);
      
      // Encrypt and save
      const encrypted = encryptBuffer(plaintext, this.dbKey);
      const tempPath = `${DB_FILE_ENC}.tmp`;
      writeFileSync(tempPath, encrypted);
      renameSync(tempPath, DB_FILE_ENC);
      
      // Backup old file (don't delete for safety)
      const backupPath = `${DB_FILE_OLD}.backup.${Date.now()}`;
      renameSync(DB_FILE_OLD, backupPath);
      
      console.log(`[NikeCoin] Migration complete. Old DB backed up to: ${backupPath}`);
      return plaintext;
    }
    
    // New database
    return Buffer.alloc(0);
  }

  // Restore DB from buffer using temp file approach
  private restoreFromBuffer(buffer: Buffer): void {
    const tempPath = join(DATA_DIR, '.coin_v2_restore_temp.db');
    try {
      writeFileSync(tempPath, buffer);
      const tempDb = new Database(tempPath);
      
      // Copy all tables to memory DB
      const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
      
      for (const { name } of tables) {
        // Get table schema
        const schema = tempDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(name) as { sql: string };
        if (schema?.sql) {
          this.db.exec(schema.sql);
        }
        
        // Copy data
        const rows = tempDb.prepare(`SELECT * FROM "${name}"`).all();
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map(() => '?').join(',');
          const insert = this.db.prepare(`INSERT INTO "${name}" (${columns.join(',')}) VALUES (${placeholders})`);
          
          const insertMany = this.db.transaction((data: any[]) => {
            for (const row of data) {
              insert.run(...columns.map(c => row[c]));
            }
          });
          insertMany(rows);
        }
      }
      
      // Copy indexes
      const indexes = tempDb.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all() as { sql: string }[];
      for (const { sql } of indexes) {
        if (sql) this.db.exec(sql);
      }
      
      tempDb.close();
    } finally {
      try { unlinkSync(tempPath); } catch {}
    }
  }

  // Save memory DB to encrypted file
  private saveDatabase(): void {
    const tempPath = join(DATA_DIR, '.coin_v2_save_temp.db');
    try {
      // Export memory DB to temp file
      const tempDb = new Database(tempPath);
      const backup = tempDb.backup(':memory:');
      while (backup.step(-1)) {}
      backup.free();
      tempDb.close();
      
      // Read and encrypt
      const plaintext = readFileSync(tempPath);
      const encrypted = encryptBuffer(plaintext, this.dbKey);
      
      // Atomic write
      const tempEncPath = `${DB_FILE_ENC}.tmp`;
      writeFileSync(tempEncPath, encrypted);
      renameSync(tempEncPath, DB_FILE_ENC);
    } finally {
      try { unlinkSync(tempPath); } catch {}
    }
  }

  // Immediate save after state-changing operations
  private immediateSave(): void {
    try {
      this.saveDatabase();
    } catch (err) {
      console.error('[NikeCoin] CRITICAL: Failed to save database:', err);
      // Don't throw - operation succeeded, just persistence failed
      // Next auto-save or operation will retry
    }
  }

  private startAutoSave(): void {
    // Periodic save every 5 minutes
    this.saveInterval = setInterval(() => {
      try {
        this.saveDatabase();
      } catch (err) {
        console.error('[NikeCoin] Auto-save failed:', err);
      }
    }, 5 * 60 * 1000);
    
    // Graceful shutdown handlers
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('exit', () => {
      if (this.saveInterval) this.saveDatabase();
    });
  }

  shutdown(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    this.saveDatabase();
    this.db.close();
  }

  forceSave(): void {
    this.saveDatabase();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        did TEXT PRIMARY KEY,
        discord_id TEXT UNIQUE NOT NULL,
        username TEXT,
        balance INTEGER DEFAULT 0 CHECK(balance >= 0),
        total_received INTEGER DEFAULT 0,
        total_sent INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch() * 1000),
        updated_at INTEGER DEFAULT (unixepoch() * 1000)
      )
    `);

    try {
      this.db.prepare('SELECT username FROM accounts LIMIT 1').get();
    } catch {
      this.db.exec('ALTER TABLE accounts ADD COLUMN username TEXT');
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        from_did TEXT NOT NULL,
        to_did TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK(amount > 0),
        timestamp INTEGER DEFAULT (unixepoch() * 1000),
        signature TEXT NOT NULL,
        memo TEXT
      )
    `);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_did)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_did)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(timestamp)`);
  }

  getOrCreateAccount(discordId: string, username?: string): CoinAccount {
    const did = `did:nike:discord:${discordId}`;
    let account = this.db.prepare('SELECT * FROM accounts WHERE did = ?').get(did) as CoinAccount | undefined;

    if (!account) {
      const now = Date.now();
      this.db.prepare(`
        INSERT INTO accounts (did, discord_id, username, balance, total_received, total_sent, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, 0, ?, ?)
      `).run(did, discordId, username || null, now, now);
      account = this.db.prepare('SELECT * FROM accounts WHERE did = ?').get(did) as CoinAccount;
    } else if (username && account.username !== username) {
      this.db.prepare('UPDATE accounts SET username = ? WHERE did = ?').run(username, did);
      account.username = username;
    }

    return account;
  }

  mint(toDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds safe integer limit');

    const account = this.getOrCreateAccount(toDiscordId, username);
    const now = Date.now();
    const txData = { type: 'mint', to: account.did, amount, time: now };
    const signature = this.signTx(txData);

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: 'MINT',
      to_did: account.did,
      amount,
      timestamp: now,
      signature,
      memo: memo || 'Minted by system'
    };

    const insertTx = this.db.prepare(`
      INSERT INTO transactions (id, from_did, to_did, amount, timestamp, signature, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateAccount = this.db.prepare(`
      UPDATE accounts SET balance = balance + ?, total_received = total_received + ?, updated_at = ? WHERE did = ?
    `);

    const transaction = this.db.transaction(() => {
      insertTx.run(tx.id, tx.from_did, tx.to_did, tx.amount, tx.timestamp, tx.signature, tx.memo);
      updateAccount.run(amount, amount, Date.now(), account.did);
    });
    transaction();
    
    this.immediateSave(); // Persist immediately
    return tx;
  }

  send(fromDiscordId: string, toDiscordId: string, amount: number, memo?: string, fromUsername?: string, toUsername?: string): CoinTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds safe integer limit');
    if (fromDiscordId === toDiscordId) throw new Error('Cannot send to yourself');

    const fromAccount = this.getOrCreateAccount(fromDiscordId, fromUsername);
    const toAccount = this.getOrCreateAccount(toDiscordId, toUsername);

    if (fromAccount.balance < amount) {
      throw new Error(`Insufficient balance: ${fromAccount.balance} < ${amount}`);
    }

    const now = Date.now();
    const txData = { type: 'transfer', from: fromAccount.did, to: toAccount.did, amount, time: now };
    const signature = this.signTx(txData);

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: fromAccount.did,
      to_did: toAccount.did,
      amount,
      timestamp: now,
      signature,
      memo
    };

    const insertTx = this.db.prepare(`
      INSERT INTO transactions (id, from_did, to_did, amount, timestamp, signature, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const debitFrom = this.db.prepare(`
      UPDATE accounts SET balance = balance - ?, total_sent = total_sent + ?, updated_at = ? WHERE did = ?
    `);
    const creditTo = this.db.prepare(`
      UPDATE accounts SET balance = balance + ?, total_received = total_received + ?, updated_at = ? WHERE did = ?
    `);

    const transaction = this.db.transaction(() => {
      insertTx.run(tx.id, tx.from_did, tx.to_did, tx.amount, tx.timestamp, tx.signature, tx.memo);
      debitFrom.run(amount, amount, Date.now(), fromAccount.did);
      creditTo.run(amount, amount, Date.now(), toAccount.did);
    });
    transaction();
    
    this.immediateSave(); // Persist immediately
    return tx;
  }

  burn(fromDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds safe integer limit');

    const account = this.getOrCreateAccount(fromDiscordId, username);
    if (account.balance < amount) {
      throw new Error(`Insufficient balance: ${account.balance} < ${amount}`);
    }

    const now = Date.now();
    const txData = { type: 'burn', from: account.did, amount, time: now };
    const signature = this.signTx(txData);

    const tx: CoinTransaction = {
      id: randomUUID(),
      from_did: account.did,
      to_did: 'BURN',
      amount,
      timestamp: now,
      signature,
      memo: memo || 'Burned by owner'
    };

    const insertTx = this.db.prepare(`
      INSERT INTO transactions (id, from_did, to_did, amount, timestamp, signature, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const debitFrom = this.db.prepare(`
      UPDATE accounts SET balance = balance - ?, total_sent = total_sent + ?, updated_at = ? WHERE did = ?
    `);

    const transaction = this.db.transaction(() => {
      insertTx.run(tx.id, tx.from_did, tx.to_did, tx.amount, tx.timestamp, tx.signature, tx.memo);
      debitFrom.run(amount, amount, Date.now(), account.did);
    });
    transaction();
    
    this.immediateSave(); // Persist immediately
    return tx;
  }

  // Verify transaction signature (supports both Ed25519 and legacy HMAC for backward compatibility)
  verifyTransaction(tx: CoinTransaction): boolean {
    // Try Ed25519 verification first
    if (this.verifySignature(tx)) {
      return true;
    }
    
    // Fall back to legacy HMAC verification for old transactions
    let expectedData: object;
    if (tx.from_did === 'MINT') {
      expectedData = { type: 'mint', to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    } else if (tx.to_did === 'BURN') {
      expectedData = { type: 'burn', from: tx.from_did, amount: tx.amount, time: tx.timestamp };
    } else {
      expectedData = { type: 'transfer', from: tx.from_did, to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    }
    const legacySig = createHmac('sha256', this.serverKey).update(JSON.stringify(expectedData)).digest('hex');
    return tx.signature === legacySig;
  }

  getBalance(discordId: string): number {
    return this.getOrCreateAccount(discordId).balance;
  }

  getHistory(discordId: string, limit = 10): Array<CoinTransaction & { direction: string; other_discord_id: string; other_username?: string }> {
    const did = `did:nike:discord:${discordId}`;
    return this.db.prepare(`
      SELECT t.*,
        CASE WHEN t.from_did = ? THEN 'sent' ELSE 'received' END as direction,
        CASE WHEN t.from_did = ? THEN REPLACE(t.to_did, 'did:nike:discord:', '') ELSE REPLACE(t.from_did, 'did:nike:discord:', '') END as other_discord_id,
        CASE WHEN t.from_did = ? THEN a_to.username ELSE a_from.username END as other_username
      FROM transactions t
      LEFT JOIN accounts a_from ON t.from_did = a_from.did
      LEFT JOIN accounts a_to ON t.to_did = a_to.did
      WHERE t.from_did = ? OR t.to_did = ?
      ORDER BY t.timestamp DESC LIMIT ?
    `).all(did, did, did, did, did, limit) as Array<CoinTransaction & { direction: string; other_discord_id: string; other_username?: string }>;
  }

  getStats(discordId: string): CoinAccount {
    return this.getOrCreateAccount(discordId);
  }

  getAllAccounts(): CoinAccount[] {
    return this.db.prepare('SELECT * FROM accounts ORDER BY balance DESC').all() as CoinAccount[];
  }

  listAccounts(limit = 20): Array<{ did: string; discord_id: string; username: string | null; balance: number; total_received: number; total_sent: number }> {
    return this.db.prepare(`
      SELECT did, discord_id, username, balance, total_received, total_sent
      FROM accounts WHERE balance > 0 OR total_received > 0 OR total_sent > 0
      ORDER BY balance DESC LIMIT ?
    `).all(limit) as Array<{ did: string; discord_id: string; username: string | null; balance: number; total_received: number; total_sent: number }>;
  }

  migrateFromV1(v1Data: Array<{ user_id: string; username?: string; balance: number }>): { migrated: number; skipped: number; errors: string[] } {
    const errors: string[] = [];
    let migrated = 0, skipped = 0;

    for (const entry of v1Data) {
      try {
        const existing = this.getOrCreateAccount(entry.user_id, entry.username);
        if (existing.balance === 0 && entry.balance > 0) {
          this.mint(entry.user_id, entry.balance, 'Migration from v1', entry.username);
          migrated++;
        } else if (existing.balance !== entry.balance) {
          errors.push(`Balance mismatch for ${entry.user_id}: existing=${existing.balance}, v1=${entry.balance}`);
          skipped++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`Failed to migrate ${entry.user_id}: ${err}`);
      }
    }
    
    if (migrated > 0) this.immediateSave();
    return { migrated, skipped, errors };
  }

  close(): void {
    this.shutdown();
  }

  // Ed25519 signature using server-side key
  private signTx(data: object): string {
    const message = Buffer.from(JSON.stringify(data), 'utf-8');
    const sig = sign(null, message, this.signingKey.privateKey);
    return sig.toString('base64url'); // URL-safe base64
  }
  
  // Verify Ed25519 signature (for external verification)
  verifySignature(tx: CoinTransaction): boolean {
    let expectedData: object;
    if (tx.from_did === 'MINT') {
      expectedData = { type: 'mint', to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    } else if (tx.to_did === 'BURN') {
      expectedData = { type: 'burn', from: tx.from_did, amount: tx.amount, time: tx.timestamp };
    } else {
      expectedData = { type: 'transfer', from: tx.from_did, to: tx.to_did, amount: tx.amount, time: tx.timestamp };
    }
    
    const message = Buffer.from(JSON.stringify(expectedData), 'utf-8');
    const signature = Buffer.from(tx.signature, 'base64url');
    
    try {
      return verify(null, message, this.signingKey.publicKey, signature);
    } catch {
      return false;
    }
  }
}

export const coinSystem = new NikeCoinV2Storage();

// NikeCoin v2 - SOLID Architecture Entry Point
// Exports all public APIs with proper dependency injection

import { join } from 'path';
import { homedir } from 'os';
import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';

import { CoinService } from './services/CoinService.js';
import { UserService } from './services/UserService.js';
import { SqliteRepository } from './infrastructure/persistence/SqliteRepository.js';
import { UserRepository } from './infrastructure/persistence/UserRepository.js';
import { AesGcmEncryption } from './infrastructure/crypto/AesGcmEncryption.js';
import { Ed25519Signer } from './infrastructure/crypto/Ed25519Signer.js';
import type { CoinAccount, CoinTransaction } from './core/types.js';

export * from './core/types.js';
export * from './core/interfaces.js';
export * from './core/errors/index.js';
export { CoinService } from './services/CoinService.js';
export { UserService } from './services/UserService.js';
export { SqliteRepository } from './infrastructure/persistence/SqliteRepository.js';
export { UserRepository } from './infrastructure/persistence/UserRepository.js';
export { AesGcmEncryption } from './infrastructure/crypto/AesGcmEncryption.js';
export { Ed25519Signer } from './infrastructure/crypto/Ed25519Signer.js';

const DATA_DIR = join(homedir(), '.nike');
const DB_FILE_ENC = join(DATA_DIR, 'coin_v2.db.enc');
const DB_FILE_OLD = join(DATA_DIR, 'coin_v2.db');
const SIGNING_KEY_FILE = join(DATA_DIR, 'coin_v2_signing_key.pem');

interface EncryptedStorageConfig {
  dbKey: string;
  serverSecret: string;
  autoSaveIntervalMs?: number;
}

export class EncryptedCoinStorage {
  private db: Database.Database;
  private encryption: AesGcmEncryption;
  private signer: Ed25519Signer;
  private repository: SqliteRepository;
  private userRepo: UserRepository;
  private _service: CoinService;
  private _userService: UserService;
  private saveInterval: NodeJS.Timeout | null = null;
  private dbPath: string;

  constructor(config: EncryptedStorageConfig) {
    if (!config.dbKey || config.dbKey.length < 16) {
      throw new Error('Database encryption key must be at least 16 characters');
    }
    if (!config.serverSecret) {
      throw new Error('Server secret is required');
    }

    this.dbPath = DB_FILE_ENC;
    mkdirSync(DATA_DIR, { recursive: true });

    // Initialize crypto services
    this.encryption = new AesGcmEncryption(config.dbKey);
    this.signer = new Ed25519Signer(SIGNING_KEY_FILE, config.serverSecret);

    // Load or create database
    const dbBuffer = this.loadOrCreateDatabase();
    this.db = new Database(':memory:');

    if (dbBuffer.length > 0) {
      this.restoreFromBuffer(dbBuffer);
    }

    // Initialize repositories and services
    this.repository = new SqliteRepository(this.db);
    this.userRepo = new UserRepository(this.db);
    this._service = new CoinService(this.repository, this.repository, this.signer);
    this._userService = new UserService(this.userRepo);

    // Start auto-save
    this.startAutoSave(config.autoSaveIntervalMs ?? 5 * 60 * 1000);
  }

  private loadOrCreateDatabase(): Buffer {
    // Check for encrypted file first
    if (existsSync(this.dbPath)) {
      const encrypted = readFileSync(this.dbPath);
      try {
        return this.encryption.decrypt(encrypted);
      } catch (err) {
        throw new Error(`Failed to decrypt database: ${(err as Error).message}`);
      }
    }

    // Migrate from old plaintext database if exists
    if (existsSync(DB_FILE_OLD)) {
      console.log('Migrating from legacy plaintext database...');
      const plaintext = readFileSync(DB_FILE_OLD);
      
      // Save encrypted version
      const encrypted = this.encryption.encrypt(plaintext);
      writeFileSync(this.dbPath, encrypted);
      
      // Backup old file
      const backupPath = `${DB_FILE_OLD}.backup.${Date.now()}`;
      renameSync(DB_FILE_OLD, backupPath);
      console.log(`Migration complete. Old database backed up to: ${backupPath}`);
      
      return plaintext;
    }

    return Buffer.alloc(0); // New database
  }

  private restoreFromBuffer(buffer: Buffer): void {
    const tempPath = join(DATA_DIR, '.restore_temp.db');
    writeFileSync(tempPath, buffer);
    
    // Attach temp database and copy data
    this.db.exec(`ATTACH DATABASE '${tempPath}' AS source`);
    
    // Copy schema and data from each table
    const tables = this.db.prepare("SELECT name FROM source.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[];
    for (const { name } of tables) {
      try {
        this.db.exec(`INSERT OR REPLACE INTO ${name} SELECT * FROM source.${name}`);
      } catch (err) {
        console.warn(`Warning: Could not restore table ${name}: ${(err as Error).message}`);
      }
    }
    
    this.db.exec('DETACH DATABASE source');
    
    try {
      unlinkSync(tempPath);
    } catch {}
  }

  private startAutoSave(intervalMs: number): void {
    this.saveInterval = setInterval(() => {
      try {
        this.save();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, intervalMs);

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  save(): void {
    const tempPath = join(DATA_DIR, '.save_temp.db');
    
    // Create new database and copy all data
    const tempDb = new Database(tempPath);
    
    // Get schema from current db
    const tables = this.db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string; sql: string}[];
    
    for (const { name, sql } of tables) {
      // Create table in temp db
      tempDb.exec(sql);
      // Copy data
      const rows = this.db.prepare(`SELECT * FROM ${name}`).all();
      if (rows.length === 0) continue;
      
      const columns = Object.keys(rows[0]);
      const insertSql = `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
      const insert = tempDb.prepare(insertSql);
      
      const insertMany = tempDb.transaction((data: any[]) => {
        for (const row of data) {
          insert.run(...columns.map(c => row[c]));
        }
      });
      insertMany(rows);
    }
    
    tempDb.close();

    const plaintext = readFileSync(tempPath);
    const encrypted = this.encryption.encrypt(plaintext);

    const tempEncPath = `${this.dbPath}.tmp`;
    writeFileSync(tempEncPath, encrypted);
    renameSync(tempEncPath, this.dbPath);

    try {
      unlinkSync(tempPath);
    } catch {}
  }

  shutdown(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    this.save();
    this.db.close();
  }

  forceSave(): void {
    this.save();
  }

  // Delegate all operations to service
  get service(): CoinService {
    return this._service;
  }

  get userService(): UserService {
    return this._userService;
  }

  // Backward compatibility methods
  mint(toDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    const result = this._service.mint(toDiscordId, amount, memo, username);
    this.save();
    return result;
  }

  send(fromDiscordId: string, toDiscordId: string, amount: number, memo?: string, fromUsername?: string, toUsername?: string): CoinTransaction {
    const result = this._service.send(fromDiscordId, toDiscordId, amount, memo, fromUsername, toUsername);
    this.save();
    return result;
  }

  burn(fromDiscordId: string, amount: number, memo?: string, username?: string): CoinTransaction {
    const result = this._service.burn(fromDiscordId, amount, memo, username);
    this.save();
    return result;
  }

  getBalance(discordId: string): number {
    return this._service.getBalance(discordId);
  }

  getHistory(discordId: string, limit?: number): ReturnType<CoinService['getHistory']> {
    return this._service.getHistory(discordId, limit);
  }

  getStats(discordId: string): CoinAccount {
    return this._service.getStats(discordId);
  }

  listAccounts(limit?: number): ReturnType<CoinService['listAccounts']> {
    return this._service.listAccounts(limit);
  }

  verifyTransaction(tx: CoinTransaction): boolean {
    return this._service.verifyTransaction(tx);
  }
}

// Singleton instance for backward compatibility
let globalInstance: EncryptedCoinStorage | null = null;

export function initializeCoinSystem(dbKey: string, serverSecret: string): EncryptedCoinStorage {
  if (globalInstance) {
    globalInstance.shutdown();
  }
  globalInstance = new EncryptedCoinStorage({ dbKey, serverSecret });
  return globalInstance;
}

export function getCoinSystem(): EncryptedCoinStorage {
  if (!globalInstance) {
    const dbKey = process.env.NIKECOIN_DB_KEY;
    const serverSecret = process.env.NIKECOIN_SECRET;
    if (!dbKey || !serverSecret) {
      throw new Error('NIKECOIN_DB_KEY and NIKECOIN_SECRET environment variables are required');
    }
    globalInstance = new EncryptedCoinStorage({ dbKey, serverSecret });
  }
  return globalInstance;
}

// Legacy export name for compatibility

// Gacha System Integration
export { GachaV2Integrated, type Title, type Rarity, type InventoryItem, type GachaResult } from './gacha_v2_integrated.js';

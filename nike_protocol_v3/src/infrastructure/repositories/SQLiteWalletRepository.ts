import { WalletRepository } from '../../core/domain/user/repositories/WalletRepository.js';
import { Wallet } from '../../core/domain/user/Wallet.js';
import { Result, ok, err } from '../../core/shared/Result.js';
import { NikeError } from '../../core/errors/NikeError.js';
import { EncryptedDatabase } from '../database/EncryptedDatabase.js';

export class SQLiteWalletRepository implements WalletRepository {
  private db: EncryptedDatabase;

  constructor(dbPath: string, encryptionKey: string) {
    this.db = new EncryptedDatabase(dbPath, encryptionKey);
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        did TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async findByDid(did: string): Promise<Wallet | null> {
    const row = this.db.prepare(
      'SELECT * FROM wallets WHERE did = ?'
    ).get(did) as { did: string; balance: number; version: number; created_at: string; updated_at: string } | undefined;

    if (!row) {
      return null;
    }

    return new Wallet({
      did: row.did,
      balance: row.balance,
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  async save(wallet: Wallet): Promise<void> {
    this.db.prepare(
      `INSERT OR REPLACE INTO wallets (did, balance, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      wallet.did,
      wallet.balance,
      wallet.version,
      wallet.createdAt.toISOString(),
      wallet.updatedAt.toISOString()
    );
  }

  async addBalance(did: string, amount: number): Promise<Result<void, NikeError>> {
    try {
      // Use atomic SQL operation for race condition prevention
      const result = this.db.prepare(
        'UPDATE wallets SET balance = balance + ?, version = version + 1, updated_at = ? WHERE did = ?'
      ).run(amount, new Date().toISOString(), did);

      if (result.changes === 0) {
        // Wallet doesn't exist, create it
        this.db.prepare(
          'INSERT INTO wallets (did, balance, version, created_at, updated_at) VALUES (?, ?, 1, ?, ?)'
        ).run(did, amount, new Date().toISOString(), new Date().toISOString());
      }

      return ok(undefined);
    } catch (error) {
      return err(new NikeError('DB_ERROR', `Failed to add balance: ${error}`));
    }
  }

  async subtractBalance(did: string, amount: number): Promise<Result<void, NikeError>> {
    try {
      // Check current balance first
      const wallet = await this.findByDid(did);
      if (!wallet) {
        return err(new NikeError('WALLET_NOT_FOUND', 'Wallet not found'));
      }

      if (wallet.balance < amount) {
        return err(new NikeError('INSUFFICIENT_BALANCE', `Need ${amount}, have ${wallet.balance}`));
      }

      // Atomic subtraction
      const result = this.db.prepare(
        'UPDATE wallets SET balance = balance - ?, version = version + 1, updated_at = ? WHERE did = ? AND balance >= ?'
      ).run(amount, new Date().toISOString(), did, amount);

      if (result.changes === 0) {
        return err(new NikeError('CONCURRENT_MODIFICATION', 'Balance changed during operation'));
      }

      return ok(undefined);
    } catch (error) {
      return err(new NikeError('DB_ERROR', `Failed to subtract balance: ${error}`));
    }
  }
}

import { ok, err, type Result } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import { Wallet } from '../../core/domain/user/Wallet.js';
import { Coin } from '../../core/domain/coin/Coin.js';
import { UserId } from '../../core/domain/user/UserId.js';
import type { Database } from '../database/Database.js';

interface WalletRow {
  did: string;
  balance: number;
}

export class SQLiteWalletRepository implements IWalletRepository {
  constructor(private db: Database) {
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        did TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async findByDID(did: string): Promise<Result<Wallet, Error>> {
    try {
      const stmt = this.db.prepare('SELECT * FROM wallets WHERE did = ?');
      const row = stmt.get(did) as WalletRow | undefined;
      
      if (!row) {
        return err(new Error('Wallet not found'));
      }

      const userIdResult = UserId.create(row.did);
      if (userIdResult.isErr()) {
        return err(new Error(userIdResult.error.message));
      }

      const coinResult = Coin.create(row.balance);
      if (coinResult.isErr()) {
        return err(new Error(coinResult.error.message));
      }

      return ok(new Wallet(userIdResult.value, coinResult.value));
    } catch (e) {
      return err(new Error(`Failed to find wallet: ${e}`));
    }
  }

  async save(wallet: Wallet): Promise<Result<void, Error>> {
    try {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO wallets (did, balance, updated_at) VALUES (?, ?, datetime("now"))'
      );
      stmt.run(wallet.userId.value, wallet.balance.amount);
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Failed to save wallet: ${e}`));
    }
  }

  async updateBalance(did: string, newBalance: Coin): Promise<Result<void, Error>> {
    try {
      const stmt = this.db.prepare(
        'UPDATE wallets SET balance = ?, updated_at = datetime("now") WHERE did = ?'
      );
      stmt.run(newBalance.amount, did);
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Failed to update balance: ${e}`));
    }
  }

  /**
   * 【防衛プロトコル】アトミックな残高加算
   * SQLレベルで加算を行い、read-modify-writeサイクルを排除
   */
  async addBalance(did: string, amount: number): Promise<Result<number, Error>> {
    try {
      // Ensure wallet exists
      const checkStmt = this.db.prepare('SELECT 1 FROM wallets WHERE did = ?');
      const exists = checkStmt.get(did);
      
      if (!exists) {
        const createStmt = this.db.prepare('INSERT INTO wallets (did, balance) VALUES (?, 0)');
        createStmt.run(did);
      }

      // Atomic addition
      const updateStmt = this.db.prepare(
        'UPDATE wallets SET balance = balance + ?, updated_at = datetime("now") WHERE did = ?'
      );
      updateStmt.run(amount, did);

      // Get new balance
      const selectStmt = this.db.prepare('SELECT balance FROM wallets WHERE did = ?');
      const row = selectStmt.get(did) as { balance: number };
      
      return ok(row.balance);
    } catch (e) {
      return err(new Error(`Failed to add balance: ${e}`));
    }
  }
}

import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import type { Transaction } from '../../core/domain/coin/Transaction.js';
import type { Database } from '../database/Database.js';

export class SQLiteTransactionRepository implements ITransactionRepository {
  constructor(private db: Database) {}

  async save(transaction: Transaction): Promise<Result<void, Error>> {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO transactions (id, did, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      stmt.run(
        transaction.id,
        transaction.did,
        transaction.amount,
        transaction.type,
        transaction.description,
        transaction.createdAt.toISOString()
      );
      return ok(undefined);
    } catch (e) {
      return err(new Error(`Failed to save transaction: ${e}`));
    }
  }

  async findByDID(did: string): Promise<Result<Transaction[], Error>> {
    try {
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE did = ? ORDER BY created_at DESC');
      const rows = stmt.all(did) as any[];
      return ok(rows.map(row => ({
        id: row.id,
        did: row.did,
        amount: row.amount,
        type: row.type,
        description: row.description,
        createdAt: new Date(row.created_at)
      })));
    } catch (e) {
      return err(new Error(`Failed to find transactions: ${e}`));
    }
  }
}

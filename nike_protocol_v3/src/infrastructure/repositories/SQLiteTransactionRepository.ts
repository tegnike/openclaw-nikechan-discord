import { TransactionRepository } from '../../core/domain/coin/repositories/TransactionRepository.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';
import { EncryptedDatabase } from '../database/EncryptedDatabase.js';

export class SQLiteTransactionRepository implements TransactionRepository {
  private db: EncryptedDatabase;

  constructor(dbPath: string, encryptionKey: string) {
    this.db = new EncryptedDatabase(dbPath, encryptionKey);
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        from_did TEXT,
        to_did TEXT,
        description TEXT,
        signature TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }

  async save(tx: Transaction): Promise<void> {
    this.db.prepare(
      `INSERT INTO transactions (id, type, amount, from_did, to_did, description, signature, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      tx.id,
      tx.type,
      tx.amount,
      tx.fromDid || null,
      tx.toDid || null,
      tx.description || null,
      tx.signature,
      tx.timestamp.toISOString()
    );
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = this.db.prepare(
      'SELECT * FROM transactions WHERE id = ?'
    ).get(id) as {
      id: string;
      type: string;
      amount: number;
      from_did: string | null;
      to_did: string | null;
      description: string | null;
      signature: string;
      timestamp: string;
    } | undefined;

    if (!row) {
      return null;
    }

    return new Transaction({
      id: row.id,
      type: row.type as 'MINT' | 'TRANSFER' | 'GACHA',
      amount: row.amount,
      fromDid: row.from_did || undefined,
      toDid: row.to_did || undefined,
      description: row.description || undefined,
      signature: row.signature,
      timestamp: new Date(row.timestamp)
    });
  }

  async findByDid(did: string): Promise<Transaction[]> {
    const rows = this.db.prepare(
      `SELECT * FROM transactions 
       WHERE from_did = ? OR to_did = ?
       ORDER BY timestamp DESC`
    ).all(did, did) as Array<{
      id: string;
      type: string;
      amount: number;
      from_did: string | null;
      to_did: string | null;
      description: string | null;
      signature: string;
      timestamp: string;
    }>;

    return rows.map(row => new Transaction({
      id: row.id,
      type: row.type as 'MINT' | 'TRANSFER' | 'GACHA',
      amount: row.amount,
      fromDid: row.from_did || undefined,
      toDid: row.to_did || undefined,
      description: row.description || undefined,
      signature: row.signature,
      timestamp: new Date(row.timestamp)
    }));
  }
}

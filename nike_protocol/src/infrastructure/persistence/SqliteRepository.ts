// SQLite Repository Implementation
// Implements IAccountRepository and ITransactionRepository

import Database from 'better-sqlite3';
import { CoinAccount, CoinTransaction, TransactionWithDirection } from '../../core/types.js';
import { IAccountRepository, ITransactionRepository } from '../../core/interfaces.js';

export class SqliteRepository implements IAccountRepository, ITransactionRepository {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
    this.initTables();
  }

  private initTables(): void {
    // Accounts table
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

    // Migration: add username column if not exists
    try {
      this.db.prepare('SELECT username FROM accounts LIMIT 1').get();
    } catch {
      this.db.exec('ALTER TABLE accounts ADD COLUMN username TEXT');
    }

    // Transactions table
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

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_did)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_did)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(timestamp)`);
  }

  // IAccountRepository implementation
  getOrCreate(discordId: string, username?: string): CoinAccount {
    const did = `did:nike:discord:${discordId}`;
    let account = this.getByDiscordId(discordId);

    if (!account) {
      const now = Date.now();
      this.db.prepare(`
        INSERT INTO accounts (did, discord_id, username, balance, total_received, total_sent, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, 0, ?, ?)
      `).run(did, discordId, username || null, now, now);
      account = this.getByDiscordId(discordId)!;
    } else if (username && account.username !== username) {
      this.db.prepare('UPDATE accounts SET username = ? WHERE did = ?').run(username, did);
      account.username = username;
    }

    return account;
  }

  getByDiscordId(discordId: string): CoinAccount | undefined {
    const did = `did:nike:discord:${discordId}`;
    return this.db.prepare('SELECT * FROM accounts WHERE did = ?').get(did) as CoinAccount | undefined;
  }

  update(account: CoinAccount): void {
    this.db.prepare(`
      UPDATE accounts 
      SET balance = ?, total_received = ?, total_sent = ?, updated_at = ?
      WHERE did = ?
    `).run(account.balance, account.total_received, account.total_sent, Date.now(), account.did);
  }

  listAll(limit?: number): CoinAccount[] {
    const rows = this.db.prepare(`
      SELECT did, discord_id, username, balance, total_received, total_sent, created_at, updated_at
      FROM accounts
      WHERE balance > 0 OR total_received > 0 OR total_sent > 0
      ORDER BY balance DESC
      LIMIT ?
    `).all(limit ?? 100) as Array<{
      did: string;
      discord_id: string;
      username: string | null;
      balance: number;
      total_received: number;
      total_sent: number;
      created_at: number;
      updated_at: number;
    }>;
    return rows;
  }

  // ITransactionRepository implementation
  save(tx: CoinTransaction): void {
    this.db.prepare(`
      INSERT INTO transactions (id, from_did, to_did, amount, timestamp, signature, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tx.id, tx.from_did, tx.to_did, tx.amount, tx.timestamp, tx.signature, tx.memo);
  }

  getHistory(discordId: string, limit: number): TransactionWithDirection[] {
    const did = `did:nike:discord:${discordId}`;
    return this.db.prepare(`
      SELECT
        t.*,
        CASE WHEN t.from_did = ? THEN 'sent' ELSE 'received' END as direction,
        CASE WHEN t.from_did = ? THEN REPLACE(t.to_did, 'did:nike:discord:', '')
             ELSE REPLACE(t.from_did, 'did:nike:discord:', '') END as other_discord_id,
        CASE WHEN t.from_did = ? THEN a_to.username ELSE a_from.username END as other_username
      FROM transactions t
      LEFT JOIN accounts a_from ON t.from_did = a_from.did
      LEFT JOIN accounts a_to ON t.to_did = a_to.did
      WHERE t.from_did = ? OR t.to_did = ?
      ORDER BY t.timestamp DESC
      LIMIT ?
    `).all(did, did, did, did, did, limit) as TransactionWithDirection[];
  }

  verify(tx: CoinTransaction): boolean {
    // Verification is handled by the Signer service
    return true;
  }
}

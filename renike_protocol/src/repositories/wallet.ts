// ============================================
// ReNikeProtocol - Wallet Repository
// ============================================

import { getDB, withTransaction } from '../db/connection.js';
import { DID, Wallet, Transaction } from '../core/types.js';
import { NikeError, InsufficientBalanceError, WalletNotFoundError } from '../core/errors.js';
import crypto from 'crypto';

export class WalletRepository {
  /**
   * Get wallet by DID
   */
  async findByDID(did: DID): Promise<Wallet | null> {
    const db = getDB();
    const row = await db.get(
      'SELECT * FROM wallets WHERE did = ?',
      did
    );

    if (!row) return null;

    return {
      did: row.did as DID,
      balance: row.balance,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Create or update wallet balance
   */
  async upsert(did: DID, balance: number): Promise<Wallet> {
    const db = getDB();

    await db.run(
      `INSERT INTO wallets (did, balance, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(did) DO UPDATE SET
       balance = excluded.balance,
       updated_at = CURRENT_TIMESTAMP`,
      did, balance
    );

    const wallet = await this.findByDID(did);
    if (!wallet) throw new NikeError('Failed to upsert wallet', 'UPSERT_FAILED');
    return wallet;
  }

  /**
   * Atomically transfer coins between wallets
   */
  async transfer(
    fromDid: DID,
    toDid: DID,
    amount: number,
    description: string
  ): Promise<{ fromWallet: Wallet; toWallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) {
      throw new NikeError('Amount must be positive', 'INVALID_AMOUNT', { amount });
    }

    if (fromDid === toDid) {
      throw new NikeError('Cannot transfer to self', 'SELF_TRANSFER');
    }

    return withTransaction(async () => {
      const db = getDB();

      // Lock and check sender balance
      const fromRow = await db.get(
        'SELECT balance FROM wallets WHERE did = ?',
        fromDid
      );

      if (!fromRow) {
        throw new WalletNotFoundError(fromDid);
      }

      if (fromRow.balance < amount) {
        throw new InsufficientBalanceError(fromRow.balance, amount);
      }

      // Ensure receiver exists
      const toRow = await db.get(
        'SELECT 1 FROM wallets WHERE did = ?',
        toDid
      );

      if (!toRow) {
        await db.run(
          'INSERT INTO wallets (did, balance) VALUES (?, 0)',
          toDid
        );
      }

      // Perform transfer
      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE did = ?',
        amount, fromDid
      );

      await db.run(
        'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE did = ?',
        amount, toDid
      );

      // Record transaction
      const txId = crypto.randomUUID();
      const signature = crypto
        .createHmac('sha256', process.env.RENIKE_SECRET || 'default-secret')
        .update(`${txId}:${fromDid}:${toDid}:${amount}`)
        .digest('hex');

      await db.run(
        `INSERT INTO transactions (id, type, amount, from_did, to_did, description, signature)
         VALUES (?, 'TRANSFER', ?, ?, ?, ?, ?)`,
        txId, amount, fromDid, toDid, description, signature
      );

      const fromWallet = await this.findByDID(fromDid);
      const toWallet = await this.findByDID(toDid);
      const transaction = await this.getTransaction(txId);

      if (!fromWallet || !toWallet || !transaction) {
        throw new NikeError('Transaction verification failed', 'VERIFY_FAILED');
      }

      return { fromWallet, toWallet, transaction };
    });
  }

  /**
   * Mint coins to a wallet (admin only)
   */
  async mint(
    toDid: DID,
    amount: number,
    description: string
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) {
      throw new NikeError('Amount must be positive', 'INVALID_AMOUNT', { amount });
    }

    return withTransaction(async () => {
      const db = getDB();

      // Ensure wallet exists
      const existing = await db.get('SELECT 1 FROM wallets WHERE did = ?', toDid);
      if (!existing) {
        await db.run('INSERT INTO wallets (did, balance) VALUES (?, 0)', toDid);
      }

      // Add balance
      await db.run(
        'UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE did = ?',
        amount, toDid
      );

      // Record transaction
      const txId = crypto.randomUUID();
      const signature = crypto
        .createHmac('sha256', process.env.RENIKE_SECRET || 'default-secret')
        .update(`${txId}:MINT:${toDid}:${amount}`)
        .digest('hex');

      await db.run(
        `INSERT INTO transactions (id, type, amount, to_did, description, signature)
         VALUES (?, 'MINT', ?, ?, ?, ?)`,
        txId, amount, toDid, description, signature
      );

      const wallet = await this.findByDID(toDid);
      const transaction = await this.getTransaction(txId);

      if (!wallet || !transaction) {
        throw new NikeError('Mint verification failed', 'VERIFY_FAILED');
      }

      return { wallet, transaction };
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<Transaction | null> {
    const db = getDB();
    const row = await db.get('SELECT * FROM transactions WHERE id = ?', id);

    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      amount: row.amount,
      fromDid: row.from_did as DID | null,
      toDid: row.to_did as DID | null,
      description: row.description,
      signature: row.signature,
      timestamp: new Date(row.timestamp)
    };
  }

  /**
   * Get transaction history for a DID
   */
  async getHistory(did: DID, limit: number = 20): Promise<Transaction[]> {
    const db = getDB();
    const rows = await db.all(
      `SELECT * FROM transactions 
       WHERE from_did = ? OR to_did = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      did, did, limit
    );

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      fromDid: row.from_did as DID | null,
      toDid: row.to_did as DID | null,
      description: row.description,
      signature: row.signature,
      timestamp: new Date(row.timestamp)
    }));
  }
}

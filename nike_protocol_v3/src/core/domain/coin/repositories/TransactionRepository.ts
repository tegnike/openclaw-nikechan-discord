import { Transaction } from '../Transaction.js';

export interface TransactionRepository {
  save(tx: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  findByDid(did: string): Promise<Transaction[]>;
}

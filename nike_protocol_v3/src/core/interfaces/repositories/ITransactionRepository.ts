import type { Result } from 'neverthrow';
import type { Transaction } from '../../domain/coin/Transaction.js';

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<Result<void, Error>>;
  findByDID(did: string): Promise<Result<Transaction[], Error>>;
}

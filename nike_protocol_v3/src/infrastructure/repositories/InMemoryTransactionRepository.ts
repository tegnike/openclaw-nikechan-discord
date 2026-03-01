import { ok, err, type Result } from 'neverthrow';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import type { Transaction } from '../../core/domain/coin/Transaction.js';

export class InMemoryTransactionRepository implements ITransactionRepository {
  private transactions: Transaction[] = [];

  async save(transaction: Transaction): Promise<Result<void, Error>> {
    this.transactions.push(transaction);
    return ok(undefined);
  }

  async findByDID(did: string): Promise<Result<Transaction[], Error>> {
    const txs = this.transactions.filter(t => t.did === did);
    return ok(txs);
  }
}

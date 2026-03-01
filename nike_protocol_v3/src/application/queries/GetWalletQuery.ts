import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';

export interface WalletDTO {
  did: string;
  balance: number;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    createdAt: Date;
  }>;
}

export class GetWalletQuery {
  constructor(
    private walletRepo: IWalletRepository,
    private txRepo: ITransactionRepository
  ) {}

  async execute(did: string): Promise<Result<WalletDTO, Error>> {
    const walletResult = await this.walletRepo.findByDID(did);
    if (walletResult.isErr()) {
      return err(walletResult.error);
    }
    
    const wallet = walletResult.value;
    const txResult = await this.txRepo.findByDID(did);
    const transactions = txResult.isOk() ? txResult.value : [];

    return ok({
      did: wallet.userId.value,
      balance: wallet.balance.amount,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt
      }))
    });
  }
}

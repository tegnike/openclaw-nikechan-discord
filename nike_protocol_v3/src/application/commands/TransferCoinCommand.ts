import { ok, err, type Result } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import { Coin } from '../../core/domain/coin/Coin.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';

export interface TransferInput {
  fromDid: string;
  toDid: string;
  amount: number;
  description?: string;
}

export class TransferCoinCommand {
  constructor(
    private walletRepo: IWalletRepository,
    private txRepo: ITransactionRepository
  ) {}

  async execute(input: TransferInput): Promise<Result<{ txId: string; fromBalance: number; toBalance: number }, Error>> {
    if (input.amount <= 0) {
      return err(new Error('Amount must be positive'));
    }

    // Check sender balance
    const fromWalletResult = await this.walletRepo.findByDID(input.fromDid);
    if (fromWalletResult.isErr()) {
      return err(new Error('Sender wallet not found'));
    }
    const fromWallet = fromWalletResult.value;

    const coinResult = Coin.create(input.amount);
    if (coinResult.isErr()) {
      return err(new Error(coinResult.error.message));
    }
    const coin = coinResult.value;

    if (fromWallet.balance.amount < input.amount) {
      return err(new Error('Insufficient balance'));
    }

    // Deduct from sender
    const subtractResult = await this.walletRepo.addBalance(input.fromDid, -input.amount);
    if (subtractResult.isErr()) {
      return err(subtractResult.error);
    }
    const fromBalance = subtractResult.value;

    // Add to receiver
    const addResult = await this.walletRepo.addBalance(input.toDid, input.amount);
    if (addResult.isErr()) {
      // Rollback would happen here in production
      return err(addResult.error);
    }
    const toBalance = addResult.value;

    // Record transaction
    const tx = Transaction.create({
      did: input.fromDid,
      amount: -input.amount,
      type: 'TRANSFER',
      description: input.description || `Transferred ${input.amount} to ${input.toDid}`
    });

    await this.txRepo.save(tx);

    return ok({ txId: tx.id, fromBalance, toBalance });
  }
}

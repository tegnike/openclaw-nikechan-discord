import { ok, err, type Result } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import { Coin } from '../../core/domain/coin/Coin.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';
import { UserId } from '../../core/domain/user/UserId.js';
import { Wallet } from '../../core/domain/user/Wallet.js';

export interface MintCoinInput {
  did: string;
  discordId?: string;
  amount: number;
  description?: string;
}

export class MintCoinCommand {
  constructor(
    private walletRepo: IWalletRepository,
    private txRepo: ITransactionRepository
  ) {}

  async execute(input: MintCoinInput): Promise<Result<{ txId: string; newBalance: number }, Error>> {
    const targetDid = input.discordId || input.did;
    
    // Validate amount
    if (input.amount <= 0) {
      return err(new Error('Amount must be positive'));
    }
    if (input.amount > 1000000) {
      return err(new Error('Amount exceeds maximum'));
    }

    // Find or create wallet
    const walletResult = await this.walletRepo.findByDID(targetDid);
    
    if (walletResult.isErr()) {
      // Create new wallet
      const userIdResult = UserId.create(targetDid);
      if (userIdResult.isErr()) {
        return err(new Error(userIdResult.error.message));
      }
      const newWallet = Wallet.create(userIdResult.value);
      await this.walletRepo.save(newWallet);
    }

    // Add balance atomically
    const addResult = await this.walletRepo.addBalance(targetDid, input.amount);
    if (addResult.isErr()) {
      return err(addResult.error);
    }
    const newBalance = addResult.value;

    // Record transaction
    const tx = Transaction.create({
      did: targetDid,
      amount: input.amount,
      type: 'MINT',
      description: input.description || `Minted ${input.amount} coins`
    });

    const saveTxResult = await this.txRepo.save(tx);
    if (saveTxResult.isErr()) {
      return err(saveTxResult.error);
    }

    return ok({ txId: tx.id, newBalance });
  }
}

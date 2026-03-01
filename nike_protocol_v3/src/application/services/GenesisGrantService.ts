import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import { MintCoinCommand } from '../commands/MintCoinCommand.js';

export interface GenesisGrantInput {
  discordId: string;
  amount: number;
  reason?: string;
}

export class GenesisGrantService {
  private mintCommand: MintCoinCommand;

  constructor(
    walletRepo: IWalletRepository,
    txRepo: ITransactionRepository
  ) {
    this.mintCommand = new MintCoinCommand(walletRepo, txRepo);
  }

  async grant(input: GenesisGrantInput): Promise<{ txId: string; newBalance: number }> {
    const result = await this.mintCommand.execute({
      did: input.discordId,
      discordId: input.discordId,
      amount: input.amount,
      description: input.reason || 'Genesis grant'
    });
    
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

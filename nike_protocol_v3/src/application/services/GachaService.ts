import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import type { InventoryRepository } from '../../core/domain/gacha/InventoryRepository.js';
import { PullGachaCommand, type PullGachaOutput } from '../commands/PullGachaCommand.js';
import { DomainError } from '../../core/errors/DomainError.js';

export class GachaService {
  private pullCommand: PullGachaCommand;

  constructor(
    walletRepo: IWalletRepository,
    txRepo: ITransactionRepository,
    inventoryRepo: InventoryRepository
  ) {
    this.pullCommand = new PullGachaCommand(walletRepo, txRepo, inventoryRepo);
  }

  async pull(did: string): Promise<PullGachaOutput> {
    const result = await this.pullCommand.execute({ did, isTenPull: false });
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  async pull10(did: string): Promise<PullGachaOutput> {
    const result = await this.pullCommand.execute({ did, isTenPull: true });
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

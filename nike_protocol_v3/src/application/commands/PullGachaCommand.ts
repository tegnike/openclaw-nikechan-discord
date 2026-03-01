import { ok, err, type Result } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import type { ITransactionRepository } from '../../core/interfaces/repositories/ITransactionRepository.js';
import type { InventoryRepository } from '../../core/domain/gacha/InventoryRepository.js';
import { DropTable } from '../../core/domain/gacha/DropTable.js';
import { GachaPulled } from '../../core/events/GachaPulled.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';
import { DomainError } from '../../core/errors/DomainError.js';

export interface PullGachaInput {
  did: string;
  isTenPull?: boolean;
}

export interface PullGachaOutput {
  pulls: Array<{
    titleId: string;
    name: string;
    rarity: string;
    isNew: boolean;
  }>;
  totalCost: number;
  newBalance: number;
  transactionIds: string[];
}

export class PullGachaCommand {
  private readonly COST_PER_PULL = 10;
  private readonly dropTable = DropTable.createStandard();

  constructor(
    private walletRepo: IWalletRepository,
    private txRepo: ITransactionRepository,
    private inventoryRepo: InventoryRepository
  ) {}

  async execute(input: PullGachaInput): Promise<Result<PullGachaOutput, Error>> {
    const pullCount = input.isTenPull ? 10 : 1;
    const totalCost = this.COST_PER_PULL * pullCount;

    // Check balance
    const walletResult = await this.walletRepo.findByDID(input.did);
    if (walletResult.isErr()) {
      return err(new DomainError('WALLET_NOT_FOUND', 'Wallet not found'));
    }
    const wallet = walletResult.value;

    if (wallet.balance.amount < totalCost) {
      return err(new DomainError('INSUFFICIENT_BALANCE', `Need ${totalCost} coins, have ${wallet.balance.amount}`));
    }

    // Deduct coins
    const deductResult = await this.walletRepo.addBalance(input.did, -totalCost);
    if (deductResult.isErr()) {
      return err(deductResult.error);
    }
    const newBalance = deductResult.value;

    // Get or create inventory
    const inventoryResult = await this.inventoryRepo.findByDiscordId(input.did);
    if (inventoryResult.isErr()) {
      return err(inventoryResult.error);
    }
    let inventory = inventoryResult.value;

    // Draw gacha
    const draws = input.isTenPull 
      ? this.dropTable.drawTen() 
      : [this.dropTable.drawSingle()];

    const pulls: PullGachaOutput['pulls'] = [];
    const transactionIds: string[] = [];

    for (const title of draws) {
      const isNew = !inventory.hasTitle(title.id);
      if (isNew) {
        inventory = inventory.addTitle(title);
      }

      pulls.push({
        titleId: title.id,
        name: title.name,
        rarity: title.rarity,
        isNew
      });

      // Record transaction for each pull
      const tx = Transaction.create({
        did: input.did,
        amount: -this.COST_PER_PULL,
        type: 'GACHA',
        description: `Gacha: ${title.name} (${title.rarity})`
      });
      
      await this.txRepo.save(tx);
      transactionIds.push(tx.id);
    }

    // Save inventory
    const saveResult = await this.inventoryRepo.save(input.did, inventory);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // Emit event
    const event = new GachaPulled(input.did, draws.map(t => t.id), totalCost);

    return ok({
      pulls,
      totalCost,
      newBalance,
      transactionIds
    });
  }
}

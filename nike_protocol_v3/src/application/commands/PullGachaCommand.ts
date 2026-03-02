import { WalletRepository } from '../../core/domain/user/repositories/WalletRepository.js';
import { TransactionRepository } from '../../core/domain/coin/repositories/TransactionRepository.js';
import { InventoryRepository } from '../../core/domain/gacha/repositories/InventoryRepository.js';
import { DropTable } from '../../core/domain/gacha/DropTable.js';
import { Title } from '../../core/domain/gacha/Title.js';
import { GachaPull } from '../../core/domain/gacha/GachaPull.js';
import { Transaction } from '../../core/domain/coin/Transaction.js';
import { Result, ok, err } from '../../core/shared/Result.js';
import { NikeError } from '../../core/errors/NikeError.js';

export interface PullGachaInput {
  did: string;
  count: number;
}

export interface PullGachaOutput {
  titles: Title[];
  transactionId: string;
}

export class PullGachaCommand {
  private walletRepo: WalletRepository;
  private txRepo: TransactionRepository;
  private inventoryRepo: InventoryRepository;
  private dropTable: DropTable;
  private signFn: (data: string) => string;

  constructor(
    walletRepo: WalletRepository,
    txRepo: TransactionRepository,
    inventoryRepo: InventoryRepository,
    dropTable: DropTable,
    signFn: (data: string) => string
  ) {
    this.walletRepo = walletRepo;
    this.txRepo = txRepo;
    this.inventoryRepo = inventoryRepo;
    this.dropTable = dropTable;
    this.signFn = signFn;
  }

  async execute(input: PullGachaInput): Promise<Result<PullGachaOutput, NikeError>> {
    const cost = input.count * 10; // 10 coins per pull

    // Check balance
    const wallet = await this.walletRepo.findByDid(input.did);
    if (!wallet) {
      return err(new NikeError('WALLET_NOT_FOUND', 'Wallet not found'));
    }

    if (wallet.balance < cost) {
      return err(new NikeError('INSUFFICIENT_BALANCE', `Need ${cost} coins, have ${wallet.balance}`));
    }

    // Deduct balance
    const deductResult = await this.walletRepo.subtractBalance(input.did, cost);
    if (!deductResult.success) {
      const errorResult = deductResult as { success: false; error: NikeError };
      return err(errorResult.error);
    }

    // Perform gacha pull
    const titles = this.dropTable.drawTen();

    // Create gacha pull record
    const pull = GachaPull.create({
      userId: input.did,
      titles,
      cost,
      timestamp: new Date()
    });

    // Add titles to inventory
    for (const title of titles) {
      await this.inventoryRepo.addTitle(input.did, title.id);
    }

    // Create transaction record
    const tx = new Transaction({
      type: 'GACHA',
      amount: -cost,
      fromDid: input.did,
      toDid: 'system:gacha',
      description: `Gacha ${input.count}pull`,
      signature: this.signFn(`${input.did}:${cost}:${Date.now()}`)
    });

    await this.txRepo.save(tx);

    return ok({
      titles,
      transactionId: tx.id
    });
  }
}

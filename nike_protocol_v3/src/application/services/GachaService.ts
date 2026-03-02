import { PullGachaCommand } from '../commands/PullGachaCommand.js';
import { SQLiteInventoryRepository } from '../../infrastructure/repositories/SQLiteInventoryRepository.js';
import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';
import { SQLiteTransactionRepository } from '../../infrastructure/repositories/SQLiteTransactionRepository.js';
import { DropTable } from '../../core/domain/gacha/DropTable.js';
import { Title } from '../../core/domain/gacha/Title.js';
import { Result, ok, err } from '../../core/shared/Result.js';
import { NikeError } from '../../core/errors/NikeError.js';
import { createHmac } from 'crypto';

export interface GachaPullResult {
  titles: Title[];
  transactionId: string;
}

export class GachaService {
  private pullCommand: PullGachaCommand;
  private inventoryRepo: SQLiteInventoryRepository;

  private constructor(
    pullCommand: PullGachaCommand,
    inventoryRepo: SQLiteInventoryRepository
  ) {
    this.pullCommand = pullCommand;
    this.inventoryRepo = inventoryRepo;
  }

  static async create(): Promise<GachaService> {
    const dbPath = process.env.NIKECOIN_DB_PATH || './data/coin_v3.db';
    const encryptionKey = process.env.NIKE_COIN_ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      throw new Error('NIKE_COIN_ENCRYPTION_KEY environment variable is required');
    }

    const walletRepo = new SQLiteWalletRepository(dbPath, encryptionKey);
    const txRepo = new SQLiteTransactionRepository(dbPath, encryptionKey);
    const inventoryRepo = new SQLiteInventoryRepository(dbPath, encryptionKey);
    
    const signFn = (data: string) => {
      const secret = process.env.NIKECOIN_SECRET || 'default-secret';
      return createHmac('sha256', secret).update(data).digest('hex');
    };

    const dropTable = DropTable.createDefault();
    const pullCommand = new PullGachaCommand(
      walletRepo,
      txRepo,
      inventoryRepo,
      dropTable,
      signFn
    );

    return new GachaService(pullCommand, inventoryRepo);
  }

  async pull10(did: string): Promise<Result<GachaPullResult, NikeError>> {
    return this.pullCommand.execute({ did, count: 10 });
  }

  async getInventory(did: string): Promise<Result<Title[], NikeError>> {
    const inventory = await this.inventoryRepo.findByDid(did);
    
    if (!inventory) {
      return ok([]);
    }

    return ok(inventory.titles);
  }
}

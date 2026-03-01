import { SQLiteWalletRepository } from '../../infrastructure/repositories/SQLiteWalletRepository.js';
import { SQLiteTransactionRepository } from '../../infrastructure/repositories/SQLiteTransactionRepository.js';
import { MintCoinCommand } from '../commands/MintCoinCommand.js';
import { TransferCoinCommand } from '../commands/TransferCoinCommand.js';
import type { Database } from '../../infrastructure/database/Database.js';

export interface WalletDTO {
  did: string;
  balance: number;
}

export class NikeCoinService {
  private static instance: NikeCoinService;
  private walletRepo!: SQLiteWalletRepository;
  private txRepo!: SQLiteTransactionRepository;
  private mintCommand!: MintCoinCommand;
  private transferCommand!: TransferCoinCommand;

  private constructor() {}

  static getInstance(): NikeCoinService {
    if (!NikeCoinService.instance) {
      NikeCoinService.instance = new NikeCoinService();
    }
    return NikeCoinService.instance;
  }

  initialize(db: Database): void {
    this.walletRepo = new SQLiteWalletRepository(db);
    this.txRepo = new SQLiteTransactionRepository(db);
    this.mintCommand = new MintCoinCommand(this.walletRepo, this.txRepo);
    this.transferCommand = new TransferCoinCommand(this.walletRepo, this.txRepo);
  }

  async mint(did: string, amount: number, description?: string): Promise<{ txId: string; newBalance: number }> {
    const result = await this.mintCommand.execute({ did, amount, description });
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  async transfer(fromDid: string, toDid: string, amount: number, description?: string): Promise<{ txId: string; fromBalance: number; toBalance: number }> {
    const result = await this.transferCommand.execute({ fromDid, toDid, amount, description });
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  async getBalance(did: string): Promise<number> {
    const result = await this.walletRepo.findByDID(did);
    if (result.isErr()) {
      return 0;
    }
    return result.value.balance.amount;
  }
}

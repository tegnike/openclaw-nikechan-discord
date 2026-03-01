import { ok, err, type Result } from 'neverthrow';
import type { IWalletRepository } from '../../core/interfaces/repositories/IWalletRepository.js';
import { Wallet } from '../../core/domain/user/Wallet.js';
import { Coin } from '../../core/domain/coin/Coin.js';
import { UserId } from '../../core/domain/user/UserId.js';

export class InMemoryWalletRepository implements IWalletRepository {
  private wallets = new Map<string, { balance: number; transactions: any[]; titles: any[] }>();

  async findByDID(did: string): Promise<Result<Wallet, Error>> {
    const data = this.wallets.get(did);
    if (!data) {
      return err(new Error('Wallet not found'));
    }
    
    const userIdResult = UserId.create(did);
    if (userIdResult.isErr()) {
      return err(new Error(userIdResult.error.message));
    }
    
    const coinResult = Coin.create(data.balance);
    if (coinResult.isErr()) {
      return err(new Error(coinResult.error.message));
    }
    
    return ok(new Wallet(userIdResult.value, coinResult.value));
  }

  async save(wallet: Wallet): Promise<Result<void, Error>> {
    this.wallets.set(wallet.userId.value, {
      balance: wallet.balance.amount,
      transactions: [],
      titles: []
    });
    return ok(undefined);
  }

  async updateBalance(did: string, newBalance: Coin): Promise<Result<void, Error>> {
    const data = this.wallets.get(did);
    if (!data) {
      return err(new Error('Wallet not found'));
    }
    data.balance = newBalance.amount;
    return ok(undefined);
  }

  async addBalance(did: string, amount: number): Promise<Result<number, Error>> {
    let data = this.wallets.get(did);
    if (!data) {
      data = { balance: 0, transactions: [], titles: [] };
      this.wallets.set(did, data);
    }
    data.balance += amount;
    if (data.balance < 0) {
      data.balance -= amount; // rollback
      return err(new Error('Insufficient balance'));
    }
    return ok(data.balance);
  }
}

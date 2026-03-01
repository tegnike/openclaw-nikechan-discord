import type { Result } from 'neverthrow';
import type { Wallet } from '../../domain/user/Wallet.js';
import type { Coin } from '../../domain/coin/Coin.js';

export interface IWalletRepository {
  findByDID(did: string): Promise<Result<Wallet, Error>>;
  save(wallet: Wallet): Promise<Result<void, Error>>;
  updateBalance(did: string, newBalance: Coin): Promise<Result<void, Error>>;
  addBalance(did: string, amount: number): Promise<Result<number, Error>>;
}

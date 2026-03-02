import { Wallet } from '../Wallet.js';
import { Result } from '../../../shared/Result.js';
import { NikeError } from '../../../errors/NikeError.js';

export interface WalletRepository {
  findByDid(did: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  addBalance(did: string, amount: number): Promise<Result<void, NikeError>>;
  subtractBalance(did: string, amount: number): Promise<Result<void, NikeError>>;
}

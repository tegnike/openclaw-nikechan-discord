import { ok, err, type Result } from 'neverthrow';
import type { Coin } from '../Coin.js';
import type { Wallet } from '../../user/Wallet.js';

export interface MintingPolicy {
  canMint(wallet: Wallet, amount: Coin): Result<void, Error>;
}

export class DefaultMintingPolicy implements MintingPolicy {
  private readonly MAX_DAILY_MINT = 10000;

  canMint(wallet: Wallet, amount: Coin): Result<void, Error> {
    if (amount.amount <= 0) {
      return err(new Error('Amount must be positive'));
    }
    if (amount.amount > this.MAX_DAILY_MINT) {
      return err(new Error(`Cannot mint more than ${this.MAX_DAILY_MINT} at once`));
    }
    return ok(undefined);
  }
}

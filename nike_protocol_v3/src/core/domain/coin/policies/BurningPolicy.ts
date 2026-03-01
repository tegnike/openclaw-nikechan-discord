import { ok, err, type Result } from 'neverthrow';
import type { Coin } from '../Coin.js';
import type { Wallet } from '../../user/Wallet.js';

export interface BurningPolicy {
  canBurn(wallet: Wallet, amount: Coin): Result<void, Error>;
}

export class DefaultBurningPolicy implements BurningPolicy {
  canBurn(wallet: Wallet, amount: Coin): Result<void, Error> {
    if (amount.amount <= 0) {
      return err(new Error('Amount must be positive'));
    }
    if (wallet.balance.amount < amount.amount) {
      return err(new Error('Insufficient balance'));
    }
    return ok(undefined);
  }
}

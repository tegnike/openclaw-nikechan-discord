import { ok, err, type Result } from 'neverthrow';
import type { Coin } from '../Coin.js';
import type { Wallet } from '../../user/Wallet.js';

export interface TransferPolicy {
  canTransfer(from: Wallet, to: Wallet, amount: Coin): Result<void, Error>;
}

export class DefaultTransferPolicy implements TransferPolicy {
  canTransfer(from: Wallet, to: Wallet, amount: Coin): Result<void, Error> {
    if (amount.amount <= 0) {
      return err(new Error('Amount must be positive'));
    }
    if (from.balance.amount < amount.amount) {
      return err(new Error('Insufficient balance'));
    }
    return ok(undefined);
  }
}

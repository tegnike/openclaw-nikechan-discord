import { Coin } from '../coin/Coin.js';
import { UserId } from './UserId.js';

export class Wallet {
  constructor(
    public readonly userId: UserId,
    public balance: Coin
  ) {}

  static create(userId: UserId): Wallet {
    return new Wallet(userId, Coin.zero());
  }

  add(amount: Coin): void {
    const result = this.balance.add(amount);
    if (result.isOk()) {
      this.balance = result.value;
    }
  }

  subtract(amount: Coin): boolean {
    if (this.balance.amount < amount.amount) {
      return false;
    }
    const result = this.balance.subtract(amount);
    if (result.isOk()) {
      this.balance = result.value;
      return true;
    }
    return false;
  }
}

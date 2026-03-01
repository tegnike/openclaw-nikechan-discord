// Value Object: Coin - Immutable monetary value

import { ok, err, type Result } from 'neverthrow';

export type CoinError = 
  | { type: 'NEGATIVE_AMOUNT'; message: string }
  | { type: 'NOT_INTEGER'; message: string }
  | { type: 'OVERFLOW'; message: string };

export class Coin {
  readonly #amount: number;
  readonly #currency: 'NIKE' = 'NIKE';

  private constructor(amount: number) {
    this.#amount = amount;
  }

  static create(amount: number): Result<Coin, CoinError> {
    if (!Number.isInteger(amount)) {
      return err({ type: 'NOT_INTEGER', message: `Amount must be integer: ${amount}` });
    }
    if (amount < 0) {
      return err({ type: 'NEGATIVE_AMOUNT', message: `Amount cannot be negative: ${amount}` });
    }
    if (amount > Number.MAX_SAFE_INTEGER) {
      return err({ type: 'OVERFLOW', message: `Amount exceeds safe integer limit` });
    }
    return ok(new Coin(amount));
  }

  static zero(): Coin {
    return new Coin(0);
  }

  get amount(): number {
    return this.#amount;
  }

  get currency(): 'NIKE' {
    return this.#currency;
  }

  add(other: Coin): Result<Coin, CoinError> {
    const sum = this.#amount + other.#amount;
    if (sum > Number.MAX_SAFE_INTEGER) {
      return err({ type: 'OVERFLOW', message: 'Addition would overflow' });
    }
    return ok(new Coin(sum));
  }

  subtract(other: Coin): Result<Coin, CoinError> {
    return Coin.create(this.#amount - other.#amount);
  }

  isZero(): boolean {
    return this.#amount === 0;
  }

  isGreaterThan(other: Coin): boolean {
    return this.#amount > other.#amount;
  }

  isGreaterThanOrEqual(other: Coin): boolean {
    return this.#amount >= other.#amount;
  }

  equals(other: Coin): boolean {
    return this.#amount === other.#amount;
  }

  toString(): string {
    return `${this.#amount} ${this.#currency}`;
  }
}

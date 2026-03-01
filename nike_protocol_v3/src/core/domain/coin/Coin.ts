// Value Object: Coin - Immutable monetary value
import { ok, err, type Result } from 'neverthrow';

export type NikeError = 
  | { type: 'INVALID_AMOUNT'; message: string }
  | { type: 'NEGATIVE_AMOUNT'; message: string }
  | { type: 'OVERFLOW'; message: string }
  | { type: 'MAX_EXCEEDED'; message: string };

export class Coin {
  readonly #amount: number;
  readonly currency = 'NIKE' as const;
  static readonly MAX_AMOUNT = 1_000_000_000;
  
  private constructor(amount: number) {
    this.#amount = amount;
    Object.freeze(this);
  }
  
  static create(amount: number): Result<Coin, NikeError> {
    if (!Number.isInteger(amount)) {
      return err({ type: 'INVALID_AMOUNT', message: 'Amount must be an integer' });
    }
    if (amount < 0) {
      return err({ type: 'NEGATIVE_AMOUNT', message: 'Amount cannot be negative' });
    }
    if (amount > Coin.MAX_AMOUNT) {
      return err({ type: 'MAX_EXCEEDED', message: `Amount cannot exceed ${Coin.MAX_AMOUNT}` });
    }
    return ok(new Coin(amount));
  }
  
  static zero(): Coin {
    return new Coin(0);
  }
  
  get amount(): number {
    return this.#amount;
  }
  
  add(other: Coin): Result<Coin, NikeError> {
    const sum = this.#amount + other.amount;
    if (sum > Coin.MAX_AMOUNT) {
      return err({ type: 'OVERFLOW', message: `Sum exceeds maximum ${Coin.MAX_AMOUNT}` });
    }
    return Coin.create(sum);
  }
  
  subtract(other: Coin): Result<Coin, NikeError> {
    return Coin.create(this.#amount - other.amount);
  }
  
  isZero(): boolean {
    return this.#amount === 0;
  }
  
  greaterThan(other: Coin): boolean {
    return this.#amount > other.amount;
  }
  
  lessThan(other: Coin): boolean {
    return this.#amount < other.amount;
  }
  
  equals(other: Coin): boolean {
    return this.#amount === other.amount;
  }
  
  toString(): string {
    return `${this.#amount} ${this.currency}`;
  }
}

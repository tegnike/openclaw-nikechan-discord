import { DomainError } from './DomainError.js';

export class InsufficientFundsError extends DomainError {
  readonly code = 'INSUFFICIENT_FUNDS';
  readonly statusCode = 400;
  readonly isRetryable = false;

  constructor(
    public readonly balance: number,
    public readonly required: number
  ) {
    super(`Insufficient balance: ${balance} < ${required}`);
  }
}

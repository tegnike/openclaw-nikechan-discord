import { DomainError } from './DomainError.js';

export class InvalidAmountError extends DomainError {
  readonly code = 'INVALID_AMOUNT';
  readonly statusCode = 400;
  readonly isRetryable = false;
}
